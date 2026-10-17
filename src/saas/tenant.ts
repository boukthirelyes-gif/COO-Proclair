import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { DomainError } from '@/domain/rules';
import { CRMService } from '@/domain/service';
import { requirePermission, userActor } from '@/lib/access';
import { ProspectingService } from '@/prospecting/service';
import {mapQuery} from '@/prospecting/query';
import { SaasControl, organizationLock, type SaasIdentity } from './control';
import { entitlement, tenantSchema, type features } from './policy';
import { tenantVersion } from './provision';
let activeClients = 0;
export class SaasTenant {
    constructor(private control: SaasControl, private connectionString: string) { }
    private async withTenant<T>(slug: string, identity: SaasIdentity, feature: typeof features[number], fn: (db: PrismaClient, actor: ReturnType<typeof userActor>, membership: Awaited<ReturnType<SaasControl['organization']>>) => Promise<T>) {
        const membership = await this.control.organization(slug, identity), organization = membership.organization;
        if (organization.status !== 'READY' || organization.schemaVersion !== await tenantVersion())
            throw new DomainError('TENANT_NOT_READY', 'Entreprise en attente de provisioning ou migration.', 503);
        if (!organization.subscription)
            throw new DomainError('SUBSCRIPTION_INACTIVE', 'Abonnement absent.', 403);
        entitlement(organization.subscription, feature);
        if (activeClients >= 8)
            throw new DomainError('TENANT_CAPACITY', 'Capacité temporairement atteinte ; réessayez.', 503);
        activeClients++;
        const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: this.connectionString, max: 1, connectionTimeoutMillis: 10000, idleTimeoutMillis: 5000 }, { schema: tenantSchema(organization.schemaName) }) });
        try {
            const user = await db.appUser.findUnique({ where: { id: membership.id } });
            if (!user?.active || user.role !== membership.role)
                throw new DomainError('MEMBERSHIP_INACTIVE', 'Accès d’entreprise révoqué ou incohérent.', 403);
            return await fn(db, userActor(user), membership);
        }
        finally {
            try {
                await db.$disconnect();
            }
            finally {
                activeClients--;
            }
        }
    }
    async list(slug: string, kind: string, query: unknown, identity: SaasIdentity) { const v = z.object({ cursor: z.string().min(1).max(100).optional(), limit: z.coerce.number().int().min(1).max(100).default(30), search: z.string().trim().max(100).default('') }).strict().parse(query); if (!['customers', 'contracts', 'visits', 'invoices'].includes(kind))
        throw new DomainError('NOT_FOUND', 'Module non disponible.', 404); return this.withTenant(slug, identity, kind === 'invoices' ? 'finance' : 'crm', async (db, actor) => { requirePermission(actor, kind === 'invoices' ? 'finance' : 'crm.read'); const where = kind === 'customers' && v.search ? { name: { contains: v.search, mode: 'insensitive' as const } } : {}; const delegate = (db as any)[{ customers: 'customer', contracts: 'contract', visits: 'visit', invoices: 'invoice' }[kind]!]; const rows = await delegate.findMany({ where, orderBy: { id: 'asc' }, take: v.limit + 1, ...(v.cursor ? { cursor: { id: v.cursor }, skip: 1 } : {}) }); const hasMore = rows.length > v.limit; const items = rows.slice(0, v.limit); return { items, nextCursor: hasMore ? items.at(-1).id : null, limit: v.limit }; }); }
    async customer(slug: string, id: string, identity: SaasIdentity) { return this.withTenant(slug, identity, 'crm', async (db, actor) => { requirePermission(actor, 'crm.read'); return new CRMService(db).getCustomer(id); }); }
    async mutate(slug: string, kind: string, input: unknown, identity: SaasIdentity) {
        if (!['customers', 'properties', 'contracts'].includes(kind))
            throw new DomainError('NOT_FOUND', 'Mutation non disponible.', 404);
        return this.withTenant(slug, identity, 'crm', async (db, actor, m) => {
            requirePermission(actor, 'crm.write');
            return db.$transaction(async (tx) => {
                await organizationLock(tx, m.organizationId);
                const rows = await tx.$queryRawUnsafe<any[]>(`SELECT m.role,m.active,u.active AS "userActive",o.status,s.status AS "subscriptionStatus",s."trialEndsAt",p.active AS "planActive",p.policy FROM "${this.control.schema}"."SaasMembership" m JOIN "${this.control.schema}"."SaasUser" u ON u.id=m."userId" JOIN "${this.control.schema}"."SaasOrganization" o ON o.id=m."organizationId" JOIN "${this.control.schema}"."SaasSubscription" s ON s."organizationId"=o.id JOIN "${this.control.schema}"."SaasPlan" p ON p.code=s."planCode" WHERE m.id=$1 AND u.id=$2`, m.id, identity.id);
                const current = rows[0];
                if (!current?.active || !current.userActive || current.status !== 'READY' || current.role !== actor.businessRole)
                    throw new DomainError('MEMBERSHIP_INACTIVE', 'Accès d’entreprise modifié.', 403);
                const policy = entitlement({ status: current.subscriptionStatus, trialEndsAt: current.trialEndsAt, plan: { active: current.planActive, policy: current.policy } }, 'crm');
                if (kind === 'customers' && await tx.customer.count() >= policy.customers)
                    throw new DomainError('QUOTA_EXCEEDED', 'Limite de clients atteinte.', 409);
                // Reuse the existing CRM validation, relations and audit inside this transaction.
                const scoped = new Proxy(tx, { get(target, key) { if (key === '$transaction')
                        return (fn: (value: Prisma.TransactionClient) => Promise<unknown>) => fn(tx); const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; } }) as PrismaClient;
                const service = new CRMService(scoped);
                return kind === 'customers' ? service.createCustomer(input, actor) : kind === 'properties' ? service.createProperty(input, actor) : service.createContract(input, actor);
            }, { isolationLevel: 'ReadCommitted' });
        });
    }
    async pins(slug: string, query: unknown, identity: SaasIdentity) {const {after,...filters}=mapQuery.extend({after:z.string().min(1).max(100).optional()}).parse(query);return this.withTenant(slug,identity,'prospecting',(db,actor)=>new ProspectingService(db).list(actor,after,filters));}
    async omega(slug: string, identity: SaasIdentity) { return this.withTenant(slug, identity, 'omega', async (db, actor, m) => { requirePermission(actor, 'crm.read'); requirePermission(actor, 'omega'); const [customers, contracts, visits] = await Promise.all([db.customer.count(), db.contract.count(), db.visit.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } })]); return { organizationId: m.organizationId, mode: 'READ_ONLY', tool: 'organization_summary', sources: ['Customer', 'Contract', 'Visit'], values: { customers, contracts, openVisits: visits }, externalActions: false, modelProvider: 'NOT_ENABLED' }; }); }
    async usage(slug: string, identity: SaasIdentity) { return this.withTenant(slug, identity, 'reports', async (db, actor, m) => { requirePermission(actor, 'crm.read'); return { customers: await db.customer.count(), users: await this.control.db.saasMembership.count({ where: { organizationId: m.organizationId, active: true } }), pins: await db.prospectPin.count(), policy: m.organization.subscription?.plan.policy, externalUsage: 'NOT_CONNECTED', storageBytes: null, smsSent: 0 }; }); }
}

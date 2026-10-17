import { createHash, randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import type { PrismaClient } from '@prisma/client';
import { hashPassword, presets } from '@/lib/access';
import { DomainError } from '@/domain/rules';
import { tenantSchema } from './policy';
export const controlMigration = '20261017100000_saas_control_plane';
let manifest: Promise<{
    name: string;
    sql: string;
    checksum: string;
}[]> | undefined;
export function tenantMigrations() { return manifest ??= (async () => { const base = resolve('prisma/migrations'), entries = (await readdir(base, { withFileTypes: true })).filter(v => v.isDirectory() && v.name !== controlMigration).sort((a, b) => a.name.localeCompare(b.name)); return Promise.all(entries.map(async (e) => { const sql = await readFile(resolve(base, e.name, 'migration.sql'), 'utf8'); return { name: e.name, sql, checksum: createHash('sha256').update(sql).digest('hex') }; })); })(); }
export async function tenantVersion() { return createHash('sha256').update(JSON.stringify((await tenantMigrations()).map(v => [v.name, v.checksum]))).digest('hex'); }
function quoted(value: string) { if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(value))
    throw Error('Invalid internal schema identifier'); return '"' + value + '"'; }
/** Explicit worker operation. No request performs DDL, and no customer-controlled SQL is used. */
export async function provisionOrganization(db: PrismaClient, connectionString: string, organizationId: string, controlSchema = 'public') {
    if (process.env.VERCEL_ENV === 'production' || process.env.PROCLAIR_SAAS_ALLOW_PROVISIONING !== 'true')
        throw new DomainError('PROVISIONING_DISABLED', 'Provisioning désactivé ; worker isolé explicitement requis.', 503);
    const q = quoted(controlSchema), client = new pg.Client({ connectionString, connectionTimeoutMillis: 10000 });
    await client.connect();
    try {
        await client.query('BEGIN');
        await client.query('SET LOCAL statement_timeout = 60000');
        const { rows } = await client.query(`SELECT * FROM ${q}."SaasOrganization" WHERE id=$1 FOR UPDATE`, [organizationId]);
        const org = rows[0];
        if (!org)
            throw new DomainError('NOT_FOUND', 'Entreprise introuvable.', 404);
        tenantSchema(org.schemaName);
        const version = await tenantVersion();
        if (org.status === 'READY') {
            if (org.schemaVersion !== version)
                throw new DomainError('TENANT_MIGRATION_REQUIRED', 'Migration d’entreprise requise.', 503);
            await client.query('COMMIT');
            return { organizationId, status: 'READY', replayed: true };
        }
        if (!['PENDING', 'FAILED'].includes(org.status) || org.provisioningAttempts >= 5)
            throw new DomainError('PROVISIONING_STATE', 'Entreprise non admissible au provisioning.', 409);
        const member = await client.query(`SELECT m.id,u.name,u.email FROM ${q}."SaasMembership" m JOIN ${q}."SaasUser" u ON u.id=m."userId" WHERE m."organizationId"=$1 AND m.role='OWNER' AND m.active=true AND u.active=true`, [org.id]);
        if (member.rows.length !== 1)
            throw new DomainError('OWNER_REQUIRED', 'Propriétaire unique requis pour l’initialisation.', 409);
        await client.query(`CREATE SCHEMA ${quoted(org.schemaName)}`);
        await client.query(`SET LOCAL search_path TO ${quoted(org.schemaName)}`);
        await client.query('CREATE TABLE "_proclair_migrations" (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
        for (const m of await tenantMigrations()) {
            await client.query(m.sql);
            await client.query('INSERT INTO "_proclair_migrations" (name,checksum) VALUES ($1,$2)', [m.name, m.checksum]);
        }
        const owner = member.rows[0];
        await client.query('INSERT INTO "AppUser" (id,username,name,role,permissions,"passwordHash",active) VALUES ($1,$2,$3,\'OWNER\',$4,$5,true)', [owner.id, 'saas-owner', owner.name, presets.OWNER, hashPassword(randomBytes(32).toString('hex'))]);
        await client.query('INSERT INTO "BusinessProfile" (id,"legalName","updatedAt") VALUES (\'proclair\',$1,CURRENT_TIMESTAMP)', [org.name]);
        await client.query(`UPDATE ${q}."SaasOrganization" SET status='READY',"schemaVersion"=$2,"lastErrorCode"=NULL,"provisioningAttempts"="provisioningAttempts"+1,"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1`, [org.id, version]);
        await client.query(`INSERT INTO ${q}."SaasEvent" (id,"organizationId","actorId",action,details) VALUES ($1,$2,'provision-worker','TENANT_PROVISIONED',$3)`, [randomBytes(16).toString('hex'), org.id, JSON.stringify({ schemaVersion: version, commercialPayments: false })]);
        await client.query('COMMIT');
        return { organizationId, status: 'READY', replayed: false };
    }
    catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        if (error instanceof DomainError && ['PROVISIONING_STATE', 'TENANT_BOUNDARY', 'NOT_FOUND', 'TENANT_MIGRATION_REQUIRED'].includes(error.code))
            throw error;
        await db.saasOrganization.updateMany({ where: { id: organizationId, status: { in: ['PENDING', 'FAILED'] } }, data: { status: 'FAILED', provisioningAttempts: { increment: 1 }, lastErrorCode: 'PROVISIONING_FAILED' } });
        throw new DomainError('PROVISIONING_FAILED', 'Initialisation annulée ; reprise administrée possible.', 503);
    }
    finally {
        await client.end();
    }
}

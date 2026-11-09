import type { PrismaClient } from '@prisma/client';
import { DomainError } from '@/domain/rules';
import { providerSchema, tenantSchema } from './policy';
/** Routing primitive only. Signature validation and transport handlers remain disabled. */
export async function resolveSaasWebhookTenant(db: PrismaClient, provider: unknown, externalAccountId: string) { const p = providerSchema.parse(provider); if (!externalAccountId || externalAccountId.length > 200)
    throw new DomainError('WEBHOOK_ACCOUNT', 'Compte fournisseur invalide.', 403); const integration = await db.saasIntegration.findUnique({ where: { provider_externalAccountId: { provider: p, externalAccountId } }, include: { organization: true } }); if (!integration || integration.status !== 'VERIFIED' || integration.organization.status !== 'READY')
    throw new DomainError('WEBHOOK_NOT_VERIFIED', 'Aucun connecteur vérifié pour cet événement.', 403); tenantSchema(integration.organization.schemaName); return { organizationId: integration.organizationId, schemaName: integration.organization.schemaName }; }

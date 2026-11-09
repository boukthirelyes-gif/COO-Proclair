import { z } from 'zod';
import { DomainError } from '@/domain/rules';
export const features = ['crm', 'prospecting', 'finance', 'omega', 'automations', 'reports', 'api', 'sms', 'storage'] as const;
export const policySchema = z.object({ users: z.number().int().min(1).max(100000), customers: z.number().int().min(0).max(10000000), sms: z.number().int().min(0).max(10000000), storageBytes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), features: z.array(z.enum(features)).max(features.length) }).strict();
export type Policy = z.infer<typeof policySchema>;
export const defaultPlans = ['TRIAL', 'BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE'].map((code, index) => ({ code, name: code === 'TRIAL' ? 'Essai' : code.charAt(0) + code.slice(1).toLowerCase(), monthlyPriceCents: null, currency: 'CAD', policy: { users: [5, 5, 20, 100, 1000][index], customers: [1000, 1000, 10000, 100000, 1000000][index], sms: 0, storageBytes: 0, features: ['crm', 'prospecting', 'finance', 'omega', 'reports', 'api'] } }));
export function entitlement(subscription: {
    status: string;
    trialEndsAt: Date | null;
    plan: {
        active: boolean;
        policy: unknown;
    };
}, feature: typeof features[number], now = new Date()) {
    if (!['TRIALING', 'ACTIVE'].includes(subscription.status) || !subscription.plan.active || (subscription.status === 'TRIALING' && (!subscription.trialEndsAt || subscription.trialEndsAt <= now)))
        throw new DomainError('SUBSCRIPTION_INACTIVE', 'Essai ou abonnement inactif.', 403);
    const policy = policySchema.parse(subscription.plan.policy);
    if (!policy.features.includes(feature))
        throw new DomainError('FEATURE_NOT_INCLUDED', 'Fonction non comprise dans ce forfait.', 403);
    return policy;
}
export const providerSchema = z.enum(['STRIPE', 'TWILIO', 'MAPS', 'EMAIL', 'SIGNATURE', 'AI']);
export const settingsSchema = z.object({ name: z.string().trim().min(1).max(200), logoUrl: z.string().url().max(1000).refine(v => { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; }).nullable().optional(), primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), services: z.array(z.string().trim().min(1).max(100)).max(100), taxes: z.array(z.object({ name: z.string().min(1).max(60), rateBps: z.number().min(0).max(10000) }).strict()).max(10), timezone: z.literal('America/Toronto'), businessHours: z.record(z.string().max(100)).optional(), priceList: z.array(z.object({ service: z.string().min(1).max(100), unitPriceCents: z.number().int().min(0).max(100000000) }).strict()).max(500).optional(), contractTemplate: z.string().max(30000).optional(), invoiceTemplate: z.string().max(30000).optional(), messageTemplates: z.record(z.string().max(5000)).optional() }).strict();
export function tenantSchema(name: string) { if (!/^tenant_[a-f0-9]{32}$/.test(name))
    throw new DomainError('TENANT_BOUNDARY', 'Schéma d’entreprise non admissible.', 403); return name; }

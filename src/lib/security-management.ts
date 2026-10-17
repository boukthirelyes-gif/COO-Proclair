import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { DomainError } from '@/domain/rules';
import { requirePermission, requireCurrentAdministrator, type AccessActor } from './access';
export const bootstrapEpoch = 'bootstrap-admin';
function admin(actor: AccessActor) { requirePermission(actor, 'users'); if (actor.role !== 'ADMIN' || actor.accountRole !== 'ADMIN')
    throw new DomainError('FORBIDDEN', 'Administrateur humain requis.', 403); }
export async function revokeUserSessions(db: PrismaClient, input: unknown, actor: AccessActor) {
    const v = z.object({ userId: z.string().min(1).max(100), approved: z.literal(true) }).strict().parse(input);
    if (v.userId !== actor.id)
        admin(actor);
    return db.$transaction(async (tx) => {
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928357)`;
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928391)`;
        if(v.userId!==actor.id)await requireCurrentAdministrator(tx,actor);
        if (v.userId === 'admin')
            await tx.securitySessionEpoch.upsert({ where: { id: bootstrapEpoch }, create: { id: bootstrapEpoch, version: 1 }, update: { version: { increment: 1 } } });
        else {
            const user = await tx.appUser.findUnique({ where: { id: v.userId }, select: { id: true, role: true } });
            if (!user)
                throw new DomainError('NOT_FOUND', 'Compte introuvable.', 404);
            if (user.role === 'OWNER' && v.userId !== actor.id && actor.id !== 'admin' && actor.businessRole !== 'OWNER')
                throw new DomainError('FORBIDDEN', 'Seul un propriétaire peut révoquer ce compte.', 403);
            await tx.appUser.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
        }
        await tx.auditEvent.create({ data: { actorId: actor.id, actorRole: actor.accountRole, action: 'SESSIONS_REVOKED', entityType: 'AppUser', entityId: v.userId, after: { scope: 'ALL_DEVICES' } } });
        return { revoked: true, scope: 'ALL_DEVICES', userId: v.userId };
    });
}
export async function recordLogin(db: PrismaClient, identity: string, actor: AccessActor | null) { await db.auditEvent.create({ data: { actorId: actor?.id ?? 'authentication', actorRole: actor?.accountRole ?? 'ANONYMOUS', action: actor ? 'LOGIN_SUCCEEDED' : 'LOGIN_FAILED', entityType: 'Authentication', entityId: actor?.id ?? createHash('sha256').update(identity).digest('hex'), after: { success: Boolean(actor) } } }); }
export async function securityOverview(db: PrismaClient, actor: AccessActor) {
    admin(actor);
    return db.$transaction(async (tx) => {
        const [activeUsers, inactiveUsers, events, failedLogins, failedJobs, mfaEnabledAccounts, pendingInvitations] = await Promise.all([tx.appUser.count({ where: { active: true } }), tx.appUser.count({ where: { active: false } }), tx.auditEvent.findMany({ where: { action: { in: ['LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'SESSIONS_REVOKED', 'USER_CREATED', 'USER_UPDATED', 'MFA_ENABLED', 'MFA_DISABLED', 'MFA_RECOVERY_USED', 'MFA_RATE_BLOCKED', 'USER_INVITATION_ISSUED', 'USER_INVITATION_ACCEPTED', 'USER_INVITATION_REVOKED'] } }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, action: true, actorId: true, entityId: true, createdAt: true } }), tx.auditEvent.count({ where: { action: 'LOGIN_FAILED', createdAt: { gte: new Date(Date.now() - 86400000) } } }), tx.workerJob.count({ where: { status: 'DEAD_LETTER' } }), tx.accountMfa.count({ where: { enabled: true } }), tx.userInvitation.count({ where: { usedAt: null, revokedAt: null, expiresAt: { gt: new Date() }, user: { active: false } } })]);
        return { viewerId: actor.id, generatedAt: new Date().toISOString(), database: 'QUERY_VERIFIED', activeUsers, inactiveUsers, failedLoginsLast24h: failedLogins, failedJobs, events, activeSessions: null, mfa: 'OPTIONAL_TOTP', mfaEnabledAccounts, pendingInvitations, backups: 'NOT_VERIFIED', restoration: 'NOT_VERIFIED', privacyCompliance: 'REQUIRES_ORGANIZATIONAL_REVIEW' };
    });
}

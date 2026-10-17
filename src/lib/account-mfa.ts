import { randomBytes } from 'node:crypto';
import type { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { DomainError } from '@/domain/rules';
import { checkPassword } from './auth';
import { verifyPassword, type AccessActor } from './access';
import { base32, encryptMfa, decryptMfa, matchedStep, recoveryDigest } from './totp';
import { bootstrapEpoch } from './security-management';
import { takeLoginAttempt } from './production-auth';
async function validPassword(db: PrismaClient, actor: AccessActor, password: string) { if (actor.id === 'admin')
    return checkPassword(password); const row = await db.appUser.findUnique({ where: { id: actor.id } }); return Boolean(row?.active && row.sessionVersion === actor.sessionVersion && verifyPassword(password, row.passwordHash)); }
async function revoke(tx: Prisma.TransactionClient, actor: AccessActor) { if (actor.id === 'admin')
    await tx.securitySessionEpoch.upsert({ where: { id: bootstrapEpoch }, create: { id: bootstrapEpoch, version: 1 }, update: { version: { increment: 1 } } });
else
    await tx.appUser.update({ where: { id: actor.id }, data: { sessionVersion: { increment: 1 } } }); }
async function currentActor(tx: Prisma.TransactionClient, actor: AccessActor) {
    if (actor.id === 'admin') {
        const epoch = await tx.securitySessionEpoch.findUnique({ where: { id: bootstrapEpoch } });
        if ((epoch?.version ?? 0) !== actor.sessionVersion)
            throw new DomainError('SESSION_REVOKED', 'Session révoquée.', 401);
    }
    else {
        const user = await tx.appUser.findUnique({ where: { id: actor.id }, select: { active: true, sessionVersion: true } });
        if (!user?.active || user.sessionVersion !== actor.sessionVersion)
            throw new DomainError('SESSION_REVOKED', 'Session révoquée.', 401);
    }
}
async function consumeFactor(tx: Prisma.TransactionClient, row: {
    actorId: string;
    encryptedSecret: string;
    recoveryHashes: string[];
    lastStep: number;
    failedAttempts: number;
    blockedUntil: Date | null;
}, code: unknown, now: number) {
    if (typeof code !== 'string' || !code.trim() || code.length > 80)
        return false;
    const actorId = row.actorId, index = row.recoveryHashes.indexOf(recoveryDigest(actorId, code));
    if (index >= 0) {
        await tx.accountMfa.update({ where: { actorId }, data: { recoveryHashes: row.recoveryHashes.filter((_, i) => i !== index), failedAttempts: 0, blockedUntil: null } });
        await tx.auditEvent.create({ data: { actorId, actorRole: 'ACCOUNT', action: 'MFA_RECOVERY_USED', entityType: 'AccountMfa', entityId: actorId, after: { remaining: row.recoveryHashes.length - 1 } } });
        return true;
    }
    if (row.blockedUntil && row.blockedUntil.getTime() > now)
        return false;
    const step = matchedStep(decryptMfa(row.encryptedSecret, actorId), code.trim(), now, row.lastStep);
    if (step !== null) {
        await tx.accountMfa.update({ where: { actorId }, data: { lastStep: step, failedAttempts: 0, blockedUntil: null } });
        return true;
    }
    const attempts = row.blockedUntil ? 1 : row.failedAttempts + 1, blockedUntil = attempts >= 5 ? new Date(now + 15 * 60000) : null;
    await tx.accountMfa.update({ where: { actorId }, data: { failedAttempts: attempts, blockedUntil } });
    if (blockedUntil)
        await tx.auditEvent.create({ data: { actorId, actorRole: 'ACCOUNT', action: 'MFA_RATE_BLOCKED', entityType: 'AccountMfa', entityId: actorId, after: { blockedUntil: blockedUntil.toISOString() } } });
    return false;
}
/** Called only after password verification. Successes and failures persist atomically. */
export async function verifyAccountMfa(db: PrismaClient, actorId: string, code: unknown, now = Date.now()) {
    return db.$transaction(async (tx) => { await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928393)`; const row = await tx.accountMfa.findUnique({ where: { actorId } }); return row?.enabled ? consumeFactor(tx, row, code, now) : true; });
}
export class AccountMfaService {
    constructor(private db: PrismaClient, private now: () => number = () => Date.now()) { }
    async status(actor: AccessActor) { const row = await this.db.accountMfa.findUnique({ where: { actorId: actor.id }, select: { enabled: true, recoveryHashes: true, blockedUntil: true } }); return { enabled: row?.enabled ?? false, recoveryCodesRemaining: row?.recoveryHashes.length ?? 0, blockedUntil: row?.blockedUntil ?? null, policy: 'OPTIONAL', method: 'TOTP', sessionScopeOnChange: 'ALL_DEVICES' }; }
    private async proof(input: unknown, actor: AccessActor) { const v = z.object({ password: z.string().min(1).max(256) }).strict().parse(input); if (!await takeLoginAttempt(this.db, this.now(), 'mfa-password:' + actor.id))
        throw new DomainError('RATE_LIMIT', 'Réessayez dans une minute.', 429); if (!await validPassword(this.db, actor, v.password))
        throw new DomainError('INVALID_CREDENTIALS', 'Vérification du mot de passe refusée.', 403); }
    async begin(input: unknown, actor: AccessActor) { await this.proof(input, actor); return this.db.$transaction(async (tx) => { await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928357)`; await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928393)`; await currentActor(tx, actor); const before = await tx.accountMfa.findUnique({ where: { actorId: actor.id } }); if (before?.enabled)
        throw new DomainError('MFA_ALREADY_ENABLED', 'Désactivez la MFA avec un code valide avant tout nouvel enrôlement.', 409); const secret = base32(randomBytes(20)); await tx.accountMfa.upsert({ where: { actorId: actor.id }, create: { actorId: actor.id, encryptedSecret: encryptMfa(secret, actor.id), createdAt: new Date(this.now()) }, update: { encryptedSecret: encryptMfa(secret, actor.id), createdAt: new Date(this.now()), lastStep: -1, recoveryHashes: [], failedAttempts: 0, blockedUntil: null } }); return { secret, expiresInSeconds: 600, issuer: 'Proclair', algorithm: 'SHA1', digits: 6, periodSeconds: 30 }; }); }
    async confirm(input: unknown, actor: AccessActor) {
        const v = z.object({ code: z.string().regex(/^\d{6}$/) }).strict().parse(input);
        if (!await takeLoginAttempt(this.db, this.now(), 'mfa-confirm:' + actor.id))
            throw new DomainError('RATE_LIMIT', 'Réessayez dans une minute.', 429);
        return this.db.$transaction(async (tx) => { await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928357)`; await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928393)`; await currentActor(tx, actor); const row = await tx.accountMfa.findUnique({ where: { actorId: actor.id } }); if (!row || row.enabled || this.now() - row.createdAt.getTime() > 600000)
            throw new DomainError('MFA_ENROLLMENT_EXPIRED', 'Enrôlement absent, terminé ou expiré.', 409); const step = matchedStep(decryptMfa(row.encryptedSecret, actor.id), v.code, this.now()); if (step === null)
            throw new DomainError('MFA_INVALID', 'Code MFA invalide.', 403); const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(10).toString('hex').toUpperCase()); await tx.accountMfa.update({ where: { actorId: actor.id }, data: { enabled: true, lastStep: step, failedAttempts: 0, blockedUntil: null, recoveryHashes: recoveryCodes.map(code => recoveryDigest(actor.id, code)) } }); await revoke(tx, actor); await tx.auditEvent.create({ data: { actorId: actor.id, actorRole: actor.accountRole, action: 'MFA_ENABLED', entityType: 'AccountMfa', entityId: actor.id, after: { enabled: true } } }); return { enabled: true, recoveryCodes, reconnectRequired: true }; });
    }
    async disable(input: unknown, actor: AccessActor) {
        const v = z.object({ password: z.string().min(1).max(256), code: z.string().min(6).max(80), approved: z.literal(true) }).strict().parse(input);
        await this.proof({ password: v.password }, actor);
        const result = await this.db.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928357)`;
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928393)`;
            await currentActor(tx, actor);
            const row = await tx.accountMfa.findUnique({ where: { actorId: actor.id } });
            if (!row?.enabled)
                throw new DomainError('MFA_NOT_ENABLED', 'MFA inactive.', 409);
            if (!await consumeFactor(tx, row, v.code, this.now()))
                return { invalid: true as const };
            await tx.accountMfa.delete({ where: { actorId: actor.id } });
            await revoke(tx, actor);
            await tx.auditEvent.create({ data: { actorId: actor.id, actorRole: actor.accountRole, action: 'MFA_DISABLED', entityType: 'AccountMfa', entityId: actor.id, after: { enabled: false } } });
            return { enabled: false, reconnectRequired: true };
        });
        if ('invalid' in result)
            throw new DomainError('MFA_INVALID', 'Code MFA ou code de secours invalide ou temporairement bloqué.', 403);
        return result;
    }
}

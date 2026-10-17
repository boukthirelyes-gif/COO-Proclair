import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { DomainError } from '@/domain/rules';
import { publicUserSelect, userFields, hashPassword, requirePermission, requireCurrentAdministrator, type AccessActor } from './access';
import { takeLoginAttempt } from './production-auth';
function admin(actor: AccessActor) { requirePermission(actor, 'users'); if (actor.role !== 'ADMIN' || actor.accountRole !== 'ADMIN')
    throw new DomainError('FORBIDDEN', 'Administrateur humain requis.', 403); }
function owner(role: string, actor: AccessActor) { if (role === 'OWNER' && actor.id !== 'admin' && actor.businessRole !== 'OWNER')
    throw new DomainError('FORBIDDEN', 'Gestion des propriétaires réservée au propriétaire.', 403); }
export class UserInvitations {
    constructor(private db: PrismaClient, private now: () => Date = () => new Date()) { }
    private async issueRow(tx: Prisma.TransactionClient, user: {
        id: string;
        version: number;
    }, actor: AccessActor, now: Date) {
        await tx.userInvitation.updateMany({ where: { userId: user.id, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
        const token = randomBytes(32).toString('base64url'), expiresAt = new Date(now.getTime() + 72 * 3600000), row = await tx.userInvitation.create({ data: { userId: user.id, userVersion: user.version, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt, createdBy: actor.id } });
        await tx.auditEvent.create({ data: { actorId: actor.id, actorRole: actor.accountRole, action: 'USER_INVITATION_ISSUED', entityType: 'AppUser', entityId: user.id, after: { invitationId: row.id, expiresAt: expiresAt.toISOString(), delivery: 'MANUAL_SECURE_CHANNEL' } } });
        return { id: row.id, path: '/invite#token=' + token, expiresAt, delivery: 'NOT_SENT' };
    }
    async create(input: unknown, actor: AccessActor) {
        admin(actor);
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['username', 'name', 'role', 'permissions', 'technicianId'].includes(k)))
            throw new DomainError('INVALID_INPUT', 'Champs d’invitation invalides.', 422);
        const fields = userFields.parse({ ...input, active: false });
        owner(fields.role, actor);
        return this.db.$transaction(async (tx) => { await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928357)`; await requireCurrentAdministrator(tx, actor); const user = await tx.appUser.create({ data: { ...fields, passwordHash: hashPassword(randomBytes(32).toString('hex')) }, select: publicUserSelect }); await tx.auditEvent.create({ data: { actorId: actor.id, actorRole: actor.accountRole, action: 'USER_CREATED', entityType: 'AppUser', entityId: user.id, after: JSON.parse(JSON.stringify(user)) } }); const invitation = await this.issueRow(tx, user, actor, this.now()); return { user, invitation }; });
    }
    async issue(input: unknown, actor: AccessActor) {
        admin(actor);
        const v = z.object({ userId: z.string().min(1).max(100), expectedVersion: z.number().int().positive(), approved: z.literal(true) }).strict().parse(input), now = this.now();
        return this.db.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928357)`;
            await requireCurrentAdministrator(tx, actor);
            const user = await tx.appUser.findUnique({ where: { id: v.userId }, select: { id: true, role: true, active: true, version: true } });
            if (!user)
                throw new DomainError('NOT_FOUND', 'Compte introuvable.', 404);
            owner(user.role, actor);
            if (user.active || user.version !== v.expectedVersion)
                throw new DomainError('INVITATION_STATE', 'Compte inactif et version actuelle requis.', 409);
            return this.issueRow(tx, user, actor, now);
        });
    }
    async revoke(input: unknown, actor: AccessActor) { admin(actor); const v = z.object({ id: z.string().min(1).max(100), approved: z.literal(true) }).strict().parse(input); return this.db.$transaction(async (tx) => { await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928357)`; await requireCurrentAdministrator(tx, actor); const row = await tx.userInvitation.findUnique({ where: { id: v.id }, include: { user: { select: { role: true } } } }); if (!row)
        throw new DomainError('NOT_FOUND', 'Invitation introuvable.', 404); owner(row.user.role, actor); if (row.usedAt)
        throw new DomainError('INVITATION_USED', 'Compte déjà activé ; désactivez-le si nécessaire.', 409); await tx.userInvitation.update({ where: { id: row.id }, data: { revokedAt: this.now() } }); await tx.auditEvent.create({ data: { actorId: actor.id, actorRole: actor.accountRole, action: 'USER_INVITATION_REVOKED', entityType: 'AppUser', entityId: row.userId, after: { invitationId: row.id } } }); return { revoked: true }; }); }
    async accept(input: unknown) {
        const v = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password: z.string().min(12).max(256) }).strict().parse(input), tokenHash = createHash('sha256').update(v.token).digest('hex');
        if (!await this.db.userInvitation.findUnique({ where: { tokenHash }, select: { id: true } }))
            throw new DomainError('INVITATION_INVALID', 'Invitation invalide, utilisée, modifiée ou expirée.', 410);
        if (!await takeLoginAttempt(this.db, this.now().getTime(), 'invitation:' + tokenHash))
            throw new DomainError('RATE_LIMIT', 'Réessayez dans une minute.', 429);
        return this.db.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928357)`;
            const row = await tx.userInvitation.findUnique({ where: { tokenHash }, include: { user: { select: { active: true, version: true, username: true, role: true } } } });
            if (!row || row.usedAt || row.revokedAt || row.expiresAt <= this.now() || row.user.active || row.user.version !== row.userVersion)
                throw new DomainError('INVITATION_INVALID', 'Invitation invalide, utilisée, modifiée ou expirée.', 410);
            await tx.appUser.update({ where: { id: row.userId, version: row.userVersion }, data: { active: true, passwordHash: hashPassword(v.password), version: { increment: 1 }, sessionVersion: { increment: 1 } } });
            await tx.userInvitation.update({ where: { id: row.id }, data: { usedAt: this.now() } });
            await tx.auditEvent.create({ data: { actorId: row.userId, actorRole: row.user.role, action: 'USER_INVITATION_ACCEPTED', entityType: 'AppUser', entityId: row.userId, after: { invitationId: row.id, activated: true } } });
            return { activated: true, username: row.user.username, reconnectRequired: true };
        });
    }
}

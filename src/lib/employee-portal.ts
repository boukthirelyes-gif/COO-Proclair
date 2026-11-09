import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { dayBounds, DomainError } from '@/domain/rules';
import { requirePermission, type AccessActor } from './access';
const select = { id: true, version: true, status: true, service: true, startsAt: true, endsAt: true, durationMinutes: true, technicianInstructions: true, customer: { select: { name: true } }, property: { select: { address: true } } } as const;
export class EmployeePortal {
    constructor(private db: PrismaClient) { }
    private async technician(actor: AccessActor) { requirePermission(actor, 'employee.self'); const user = await this.db.appUser.findUnique({ where: { id: actor.id }, select: { active: true, sessionVersion: true, technicianId: true, technician: { select: { active: true } } } }); if (!user?.active || user.sessionVersion !== actor.sessionVersion || !user.technicianId || !user.technician?.active)
        throw new DomainError('EMPLOYEE_NOT_ASSIGNED', 'Aucun technicien actif lié à ce compte.', 403); return user.technicianId; }
    async visits(input: unknown, actor: AccessActor) { const v = z.object({ date: z.string() }).strict().parse(input), bounds = dayBounds(v.date), technicianId = await this.technician(actor); const where = { technicianId, startsAt: { gte: bounds.start, lt: bounds.end } }; return this.db.$transaction(async (tx) => ({ date: v.date, timezone: 'America/Toronto', total: await tx.visit.count({ where }), visits: await tx.visit.findMany({ where, select, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], take: 100 }), limit: 100 }), { isolationLevel: 'RepeatableRead' }); }
    async start(id: string, input: unknown, actor: AccessActor) {
        const v = z.object({ expectedVersion: z.number().int().positive(), approved: z.literal(true) }).strict().parse(input);
        requirePermission(actor, 'employee.self');
        return this.db.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928357)`;
            const user = await tx.appUser.findUnique({ where: { id: actor.id }, select: { active: true, sessionVersion: true, technicianId: true, technician: { select: { active: true } } } });
            if (!user?.active || user.sessionVersion !== actor.sessionVersion || !user.technicianId || !user.technician?.active)
                throw new DomainError('EMPLOYEE_NOT_ASSIGNED', 'Accès technicien absent ou révoqué.', 403);
            const before = await tx.visit.findFirst({ where: { id, technicianId: user.technicianId }, select });
            if (!before)
                throw new DomainError('NOT_FOUND', 'Intervention introuvable.', 404);
            if (before.status === 'IN_PROGRESS' && before.version === v.expectedVersion + 1)
                return before;
            if (before.version !== v.expectedVersion)
                throw new DomainError('VERSION_CONFLICT', 'Intervention modifiée.', 409);
            if (before.status !== 'SCHEDULED' || !before.startsAt || !before.endsAt)
                throw new DomainError('INVALID_TRANSITION', 'Intervention planifiée requise.', 409);
            const row = await tx.visit.update({ where: { id, version: v.expectedVersion }, data: { status: 'IN_PROGRESS', version: { increment: 1 } }, select });
            await tx.auditEvent.create({ data: { actorId: actor.id, actorRole: actor.accountRole, action: 'EMPLOYEE_VISIT_STARTED', entityType: 'Visit', entityId: id, after: { status: 'IN_PROGRESS' } } });
            return row;
        });
    }
    async complete(id: string, input: unknown, actor: AccessActor) {
        const v = z.object({ expectedVersion: z.number().int().positive(), actualDurationMinutes: z.number().int().min(1).max(540), approved: z.literal(true) }).strict().parse(input);
        requirePermission(actor, 'employee.self');
        return this.db.$transaction(async (tx) => {
            // Shared with UserService changes: recheck binding, activation and epoch inside mutation.
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(714928357)`;
            const user = await tx.appUser.findUnique({ where: { id: actor.id }, select: { active: true, sessionVersion: true, technicianId: true, technician: { select: { active: true } } } });
            if (!user?.active || user.sessionVersion !== actor.sessionVersion || !user.technicianId || !user.technician?.active)
                throw new DomainError('EMPLOYEE_NOT_ASSIGNED', 'Accès technicien révoqué ou absent.', 403);
            const before = await tx.visit.findFirst({ where: { id, technicianId: user.technicianId }, select: { ...select, actualDurationMinutes: true } });
            if (!before)
                throw new DomainError('NOT_FOUND', 'Intervention introuvable.', 404);
            if (before.status === 'COMPLETED' && before.version === v.expectedVersion + 1 && before.actualDurationMinutes === v.actualDurationMinutes)
                return before;
            if (before.version !== v.expectedVersion)
                throw new DomainError('VERSION_CONFLICT', 'Intervention modifiée. Actualisez.', 409);
            if (before.status !== 'IN_PROGRESS' || !before.startsAt || !before.endsAt)
                throw new DomainError('INVALID_TRANSITION', 'Seule une intervention en cours et planifiée peut être terminée.', 409);
            const row = await tx.visit.update({ where: { id, version: v.expectedVersion }, data: { status: 'COMPLETED', actualDurationMinutes: v.actualDurationMinutes, version: { increment: 1 } }, select });
            await tx.auditEvent.create({ data: { actorId: actor.id, actorRole: actor.accountRole, action: 'EMPLOYEE_VISIT_COMPLETED', entityType: 'Visit', entityId: id, after: { status: 'COMPLETED', actualDurationMinutes: v.actualDurationMinutes } } });
            return row;
        });
    }
}

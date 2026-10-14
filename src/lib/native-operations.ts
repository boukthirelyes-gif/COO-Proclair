/**
 * Native Proclair operations board. No Rotor, Stripe or Twilio dependency:
 * all inputs come from the authenticated Proclair CRM state.
 */
export type NativeVisit = {
  id: string;
  customerId?: string | null;
  technicianId?: string | null;
  service?: string | null;
  status: string;
  startsAt?: string | Date | null;
  createdAt?: string | Date | null;
};
export type NativeTechnician = {
  id: string;
  name: string;
  active?: boolean;
  dailyTarget?: number;
  fridayTarget?: number;
};
const closed = new Set(['CANCELLED', 'COMPLETED']);
const needsAttention = new Set(['FAILED', 'NO_ACCESS', 'NEEDS_FOLLOWUP']);
const priority: Record<string, number> = {
  NEEDS_FOLLOWUP: 0, FAILED: 1, NO_ACCESS: 2,
  CONFIRMED: 3, RESCHEDULED: 4, PROPOSED: 5, PENDING: 6,
};
const calendarDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  weekday: 'short',
});
function localParts(input: Date) {
  const values: Record<string, string> = {};
  for (const part of calendarDay.formatToParts(input)) values[part.type] = part.value;
  return {date: values.year + '-' + values.month + '-' + values.day, weekday: values.weekday};
}
function safeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
export function summarizeNativeOperations(
  visits: NativeVisit[],
  technicians: NativeTechnician[],
  now: Date = new Date(),
) {
  const {date: today, weekday} = localParts(now);
  const active = visits.filter(visit => !closed.has(visit.status));
  const unscheduled = active.filter(visit => !safeDate(visit.startsAt)).sort((a, b) =>
    (priority[a.status] ?? 10) - (priority[b.status] ?? 10) || a.id.localeCompare(b.id));
  const followups = visits.filter(visit => needsAttention.has(visit.status));
  const todayVisits = visits.filter(visit => {
    const start = safeDate(visit.startsAt);
    return start !== null && localParts(start).date === today && visit.status !== 'CANCELLED';
  });
  const scheduledNext = active.filter(visit => {
    const start = safeDate(visit.startsAt);
    return start !== null && start.getTime() >= now.getTime();
  }).sort((a, b) => safeDate(a.startsAt)!.getTime() - safeDate(b.startsAt)!.getTime());
  const capacities = technicians.filter(tech => tech.active !== false).map(tech => {
    const configured = weekday === 'Fri' ? tech.fridayTarget : tech.dailyTarget;
    const target = Number.isInteger(configured) && configured! >= 0
      ? configured! : weekday === 'Fri' ? 2 : 4;
    const assigned = todayVisits.filter(visit => visit.technicianId === tech.id).length;
    return {id: tech.id, name: tech.name, target, assigned, remaining: Math.max(0, target - assigned)};
  });
  return {
    today,
    weekday,
    total: visits.length,
    todayVisits,
    unscheduled,
    followups,
    scheduledNext,
    capacities,
    completedToday: todayVisits.filter(visit => visit.status === 'COMPLETED').length,
  };
}

import {DomainError} from '@/domain/rules';
import {rotorBusinessRead} from './rotor';
import type {PrismaClient} from '@prisma/client';
import {RotorCapabilityRegistry} from './rotor-capabilities';
import {validateRotorSchema} from './rotor-map';

export type RotorLiveKind = 'payments' | 'sms' | 'invoices';
type RecordRow = Record<string, unknown>;

function object(value: unknown): RecordRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordRow : {};
}
function string(value: unknown, maximum = 200): string {
  return typeof value === 'string' ? value.slice(0, maximum) : '';
}
function cents(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function customerName(value: unknown): string {
  const customer = object(value);
  return [string(customer.first_name), string(customer.last_name)].filter(Boolean).join(' ').trim()
    || string(customer.company_name) || 'Client Rotor';
}

/**
 * Select only necessary operational fields. A Rotor result is never transformed
 * into a native Proclair payment, invoice or message, avoiding duplicate charges.
 */
export function normalizeRotorLivePage(kind: RotorLiveKind, raw: unknown, page: number, limit: number) {
  const response = object(raw), pagination = object(response.pagination);
  if (!Array.isArray(response.data) || response.data.length > limit
    || typeof pagination.has_more !== 'boolean'
    || (pagination.page !== undefined && pagination.page !== page)
    || (pagination.has_more && response.data.length === 0)) {
    throw new DomainError('ROTOR_PROTOCOL', 'Réponse Rotor invalide ou pagination incomplète.', 502);
  }
  const total = typeof pagination.total === 'number' && Number.isSafeInteger(pagination.total) && pagination.total >= 0
    ? pagination.total : null;
  const rows = response.data.map((item: unknown) => {
    const r = object(item);
    if (!string(r.id, 100)) throw new DomainError('ROTOR_PROTOCOL', 'Référence Rotor manquante.', 502);
    if (kind === 'payments') {
      return {
        id: string(r.id, 100), date: string(r.payment_date || r.created_at, 80),
        status: string(r.status, 40), amountCents: cents(r.total_amount_cents),
        currency: string(r.currency, 8), method: string(r.payment_method, 80),
        customer: customerName(r.customer), reference: string(object(r.invoice).invoice_number, 100),
      };
    }
    if (kind === 'sms') {
      return {
        id: string(r.id, 100), date: string(r.created_at, 80),
        status: string(r.status, 40), direction: string(r.direction, 20),
        phone: string(r.contact_phone, 40), content: string(r.content, 2000),
      };
    }
    return {
      id: string(r.id, 100), date: string(r.created_at, 80),
      status: string(r.status, 40), amountCents: cents(r.total_cents),
      currency: string(r.currency, 8), customer: customerName(r.customer),
      reference: string(r.invoice_number, 100),
    };
  });
  if (new Set(rows.map(row=>row.id)).size !== rows.length) throw new DomainError('ROTOR_PROTOCOL','Références Rotor dupliquées.',502);
  return {source: 'ROTOR', mode: 'READ_ONLY_LIVE', kind, page, limit, total, hasMore: pagination.has_more, rows};
}

export async function rotorLivePage(kind: RotorLiveKind, page = 1, limit = 25, db?:PrismaClient) {
  if (!['payments', 'sms', 'invoices'].includes(kind)
    || !Number.isSafeInteger(page) || page < 1 || page > 2000
    || !Number.isSafeInteger(limit) || limit < 1 || limit > 25) {
    throw new DomainError('ROTOR_PAGE', 'Pagination ou catégorie Rotor non autorisée.', 400);
  }
  const tool = kind === 'payments' ? 'list_payments'
    : kind === 'sms' ? 'list_messages' : 'list_invoices';
  const args={...(kind === 'sms' ? {channel: 'sms'} : {}), page, limit};
  const schema=db?await new RotorCapabilityRegistry(db).schema(tool):null;
  if(schema)validateRotorSchema(schema.inputSchema,args);
  const raw = await rotorBusinessRead(tool, args);
  if(schema?.outputSchema)validateRotorSchema(schema.outputSchema,raw);
  return normalizeRotorLivePage(kind, raw, page, limit);
}

import {Prisma,type PrismaClient} from '@prisma/client';
import {DomainError} from '../domain/rules';
import {requirePermission,type AccessActor} from './access';
function exact(value:bigint|number){const result=Number(value);if(!Number.isSafeInteger(result))throw new DomainError('AMOUNT_OVERFLOW','La synthèse dépasse les montants représentables en centimes.',422);return result;}
/** Aggregate native CAD ledger in PostgreSQL without loading invoice/customer bodies. */
export async function dashboardMetrics(db:PrismaClient,actor:AccessActor,schema='public'){
 requirePermission(actor,'crm.read');if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))throw new DomainError('INVALID_SCHEMA','Configuration de stockage invalide.',500);
 const table=(name:string)=>Prisma.raw(`"${schema}"."${name}"`);
 return db.$transaction(async tx=>{
  const [customers,activeContracts]=await Promise.all([tx.customer.count(),tx.contract.count({where:{active:true}})]);
  if(!actor.permissions.includes('finance'))return {customers,activeContracts,finance:null};
  const [totals]=await tx.$queryRaw<{issued:bigint;paid:bigint;outstanding:bigint;unpaid:bigint;excluded:bigint}[]>(Prisma.sql`
   WITH paid AS (
    SELECT p."invoiceId",SUM(p."amountCents"::bigint-COALESCE((SELECT SUM(f."amountCents"::bigint) FROM ${table('StripeRefund')} f WHERE f."paymentId"=p.id AND f.status='SUCCEEDED'),0)) AS cents FROM ${table('Payment')} p
    WHERE p.mode='LIVE' AND NOT EXISTS(SELECT 1 FROM ${table('PaymentReversal')} r WHERE r."paymentId"=p."id") GROUP BY p."invoiceId"
   ), invoices AS (
    SELECT i."currency",i."totalCents"::bigint AS total,COALESCE(p.cents,0) AS paid
    FROM ${table('Invoice')} i LEFT JOIN paid p ON p."invoiceId"=i."id" WHERE i."paymentMode"='LIVE' AND i."status" NOT IN ('DRAFT','VOID')
   ) SELECT COALESCE(SUM(total) FILTER(WHERE "currency"='CAD'),0)::bigint AS issued,
    COALESCE(SUM(paid) FILTER(WHERE "currency"='CAD'),0)::bigint AS paid,
    COALESCE(SUM(GREATEST(total-paid,0)) FILTER(WHERE "currency"='CAD'),0)::bigint AS outstanding,
    COUNT(*) FILTER(WHERE "currency"='CAD' AND total>paid)::bigint AS unpaid,
    COUNT(*) FILTER(WHERE "currency"<>'CAD')::bigint AS excluded FROM invoices
  `);
  const daily=await tx.$queryRaw<{date:string;cents:bigint}[]>(Prisma.sql`
   WITH movements AS (
    SELECT to_char(p."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Toronto','YYYY-MM-DD') AS date,p."amountCents"::bigint AS cents
    FROM ${table('Payment')} p JOIN ${table('Invoice')} i ON i."id"=p."invoiceId" WHERE i."currency"='CAD' AND i."paymentMode"='LIVE'
    UNION ALL
    SELECT to_char(r."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Toronto','YYYY-MM-DD') AS date,-p."amountCents"::bigint AS cents
    FROM ${table('PaymentReversal')} r JOIN ${table('Payment')} p ON p."id"=r."paymentId" JOIN ${table('Invoice')} i ON i."id"=p."invoiceId" WHERE i."currency"='CAD' AND i."paymentMode"='LIVE'
    UNION ALL
    SELECT to_char(r."updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Toronto','YYYY-MM-DD') AS date,-r."amountCents"::bigint AS cents FROM ${table('StripeRefund')} r JOIN ${table('Payment')} p ON p.id=r."paymentId" JOIN ${table('Invoice')} i ON i.id=p."invoiceId" WHERE r.status='SUCCEEDED' AND r.mode='LIVE' AND i.currency='CAD'
   ) SELECT date,SUM(cents)::bigint AS cents FROM movements GROUP BY date ORDER BY date DESC LIMIT 14
  `);
  return {customers,activeContracts,finance:{receivedCents:exact(totals.paid),issuedCents:exact(totals.issued),outstandingCents:exact(totals.outstanding),unpaidCount:exact(totals.unpaid),excludedCurrencyCount:exact(totals.excluded),daily:daily.reverse().map(row=>({date:row.date,cents:exact(row.cents)})),recording:'MANUAL_LEDGER',currency:'CAD'}};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

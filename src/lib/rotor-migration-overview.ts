import {Prisma,type PrismaClient} from '@prisma/client';
import {requirePermission,type AccessActor} from './access';
import {DomainError} from '@/domain/rules';
const count=(value:string)=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw new DomainError('COUNT_TOO_LARGE','Ce volume nécessite un rapport dédié.',413);return n};
export async function rotorMigrationOverview(db:PrismaClient,actor:AccessActor,schema='public'){
 requirePermission(actor,'integrations');
 if(!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(schema))throw new DomainError('INVALID_SCHEMA','Schéma du rapport invalide.',400);
 const table=(name:string)=>Prisma.raw('"'+schema+'"."'+name+'"');
 return db.$transaction(async tx=>{
  const [clients]=await tx.$queryRaw<Array<{staged:string;linked:string;pending:string;conflicts:string}>>`
   SELECT count(*)::text AS staged,
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ${table('RotorCustomerMapping')} m WHERE m."externalId"=r."externalId"))::text AS linked,
    count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM ${table('RotorCustomerMapping')} m WHERE m."externalId"=r."externalId"))::text AS pending,
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ${table('RotorCustomerMapping')} m WHERE m."externalId"=r."externalId" AND (m."syncStatus"='SOURCE_CHANGED' OR m."sourceHash" IS DISTINCT FROM r."contentHash")))::text AS conflicts
   FROM ${table('RotorMirrorRecord')} r WHERE r.kind='CUSTOMER'`;
  const runs=await tx.rotorImportRun.groupBy({by:['status'],_count:{_all:true}});
  const financial=actor.permissions.includes('finance')?await tx.$queryRaw<Array<{kind:string;total:string;unmatched:string;missingCustomer:string;missingInvoice:string}>>`
   SELECT a.kind,count(*)::text AS total,
    count(*) FILTER (WHERE a."customerExternalId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${table('RotorCustomerMapping')} m WHERE m."externalId"=a."customerExternalId") AND NOT EXISTS (SELECT 1 FROM ${table('Customer')} c WHERE c."rotorExternalId"=a."customerExternalId"))::text AS unmatched,
    count(*) FILTER (WHERE a."customerExternalId" IS NULL)::text AS "missingCustomer",
    count(*) FILTER (WHERE a.kind='PAYMENT' AND a."invoiceExternalId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${table('RotorFinancialArchive')} i WHERE i.kind='INVOICE' AND i."externalId"=a."invoiceExternalId"))::text AS "missingInvoice"
   FROM ${table('RotorFinancialArchive')} a GROUP BY a.kind`:null;
  return {scope:'STORED_DATA_ONLY',transferComplete:false,generatedAt:new Date().toISOString(),customers:{staged:count(clients.staged),linked:count(clients.linked),pendingReview:count(clients.pending),sourceConflicts:count(clients.conflicts)},runs:Object.fromEntries(runs.map(r=>[r.status,r._count._all])),financial:financial?Object.fromEntries(['INVOICE','PAYMENT'].map(kind=>{const row=financial.find(r=>r.kind===kind);return [kind,row?{total:count(row.total),unmatchedCustomers:count(row.unmatched),missingCustomerReference:count(row.missingCustomer),missingInvoice:count(row.missingInvoice)}:{total:0,unmatchedCustomers:0,missingCustomerReference:0,missingInvoice:0}]})):null};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

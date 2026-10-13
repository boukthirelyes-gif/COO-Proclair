import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {requirePermission,type AccessActor} from './access';
import {DomainError} from '@/domain/rules';
const query=z.object({after:z.string().max(128).default(''),search:z.string().trim().max(200).default(''),status:z.enum(['ALL','PENDING','LINKED','SOURCE_CHANGED']).default('ALL')}).strict();
export async function rotorCustomerReviewList(db:PrismaClient,runId:string,input:unknown,actor:AccessActor,schema='public'){
 requirePermission(actor,'integrations');const v=query.parse(input);if(!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(schema))throw new DomainError('INVALID_SCHEMA','Schéma du rapport invalide.',400);
 const table=(name:string)=>Prisma.raw('"'+schema+'"."'+name+'"');
 const state=Prisma.sql`CASE WHEN r."contentHash" IS DISTINCT FROM i."contentHash" OR (m."externalId" IS NOT NULL AND (m."sourceHash" IS DISTINCT FROM i."contentHash" OR m."syncStatus"='SOURCE_CHANGED')) THEN 'SOURCE_CHANGED' WHEN m."externalId" IS NULL THEN 'PENDING' ELSE 'LINKED' END`;
 const joins=Prisma.sql`FROM ${table('RotorImportItem')} i LEFT JOIN ${table('RotorMirrorRecord')} r ON r.kind='CUSTOMER' AND r."externalId"=i."externalId" LEFT JOIN ${table('RotorCustomerMapping')} m ON m."externalId"=i."externalId" LEFT JOIN ${table('Customer')} c ON c.id=m."customerId"`;
 const pattern='%'+v.search.replace(/[\\%_]/g,c=>'\\'+c)+'%';
 const search=v.search?Prisma.sql`AND (i."externalId" ILIKE ${pattern} OR i.normalized->>'name' ILIKE ${pattern} OR i.normalized->>'email' ILIKE ${pattern} OR i.normalized->>'phone' ILIKE ${pattern} OR i.normalized->>'address' ILIKE ${pattern})`:Prisma.empty;
 const where=Prisma.sql`WHERE i."runId"=${runId} AND i.kind='CUSTOMER' ${search} ${v.status==='ALL'?Prisma.empty:Prisma.sql`AND (${state})=${v.status}`}`;
 return db.$transaction(async tx=>{
  if(!await tx.rotorImportRun.findUnique({where:{id:runId},select:{id:true}}))throw new DomainError('NOT_FOUND','Import introuvable.',404);
  const [counts]=await tx.$queryRaw<Array<{total:string}>>`SELECT count(*)::text AS total ${joins} ${where}`;
  const rows=await tx.$queryRaw<Array<{externalId:string;normalized:Prisma.JsonValue;contentHash:string;change:string;reviewStatus:string;customerId:string|null;customerName:string|null}>>`SELECT i."externalId",i.normalized,i."contentHash",i.change,(${state}) AS "reviewStatus",m."customerId",c.name AS "customerName" ${joins} ${where} ${v.after?Prisma.sql`AND i."externalId">${v.after}`:Prisma.empty} ORDER BY i."externalId" ASC LIMIT 21`;
  const total=Number(counts.total);if(!Number.isSafeInteger(total))throw new DomainError('COUNT_TOO_LARGE','Le volume exige un rapport dédié.',413);
  return {rows:rows.slice(0,20).map(({customerId,customerName,...row})=>({...row,mapping:customerId&&actor.permissions.includes('crm.read')?{customerId,name:customerName}:null})),total,nextCursor:rows.length>20?rows[19].externalId:null,filters:v};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

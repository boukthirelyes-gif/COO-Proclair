import {createHash} from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {DomainError} from '@/domain/rules';
import {requirePermission,type AccessActor} from './access';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const ident=z.string().trim().min(1).max(128),optionalId=ident.nullable();
const customer=z.object({externalId:ident,name:z.string().trim().min(1).max(500),email:z.string().email().max(320).nullable(),phone:z.string().max(80).nullable(),address:z.string().max(500).nullable(),notes:z.string().max(10000)}).strict();
const financial=z.object({externalId:ident,customerExternalId:optionalId,invoiceExternalId:optionalId,amountCents:z.number().int().min(-2147483647).max(2147483647),currency:z.literal('CAD'),status:z.string().trim().min(1).max(80),occurredAt:z.string().datetime({offset:true}).transform(s=>new Date(s).toISOString()),reference:z.string().max(500).nullable(),method:z.string().max(80).nullable()}).strict();
const input=z.discriminatedUnion('kind',[z.object({kind:z.literal('CUSTOMER'),rows:z.array(customer).min(1).max(1000)}).strict(),z.object({kind:z.literal('INVOICE'),rows:z.array(financial).min(1).max(1000)}).strict(),z.object({kind:z.literal('PAYMENT'),rows:z.array(financial).min(1).max(1000)}).strict()]);
type Data=z.infer<typeof input>;
function permitted(actor:AccessActor,kind:string){requirePermission(actor,'integrations');requirePermission(actor,kind==='CUSTOMER'?'crm.write':'finance')}
export class RotorFileImports{
 constructor(public db:PrismaClient){}
 private parse(value:unknown,actor:AccessActor){const v=input.parse(value);permitted(actor,v.kind);if(new Set(v.rows.map(r=>r.externalId)).size!==v.rows.length)throw new DomainError('DUPLICATE_SOURCE_ID','Identifiant Rotor dupliqué dans le fichier.',409);v.rows.sort((a,b)=>a.externalId.localeCompare(b.externalId));return v}
 private async inspect(tx:Prisma.TransactionClient,v:Data){const checksum=hash(v),batch=await tx.rotorFileImport.findUnique({where:{checksum}});let unchanged=0;const conflicts:string[]=[];
  if(v.kind==='CUSTOMER'){const rows=await tx.rotorMirrorRecord.findMany({where:{kind:'CUSTOMER',externalId:{in:v.rows.map(r=>r.externalId)}},select:{externalId:true,contentHash:true}});for(const r of v.rows){const existing=rows.find(e=>e.externalId===r.externalId);if(existing){if(existing.contentHash!==hash(r))conflicts.push(r.externalId);else unchanged++}}}
  else{const rows=await tx.rotorFinancialArchive.findMany({where:{kind:v.kind,externalId:{in:v.rows.map(r=>r.externalId)}},select:{externalId:true,contentHash:true}});for(const r of v.rows){const existing=rows.find(e=>e.externalId===r.externalId);if(existing){if(existing.contentHash!==hash(r))conflicts.push(r.externalId);else unchanged++}}}
  return {checksum,kind:v.kind,rowCount:v.rows.length,newRows:v.rows.length-unchanged-conflicts.length,unchanged,conflicts,samples:v.rows.slice(0,5),totalCents:v.kind==='CUSTOMER'?null:v.rows.reduce((sum,r)=>sum+BigInt(r.amountCents),0n).toString(),replayed:Boolean(batch),runId:batch?.runId??null,nativeWrites:false,financialWrites:false,source:'USER_MAPPED_ROTOR_EXPORT'};
 }
 async preview(value:unknown,actor:AccessActor){const v=this.parse(value,actor);return this.db.$transaction(tx=>this.inspect(tx,v),{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead})}
 async apply(value:unknown,actor:AccessActor){const approved=z.object({kind:z.string(),rows:z.array(z.unknown()),checksum:z.string().regex(/^[a-f0-9]{64}$/),approved:z.literal(true)}).strict().parse(value),v=this.parse({kind:approved.kind,rows:approved.rows},actor);
  return this.db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928362)`;const report=await this.inspect(tx,v);if(report.checksum!==approved.checksum)throw new DomainError('SOURCE_CHANGED','Le fichier ou son association de colonnes a changé. Prévisualisez de nouveau.',409);if(report.conflicts.length)throw new DomainError('SOURCE_CONFLICT','Des identifiants existent avec un contenu différent. Aucun écrasement effectué.',409);if(report.replayed)return report;
   const now=new Date();let runId:string|null=null;
   if(v.kind==='CUSTOMER'){
    const run=await tx.rotorImportRun.create({data:{status:'COMPLETE',start:now,end:new Date(now.getTime()+1),kinds:['CUSTOMER'],checkpoints:{CUSTOMER:{page:2,done:true,pages:1,received:v.rows.length,total:v.rows.length,lastHash:report.checksum,source:'CSV_EXPORT'}},createdBy:actor.id,completedAt:now}});runId=run.id;
    const prior=await tx.rotorMirrorRecord.findMany({where:{kind:'CUSTOMER',externalId:{in:v.rows.map(r=>r.externalId)}},select:{externalId:true}}),existing=new Set(prior.map(r=>r.externalId));
    const mapped=v.rows.map(r=>({row:r,contentHash:hash(r),normalized:{kind:'CUSTOMER',externalId:r.externalId,name:r.name,status:null,summary:null,email:r.email,phone:r.phone,address:r.address,customerExternalId:null,jobExternalId:null,startsAt:null,endsAt:null}}));
    await tx.rotorMirrorRecord.createMany({data:mapped.map(m=>({...m.normalized,contentHash:m.contentHash,syncedAt:now,lastImportRunId:run.id})),skipDuplicates:true});
    const actual=await tx.rotorMirrorRecord.findMany({where:{kind:'CUSTOMER',externalId:{in:v.rows.map(r=>r.externalId)}},select:{externalId:true,contentHash:true}}),hashes=new Map(actual.map(r=>[r.externalId,r.contentHash]));
    if(mapped.some(m=>hashes.get(m.row.externalId)!==m.contentHash))throw new DomainError('SOURCE_CONFLICT','La source a changé pendant l’import. Aucun écrasement effectué.',409);
    await tx.rotorMirrorRecord.updateMany({where:{kind:'CUSTOMER',externalId:{in:v.rows.map(r=>r.externalId)}},data:{syncedAt:now,lastImportRunId:run.id}});
    await tx.rotorImportItem.createMany({data:mapped.map(({row:r,contentHash,normalized})=>({runId:run.id,kind:'CUSTOMER',externalId:r.externalId,page:1,contentHash,rawPayload:{name:r.name,email:r.email,phone:r.phone,address:r.address,notes:r.notes},normalized,change:existing.has(r.externalId)?'UNCHANGED':'NEW'}))});
   }
   const batch=await tx.rotorFileImport.create({data:{checksum:report.checksum,kind:v.kind,rowCount:v.rows.length,createdBy:actor.id,runId}});
   if(v.kind!=='CUSTOMER')await tx.rotorFinancialArchive.createMany({data:v.rows.map(r=>({...r,kind:v.kind,occurredAt:new Date(r.occurredAt),contentHash:hash(r),importId:batch.id})),skipDuplicates:true});
   await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:'ROTOR_FILE_IMPORTED',entityType:'RotorFileImport',entityId:batch.id,after:{kind:v.kind,rowCount:v.rows.length,newRows:report.newRows,unchanged:report.unchanged,checksum:report.checksum,nativeWrites:false,financialWrites:false}}});return {...report,runId,importId:batch.id};
  },{timeout:30000});
 }
 async history(actor:AccessActor){requirePermission(actor,'integrations');const batches=await this.db.rotorFileImport.findMany({where:actor.permissions.includes('finance')?{}:{kind:'CUSTOMER'},orderBy:{createdAt:'desc'},take:20});return {batches,limit:20}}
 async archive(actor:AccessActor,query:unknown){requirePermission(actor,'finance');const v=z.object({kind:z.enum(['INVOICE','PAYMENT']),after:z.string().max(100).optional(),customerId:z.string().max(100).optional()}).strict().parse(query);let externalIds:string[]|undefined;if(v.customerId){const [customer,mappings]=await Promise.all([this.db.customer.findUnique({where:{id:v.customerId},select:{rotorExternalId:true}}),this.db.rotorCustomerMapping.findMany({where:{customerId:v.customerId},select:{externalId:true}})]);externalIds=[...new Set([customer?.rotorExternalId,...mappings.map(r=>r.externalId)].filter((s):s is string=>!!s))]}
  const where={kind:v.kind,...(externalIds?{customerExternalId:{in:externalIds}}:{})},[rows,total]=await Promise.all([this.db.rotorFinancialArchive.findMany({where,orderBy:{id:'asc'},...(v.after?{cursor:{id:v.after},skip:1}:{}),take:51}),this.db.rotorFinancialArchive.count({where})]);
  const ids=rows.map(r=>r.customerExternalId).filter((s):s is string=>!!s),mappings=await this.db.rotorCustomerMapping.findMany({where:{externalId:{in:ids}},include:{customer:{select:{id:true,name:true}}}}),native=await this.db.customer.findMany({where:{rotorExternalId:{in:ids}},select:{id:true,name:true,rotorExternalId:true}});
  return {rows:rows.slice(0,50).map(r=>{const match=mappings.find(m=>m.externalId===r.customerExternalId)?.customer??native.find(c=>c.rotorExternalId===r.customerExternalId);return {...r,customer:match?{id:match.id,name:match.name}:null}}),total,nextCursor:rows.length>50?rows[49].id:null,financialWrites:false};
 }
}

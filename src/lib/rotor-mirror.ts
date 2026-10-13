import type {PrismaClient} from '@prisma/client';
import {DomainError} from '@/domain/rules';
import {rotorReadPage} from './rotor';

type SourceKind='CUSTOMER'|'JOB'|'VISIT';
type SourceRecord=Record<string,unknown>;
type MirrorRow={
 kind:SourceKind;externalId:string;name:string;status:string|null;summary:string|null;
 email:string|null;phone:string|null;address:string|null;customerExternalId:string|null;
 jobExternalId:string|null;startsAt:Date|null;endsAt:Date|null;
};

const object=(value:unknown):SourceRecord|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as SourceRecord:null;
const str=(value:unknown,max=500):string|null=>typeof value==='string'&&value.trim()?value.trim().slice(0,max):null;
const identifier=(value:unknown)=>typeof value==='string'||typeof value==='number'?str(String(value),128):null;
const date=(value:unknown):Date|null=>{
 if(typeof value!=='string'||value.length>70)return null;
 const date=new Date(value);return Number.isFinite(date.getTime())?date:null;
};
const address=(value:unknown):string|null=>{
 const a=object(value);if(!a)return str(value,500);
 const parts=[a.street1,a.street2,a.city,a.state,a.zip,a.country].map(v=>str(v,160)).filter(Boolean);
 return parts.join(', ').slice(0,500)||null;
};
const name=(row:SourceRecord)=>{
 return str(row.company_name,500)||
 [str(row.first_name,180),str(row.last_name,180)].filter(Boolean).join(' ').trim()||
 str(row.name,500)||null;
};

export function normalizeRotorBatch(batch:Awaited<ReturnType<typeof rotorReadPage>>){
 const result:MirrorRow[]=[];
 const unique=new Set<string>();
 function add(kind:SourceKind,items:SourceRecord[],convert:(item:SourceRecord,id:string)=>Omit<MirrorRow,'kind'|'externalId'>){
  for(const item of items){
   const r=object(item),id=r&&identifier(r.id);
   if(!r||!id)throw new DomainError('ROTOR_PROTOCOL','Un enregistrement Rotor manque d’identifiant.',502);
   const key=kind+':'+id;
   if(unique.has(key))throw new DomainError('ROTOR_PROTOCOL','Identifiant Rotor dupliqué dans la page.',502);
   unique.add(key);
   result.push({kind,externalId:id,...convert(r,id)});
  }
 }
 add('CUSTOMER',batch.customers.data,(r,id)=>({
  name:name(r)||'Client Rotor '+id,status:str(r.status,80),summary:null,
  email:str(r.email,320),phone:str(r.phone,80),address:address(r.address),
  customerExternalId:null,jobExternalId:null,startsAt:null,endsAt:null,
 }));
 add('JOB',batch.jobs.data,(r,id)=>{
  const c=object(r.customer);
  const title=str(r.job_number,80)||id;
  const firstItem=Array.isArray(r.line_items)?object(r.line_items[0]):null;
  return {
   name:'Prestation Rotor '+title,status:str(r.status,80),
   summary:str(firstItem?.title,250),
   email:null,phone:null,address:null,customerExternalId:identifier(c?.id),
   jobExternalId:id,startsAt:date(r.start_date),endsAt:date(r.end_date),
  };
 });
 add('VISIT',batch.visits.data,(r,id)=>{
  const c=object(r.customer),job=object(r.job);
  return {
   name:str(r.service_type,250)||'Visite Rotor '+id,status:str(r.status,80),
   summary:str(job?.job_number,80)?'Prestation '+str(job?.job_number,80):null,
   email:null,phone:null,address:address(r.address),
   customerExternalId:identifier(c?.id),jobExternalId:identifier(r.job_id),
   startsAt:date(r.start),endsAt:date(r.end),
  };
 });
 return result;
}
export async function previewRotorMirror(page:number,start:string,end:string){
 const batch=await rotorReadPage(page,25,start,end);
 const records=normalizeRotorBatch(batch);
 return {
  page,start,end,limit:25,
  counts:{
   customers:batch.customers.data.length,
   jobs:batch.jobs.data.length,
   visits:batch.visits.data.length,
  },
  hasMore:{
   customers:batch.customers.pagination.hasMore,
   jobs:batch.jobs.pagination.hasMore,
   visits:batch.visits.pagination.hasMore,
  },
  samples:records.slice(0,10).map(r=>({kind:r.kind,externalId:r.externalId,name:r.name,status:r.status})),
  message:'Aucune donnée importée. Les données Rotor resteront séparées des contrats et visites locales.',
 };
}

export async function applyRotorMirror(db:PrismaClient,page:number,start:string,end:string){
 const batch=await rotorReadPage(page,25,start,end);
 const rows=normalizeRotorBatch(batch);
 // One transaction prevents a partly imported page. Compound external keys prevent duplicates.
 await db.$transaction(async tx=>{
  for(const record of rows){
   const {kind,externalId,...fields}=record;
   await tx.rotorMirrorRecord.upsert({
    where:{kind_externalId:{kind,externalId}},
    create:{kind,externalId,...fields},
    update:{...fields,contentHash:null,lastImportRunId:null,syncedAt:new Date()},
   });
  }
  await tx.auditEvent.create({data:{
   actorId:'admin',actorRole:'ADMIN',action:'ROTOR_MIRROR_IMPORT',
   entityType:'RotorMirrorRecord',entityId:'page:'+page,
   after:{page,counts:{customers:batch.customers.data.length,jobs:batch.jobs.data.length,visits:batch.visits.data.length},readOnly:true},
  }});
 },{timeout:50000});
 return {
  page,imported:rows.length,
  counts:{customers:batch.customers.data.length,jobs:batch.jobs.data.length,visits:batch.visits.data.length},
  hasMore:{customers:batch.customers.pagination.hasMore,jobs:batch.jobs.pagination.hasMore,visits:batch.visits.pagination.hasMore},
  readOnly:true,
 };
}

export async function listRotorMirror(db:PrismaClient){
 const [counts,records]=await Promise.all([
  db.rotorMirrorRecord.groupBy({by:['kind'],_count:{_all:true}}),
  db.rotorMirrorRecord.findMany({orderBy:[{syncedAt:'desc'},{externalId:'asc'}],take:50}),
 ]);
 return {counts:Object.fromEntries(counts.map(row=>[row.kind,row._count._all])),records,readOnly:true};
}

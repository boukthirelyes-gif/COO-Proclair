import {Prisma,type PrismaClient} from '@prisma/client';
import {suggestRotorSmsReply} from '@/omega/sms-drafts';
import {z} from 'zod';
import {DomainError} from '@/domain/rules';
import {bootstrapActor,requirePermission,type AccessActor} from './access';
import {RotorCapabilityRegistry} from './rotor-capabilities';
import {validateRotorSchema} from './rotor-map';
import {rotorInboxRead,rotorStatus} from './rotor';

// Rotor's inbox is mirrored separately. Nothing is sent to Rotor or Twilio here.
const sourceMessage=z.object({
 id:z.string().min(1).max(128),
 channel:z.literal('sms'),
 direction:z.enum(['inbound','outbound']),
 content:z.string().max(20000),
 created_at:z.string().datetime({offset:true}),
 contact_id:z.string().max(128).nullish(),
 contact_type:z.enum(['customer','lead']).nullish(),
 contact_phone:z.string().max(32).nullish(),
 thread_id:z.string().max(256).nullish(),
 subject:z.string().max(1000).nullish(),
 status:z.string().max(100).nullish(),
 read:z.boolean().nullish(),
}).passthrough();
const responseSchema=z.object({
 data:z.array(z.unknown()).max(100),
 pagination:z.object({
  page:z.number().int().min(1),
  limit:z.number().int().min(1).max(100),
  total:z.number().int().min(0).optional(),
  has_more:z.boolean(),
 }).passthrough(),
}).passthrough();
export function normalizeRotorInbox(raw:unknown,expectedPage:number){
 const response=responseSchema.parse(raw);
 if(response.pagination.page!==expectedPage)throw new DomainError('ROTOR_PROTOCOL','Pagination des messages Rotor incohérente.',502);
 const messages=response.data.map(v=>sourceMessage.parse(v));
 if(messages.length>response.pagination.limit||response.pagination.has_more&&messages.length===0)throw new DomainError('ROTOR_PROTOCOL','Page SMS vide ou incohérente.',502);
 if(new Set(messages.map(m=>m.id)).size!==messages.length)throw new DomainError('ROTOR_PROTOCOL','Identifiants de messages dupliqués sur cette page.',502);
 return {messages,pagination:response.pagination};
}
export function exactRotorCustomerId(type:string|null|undefined,id:string|null|undefined,mappings:Map<string,string>,natives:Map<string,string>){
 if(type!=='customer'||!id)return null;
 const a=mappings.get(id),b=natives.get(id);
 return a&&b&&a!==b?null:a??b??null;
}
export class RotorInboxService {
 constructor(private db:PrismaClient,private read:typeof rotorInboxRead=rotorInboxRead){}
 async list(actor:AccessActor,input:unknown={}){
  requirePermission(actor,'integrations');requirePermission(actor,'crm.read');
  const v=z.object({
   phone:z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
   q:z.string().trim().max(80).optional(),
   page:z.number().int().min(1).max(1000).default(1),
  }).strict().parse(input);
  const where:Prisma.RotorInboxMessageWhereInput={
   ...(v.phone?{phone:v.phone}:{}),
   ...(v.q?{OR:[{body:{contains:v.q,mode:'insensitive'}},{phone:{contains:v.q}}]}:{}),
  };
  const [rows,total,localTotal]=await Promise.all([
   this.db.rotorInboxMessage.findMany({where,orderBy:[{messageAt:'desc'},{externalId:'asc'}],take:100,skip:(v.page-1)*100}),
   this.db.rotorInboxMessage.count({where}),
   this.db.rotorInboxMessage.count(),
  ]);
  return {rows,total,localTotal,page:v.page,provider:'ROTOR_SURGE',readOnly:true};
 }
 async sync(input:unknown,actor:AccessActor){
  requirePermission(actor,'integrations');requirePermission(actor,'crm.read');
  const v=z.object({page:z.number().int().min(1).max(2000),approved:z.literal(true)}).strict().parse(input);
  const schema=await new RotorCapabilityRegistry(this.db).schema('list_messages');
  const args={page:v.page,limit:100,channel:'sms'};
  validateRotorSchema(schema.inputSchema,args);
  const raw=await this.read(v.page,100);
  if(schema.outputSchema)validateRotorSchema(schema.outputSchema,raw);
  const {messages,pagination}=normalizeRotorInbox(raw,v.page);
  const sourceIds=[...new Set(messages.filter(m=>m.contact_type==='customer').map(m=>m.contact_id).filter((id):id is string=>Boolean(id)))];
  const [mappingRows,nativeRows]=await Promise.all([
   this.db.rotorCustomerMapping.findMany({where:{externalId:{in:sourceIds}},select:{externalId:true,customerId:true}}),
   this.db.customer.findMany({where:{rotorExternalId:{in:sourceIds}},select:{rotorExternalId:true,id:true}}),
  ]);
  const mappings=new Map(mappingRows.map(row=>[row.externalId,row.customerId]));
  const natives=new Map(nativeRows.filter(row=>row.rotorExternalId).map(row=>[row.rotorExternalId!,row.id]));
  await this.db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928367)`;
   for(const message of messages){
    const data={
     channel:message.channel,direction:message.direction,body:message.content,
     contactId:message.contact_id??null,contactType:message.contact_type??null,
     customerId:exactRotorCustomerId(message.contact_type,message.contact_id,mappings,natives),
     phone:message.contact_phone??null,threadId:message.thread_id??null,
     subject:message.subject??null,status:message.status??null,read:message.read??false,
     messageAt:new Date(message.created_at),syncedAt:new Date(),
    };
    await tx.rotorInboxMessage.upsert({where:{externalId:message.id},create:{externalId:message.id,...data},update:data});
   }
   await tx.auditEvent.create({data:{
    actorId:actor.id,actorRole:actor.accountRole,action:'ROTOR_SMS_PAGE_IMPORTED',
    entityType:'RotorInboxMessage',entityId:'page:'+v.page,
    after:{page:v.page,count:messages.length,channel:'sms',readOnly:true},
   }});
  },{timeout:25000});
  return {imported:messages.length,page:v.page,hasMore:pagination.has_more??false,
   sourceTotal:pagination.total??null,localTotal:await this.db.rotorInboxMessage.count(),readOnly:true};
 }
 async followups(actor:AccessActor){
  requirePermission(actor,'integrations');requirePermission(actor,'crm.read');
  const messages=await this.db.rotorInboxMessage.findMany({where:{phone:{not:null}},
   orderBy:[{messageAt:'desc'},{externalId:'asc'}],take:500,
   select:{externalId:true,body:true,direction:true,phone:true,messageAt:true,customerId:true,threadId:true}});
  const seen=new Set<string>();
  const latest=messages.filter(msg=>{const key=msg.threadId??msg.phone!;if(seen.has(key))return false;seen.add(key);return msg.direction==='inbound'}).slice(0,20);
  const ids=[...new Set(latest.map(x=>x.customerId).filter((v):v is string=>Boolean(v)))];
  const customers=await this.db.customer.findMany({where:{id:{in:ids}},select:{id:true,name:true}});
  const names=new Map(customers.map(c=>[c.id,c.name]));
  return {items:latest.map(x=>({...x,body:x.body.slice(0,300),triage:suggestRotorSmsReply(x.body),
   customerName:x.customerId?names.get(x.customerId)??null:null})),
   checkedRecent:messages.length,partial:messages.length===500,readOnly:true};
 }
 async autoStatus(actor:AccessActor){
  requirePermission(actor,'integrations');requirePermission(actor,'crm.read');
  const state=await this.db.rotorSmsSyncControl.findUnique({where:{id:'rotor-sms'}});
  return {enabled:state?.enabled??false,lastRunAt:state?.lastRunAt??null,
   lastImported:state?.lastImported??0,lastErrorCode:state?.lastErrorCode??null,readOnly:true};
 }
 async configureAuto(input:unknown,actor:AccessActor){
  requirePermission(actor,'integrations');requirePermission(actor,'crm.read');
  if(actor.accountRole!=='ADMIN')throw new DomainError('FORBIDDEN','Réservé à un administrateur.',403);
  const {enabled}=z.object({enabled:z.boolean()}).strict().parse(input);
  if(enabled){
   const status=await rotorStatus();
   if(!status.connected||!status.grantedScopes.includes('inbox:read'))
    throw new DomainError('ROTOR_AUTH','Reconnectez Rotor dans ce CRM avec inbox:read.',409);
   await new RotorCapabilityRegistry(this.db).schema('list_messages');
  }
  await this.db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928368)`;
   await tx.rotorSmsSyncControl.upsert({where:{id:'rotor-sms'},create:{id:'rotor-sms',enabled},
    update:{enabled,leaseUntil:enabled?undefined:null}});
   await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,
    action:enabled?'ROTOR_SMS_AUTO_ENABLED':'ROTOR_SMS_AUTO_DISABLED',
    entityType:'RotorSmsSyncControl',entityId:'rotor-sms',after:{enabled,readOnly:true}}});
  });
  return this.autoStatus(actor);
 }
 async tick(now=new Date()){
  const claimed=await this.db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928368)`;
   const state=await tx.rotorSmsSyncControl.findUnique({where:{id:'rotor-sms'}});
   if(!state?.enabled||(state.leaseUntil&&state.leaseUntil>now))return false;
   await tx.rotorSmsSyncControl.update({where:{id:'rotor-sms'},data:{leaseUntil:new Date(now.getTime()+120000)}});
   return true;
  });
  if(!claimed)return {checked:false,reason:'DISABLED_OR_BUSY'};
  let imported=0,errorCode:string|null=null,hasMore=false;
  try{
   const actor={...bootstrapActor,id:'rotor-sms-cron',name:'Synchronisation SMS Rotor'};
   const result=await this.sync({page:1,approved:true},actor);
   imported=result.imported;hasMore=result.hasMore;
  }catch(error){errorCode=error instanceof DomainError?error.code:'ROTOR_SMS_SYNC_FAILED'}
  await this.db.rotorSmsSyncControl.update({where:{id:'rotor-sms'},data:{
   leaseUntil:null,lastRunAt:now,lastImported:imported,lastErrorCode:errorCode}});
  return {checked:true,imported,errorCode,hasMore,readOnly:true,limitedToRecentPage:true};
 }

}

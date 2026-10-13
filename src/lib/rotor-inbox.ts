import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {DomainError} from '@/domain/rules';
import {requirePermission,type AccessActor} from './access';
import {RotorCapabilityRegistry} from './rotor-capabilities';
import {validateRotorSchema} from './rotor-map';
import {rotorInboxRead} from './rotor';

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
  has_more:z.boolean().optional(),
 }).passthrough(),
}).passthrough();
export function normalizeRotorInbox(raw:unknown,expectedPage:number){
 const response=responseSchema.parse(raw);
 if(response.pagination.page!==expectedPage)throw new DomainError('ROTOR_PROTOCOL','Pagination des messages Rotor incohérente.',502);
 const messages=response.data.map(v=>sourceMessage.parse(v));
 if(new Set(messages.map(m=>m.id)).size!==messages.length)throw new DomainError('ROTOR_PROTOCOL','Identifiants de messages dupliqués sur cette page.',502);
 return {messages,pagination:response.pagination};
}
export class RotorInboxService {
 constructor(private db:PrismaClient,private read:typeof rotorInboxRead=rotorInboxRead){}
 async list(actor:AccessActor,input:unknown={}){
  requirePermission(actor,'integrations');requirePermission(actor,'crm.read');
  const v=z.object({
   phone:z.string().regex(/^\\+[1-9]\\d{7,14}$/).optional(),
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
  await this.db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928367)`;
   for(const message of messages){
    const data={
     channel:message.channel,direction:message.direction,body:message.content,
     contactId:message.contact_id??null,contactType:message.contact_type??null,
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
  },{timeout:20000});
  return {imported:messages.length,page:v.page,hasMore:pagination.has_more??false,
   sourceTotal:pagination.total??null,localTotal:await this.db.rotorInboxMessage.count(),readOnly:true};
 }
}

import {createHash} from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {DomainError,dayBounds,localParts} from '@/domain/rules';
import {requirePermission,type AccessActor,type Permission} from '@/lib/access';
import {annualLeaderboard} from '@/finance/commissions';

export const omegaTools=[
 {name:'CUSTOMER_SEARCH',module:'Customer Service',level:1,permission:'crm.read'},
 {name:'VISITS_ON_DATE',module:'Dispatch',level:1,permission:'dispatch'},
 {name:'COMMISSIONS',module:'Finance',level:1,permission:'sales.write'},
 {name:'CALLBACKS',module:'Sales',level:1,permission:'leads.read'},
 {name:'TASK_CREATE',module:'Administration',level:3,permission:'crm.write'},
] as const;
const readSchema=z.discriminatedUnion('tool',[
 z.object({tool:z.literal('CUSTOMER_SEARCH'),query:z.string().trim().min(2).max(100)}).strict(),
 z.object({tool:z.literal('VISITS_ON_DATE'),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),endDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),status:z.enum(['UNCONFIRMED','CANCELLED','ALL']).default('ALL')}).strict(),
 z.object({tool:z.literal('COMMISSIONS'),year:z.number().int().min(2000).max(2100)}).strict(),
 z.object({tool:z.literal('CALLBACKS')}).strict(),
]);
function access(actor:AccessActor){requirePermission(actor,'omega');requirePermission(actor,'crm.read');}
function grant(actor:AccessActor,permission:Permission){access(actor);requirePermission(actor,permission);}
const asJson=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const executionControl='omega-engine-internal';
/** Closed tool set: customer/provider contents are data, never commands or executable plans. */
export class OmegaEngine {
 constructor(private db:PrismaClient,private now:()=>Date=()=>new Date(),private schema='public'){}
 async catalog(actor:AccessActor){access(actor);const control=await this.db.workerControl.findUnique({where:{id:executionControl}});return {tools:omegaTools.filter(t=>actor.permissions.includes(t.permission)),canConfigure:actor.accountRole==='ADMIN'&&actor.role==='ADMIN',internalExecutionEnabled:control?.enabled??false,languageModel:'NOT_CONFIGURED',externalExecution:false,continuousExecution:'REQUIRES_RUNNING_WORKER',levels:[{level:1,status:'AVAILABLE'},{level:2,status:'AVAILABLE'},{level:3,status:control?.enabled?'INTERNAL_TASKS_ONLY':'DISABLED'},{level:4,status:'EXISTING_SUPERVISOR_ONLY'}]};}
 async read(input:unknown,actor:AccessActor){
  access(actor);const v=readSchema.parse(input),tool=omegaTools.find(t=>t.name===v.tool)!;grant(actor,tool.permission);
  let rows:{id:string;label:string;detail:string;view:string;customerId?:string}[]=[],count=0,metrics:unknown=null;
  if(v.tool==='CUSTOMER_SEARCH'){
   const where={OR:[{name:{contains:v.query,mode:'insensitive' as const}},{phone:{contains:v.query}},{email:{contains:v.query,mode:'insensitive' as const}}]};
   const result=await this.db.$transaction(async tx=>({count:await tx.customer.count({where}),rows:await tx.customer.findMany({where,take:20,orderBy:{id:'asc'},select:{id:true,name:true}})}),{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
   count=result.count;rows=result.rows.map(c=>({id:c.id,label:c.name,detail:'Dossier client',view:'customers',customerId:c.id}));
  }else if(v.tool==='VISITS_ON_DATE'){
   const bounds=dayBounds(v.date);if(v.endDate){const end=dayBounds(v.endDate).start;if(end<=bounds.start||end.getTime()-bounds.start.getTime()>32*86400000)throw new DomainError('OMEGA_DATE_RANGE','Période positive de 31 jours maximum.',400);bounds.end=end;}const where:Prisma.VisitWhereInput={startsAt:{gte:bounds.start,lt:bounds.end},...(v.status==='UNCONFIRMED'?{status:{in:['PENDING','PROPOSED','RESCHEDULED']}}:v.status==='CANCELLED'?{status:'CANCELLED'}:{})};
   const result=await this.db.$transaction(async tx=>({count:await tx.visit.count({where}),rows:await tx.visit.findMany({where,take:20,orderBy:[{startsAt:'asc'},{id:'asc'}],select:{id:true,customerId:true,status:true,service:true,customer:{select:{name:true}}}})}),{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
   count=result.count;rows=result.rows.map(r=>({id:r.id,label:r.customer.name,detail:r.service+' · '+r.status,view:'visits',customerId:r.customerId}));
  }else if(v.tool==='COMMISSIONS'){
   const board=await annualLeaderboard(this.db,{year:v.year},actor,this.schema);metrics={year:board.year,basis:board.policy.basis,baseCents:board.summary.baseCents,sellers:board.rows};count=board.total;
  }else{
   const where:Prisma.LeadWhereInput={status:'ACTIVE',followUpAt:{lte:this.now()},...(actor.permissions.includes('leads.all')?{}:{ownerId:actor.id}),OR:[{sourcePin:null},{sourcePin:{status:{not:'DO_NOT_CONTACT'},type:{restricted:false}}}]};
   const result=await this.db.$transaction(async tx=>({count:await tx.lead.count({where}),rows:await tx.lead.findMany({where,take:20,orderBy:[{followUpAt:'asc'},{id:'asc'}],select:{id:true,name:true}})}),{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
   count=result.count;rows=result.rows.map(r=>({id:r.id,label:r.name,detail:'Rappel arrivé à échéance ; aucun contact effectué',view:'leads'}));
  }
  const response={intent:v.tool,module:tool.module,level:1,mode:'ANALYSIS',executed:false,source:'POSTGRESQL',generatedAt:this.now().toISOString(),answer:`${count} résultat(s) dans le périmètre demandé${v.tool==='VISITS_ON_DATE'?' pour le '+v.date+(v.endDate?' au '+v.endDate+' exclusif':'')+' (Toronto), hors visites sans date':''}.`,rows,metrics,limited:count>20,examples:[]};
  await this.db.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:'OMEGA_TOOL_READ',entityType:'OmegaTool',entityId:v.tool,after:{tool:v.tool,displayed:rows.length,externalEffects:false}}});return response;
 }
 async history(actor:AccessActor){access(actor);return this.db.omegaEngineOperation.findMany({where:{actorId:actor.id},include:{task:true},orderBy:{createdAt:'desc'},take:50});}
 async prepare(input:unknown,actor:AccessActor){
  grant(actor,'crm.write');const v=z.object({tool:z.literal('TASK_CREATE'),title:z.string().trim().min(3).max(300),key:z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/)}).strict().parse(input),hash=createHash('sha256').update(JSON.stringify({tool:v.tool,title:v.title})).digest('hex');
  return this.db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928390)`;
   const previous=await tx.omegaEngineOperation.findUnique({where:{actorId_key:{actorId:actor.id,key:v.key}}});
   if(previous){if(previous.payloadHash!==hash)throw new DomainError('IDEMPOTENCY_CONFLICT','Cette clé appartient à une autre proposition.',409);return previous;}
   if(await tx.omegaEngineOperation.count({where:{actorId:actor.id,createdAt:{gte:new Date(this.now().getTime()-86400000)}}})>=20)throw new DomainError('OMEGA_RATE_LIMIT','Limite de 20 propositions internes par 24 heures.',429);
   const row=await tx.omegaEngineOperation.create({data:{actorId:actor.id,key:v.key,payloadHash:hash,title:v.title}});
   await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:'OMEGA_TASK_PROPOSED',entityType:'OmegaEngineOperation',entityId:row.id,after:{tool:v.tool,externalEffects:false}}});return row;
  });
 }
 async execute(input:unknown,actor:AccessActor){
  grant(actor,'crm.write');if(actor.role==='OMEGA')throw new DomainError('FORBIDDEN','Approbation humaine requise.',403);const v=z.object({id:z.string().min(1).max(100),approved:z.literal(true)}).strict().parse(input);
  return this.db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928390)`;
   const row=await tx.omegaEngineOperation.findFirst({where:{id:v.id,actorId:actor.id}});if(!row)throw new DomainError('NOT_FOUND','Proposition introuvable.',404);
   if(row.status==='CONFIRMED'){if(!row.taskId||!await tx.omegaInternalTask.findUnique({where:{id:row.taskId}}))throw new DomainError('OMEGA_RESULT_MISSING','Résultat interne absent.',409);return row;}
   if(!(await tx.workerControl.findUnique({where:{id:executionControl}}))?.enabled)throw new DomainError('OMEGA_STOPPED','Exécution interne désactivée par le contrôle administrateur.',409);
   if(this.now().getTime()-row.createdAt.getTime()>86400000)throw new DomainError('OMEGA_PROPOSAL_EXPIRED','Proposition expirée après 24 heures.',409);
   const task=await tx.omegaInternalTask.create({data:{title:row.title,createdBy:actor.id}});
   const result=await tx.omegaEngineOperation.update({where:{id:row.id},data:{status:'CONFIRMED',taskId:task.id,completedAt:this.now()}});
   await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:'OMEGA_TASK_CONFIRMED',entityType:'OmegaEngineOperation',entityId:row.id,after:asJson({taskId:task.id,externalEffects:false})}});return result;
  });
 }
 async complete(input:unknown,actor:AccessActor){
  grant(actor,'crm.write');if(actor.role==='OMEGA')throw new DomainError('FORBIDDEN','Validation humaine requise.',403);const v=z.object({id:z.string().min(1).max(100),approved:z.literal(true)}).strict().parse(input);
  return this.db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928390)`;
   const row=await tx.omegaEngineOperation.findFirst({where:{id:v.id,actorId:actor.id,status:'CONFIRMED'},include:{task:true}});if(!row?.task)throw new DomainError('NOT_FOUND','Tâche introuvable.',404);
   if(row.task.status==='DONE')return row.task;
   if(!(await tx.workerControl.findUnique({where:{id:executionControl}}))?.enabled)throw new DomainError('OMEGA_STOPPED','Exécution interne désactivée.',409);
   const task=await tx.omegaInternalTask.update({where:{id:row.task.id},data:{status:'DONE'}});
   await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:'OMEGA_TASK_DONE_BY_HUMAN',entityType:'OmegaInternalTask',entityId:task.id,after:{status:'DONE',externalEffects:false}}});return task;
  });
 }
 async control(input:unknown,actor:AccessActor){access(actor);if(actor.accountRole!=='ADMIN'||actor.role!=='ADMIN')throw new DomainError('FORBIDDEN','Administrateur humain requis.',403);const v=z.object({enabled:z.boolean()}).strict().parse(input);return this.db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928390)`;const row=await tx.workerControl.upsert({where:{id:executionControl},create:{id:executionControl,...v},update:v});await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:v.enabled?'OMEGA_ENGINE_ENABLED':'OMEGA_ENGINE_STOPPED',entityType:'WorkerControl',entityId:executionControl,after:v}});return row;});}
}

/** Explicit date/intent grammar. No claim of general-purpose language-model reasoning. */
export function omegaRequest(message:string,now=new Date()){
 const q=message.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/ignore.*instruction|system prompt|execute.*code|\beval\b/.test(q))return null;
 const date=q.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
 let selected=date,endDate:string|undefined;
 if(!selected&&/cette semaine/.test(q)){const p=localParts(now),d=new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);selected=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+7);endDate=d.toISOString().slice(0,10);}
 if(!selected&&/demain|aujourd/.test(q)){const p=localParts(now),d=new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`);if(/demain/.test(q))d.setUTCDate(d.getUTCDate()+1);selected=d.toISOString().slice(0,10);}
 if(/commission/.test(q))return {tool:'COMMISSIONS',year:Number(q.match(/\b20\d{2}\b/)?.[0]??localParts(now).year)} as const;
 if(/rappel|rappele/.test(q)&&!/sms|prepare/.test(q))return {tool:'CALLBACKS'} as const;
 if(selected&&/visite|client|rendez.vous/.test(q)&&!/sms|envoi|prepare|deplace|annul[eé] /i.test(q))return {tool:'VISITS_ON_DATE',date:selected,...(endDate?{endDate}:{}),status:/annule/.test(q)?'CANCELLED':/non confirm|pas confirm/.test(q)?'UNCONFIRMED':'ALL'} as const;
 const search=message.match(/^(?:cherche|recherche|trouve)\s+(?:le\s+)?client\s+(.+)$/i);if(search)return {tool:'CUSTOMER_SEARCH',query:search[1]} as const;
 return null;
}

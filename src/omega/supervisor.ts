import {createHash} from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {DomainError} from '../domain/rules';
import {requirePermission,type AccessActor,type Permission} from '../lib/access';

export const supervisorRules=['OVERDUE_VISIT','UNCONFIRMED_VISIT','UNSCHEDULED_VISIT','LEAD_CALLBACK'] as const;
type Rule=typeof supervisorRules[number];
const ruleSchema=z.enum(supervisorRules),CONTROL='native-supervisor',BATCH=25;
const priorities:Record<Rule,number>={OVERDUE_VISIT:0,LEAD_CALLBACK:1,UNCONFIRMED_VISIT:2,UNSCHEDULED_VISIT:3};
const decisionSchema=z.object({id:z.string().min(1).max(100),expectedVersion:z.number().int().positive(),action:z.enum(['APPROVE','DONE','DISMISS']),note:z.string().trim().min(3).max(1000),approved:z.literal(true)}).strict();
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
type DB=Prisma.TransactionClient;
function access(actor:AccessActor){
 requirePermission(actor,'omega');requirePermission(actor,'crm.read');
 if(actor.accountRole!=='ADMIN'||actor.role==='OMEGA')throw new DomainError('FORBIDDEN','Supervision réservée aux administrateurs humains.',403);
}
function grant(rule:Rule,actor:AccessActor){
 if(rule==='LEAD_CALLBACK')for(const p of ['leads.read','leads.write','leads.all'] as const)requirePermission(actor,p);
 else requirePermission(actor,'dispatch');
}
const defaultControl={id:CONTROL,enabled:false,rules:[] as string[],cursors:{},version:0,lastRunAt:null};
function visitWhere(rule:Rule,now:Date):Prisma.VisitWhereInput{
 if(rule==='OVERDUE_VISIT')return {OR:[{status:{in:['SCHEDULED','CONFIRMED']},startsAt:{lt:now}},{status:'IN_PROGRESS',endsAt:{lt:now}}]};
 if(rule==='UNCONFIRMED_VISIT')return {status:{in:['PENDING','PROPOSED','RESCHEDULED']}};
 return {status:'CONFIRMED',startsAt:null,contract:{active:true}};
}
const leadInclude={sourcePin:{include:{type:true}}} as const;
function eligibleLead(row:any,now:Date){return row.status==='ACTIVE'&&row.followUpAt&&row.followUpAt<=now&&row.sourcePin?.status!=='DO_NOT_CONTACT'&&!row.sourcePin?.type?.restricted}
function describe(rule:Rule,row:any){
 const fields=rule==='LEAD_CALLBACK'?{version:row.version,status:row.status,followUpAt:row.followUpAt,ownerId:row.ownerId,pinVersion:row.sourcePin?.version,pinStatus:row.sourcePin?.status,restricted:row.sourcePin?.type?.restricted}:{version:row.version,status:row.status,startsAt:row.startsAt,endsAt:row.endsAt,technicianId:row.technicianId,contractActive:row.contract.active};
 return {priority:priorities[rule],fingerprint:digest({rule,id:row.id,...fields}),label:rule==='LEAD_CALLBACK'?row.name:row.customer.name,detail:rule==='LEAD_CALLBACK'?'Rappel prospect arrivé à échéance. Aucun consentement SMS présumé.':row.service+' · '+row.status};
}
async function current(tx:DB,rule:Rule,sourceId:string,now:Date){
 if(rule==='LEAD_CALLBACK'){
  const row=await tx.lead.findUnique({where:{id:sourceId},include:leadInclude});
  return row&&eligibleLead(row,now)?describe(rule,row):null;
 }
 const row=await tx.visit.findFirst({where:{id:sourceId,...visitWhere(rule,now)},include:{customer:{select:{name:true}},contract:{select:{active:true}}}});
 return row?describe(rule,row):null;
}
/** Internal missions only. No customer confirmations, scheduling or provider calls. */
export class OmegaSupervisor {
 constructor(private db:PrismaClient,private now:()=>Date=()=>new Date()){}
 async configure(input:unknown,actor:AccessActor){
  access(actor);const v=z.object({enabled:z.boolean(),rules:z.array(ruleSchema).max(4),expectedVersion:z.number().int().nonnegative()}).strict().parse(input);
  if(new Set(v.rules).size!==v.rules.length||v.enabled&&!v.rules.length)throw new DomainError('RULES_REQUIRED','Choisissez des scénarios distincts avant activation.',400);
  for(const rule of v.rules)grant(rule,actor);
  return this.db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928370)`;
   const before=await tx.omegaSupervisorControl.findUnique({where:{id:CONTROL}});
   if((before?.version??0)!==v.expectedVersion)throw new DomainError('VERSION_CONFLICT','La configuration a changé. Actualisez OMEGA.',409);
   const result=await tx.omegaSupervisorControl.upsert({where:{id:CONTROL},create:{id:CONTROL,enabled:v.enabled,rules:v.rules},update:{enabled:v.enabled,rules:v.rules,cursors:{},version:{increment:1}}});
   await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:v.enabled?'OMEGA_SUPERVISOR_CONFIGURED':'OMEGA_SUPERVISOR_STOPPED',entityType:'OmegaSupervisorControl',entityId:CONTROL,after:{enabled:v.enabled,rules:v.rules,externalEffects:false}}});
   return result;
  });
 }
 async run(actor:AccessActor){access(actor);return this.tick(actor.id,actor)}
 async tick(actorId='omega-native-supervisor',actor?:AccessActor){
  const now=this.now();if(!Number.isFinite(now.getTime()))throw new DomainError('INVALID_DATE','Date de cycle invalide.',400);
  return this.db.$transaction(async tx=>{
   const lock=await tx.$queryRaw<{locked:boolean}[]>`SELECT pg_try_advisory_xact_lock(714928370) AS locked`;
   if(!lock[0]?.locked)return {enabled:true,busy:true,created:0,scanned:0,continuation:false,externalEffects:false};
   const control=await tx.omegaSupervisorControl.findUnique({where:{id:CONTROL}});
   if(!control?.enabled)return {enabled:false,busy:false,created:0,scanned:0,continuation:false,externalEffects:false};
   const rules=z.array(ruleSchema).max(4).parse(control.rules);
   if(actor)for(const rule of rules)grant(rule,actor);
   const cursors=z.record(z.string(),z.string()).parse(control.cursors);let scanned=0,created=0,continuation=false;
   for(const rule of rules){
    const after=cursors[rule]||null;
    const rows=rule==='LEAD_CALLBACK'?await tx.lead.findMany({where:{status:'ACTIVE',followUpAt:{lte:now},...(after?{id:{gt:after}}:{})},orderBy:{id:'asc'},take:BATCH+1,include:leadInclude}):await tx.visit.findMany({where:{...visitWhere(rule,now),...(after?{id:{gt:after}}:{})},orderBy:{id:'asc'},take:BATCH+1,include:{customer:{select:{name:true}},contract:{select:{active:true}}}});
    const page=rows.slice(0,BATCH);scanned+=page.length;const more=rows.length>BATCH;continuation ||= more;cursors[rule]=more?page.at(-1)!.id:'';
    for(const row of page){
     if(rule==='LEAD_CALLBACK'&&!eligibleLead(row,now))continue;
     const source=describe(rule,row),dedupeKey=digest({rule,sourceId:row.id,fingerprint:source.fingerprint});
     const result=await tx.omegaMission.createMany({data:[{rule,sourceId:row.id,dedupeKey,...source}],skipDuplicates:true});created+=result.count;
    }
   }
   await tx.omegaSupervisorControl.update({where:{id:CONTROL},data:{cursors,lastRunAt:now}});
   await tx.auditEvent.create({data:{actorId,actorRole:actorId==='omega-native-supervisor'?'OMEGA':'ADMIN',action:'OMEGA_SUPERVISOR_CYCLE',entityType:'OmegaSupervisorControl',entityId:CONTROL,after:{created,scanned,continuation,externalEffects:false}}});
   return {enabled:true,busy:false,created,scanned,continuation,externalEffects:false};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
 }
 async board(input:unknown,actor:AccessActor){
  access(actor);const v=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),status:z.enum(['OPEN','CLOSED','DRAFT','APPROVED']).default('OPEN'),rule:ruleSchema.optional(),search:z.string().trim().max(100).default('')}).strict().parse(input);
  const allowed=supervisorRules.filter(rule=>rule==='LEAD_CALLBACK'?['leads.read','leads.write','leads.all'].every(p=>actor.permissions.includes(p as Permission)):actor.permissions.includes('dispatch'));
  if(v.rule&&!allowed.includes(v.rule))throw new DomainError('FORBIDDEN','Scénario non autorisé.',403);
  const statuses=v.status==='OPEN'?['DRAFT','APPROVED']:v.status==='CLOSED'?['DONE','DISMISSED']:[v.status];
  // PostgreSQL LIKE metacharacters are literal user input, never extra wildcards.
  const literal=v.search.replace(/[\\%_]/g,'\\$&');
  const where:Prisma.OmegaMissionWhereInput={rule:v.rule??{in:allowed},status:{in:statuses},...(literal?{OR:['label','detail','note','sourceId'].map(field=>({[field]:{contains:literal,mode:'insensitive'}}))}:{})};
  const now=this.now();
  return this.db.$transaction(async tx=>{
   const control=await tx.omegaSupervisorControl.findUnique({where:{id:CONTROL}}),total=await tx.omegaMission.count({where});
   const rows=await tx.omegaMission.findMany({where,orderBy:[{priority:'asc'},{createdAt:'asc'},{id:'asc'}],skip:(v.page-1)*25,take:25});
   const groups=await tx.omegaMission.groupBy({by:['rule','status'],where:{rule:{in:allowed}},_count:{_all:true}});
   const counts:Record<string,number>={DRAFT:0,APPROVED:0,DONE:0,DISMISSED:0};const byRule=Object.fromEntries(allowed.map(rule=>[rule,{open:0,done:0}]));
   for(const group of groups){counts[group.status]=(counts[group.status]??0)+group._count._all;if(['DRAFT','APPROVED'].includes(group.status))byRule[group.rule].open+=group._count._all;if(group.status==='DONE')byRule[group.rule].done+=group._count._all;}
   const completedLast7Days=await tx.omegaMission.count({where:{rule:{in:allowed},status:'DONE',closedAt:{gte:new Date(now.getTime()-7*86400000),lte:now}}});
   const summary={open:counts.DRAFT+counts.APPROVED,pending:counts.DRAFT,approved:counts.APPROVED,done:counts.DONE,dismissed:counts.DISMISSED,completedLast7Days,byRule};
   const missions=[];for(const row of rows){const source=await current(tx,ruleSchema.parse(row.rule),row.sourceId,this.now());missions.push({...row,current:source?.fingerprint===row.fingerprint,view:row.rule==='LEAD_CALLBACK'?'leads':'visits'})}
   return {control:control?{id:control.id,enabled:control.enabled,rules:control.rules.filter(rule=>allowed.includes(rule as Rule)),version:control.version,lastRunAt:control.lastRunAt}:defaultControl,allowedRules:allowed,missions,summary,filters:{status:v.status,rule:v.rule??null,search:v.search},total,page:v.page,pageSize:25,hasMore:v.page*25<total,mode:'INTERNAL_MISSIONS_ONLY',externalEffects:false};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
 }
 async review(input:unknown,actor:AccessActor){
  access(actor);const v=decisionSchema.parse(input);
  return this.db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928370)`;
   return this.decide(tx,v,actor);
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
 async detail(input:unknown,actor:AccessActor){
  access(actor);const {id}=z.object({id:z.string().min(1).max(100)}).strict().parse(input);
  return this.db.$transaction(async tx=>{
   const mission=await tx.omegaMission.findUnique({where:{id}});if(!mission)throw new DomainError('NOT_FOUND','Mission introuvable.',404);
   const rule=ruleSchema.parse(mission.rule);grant(rule,actor);const now=this.now();
   const row:any=rule==='LEAD_CALLBACK'?await tx.lead.findUnique({where:{id:mission.sourceId},include:leadInclude}):await tx.visit.findUnique({where:{id:mission.sourceId},include:{customer:{select:{name:true}},contract:{select:{active:true}}}});
   const fresh=await current(tx,rule,mission.sourceId,now);
   const explanation:Record<Rule,string>={OVERDUE_VISIT:'Le début prévu est passé sans démarrage, ou la fin prévue est dépassée pour une visite en cours.',UNCONFIRMED_VISIT:'La visite est en attente, proposée ou à replanifier. Une confirmation humaine reste nécessaire.',UNSCHEDULED_VISIT:'La visite est confirmée, sans créneau, et son contrat est actif.',LEAD_CALLBACK:'Le rappel du prospect actif est arrivé à échéance. Les restrictions de contact bloquent sa préparation.'};
   const restricted=rule==='LEAD_CALLBACK'&&!!row&&!eligibleLead(row,now)&&(row.status==='DO_NOT_CONTACT'||row.sourcePin?.status==='DO_NOT_CONTACT'||row.sourcePin?.type?.restricted===true);
   const isCurrent=fresh?.fingerprint===mission.fingerprint;
   const reason=!row?'Le dossier source n’existe plus.':restricted?'Une restriction de prospection interdit l’approbation.':!fresh?'Le dossier ne correspond plus à ce scénario.':!isCurrent?'Le dossier a changé depuis la préparation de cette mission.':'La source correspond toujours à la mission préparée.';
   const source={present:!!row,eligible:!!fresh,current:isCurrent,reason,status:row?.status??null,...(rule==='LEAD_CALLBACK'?{followUpAt:row?.followUpAt??null,restricted,ownerAssigned:!!row?.ownerId}:{startsAt:row?.startsAt??null,endsAt:row?.endsAt??null,contractActive:row?.contract?.active??null,technicianAssigned:!!row?.technicianId})};
   const allowed=actor.permissions.includes('audit'),where={entityType:'OmegaMission',entityId:id,action:{in:['OMEGA_MISSION_APPROVE','OMEGA_MISSION_DONE','OMEGA_MISSION_DISMISS','OMEGA_MISSION_SUPERSEDED']}};
   const total=allowed?await tx.auditEvent.count({where}):0;
   const events=allowed?await tx.auditEvent.findMany({where,orderBy:[{createdAt:'asc'},{id:'asc'}],take:25,select:{id:true,action:true,actorId:true,actorRole:true,createdAt:true,after:true}}):[];
   const history={allowed,total,hasMore:total>events.length,events:events.map(event=>{
    const after=event.after&&typeof event.after==='object'&&!Array.isArray(event.after)?event.after as Record<string,unknown>:{};
    return {id:event.id,action:event.action,createdAt:event.createdAt,actor:event.actorId===actor.id?'Vous':event.actorRole==='OMEGA'?'OMEGA':'Utilisateur autorisé',note:typeof after.note==='string'?after.note.slice(0,1000):null};
   })};
   return {mission,explanation:explanation[rule],source,history,checkedAt:now.toISOString(),mode:'READ_ONLY',externalEffects:false};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
 }
 async reviewBatch(input:unknown,actor:AccessActor){
  access(actor);const v=z.object({missions:z.array(z.object({id:z.string().min(1).max(100),expectedVersion:z.number().int().positive()}).strict()).min(1).max(25),action:z.enum(['APPROVE','DISMISS']),note:z.string().trim().min(3).max(1000),approved:z.literal(true)}).strict().parse(input);
  if(new Set(v.missions.map(m=>m.id)).size!==v.missions.length)throw new DomainError('DUPLICATE_MISSION','Une mission ne peut figurer deux fois dans une décision.',400);
  return this.db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928370)`;
   for(const mission of v.missions)await this.decide(tx,{...mission,action:v.action,note:v.note,approved:v.approved},actor);
   return {reviewed:v.missions.length,action:v.action,externalEffects:false};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
 }
 async reconcile(input:unknown,actor:AccessActor){
  access(actor);const v=z.object({missions:z.array(z.object({id:z.string().min(1).max(100),expectedVersion:z.number().int().positive()}).strict()).min(1).max(25),approved:z.literal(true)}).strict().parse(input);
  if(new Set(v.missions.map(m=>m.id)).size!==v.missions.length)throw new DomainError('DUPLICATE_MISSION','Une mission ne peut figurer deux fois dans un nettoyage.',400);
  return this.db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928370)`;
   for(const candidate of v.missions){
    const before=await tx.omegaMission.findUnique({where:{id:candidate.id}});if(!before)throw new DomainError('NOT_FOUND','Mission introuvable.',404);
    const rule=ruleSchema.parse(before.rule);grant(rule,actor);
    if(before.version!==candidate.expectedVersion)throw new DomainError('VERSION_CONFLICT','La mission a changé. Actualisez OMEGA.',409);
    if(before.status!=='DRAFT')throw new DomainError('CLEANUP_DRAFT_REQUIRED','Seules les propositions non approuvées peuvent être nettoyées.',409);
    const source=await current(tx,rule,before.sourceId,this.now());
    if(source?.fingerprint===before.fingerprint)throw new DomainError('MISSION_STILL_CURRENT','Une proposition est encore pertinente. Actualisez OMEGA avant de nettoyer.',409);
    const note=source?'Proposition écartée : le dossier a changé depuis sa préparation. Relancer une analyse pour préparer une nouvelle mission.':'Proposition écartée : le dossier ne correspond plus au scénario ou sa source est absente. Aucun dossier client modifié.';
    await tx.omegaMission.update({where:{id:before.id,version:before.version},data:{status:'DISMISSED',note,reviewedBy:actor.id,closedAt:this.now(),version:{increment:1}}});
    await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:'OMEGA_MISSION_SUPERSEDED',entityType:'OmegaMission',entityId:before.id,after:{status:'DISMISSED',note,reason:source?'SOURCE_CHANGED':'SOURCE_NOT_ELIGIBLE',externalEffects:false}}});
   }
   return {reconciled:v.missions.length,externalEffects:false,clientChanges:false};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
 }
 private async decide(tx:DB,v:z.infer<typeof decisionSchema>,actor:AccessActor){
   const before=await tx.omegaMission.findUnique({where:{id:v.id}});if(!before)throw new DomainError('NOT_FOUND','Mission introuvable.',404);
   grant(ruleSchema.parse(before.rule),actor);
   if(before.version!==v.expectedVersion)throw new DomainError('VERSION_CONFLICT','La mission a changé. Actualisez OMEGA.',409);
   if(['DONE','DISMISSED'].includes(before.status))throw new DomainError('MISSION_CLOSED','Cette mission est clôturée.',409);
   if(v.action!=='DISMISS'){
    if(v.action==='APPROVE'){
    const source=await current(tx,ruleSchema.parse(before.rule),before.sourceId,this.now());
    if(source?.fingerprint!==before.fingerprint)throw new DomainError('STALE_MISSION','Le dossier a changé. Écartez cette mission et relancez une analyse.',409);
    }
    if(v.action==='APPROVE'&&before.status!=='DRAFT'||v.action==='DONE'&&before.status!=='APPROVED')throw new DomainError('INVALID_TRANSITION','Approuvez la mission avant sa clôture.',409);
   }
   const status=v.action==='APPROVE'?'APPROVED':v.action==='DONE'?'DONE':'DISMISSED';
   const result=await tx.omegaMission.update({where:{id:before.id,version:v.expectedVersion},data:{status,note:v.note,reviewedBy:actor.id,version:{increment:1},closedAt:status==='APPROVED'?null:this.now()}});
   await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:'OMEGA_MISSION_'+v.action,entityType:'OmegaMission',entityId:before.id,after:{status,note:v.note,externalEffects:false}}});return result;
 }
}

import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {requirePermission,type AccessActor} from '../lib/access';
import {DomainError,dayBounds,localParts} from './rules';
const fields=z.object({name:z.string().trim().min(1).max(200),dailyTarget:z.number().int().min(0).max(30),fridayTarget:z.number().int().min(0).max(30),active:z.boolean()}).strict();
export class TechnicianSettings {
 constructor(private db:PrismaClient,private now=()=>new Date()){}
 list(actor:AccessActor){requirePermission(actor,'crm.read');return this.db.technician.findMany({orderBy:[{active:'desc'},{name:'asc'},{id:'asc'}]});}
 async save(technicianId:string|null,input:unknown,actor:AccessActor){
  requirePermission(actor,'crm.read');requirePermission(actor,'settings');
  const v=technicianId?fields.extend({expectedVersion:z.number().int().positive()}).parse(input):fields.parse(input);
  return this.db.$transaction(async tx=>{
   const before=technicianId?await tx.technician.findUnique({where:{id:technicianId}}):null;
   if(technicianId&&!before)throw new DomainError('NOT_FOUND','Technicien introuvable.',404);
   if(before&&before.version!==('expectedVersion' in v?v.expectedVersion:0))throw new DomainError('VERSION_CONFLICT','Cette configuration a changé. Actualisez l’équipe.',409);
   if(before){
    const p=localParts(this.now()),today=dayBounds(`${p.year}-${p.month}-${p.day}`).start;
    const visits=await tx.visit.findMany({where:{technicianId:before.id,startsAt:{gte:today},status:{notIn:['CANCELLED','RESCHEDULED']}},select:{startsAt:true,status:true},take:10001});
    if(visits.length>10000)throw new DomainError('SCOPE_TOO_LARGE','Vérifiez les affectations avant cette modification.',413);
    if(!v.active&&visits.some(row=>row.status!=='COMPLETED'))throw new DomainError('ASSIGNED_VISITS','Réattribuez les interventions encore affectées avant de désactiver ce technicien.',409);
    const counts=new Map<string,{count:number;friday:boolean}>();
    for(const visit of visits){const d=localParts(visit.startsAt!);const key=`${d.year}-${d.month}-${d.day}`;const old=counts.get(key);counts.set(key,{count:(old?.count||0)+1,friday:d.weekday==='Fri'});}
    if([...counts.values()].some(day=>day.count>(day.friday?v.fridayTarget:v.dailyTarget)))throw new DomainError('CAPACITY_BELOW_BOOKINGS','La capacité proposée est inférieure aux interventions déjà affectées. Aucun rendez-vous déplacé.',409);
   }
   const data={name:v.name,dailyTarget:v.dailyTarget,fridayTarget:v.fridayTarget,active:v.active};
   const row=before?await tx.technician.update({where:{id:before.id,version:before.version},data:{...data,version:{increment:1}}}):await tx.technician.create({data});
   await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:before?'TECHNICIAN_UPDATED':'TECHNICIAN_CREATED',entityType:'Technician',entityId:row.id,...(before?{before:JSON.parse(JSON.stringify(before))}:{}),after:JSON.parse(JSON.stringify(row))}});
   return row;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
}

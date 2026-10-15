import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {dayBounds,DomainError} from '../domain/rules';
import {requirePermission,type AccessActor} from './access';
import {nativeDailyTarget} from './native-operations';
export async function nativeDispatch(db:PrismaClient,input:unknown,actor:AccessActor){
 requirePermission(actor,'crm.read');
 const {date,queue,page}=z.object({date:z.string(),queue:z.enum(['UNSCHEDULED','FOLLOW_UP']).default('UNSCHEDULED'),page:z.coerce.number().int().min(1).max(4000).default(1)}).strict().parse(input),bounds=dayBounds(date);
 return db.$transaction(async tx=>{
  const unscheduled:Prisma.VisitWhereInput={startsAt:null,status:{notIn:['CANCELLED','COMPLETED']},contract:{active:true}},followup:Prisma.VisitWhereInput={status:{in:['FAILED','NO_ACCESS','NEEDS_FOLLOWUP']}},day:Prisma.VisitWhereInput={startsAt:{gte:bounds.start,lt:bounds.end},status:{notIn:['CANCELLED','RESCHEDULED']}};
  const [waiting,ready,attention,scheduled,team,counts]=await Promise.all([tx.visit.count({where:unscheduled}),tx.visit.count({where:{...unscheduled,status:'CONFIRMED'}}),tx.visit.count({where:followup}),tx.visit.count({where:day}),tx.technician.findMany({where:{active:true},orderBy:[{name:'asc'},{id:'asc'}],take:101,select:{id:true,name:true,dailyTarget:true,fridayTarget:true}}),tx.visit.groupBy({by:['technicianId'],where:day,_count:{_all:true}})]);
  if(team.length>100)throw new DomainError('TEAM_TOO_LARGE','L’équipe dépasse le périmètre de ce tableau.',413);
  const rows=await tx.visit.findMany({where:queue==='FOLLOW_UP'?followup:unscheduled,take:25,skip:(page-1)*25,orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,service:true,status:true,startsAt:true,durationMinutes:true,customer:{select:{id:true,name:true}},property:{select:{address:true}},technician:{select:{name:true}}}});
  return {date,timezone:'America/Toronto',source:'POSTGRESQL',externalEffects:false,queue,page,pageSize:25,total:queue==='FOLLOW_UP'?attention:waiting,summary:{waiting,ready,attention,scheduled,unassigned:counts.find(c=>c.technicianId===null)?._count._all??0},team:team.map(tech=>{const target=nativeDailyTarget(tech,bounds.weekday),assigned=counts.find(c=>c.technicianId===tech.id)?._count._all??0;return {id:tech.id,name:tech.name,target,assigned,remaining:Math.max(0,target-assigned)}}),rows};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

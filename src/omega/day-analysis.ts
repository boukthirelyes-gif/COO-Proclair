import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {dayBounds,DomainError} from '../domain/rules';
import {findAvailableSlot} from '../domain/fill-slots';
import {requirePermission,type AccessActor} from '../lib/access';

export async function omegaDayAnalysis(db:PrismaClient,input:unknown,actor:AccessActor){
 requirePermission(actor,'omega');requirePermission(actor,'crm.read');
 const date=z.string().parse(input),bounds=dayBounds(date),workingDay=!['Sat','Sun'].includes(bounds.weekday);
 return db.$transaction(async tx=>{
  const team=await tx.technician.findMany({where:{active:true},orderBy:[{name:'asc'},{id:'asc'}],take:101});
  if(team.length>100)throw new DomainError('TEAM_TOO_LARGE','L’analyse de cette équipe dépasse le périmètre disponible.',413);
  const visits=await tx.visit.findMany({where:{technicianId:{in:team.map(t=>t.id)},status:{notIn:['CANCELLED','RESCHEDULED']},startsAt:{gte:bounds.start,lt:bounds.end}},select:{technicianId:true,startsAt:true,endsAt:true},take:10001});
  if(visits.length>10000)throw new DomainError('SCOPE_TOO_LARGE','Trop de créneaux pour cette analyse ; aucune simulation partielle produite.',413);
  const readyCandidateCount=await tx.visit.count({where:{status:'CONFIRMED',startsAt:null,contract:{active:true}}});
  const technicians=team.map(tech=>{
   const busy=visits.filter(v=>v.technicianId===tech.id).map(v=>({startsAt:v.startsAt,endsAt:v.endsAt}));
   const dailyTarget=workingDay?(bounds.weekday==='Fri'?tech.fridayTarget:tech.dailyTarget):0;
   const remainingTarget=Math.max(0,dailyTarget-busy.length),slots:{startsAt:string;endsAt:string}[]=[];
   const incomplete=busy.some(v=>!v.startsAt||!v.endsAt);
   if(workingDay&&!incomplete)for(let i=0;i<remainingTarget;i++){
    const slot=findAvailableSlot(new Date(bounds.start.getTime()+8*3600000),new Date(bounds.start.getTime()+17*3600000),60,busy,30);
    if(!slot)break;slots.push({startsAt:slot.startsAt.toISOString(),endsAt:slot.endsAt.toISOString()});busy.push(slot);
   }
   return {id:tech.id,name:tech.name,bookedCount:visits.filter(v=>v.technicianId===tech.id).length,dailyTarget,remainingTarget,slots,reason:!workingDay?'Jour hors des horaires lundi-vendredi.':incomplete?'Créneau incomplet : vérification humaine nécessaire.':!remainingTarget?'Objectif atteint ou nul.':!slots.length?'Aucun créneau de 60 minutes avec la marge prévue.':'Créneaux théoriques à confronter aux visites et déplacements réels.'};
  });
  return {date,timezone:'America/Toronto',mode:'HEURISTIC_READ_ONLY',durationMinutes:60,bufferMinutes:30,readyCandidateCount,technicians,reasons:workingDay?['Scénario de visites de 60 minutes entre 8 h et 17 h, avec marge fixe. Les durées réelles peuvent modifier les possibilités.']:['Aucune proposition de créneau pendant la fin de semaine.'],externalEffects:false,planningEffects:false};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

import {torontoDate} from '../lib/toronto';
export type Actor = {id:string; role:'ADMIN'|'DISPATCHER'|'VIEWER'|'OMEGA'};
export class DomainError extends Error { constructor(public code:string,message:string,public status=422){super(message);} }
export const transitions: Record<string,string[]> = {
 PENDING:['PROPOSED','CONFIRMED','CANCELLED'],PROPOSED:['CONFIRMED','CANCELLED','PENDING'],CONFIRMED:['SCHEDULED','CANCELLED','RESCHEDULED'],SCHEDULED:['IN_PROGRESS','CANCELLED','RESCHEDULED','NO_ACCESS'],IN_PROGRESS:['COMPLETED','FAILED','NO_ACCESS','NEEDS_FOLLOWUP'],RESCHEDULED:['PROPOSED','CONFIRMED','CANCELLED'],NO_ACCESS:['NEEDS_FOLLOWUP','RESCHEDULED'],FAILED:['NEEDS_FOLLOWUP','RESCHEDULED'],NEEDS_FOLLOWUP:['RESCHEDULED','CANCELLED'],COMPLETED:[],CANCELLED:[]
};
export function assertTransition(from:string,to:string){if(from!==to&&!transitions[from]?.includes(to))throw new DomainError('INVALID_TRANSITION',`Transition ${from} → ${to} interdite.`);}
export function authorize(actor:Actor){if(!actor?.id||!['ADMIN','DISPATCHER','OMEGA'].includes(actor.role))throw new DomainError('FORBIDDEN','Autorisation de gestion requise.',403);}
export function localParts(date:Date){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(date);return Object.fromEntries(p.map(x=>[x.type,x.value]));}
export function validateSlot(start:Date,end:Date,duration:number){if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime()))throw new DomainError('INVALID_SLOT','Date invalide.');const a=localParts(start),b=localParts(end);if(end.getTime()-start.getTime()!==duration*60000)throw new DomainError('INVALID_SLOT','La durée doit correspondre au créneau.');if(['Sat','Sun'].includes(a.weekday)||a.year!==b.year||a.month!==b.month||a.day!==b.day||Number(a.hour)<8||Number(b.hour)>17||(Number(b.hour)===17&&Number(b.minute)>0))throw new DomainError('WORKING_HOURS','Heures de travail : lundi à vendredi, 08:00–17:00 (Toronto).');}
export function dayBounds(day:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new DomainError('INVALID_DATE','Date ISO requise.');
 const base=new Date(`${day}T12:00:00Z`);if(!Number.isFinite(base.getTime())||base.toISOString().slice(0,10)!==day)throw new DomainError('INVALID_DATE','Date invalide.');
 const next=new Date(base.getTime()+86400000).toISOString().slice(0,10);
 return {start:new Date(torontoDate(day+'T00:00')),end:new Date(torontoDate(next+'T00:00')),weekday:localParts(base).weekday};
}

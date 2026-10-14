import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {dayBounds,DomainError} from '../domain/rules';
import {requirePermission,type AccessActor} from '../lib/access';
const escapeText=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
/** RFC 5545 limits physical lines to 75 UTF-8 octets, including continuation space. */
export function calendarLine(value:string){
 let line='',output='';for(const character of value){if(Buffer.byteLength(line+character,'utf8')>75){output+=line+'\r\n';line=' '}line+=character}return output+line+'\r\n';
}
const stamp=(value:Date)=>value.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export async function exportCalendar(db:PrismaClient,input:unknown,actor:AccessActor,now=new Date()){
 requirePermission(actor,'integrations');requirePermission(actor,'crm.read');requirePermission(actor,'export');
 const {start,end}=z.object({start:z.string(),end:z.string()}).strict().parse(input),from=dayBounds(start).start;
 dayBounds(end);const days=(Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000+1;
 if(days<1||days>31)throw new DomainError('INVALID_CALENDAR_RANGE','Choisissez une période de 1 à 31 jours.',400);
 const following=new Date(Date.parse(end+'T12:00:00Z')+86400000).toISOString().slice(0,10),until=dayBounds(following).start;
 return db.$transaction(async tx=>{
  const rows=await tx.visit.findMany({where:{startsAt:{gte:from,lt:until},status:{notIn:['CANCELLED','RESCHEDULED']}},take:2001,orderBy:[{startsAt:'asc'},{id:'asc'}],select:{id:true,service:true,status:true,startsAt:true,endsAt:true,updatedAt:true,version:true,customer:{select:{name:true}},property:{select:{address:true}},technician:{select:{name:true}}}});
  if(rows.length>2000)throw new DomainError('CALENDAR_TOO_LARGE','Plus de 2 000 rendez-vous : réduisez la période. Aucun export partiel produit.',413);
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Proclair//CRM Planning//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Planning Proclair','X-WR-TIMEZONE:America/Toronto'];let eventCount=0,skippedCount=0;
  for(const row of rows){
   if(!row.startsAt||!row.endsAt||row.endsAt<=row.startsAt){skippedCount++;continue}
   eventCount++;lines.push('BEGIN:VEVENT','UID:'+Buffer.from(row.id).toString('base64url')+'@proclair.local','DTSTAMP:'+stamp(now),'LAST-MODIFIED:'+stamp(row.updatedAt),'SEQUENCE:'+row.version,'DTSTART:'+stamp(row.startsAt),'DTEND:'+stamp(row.endsAt),'SUMMARY:'+escapeText(row.customer.name+' · '+row.service),'LOCATION:'+escapeText(row.property.address),'DESCRIPTION:'+escapeText('État : '+row.status+'\nTechnicien : '+(row.technician?.name||'Non affecté')),'STATUS:'+(['PENDING','PROPOSED'].includes(row.status)?'TENTATIVE':'CONFIRMED'),'END:VEVENT');
  }
  lines.push('END:VCALENDAR');return {content:lines.map(calendarLine).join(''),eventCount,skippedCount};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

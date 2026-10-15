import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {calendarLine,exportCalendar} from '../src/integrations/calendar';
import {bootstrapActor} from '../src/lib/access';
const {Client}=createRequire(import.meta.url)('pg');
test('calendar export refuses missing grants and invalid ranges before reading any records',async()=>{
 for(const permission of ['integrations','crm.read','export'])await assert.rejects(()=>exportCalendar({} as PrismaClient,{start:'2026-10-14',end:'2026-10-14'},{...bootstrapActor,permissions:bootstrapActor.permissions.filter(p=>p!==permission)}),{code:'FORBIDDEN'});
 for(const range of [{start:'2026-10-14',end:'2026-10-13'},{start:'2026-10-01',end:'2026-11-01'}])await assert.rejects(()=>exportCalendar({} as PrismaClient,range,bootstrapActor),{code:'INVALID_CALENDAR_RANGE'});
 await assert.rejects(()=>exportCalendar({} as PrismaClient,{start:'2026-02-30',end:'2026-03-01'},bootstrapActor),{code:'INVALID_DATE'});
});
test('calendar UTF-8 folding preserves accented characters and RFC line lengths',()=>{
 const original='SUMMARY:'+('Été 🧽 '.repeat(40));const folded=calendarLine(original);assert.ok(folded.split('\r\n').every(line=>Buffer.byteLength(line)<=75));assert.equal(folded.replace(/\r\n /g,'').replace(/\r\n$/,''),original);
});
test('calendar export uses Toronto day bounds, escaped text and stable native UIDs without writes',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='calendar_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));

  const customer=await db.customer.create({data:{name:'Client, été; spécial'}}),property=await db.property.create({data:{customerId:customer.id,address:'Rue\r\nBEGIN:VEVENT'}}),contract=await db.contract.create({data:{customerId:customer.id,propertyId:property.id,name:'Fixture',service:'Cleaning',totalVisits:20,priceCents:10000}}),job=await db.job.create({data:{customerId:customer.id,propertyId:property.id,contractId:contract.id,name:'Fixture'}});
  const base={customerId:customer.id,propertyId:property.id,contractId:contract.id,jobId:job.id,service:'Été '.repeat(35),durationMinutes:60,priceCents:10000};
  await db.visit.createMany({data:[{...base,id:'calendar-one',status:'SCHEDULED',startsAt:new Date('2026-11-01T04:30:00Z'),endsAt:new Date('2026-11-01T05:30:00Z'),passageNumber:1},{...base,id:'calendar-two',status:'PENDING',startsAt:new Date('2026-11-02T04:30:00Z'),endsAt:new Date('2026-11-02T05:30:00Z'),passageNumber:2},{...base,id:'calendar-outside',status:'SCHEDULED',startsAt:new Date('2026-11-02T05:30:00Z'),endsAt:new Date('2026-11-02T06:30:00Z'),passageNumber:3},{...base,status:'CANCELLED',startsAt:new Date('2026-11-01T08:30:00Z'),endsAt:new Date('2026-11-01T09:30:00Z'),passageNumber:4},{...base,status:'RESCHEDULED',startsAt:new Date('2026-11-01T08:30:00Z'),endsAt:new Date('2026-11-01T09:30:00Z'),passageNumber:5},{...base,status:'SCHEDULED',startsAt:new Date('2026-11-01T08:30:00Z'),passageNumber:6}]});
  const original=await db.visit.findMany({orderBy:{id:'asc'}}),audit=await db.auditEvent.count();
  const exported=await exportCalendar(db,{start:'2026-11-01',end:'2026-11-01'},bootstrapActor,new Date('2026-10-14T12:00:00Z')),unfolded=exported.content.replace(/\r\n /g,'');
  assert.equal(exported.eventCount,2);assert.equal(exported.skippedCount,1);assert.ok(unfolded.includes('STATUS:TENTATIVE'));assert.ok(unfolded.includes('STATUS:CONFIRMED'));assert.equal(unfolded.split('\r\n').filter(line=>line==='BEGIN:VEVENT').length,2);
  assert.ok(unfolded.includes('SUMMARY:Client\\, été\\; spécial'));assert.ok(unfolded.includes('LOCATION:Rue\\nBEGIN:VEVENT'));assert.ok(unfolded.includes('DTSTART:20261102T043000Z'));assert.ok(!unfolded.includes('DTSTART:20261102T053000Z'));
  assert.ok(exported.content.split('\r\n').every(line=>Buffer.byteLength(line)<=75));assert.ok(unfolded.includes('UID:'+Buffer.from('calendar-one').toString('base64url')+'@proclair.local'));
  assert.deepEqual(await db.visit.findMany({orderBy:{id:'asc'}}),original);assert.equal(await db.auditEvent.count(),audit);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

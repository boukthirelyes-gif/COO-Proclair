import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {omegaDayAnalysis} from '../src/omega/day-analysis';
import {bootstrapActor} from '../src/lib/access';
const {Client}=createRequire(import.meta.url)('pg');
test('OMEGA capacity rejects missing permissions and invalid calendar days before database access',async()=>{
 for(const permission of ['omega','crm.read'])await assert.rejects(()=>omegaDayAnalysis({} as PrismaClient,'2026-10-14',{...bootstrapActor,permissions:bootstrapActor.permissions.filter(p=>p!==permission)}),{code:'FORBIDDEN'});
 for(const date of ['2026-02-30','invalid'])await assert.rejects(()=>omegaDayAnalysis({} as PrismaClient,date,bootstrapActor),{code:'INVALID_DATE'});
});
test('OMEGA capacity respects targets, occupied intervals and 30-minute margins without planning writes',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='omega_day_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));
  const free=await db.technician.create({data:{name:'Free',dailyTarget:4,fridayTarget:2}}),busy=await db.technician.create({data:{name:'Busy',dailyTarget:4,fridayTarget:2}}),incomplete=await db.technician.create({data:{name:'Incomplete',dailyTarget:4,fridayTarget:2}});
  await db.technician.create({data:{name:'Inactive',active:false}});
  const customer=await db.customer.create({data:{name:'Capacity fixture'}}),property=await db.property.create({data:{customerId:customer.id,address:'Fixture'}}),contract=await db.contract.create({data:{customerId:customer.id,propertyId:property.id,name:'Capacity fixture',service:'Cleaning',totalVisits:20,priceCents:10000}}),job=await db.job.create({data:{customerId:customer.id,propertyId:property.id,contractId:contract.id,name:'Fixture'}});
  const base={customerId:customer.id,propertyId:property.id,contractId:contract.id,jobId:job.id,service:'Cleaning',durationMinutes:60,priceCents:10000};
  await db.visit.createMany({data:[{...base,technicianId:free.id,status:'SCHEDULED',startsAt:new Date('2026-10-14T14:00:00Z'),endsAt:new Date('2026-10-14T15:00:00Z'),passageNumber:1},{...base,technicianId:busy.id,status:'SCHEDULED',startsAt:new Date('2026-10-14T12:00:00Z'),endsAt:new Date('2026-10-14T21:00:00Z'),passageNumber:2},{...base,technicianId:incomplete.id,status:'SCHEDULED',startsAt:new Date('2026-10-14T14:00:00Z'),passageNumber:3},{...base,status:'CONFIRMED',passageNumber:4},{...base,status:'PENDING',passageNumber:5}]});
  const original=await db.visit.findMany({orderBy:{id:'asc'}}),before={plans:await db.omegaPlan.count(),jobs:await db.workerJob.count(),audit:await db.auditEvent.count()};
  const day=await omegaDayAnalysis(db,'2026-10-14',bootstrapActor),row=day.technicians.find(t=>t.id===free.id)!;
  assert.equal(day.mode,'HEURISTIC_READ_ONLY');assert.equal(day.externalEffects,false);assert.equal(day.planningEffects,false);assert.equal(day.readyCandidateCount,1);assert.equal(day.technicians.length,3);
  assert.equal(row.bookedCount,1);assert.equal(row.remainingTarget,3);assert.equal(row.slots.length,3);
  assert.deepEqual(row.slots.map(s=>[s.startsAt,s.endsAt]),[['2026-10-14T12:00:00.000Z','2026-10-14T13:00:00.000Z'],['2026-10-14T15:30:00.000Z','2026-10-14T16:30:00.000Z'],['2026-10-14T17:00:00.000Z','2026-10-14T18:00:00.000Z']]);
  const full=day.technicians.find(t=>t.id===busy.id)!;assert.equal(full.remainingTarget,3);assert.equal(full.slots.length,0);
  const broken=day.technicians.find(t=>t.id===incomplete.id)!;assert.equal(broken.slots.length,0);assert.match(broken.reason,/incomplet/);
  const friday=await omegaDayAnalysis(db,'2026-10-16',bootstrapActor);assert.equal(friday.technicians.find(t=>t.id===free.id)!.slots.length,2);assert.equal(friday.technicians.find(t=>t.id===free.id)!.dailyTarget,2);
  const weekend=await omegaDayAnalysis(db,'2026-10-17',bootstrapActor);assert.ok(weekend.technicians.every(t=>t.dailyTarget===0&&t.slots.length===0));
  assert.deepEqual(await db.visit.findMany({orderBy:{id:'asc'}}),original);assert.equal(await db.omegaPlan.count(),before.plans);assert.equal(await db.workerJob.count(),before.jobs);assert.equal(await db.auditEvent.count(),before.audit);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

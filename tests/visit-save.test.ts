import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {CRMService} from '../src/domain/service';
const {Client}=createRequire(import.meta.url)('pg'),admin={id:'admin',role:'ADMIN' as const};
test('atomic visit form requires mutation rights and excludes immutable prices',async()=>{
 const crm=new CRMService({} as PrismaClient);await assert.rejects(()=>crm.saveVisit('fixture',{expectedVersion:1},{id:'viewer',role:'VIEWER'}),{code:'FORBIDDEN'});await assert.rejects(()=>crm.saveVisit('fixture',{expectedVersion:1,priceCents:1},admin));
});
test('atomic visit form rolls back invalid transitions, preserves cancelled history and clears rescheduled slots',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='visit_save_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));



  const tech=await db.technician.create({data:{name:'Fixture',dailyTarget:4,fridayTarget:2}}),customer=await db.customer.create({data:{name:'Atomic fixture'}}),property=await db.property.create({data:{customerId:customer.id,address:'Fixture'}}),contract=await db.contract.create({data:{customerId:customer.id,propertyId:property.id,name:'Fixture',service:'Cleaning',totalVisits:3,priceCents:10000}}),job=await db.job.create({data:{customerId:customer.id,propertyId:property.id,contractId:contract.id,name:'Fixture'}});
  const crm=new CRMService(db),base={customerId:customer.id,propertyId:property.id,contractId:contract.id,jobId:job.id,service:'Fixture',durationMinutes:60,priceCents:10000};
  const visit=await db.visit.create({data:{...base,status:'CONFIRMED',passageNumber:1}});
  const scheduled=await crm.saveVisit(visit.id,{expectedVersion:1,status:'SCHEDULED',technicianId:tech.id,startsAt:'2026-10-14T14:00:00Z',endsAt:'2026-10-14T15:00:00Z',notes:'Atomic schedule'},admin);assert.equal(scheduled.version,2);assert.equal(scheduled.status,'SCHEDULED');
  const audits=await db.auditEvent.count();await assert.rejects(()=>crm.saveVisit(visit.id,{expectedVersion:2,status:'PENDING',notes:'Must never persist'},admin),{code:'INVALID_TRANSITION'});assert.deepEqual(await db.visit.findUnique({where:{id:visit.id}}),scheduled);assert.equal(await db.auditEvent.count(),audits);
  await assert.rejects(()=>crm.saveVisit(visit.id,{expectedVersion:2,technicianId:null,startsAt:null,endsAt:null},admin),{code:'SLOT_REQUIRED'});await assert.rejects(()=>crm.saveVisit(visit.id,{expectedVersion:1,notes:'Stale'},admin),{code:'VERSION_CONFLICT'});
  await assert.rejects(()=>crm.saveVisit(visit.id,{expectedVersion:2,status:'CANCELLED',startsAt:'2026-10-14T16:00:00Z',endsAt:'2026-10-14T17:00:00Z'},admin),{code:'CANCEL_SLOT_CHANGE'});
  const reported=await crm.saveVisit(visit.id,{expectedVersion:2,status:'RESCHEDULED',notes:'Explicit report'},admin);assert.equal(reported.version,3);assert.equal(reported.startsAt,null);assert.equal(reported.endsAt,null);assert.equal(reported.technicianId,null);
  const confirm=await crm.saveVisit(visit.id,{expectedVersion:3,status:'CONFIRMED'},admin);assert.equal(confirm.startsAt,null);assert.equal(confirm.status,'CONFIRMED');
  const simultaneous=await Promise.allSettled([crm.saveVisit(visit.id,{expectedVersion:4,notes:'First'},admin),crm.saveVisit(visit.id,{expectedVersion:4,notes:'Second'},admin)]);assert.equal(simultaneous.filter(r=>r.status==='fulfilled').length,1);assert.equal(simultaneous.filter(r=>r.status==='rejected').length,1);
  const second=await db.visit.create({data:{...base,status:'SCHEDULED',technicianId:tech.id,startsAt:new Date('2026-10-14T16:00:00Z'),endsAt:new Date('2026-10-14T17:00:00Z'),passageNumber:2}});await db.technician.update({where:{id:tech.id},data:{active:false}});await db.contract.update({where:{id:contract.id},data:{active:false}});
  const cancelled=await crm.saveVisit(second.id,{expectedVersion:1,status:'CANCELLED',notes:'Cancellation permitted despite inactive configuration'},admin);assert.equal(cancelled.status,'CANCELLED');assert.equal(cancelled.startsAt?.getTime(),second.startsAt?.getTime());assert.equal(cancelled.technicianId,tech.id);await assert.rejects(()=>crm.saveVisit(second.id,{expectedVersion:2,notes:'Reopen'},admin),{code:'TERMINAL_VISIT'});
  const pending=await db.visit.create({data:{...base,status:'PENDING',passageNumber:3}});await assert.rejects(()=>crm.saveVisit(pending.id,{expectedVersion:1,status:'CONFIRMED'},{id:'omega',role:'OMEGA'}),{code:'APPROVAL_REQUIRED'});
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

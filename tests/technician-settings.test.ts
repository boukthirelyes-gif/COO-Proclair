import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {TechnicianSettings} from '../src/domain/technicians';
import {CRMService} from '../src/domain/service';
import {bootstrapActor,userActor,presets} from '../src/lib/access';
const {Client}=createRequire(import.meta.url)('pg');
test('technician settings require settings permission and bounded integer capacities before DB access',async()=>{
 const service=new TechnicianSettings({} as PrismaClient),viewer=userActor({id:'v',name:'V',role:'VIEWER',permissions:presets.VIEWER,sessionVersion:1});
 await assert.rejects(()=>service.save(null,{name:'Test',dailyTarget:4,fridayTarget:2,active:true},viewer),{code:'FORBIDDEN'});
 await assert.rejects(()=>service.save(null,{name:'Test',dailyTarget:31,fridayTarget:2,active:true},bootstrapActor),{name:'ZodError'});
});
test('team CAS and bookings protection preserve visits and invalidate stale Omega capacity and travel margins',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const connectionString=process.env.TEST_DATABASE_URL!,schema='team_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);const db=new PrismaClient({adapter:new PrismaPg({connectionString},{schema})});
 try{
 for(const e of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${e.name}/migration.sql`,'utf8'));
 const service=new TechnicianSettings(db,()=>new Date('2026-10-13')),crm=new CRMService(db),actor=bootstrapActor;
 const tech=await service.save(null,{name:'Fixture tech',dailyTarget:4,fridayTarget:2,active:true},actor);
 const customer=await crm.createCustomer({name:'Fixture'},actor),property=await crm.createProperty({customerId:customer.id,address:'Fixture'},actor),contract=await crm.createContract({customerId:customer.id,propertyId:property.id,name:'Fixture',service:'Vitres',totalVisits:5,priceCents:0},actor),job=await crm.createJob({customerId:customer.id,propertyId:property.id,contractId:contract.id,name:'Fixture'},actor);
 const base={customerId:customer.id,propertyId:property.id,contractId:contract.id,jobId:job.id,service:'Vitres',durationMinutes:60,priceCents:0,status:'CONFIRMED'};
 const existing=await crm.createVisit({...base,passageNumber:1},actor);await crm.updateVisit(existing.id,{expectedVersion:1,technicianId:tech.id,startsAt:'2027-10-25T14:00:00Z',endsAt:'2027-10-25T15:00:00Z'},actor);
 const candidate=await crm.createVisit({...base,passageNumber:2},actor),plan=await crm.previewFill({date:'2027-10-25'},actor);
 assert.equal((plan.proposals as any[])[0].startsAt,'2027-10-25T12:00:00.000Z');
 await assert.rejects(()=>service.save(tech.id,{name:tech.name,dailyTarget:0,fridayTarget:2,active:true,expectedVersion:1},actor),{code:'CAPACITY_BELOW_BOOKINGS'});
 await assert.rejects(()=>service.save(tech.id,{name:tech.name,dailyTarget:4,fridayTarget:2,active:false,expectedVersion:1},actor),{code:'ASSIGNED_VISITS'});
 const revised=await service.save(tech.id,{name:tech.name,dailyTarget:3,fridayTarget:1,active:true,expectedVersion:1},actor);assert.equal(revised.version,2);
 await assert.rejects(()=>service.save(tech.id,{name:tech.name,dailyTarget:4,fridayTarget:2,active:true,expectedVersion:1},actor),{code:'VERSION_CONFLICT'});
 await assert.rejects(()=>crm.applyFill({planId:plan.id,expectedVersion:plan.version,idempotencyKey:'stale-tech-plan',approved:true},actor),{code:'STALE_TECHNICIAN'});
 const fresh=await crm.previewFill({date:'2027-10-25'},actor);
 const neighbor=await crm.createVisit({...base,passageNumber:3,durationMinutes:30},actor);await crm.updateVisit(neighbor.id,{expectedVersion:1,technicianId:tech.id,startsAt:'2027-10-25T13:15:00Z',endsAt:'2027-10-25T13:45:00Z'},actor);
 await assert.rejects(()=>crm.applyFill({planId:fresh.id,expectedVersion:fresh.version,idempotencyKey:'stale-margin-plan',approved:true},actor),{code:'STALE_PLAN'});
 assert.equal((await db.visit.findUniqueOrThrow({where:{id:candidate.id}})).startsAt,null);assert.equal((await db.omegaPlan.findUniqueOrThrow({where:{id:fresh.id}})).status,'PREVIEW');
 const final=await crm.previewFill({date:'2027-10-25'},actor);assert.equal((final.proposals as any[])[0].startsAt,'2027-10-25T15:30:00.000Z');await crm.applyFill({planId:final.id,expectedVersion:final.version,idempotencyKey:'good-margin-plan',approved:true},actor);
 assert.equal((await db.visit.findUniqueOrThrow({where:{id:candidate.id}})).status,'SCHEDULED');assert.equal(await db.auditEvent.count({where:{action:'TECHNICIAN_UPDATED'}}),1);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

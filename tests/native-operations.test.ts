import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {bootstrapActor} from '../src/lib/access';
import {nativeDailyTarget,summarizeNativeOperations} from '../src/lib/native-operations';
import {nativeDispatch} from '../src/lib/native-dispatch';
const {Client}=createRequire(import.meta.url)('pg');
test('native operation capacity excludes weekends, withdrawn slots and inactive technicians',()=>{
 const tech={id:'t',name:'Fixture',dailyTarget:4,fridayTarget:2};assert.equal(nativeDailyTarget(tech,'Sun'),0);assert.equal(nativeDailyTarget(tech,'Fri'),2);assert.equal(nativeDailyTarget({...tech,active:false},'Mon'),0);
 const result=summarizeNativeOperations([{id:'old',technicianId:'t',status:'RESCHEDULED',startsAt:'2026-10-14T16:00:00Z'},{id:'pending',status:'PENDING',startsAt:'2026-10-14T17:00:00Z'},{id:'ready',status:'CONFIRMED',startsAt:'2026-10-14T18:00:00Z'}],[tech],new Date('2026-10-14T12:00:00Z'));
 assert.equal(result.todayVisits.some(v=>v.id==='old'),false);assert.deepEqual(result.scheduledNext.map(v=>v.id),['ready']);
});
test('native dispatch requires CRM reading and valid pagination before database access',async()=>{
 await assert.rejects(()=>nativeDispatch({} as PrismaClient,{date:'2026-10-14'},{...bootstrapActor,permissions:[]}),{code:'FORBIDDEN'});
 await assert.rejects(()=>nativeDispatch({} as PrismaClient,{date:'2026-02-30'},bootstrapActor),{code:'INVALID_DATE'});
 await assert.rejects(()=>nativeDispatch({} as PrismaClient,{date:'2026-10-14',page:0},bootstrapActor));
});
test('native dispatch counts all rows, paginates queues and reads only native PostgreSQL without writes',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='native_dispatch_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));


  const tech=await db.technician.create({data:{name:'Fixture',dailyTarget:4,fridayTarget:2}});
  const customer=await db.customer.create({data:{name:'Native fixture'}}),property=await db.property.create({data:{customerId:customer.id,address:'Fixture'}}),contract=await db.contract.create({data:{customerId:customer.id,propertyId:property.id,name:'Fixture',service:'Cleaning',totalVisits:100,priceCents:10000}}),job=await db.job.create({data:{customerId:customer.id,propertyId:property.id,contractId:contract.id,name:'Fixture'}});
  const base={customerId:customer.id,propertyId:property.id,contractId:contract.id,jobId:job.id,service:'Fixture',durationMinutes:60,priceCents:10000};
  await db.visit.createMany({data:[...Array.from({length:26},(_,i)=>({...base,id:'waiting-'+String(i).padStart(2,'0'),status:i<10?'CONFIRMED' as const:'PENDING' as const,passageNumber:i+1})),{...base,status:'FAILED',startsAt:new Date('2026-10-13T14:00:00Z'),endsAt:new Date('2026-10-13T15:00:00Z'),passageNumber:27},{...base,status:'NO_ACCESS',startsAt:new Date('2026-10-13T14:00:00Z'),endsAt:new Date('2026-10-13T15:00:00Z'),passageNumber:28},{...base,status:'SCHEDULED',technicianId:tech.id,startsAt:new Date('2026-10-14T14:00:00Z'),endsAt:new Date('2026-10-14T15:00:00Z'),passageNumber:29},{...base,status:'COMPLETED',technicianId:tech.id,startsAt:new Date('2026-10-14T16:00:00Z'),endsAt:new Date('2026-10-14T17:00:00Z'),passageNumber:30},{...base,status:'CANCELLED',technicianId:tech.id,startsAt:new Date('2026-10-14T14:00:00Z'),endsAt:new Date('2026-10-14T15:00:00Z'),passageNumber:31},{...base,status:'RESCHEDULED',technicianId:tech.id,startsAt:new Date('2026-10-14T14:00:00Z'),endsAt:new Date('2026-10-14T15:00:00Z'),passageNumber:32}]});
  const original=await db.visit.findMany({orderBy:{id:'asc'}}),audits=await db.auditEvent.count(),result=await nativeDispatch(db,{date:'2026-10-14'},bootstrapActor);
  assert.deepEqual(result.summary,{waiting:26,ready:10,attention:2,scheduled:2,unassigned:0});assert.equal(result.rows.length,25);assert.equal(result.total,26);assert.deepEqual(result.team.map(t=>[t.assigned,t.target,t.remaining]),[[2,4,2]]);
  const second=await nativeDispatch(db,{date:'2026-10-14',page:2},bootstrapActor);assert.equal(second.rows.length,1);assert.equal(second.rows[0].id,'waiting-25');
  const followups=await nativeDispatch(db,{date:'2026-10-14',queue:'FOLLOW_UP'},bootstrapActor);assert.equal(followups.rows.length,2);
  const saturday=await nativeDispatch(db,{date:'2026-10-17'},bootstrapActor);assert.equal(saturday.team[0].target,0);assert.equal(saturday.team[0].remaining,0);
  assert.deepEqual(await db.visit.findMany({orderBy:{id:'asc'}}),original);assert.equal(await db.auditEvent.count(),audits);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

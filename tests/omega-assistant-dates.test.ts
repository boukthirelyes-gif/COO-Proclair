import test from 'node:test';
import assert from 'node:assert/strict';
import type {PrismaClient,VisitStatus} from '@prisma/client';
import {omegaAssistant} from '../src/omega/assistant';
import {bootstrapActor} from '../src/lib/access';

const now=new Date('2026-10-14T16:00:00Z');
const fixtures=[
 {id:'yesterday',status:'PENDING',startsAt:new Date('2026-10-13T14:00:00Z')},
 {id:'tomorrow-pending',status:'PENDING',startsAt:new Date('2026-10-15T14:00:00Z')},
 {id:'tomorrow-confirmed',status:'CONFIRMED',startsAt:new Date('2026-10-15T15:00:00Z')},
 {id:'tomorrow-scheduled',status:'SCHEDULED',startsAt:new Date('2026-10-15T16:00:00Z')},
 {id:'no-date',status:'PENDING',startsAt:null},
];
function fixture(rows=fixtures){
 const queries:any[]=[],audits:any[]=[];
 const matches=(where:any)=>rows.filter(row=>where.status.in.includes(row.status)&&(!where.startsAt||(row.startsAt&&row.startsAt>=where.startsAt.gte&&row.startsAt<where.startsAt.lt)));
 const db={visit:{count:async({where}:any)=>{queries.push(where);return matches(where).length},findMany:async({where}:any)=>{queries.push(where);return matches(where).map(row=>({...row,service:'Synthetic service',customerId:'customer-'+row.id,customer:{name:'Synthetic '+row.id}}))}},auditEvent:{create:async(data:any)=>{audits.push(data)}}} as unknown as PrismaClient;
 return {db,queries,audits};
}
test('OMEGA non-confirmed tomorrow excludes yesterday, confirmed and undated visits',async()=>{
 const f=fixture();const answer=await omegaAssistant(f.db,{message:'Trouve les clients non confirmés de demain'},bootstrapActor,'public',now);
 assert.equal(answer.intent,'UNCONFIRMED');assert.deepEqual(answer.rows.map((r:any)=>r.id),['tomorrow-pending']);assert.equal(answer.executed,false);assert.equal(f.audits.length,1);
});
test('OMEGA confirmed tomorrow is distinct from non-confirmed visits',async()=>{
 const f=fixture();const answer=await omegaAssistant(f.db,{message:'Montre les visites confirmées demain'},bootstrapActor,'public',now);
 assert.equal(answer.intent,'CONFIRMED');assert.deepEqual(answer.rows.map((r:any)=>r.id),['tomorrow-confirmed','tomorrow-scheduled']);assert.equal(answer.executed,false);
});

test('OMEGA preserves no-date confirmation question and explicit status semantics',async()=>{
 const f=fixture();const answer=await omegaAssistant(f.db,{message:'Qui n’a pas encore confirmé ?'},bootstrapActor,'public',now);
 assert.equal(answer.intent,'UNCONFIRMED');assert.deepEqual(answer.rows.map((r:any)=>r.id),['yesterday','tomorrow-pending','no-date']);assert.equal(answer.filters.period,null);assert.match(answer.answer,/toutes dates/);
 for(const text of ['Visites non-confirmées demain','Visites sans confirmation demain','Visites à confirmer demain','Visites qui n’ont pas été confirmées demain']){
  const f=fixture();const answer=await omegaAssistant(f.db,{message:text},bootstrapActor,'public',now);
  assert.equal(answer.intent,'UNCONFIRMED',text);assert.deepEqual(answer.rows.map((r:any)=>r.id),['tomorrow-pending'],text);
 }
});

test('OMEGA clarification for ambiguous or unsupported confirmation periods performs no visit read',async()=>{
 for(const message of ['Montre les confirmations demain','Visites confirmées après-demain','Visites confirmées lundi','Visites confirmées demain ou aujourd’hui','Visites confirmées demain matin','Visites confirmées en janvier','Visites confirmées le 2027-01-04','Visites confirmées avant demain','Visites confirmées depuis aujourd’hui','Visites confirmées demain à 9h','Visites confirmées semaine prochaine','Visites confirmées et non confirmées demain','Visites confirmées demain à 14h','Visites confirmées demain à 14:00','Visites confirmées le 15 novembre','Visites confirmées dans deux jours']){
  const f=fixture();const answer=await omegaAssistant(f.db,{message},bootstrapActor,'public',now);
  assert.equal(answer.intent,'CLARIFICATION_REQUIRED',message);assert.deepEqual(answer.rows,[]);assert.deepEqual(f.queries,[],message);assert.equal(f.audits.length,1);assert.equal(answer.executed,false);
 }
});

test('OMEGA uses Toronto calendar day for today even while UTC is on the next date',async()=>{
 const f=fixture();const answer=await omegaAssistant(f.db,{message:'Visites confirmées aujourd’hui'},bootstrapActor,'public',new Date('2026-10-15T02:00:00Z'));
 assert.equal(answer.filters.period.from,'2026-10-14');
 assert.deepEqual(f.queries[0].startsAt,{gte:new Date('2026-10-14T04:00:00Z'),lt:new Date('2026-10-15T04:00:00Z')});
});

test('OMEGA tomorrow bounds preserve Toronto spring and fall daylight-saving transitions',async()=>{
 for(const [clock,start,end] of [
  ['2026-03-07T17:00:00Z','2026-03-08T05:00:00Z','2026-03-09T04:00:00Z'],
  ['2026-10-31T16:00:00Z','2026-11-01T04:00:00Z','2026-11-02T05:00:00Z'],
 ]){
  const f=fixture();await omegaAssistant(f.db,{message:'Visites non confirmées demain'},bootstrapActor,'public',new Date(clock));
  assert.deepEqual(f.queries[0].startsAt,{gte:new Date(start),lt:new Date(end)});
  assert.deepEqual(f.queries[0],f.queries[1]);
 }
});

test('OMEGA this week is Monday through Sunday in Toronto with an exclusive end',async()=>{
 for(const clock of ['2026-10-28T16:00:00Z','2026-11-01T16:00:00Z']){
  const f=fixture();const answer=await omegaAssistant(f.db,{message:'Visites confirmées cette semaine'},bootstrapActor,'public',new Date(clock));
  assert.deepEqual(answer.filters.period,{from:'2026-10-26',toExclusive:'2026-11-02',label:'cette semaine (du 2026-10-26 au 2026-11-01, Toronto)'});
  assert.deepEqual(f.queries[0].startsAt,{gte:new Date('2026-10-26T04:00:00Z'),lt:new Date('2026-11-02T05:00:00Z')});
 }
});

test('OMEGA bounded day query includes start and excludes end and retains access controls',async()=>{
 const f=fixture([{id:'start',status:'PENDING',startsAt:new Date('2026-10-15T04:00:00Z')},{id:'end',status:'PENDING',startsAt:new Date('2026-10-16T04:00:00Z')},{id:'undated',status:'PENDING',startsAt:null}]);
 const answer=await omegaAssistant(f.db,{message:'Visites à confirmer demain'},bootstrapActor,'public',now);
 assert.deepEqual(answer.rows.map((r:any)=>r.id),['start']);assert.match(answer.answer,/sans date sont exclues/);
 await assert.rejects(()=>omegaAssistant({} as PrismaClient,{message:'Visites confirmées demain'},{...bootstrapActor,permissions:bootstrapActor.permissions.filter(p=>p!=='omega')},'public',now),{code:'FORBIDDEN'});
 await assert.rejects(()=>omegaAssistant({} as PrismaClient,{message:'Visites confirmées demain'},{...bootstrapActor,permissions:bootstrapActor.permissions.filter(p=>p!=='crm.read')},'public',now),{code:'FORBIDDEN'});
});

test('OMEGA confirmation/date filters select persisted visits and leave business records unchanged',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const {randomUUID}=await import('node:crypto'),{readFile,readdir}=await import('node:fs/promises'),{Client}=await import('pg');
 const {PrismaClient}=await import('@prisma/client'),{PrismaPg}=await import('@prisma/adapter-pg');
 const database=process.env.TEST_DATABASE_URL!,schema='omega_dates_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));
  const customer=await db.customer.create({data:{name:'Synthetic dated customer'}}),property=await db.property.create({data:{customerId:customer.id,address:'Synthetic service address'}});
  const contract=await db.contract.create({data:{customerId:customer.id,propertyId:property.id,name:'Synthetic dates contract',service:'Cleaning',totalVisits:fixtures.length,priceCents:10000}});
  const job=await db.job.create({data:{customerId:customer.id,propertyId:property.id,contractId:contract.id,name:'Synthetic job'}});
  await db.visit.createMany({data:fixtures.map((row,i)=>({...row,status:row.status as VisitStatus,customerId:customer.id,propertyId:property.id,contractId:contract.id,jobId:job.id,service:'Cleaning',durationMinutes:60,priceCents:1000,passageNumber:i+1}))});
  const before=await db.visit.findMany({orderBy:{id:'asc'}});
  const pending=await omegaAssistant(db,{message:'Trouve les clients non confirmés de demain'},bootstrapActor,schema,now);
  assert.deepEqual(pending.rows.map((r:any)=>r.id),['tomorrow-pending']);
  const confirmed=await omegaAssistant(db,{message:'Montre les visites confirmées demain'},bootstrapActor,schema,now);
  assert.deepEqual(confirmed.rows.map((r:any)=>r.id),['tomorrow-confirmed','tomorrow-scheduled']);
  assert.equal(confirmed.filters.period.from,'2026-10-15');assert.equal(confirmed.executed,false);
  assert.deepEqual(await db.visit.findMany({orderBy:{id:'asc'}}),before);assert.equal(await db.workerJob.count(),0);assert.equal(await db.payment.count(),0);
  assert.equal(await db.auditEvent.count({where:{action:'OMEGA_ASSISTANT_READ'}}),2);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

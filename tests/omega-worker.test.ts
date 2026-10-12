import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {Client}=createRequire(import.meta.url)('pg');
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {OmegaWorker} from '../src/omega/worker';
const database=process.env.TEST_DATABASE_URL;
test('durable Omega queue requires activation, deduplicates, records plans, retries and kill switch',{skip:!database},async()=>{
 const schema=`worker_test_${randomUUID().replaceAll('-','')}`;const setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))){await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));}
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});const worker=new OmegaWorker(db);const admin={id:'worker-test',role:'ADMIN' as const};
 try{
 await worker.configure({enabled:false},admin);assert.deepEqual(await worker.tick(),{enabled:false,processed:0});
 await assert.rejects(()=>worker.enqueue('2027-01-07',admin),{code:'WORKER_DISABLED'});
 await assert.rejects(()=>worker.configure({enabled:true},{id:'dispatcher',role:'DISPATCHER'}),{code:'FORBIDDEN'});
 await worker.configure({enabled:true},admin);
 const now=new Date('2027-01-04T12:00:00Z');const first=await worker.enqueue('2027-01-07',admin,now);const second=await worker.enqueue('2027-01-07',admin,now);assert.equal(first.id,second.id);
 const [a,b]=await Promise.all([worker.tick(now),worker.tick(now)]);assert.ok(a.processed+b.processed>=1);
 const job=await db.workerJob.findUniqueOrThrow({where:{id:first.id}});assert.equal(job.status,'COMPLETED');assert.ok(job.planId);assert.equal(job.attempts,1);assert.equal((await db.omegaPlan.findUniqueOrThrow({where:{id:job.planId!}})).status,'PREVIEW');
 const broken=await db.workerJob.create({data:{key:`broken-${randomUUID()}`,date:'impossible',availableAt:now}});
 await worker.tick(now);const retry=await db.workerJob.findUniqueOrThrow({where:{id:broken.id}});assert.equal(retry.attempts,1);assert.equal(retry.status,'PENDING');assert.ok(retry.availableAt>now);
 await worker.tick(new Date(now.getTime()+31000));await worker.tick(new Date(now.getTime()+92000));
 assert.equal((await db.workerJob.findUniqueOrThrow({where:{id:broken.id}})).status,'DEAD_LETTER');
 const recoverable=await db.workerJob.create({data:{key:'recoverable-'+randomUUID(),date:'2027-01-07',status:'DEAD_LETTER',attempts:3,lastError:'Temporary failure'}});
 await assert.rejects(()=>worker.retryJob(recoverable.id,{expectedAttempts:3},{id:'omega',role:'OMEGA'},now),{code:'FORBIDDEN'});
 await assert.rejects(()=>worker.retryJob(recoverable.id,{expectedAttempts:2},admin,now),{code:'VERSION_CONFLICT'});
 const attempts=await Promise.allSettled([worker.retryJob(recoverable.id,{expectedAttempts:3},admin,now),worker.retryJob(recoverable.id,{expectedAttempts:3},admin,now)]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await db.workerJob.findUniqueOrThrow({where:{id:recoverable.id}})).status,'PENDING');assert.equal(await db.auditEvent.count({where:{action:'WORKER_REQUEUED'}}),1);
 const expired=await db.workerJob.create({data:{key:'expired-'+randomUUID(),date:'2026-01-01',status:'DEAD_LETTER',attempts:3}});await assert.rejects(()=>worker.retryJob(expired.id,{expectedAttempts:3},admin,now),{code:'JOB_EXPIRED'});
 await worker.configure({enabled:false},admin);assert.equal((await worker.tick()).processed,0);
 await assert.rejects(()=>worker.retryJob(expired.id,{expectedAttempts:3},admin,now),{code:'WORKER_DISABLED'});const snapshot=await worker.state();assert.equal(snapshot.control.enabled,false);assert.equal(snapshot.summary.DEAD_LETTER,2);assert.ok(snapshot.summary.COMPLETED>=1);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end();}
});

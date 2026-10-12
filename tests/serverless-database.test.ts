import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {databaseRotorStorage,withRotorStorage} from '../src/lib/rotor-store';
import {beginRotor,completeRotor,rotorTools,rotorStatus,unseal} from '../src/lib/rotor';
import {takeLoginAttempt,cronAuthorized} from '../src/lib/production-auth';
const {Client}=createRequire(import.meta.url)('pg');
test('cron authentication rejects missing, short or incorrect secrets',()=>{
 const secret='test-cron-secret-'.repeat(3);
 assert.equal(cronAuthorized(null,secret),false);
 assert.equal(cronAuthorized('Bearer wrong',secret),false);
 assert.equal(cronAuthorized('Bearer short','short'),false);
 assert.equal(cronAuthorized('Bearer '+secret,secret),true);
});
test('serverless PostgreSQL persists encrypted OAuth, serializes replicas, consumes callback once and limits logins',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='serverless_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db1=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})}),db2=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 const originalFetch=globalThis.fetch,origin=process.env.PROCLAIR_PUBLIC_ORIGIN,secret=process.env.PROCLAIR_SESSION_SECRET;
 process.env.PROCLAIR_PUBLIC_ORIGIN='https://crm.example.test';process.env.PROCLAIR_SESSION_SECRET='isolated-db-encryption-secret-'.repeat(3);
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));
  const one=databaseRotorStorage(db1),two=databaseRotorStorage(db2);let exchanges=0,refreshes=0,revoked=false;
  globalThis.fetch=async(url:any,options:any)=>{
   if(url.endsWith('/register'))return Response.json({client_id:'replica-client'});
   if(url.endsWith('/token')){const form=new URLSearchParams(options.body);if(form.get('grant_type')==='authorization_code'){exchanges++;return Response.json({access_token:'first',refresh_token:'refresh-first',token_type:'Bearer',expires_in:1})}refreshes++;if(revoked)return Response.json({error:'invalid_grant'},{status:400});assert.equal(form.get('refresh_token'),'refresh-first');return Response.json({access_token:'rotated',refresh_token:'refresh-rotated',token_type:'Bearer',expires_in:3600})}
   const payload=JSON.parse(options.body);assert.equal(options.headers.Authorization,'Bearer rotated');if(payload.method==='initialize')return Response.json({id:payload.id,result:{protocolVersion:'2025-03-26'}});if(payload.method==='notifications/initialized')return new Response(null,{status:202});return Response.json({id:payload.id,result:{tools:[]}});
  };
  const flow=await withRotorStorage(one,()=>beginRotor()),state=new URL(flow.url).searchParams.get('state')!;
  const completions=await Promise.allSettled([withRotorStorage(one,()=>completeRotor(flow.cookie,state,'code')),withRotorStorage(two,()=>completeRotor(flow.cookie,state,'code'))]);assert.equal(completions.filter(r=>r.status==='fulfilled').length,1);assert.equal(exchanges,1);assert.equal(await db1.oAuthReceipt.count(),1);
  await Promise.all([withRotorStorage(one,()=>rotorTools()),withRotorStorage(two,()=>rotorTools())]);assert.equal(refreshes,1);
  const ciphertext=(await db2.integrationSecret.findUniqueOrThrow({where:{key:'rotor:connection'}})).encryptedValue;assert.ok(!ciphertext.includes('refresh-rotated'));assert.equal(unseal(ciphertext).refreshToken,'refresh-rotated');assert.equal((await withRotorStorage(two,()=>rotorStatus())).connected,true);
  const renewedFlow=await withRotorStorage(one,()=>beginRotor());await withRotorStorage(one,()=>completeRotor(renewedFlow.cookie,new URL(renewedFlow.url).searchParams.get('state')!,'another-code'));revoked=true;await assert.rejects(()=>withRotorStorage(one,()=>rotorTools()),{code:'ROTOR_REAUTH'});assert.equal((await withRotorStorage(two,()=>rotorStatus())).reauthRequired,true);
  const now=new Date('2026-10-12T18:00:05Z').getTime();const attempts=await Promise.all(Array.from({length:12},(_,i)=>takeLoginAttempt(i%2?db1:db2,now)));assert.equal(attempts.filter(Boolean).length,8);assert.equal(await takeLoginAttempt(db1,now+60000),true);
 }finally{globalThis.fetch=originalFetch;if(origin===undefined)delete process.env.PROCLAIR_PUBLIC_ORIGIN;else process.env.PROCLAIR_PUBLIC_ORIGIN=origin;if(secret===undefined)delete process.env.PROCLAIR_SESSION_SECRET;else process.env.PROCLAIR_SESSION_SECRET=secret;await Promise.all([db1.$disconnect(),db2.$disconnect()]);await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

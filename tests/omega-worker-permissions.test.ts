import test from 'node:test';
import assert from 'node:assert/strict';
import type {PrismaClient} from '@prisma/client';
import {OmegaWorker} from '../src/omega/worker';
import {bootstrapActor,routePermission,requirePermission,userActor,type Permission} from '../src/lib/access';

const manager=(permissions:Permission[])=>userActor({id:'synthetic-manager',name:'Synthetic',role:'MANAGER',permissions,sessionVersion:1});
function fixture(){
 let reads=0,writes=0;
 const db={workerControl:{findUnique:async()=>{reads++;return {enabled:true}}},workerJob:{upsert:async({create}:any)=>{writes++;return {id:'synthetic-job',...create}},findFirst:async()=>null}} as unknown as PrismaClient;
 return {worker:new OmegaWorker(db),counts:()=>({reads,writes})};
}

test('worker HTTP grants reject a manager without dispatch and service rejects every missing effective permission before storage',async()=>{
 for(const path of ['worker/run','worker/tick']){
  assert.equal(routePermission(path,'POST'),'dispatch');
  assert.throws(()=>requirePermission(manager(['omega','crm.read']),routePermission(path,'POST')!),{code:'FORBIDDEN'});
 }
 for(const removed of ['omega','crm.read','dispatch'] as const){
  const actor=manager((['omega','crm.read','dispatch'] as Permission[]).filter(p=>p!==removed)),f=fixture();
  await assert.rejects(()=>f.worker.enqueue('2027-01-07',actor),{code:'FORBIDDEN'});
  await assert.rejects(()=>f.worker.tickForActor(actor),{code:'FORBIDDEN'});
  assert.deepEqual(f.counts(),{reads:0,writes:0});
 }
});

test('authorized manager and admin can enqueue and run proposals; internal scheduler remains separate',async()=>{
 for(const actor of [manager(['omega','crm.read','dispatch']),bootstrapActor]){
  const f=fixture(),now=new Date('2027-01-04T12:00:00Z');
  assert.equal((await f.worker.enqueue('2027-01-07',actor,now)).date,'2027-01-07');
  assert.deepEqual(await f.worker.tickForActor(actor,now),{enabled:true,processed:0});
  assert.equal(f.counts().writes,2);
 }
 const f=fixture();assert.deepEqual(await f.worker.tick(new Date('2027-01-04T12:00:00Z')),{enabled:true,processed:0});assert.equal(f.counts().writes,1);
 await assert.rejects(()=>f.worker.tickForActor({...bootstrapActor,id:'synthetic-omega',role:'OMEGA'}),{code:'FORBIDDEN'});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type {PrismaClient} from '@prisma/client';
import {financialTransaction} from '../src/finance/transaction-queue';
test('financial admission bounds the queue, retains order and recovers after a rejected operation',async()=>{
 const key={} as PrismaClient;let release!:()=>void;const gate=new Promise<void>(r=>{release=r}),order:number[]=[];const first=financialTransaction(key,async()=>{await gate;order.push(0)});const queued=Array.from({length:31},(_,i)=>financialTransaction(key,async()=>{order.push(i+1);return i}));await assert.rejects(()=>financialTransaction(key,async()=>order.push(100)),{code:'FINANCE_BUSY'});release();await Promise.all([first,...queued]);assert.deepEqual(order,Array.from({length:32},(_,i)=>i));await assert.rejects(()=>financialTransaction(key,async()=>{throw Error('simulated failure')}),/simulated failure/);assert.equal(await financialTransaction(key,async()=>42),42);
});
test('a financial request expiring in the queue never starts late',async()=>{
 const key={} as PrismaClient;let release!:()=>void;const gate=new Promise<void>(r=>{release=r});const first=financialTransaction(key,async()=>gate);let executed=false;try{await assert.rejects(()=>financialTransaction(key,async()=>{executed=true}),{code:'FINANCE_BUSY'});}finally{release();await first;}assert.equal(await financialTransaction(key,async()=>true),true);assert.equal(executed,false);
});

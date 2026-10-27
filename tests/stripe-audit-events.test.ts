import test from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import type {PrismaClient} from '@prisma/client';
import {StripeEnterprise} from '../src/providers/stripe-enterprise';

function fixture(known?: {sessionId: string; paymentIntentId: string}) {
 const receipts = new Map<string, any>(), processed = new Map<string, any>(), decisions: any[] = [];
 let transportCalls = 0;
 const tx: any = {
  $executeRaw: async () => 1,
  stripeEventReceipt: {findUnique: async ({where}: any) => receipts.get(where.id), create: async ({data}: any) => {receipts.set(data.id, data);return data}},
  providerEvent: {findUnique: async ({where}: any) => processed.get(where.id), create: async ({data}: any) => {processed.set(data.id, data);return data}},
  stripeEventDecision: {create: async ({data}: any) => {decisions.push(data);return data}},
  stripeCheckout: {findFirst: async ({where}: any) => known && (where.sessionId === known.sessionId || where.paymentIntentId === known.paymentIntentId) ? {...known,id:'local',invoiceId:'invoice',mode:'TEST',enterprise:true} : null},
 };
 const db = {...tx, $transaction: async (fn: any) => fn(tx)} as PrismaClient;
 const service = new StripeEnterprise(db, () => {transportCalls++;throw new Error('Network forbidden in audit')});
 return {service,receipts,processed,decisions,calls: () => transportCalls};
}
const event = (type: string, object: unknown) => ({id:'evt_audit_'+type.replaceAll('.', '_'),type,livemode:false,created:1,data:{object}} as Stripe.Event);

for (const [kind,id] of [['checkout.session.completed','cs_unrelated'],['payment_intent.succeeded','pi_unrelated']]) {
 test(`unattributed ${kind} is audited and acknowledged without retries or network`, async () => {
  const f=fixture(),e=event(kind,{id});
  const response=await f.service.event(e,'TEST');
  assert.deepEqual(response,{received:true,result:{ignored:true,reason:'UNRELATED_TRANSACTION'}});
  assert.equal(f.receipts.size,1);assert.equal(f.processed.size,1);assert.equal(f.decisions[0].outcome,'PROCESSED');assert.equal(f.calls(),0);
  assert.deepEqual(await f.service.event(e,'TEST'),{duplicate:true});
 });
 test(`${kind} retaining a Proclair marker remains retriable when unknown`, async () => {
  const f=fixture();
  await assert.rejects(()=>f.service.event(event(kind,{id,metadata:{proclairEnterprise:'1'}}),'TEST'),{code:'TRANSACTION_NOT_FOUND'});
  assert.equal(f.receipts.size,1);assert.equal(f.processed.size,0);assert.equal(f.decisions[0].outcome,'RETRY_OR_REVIEW');assert.equal(f.calls(),0);
 });
}
test('a known Checkout Session without metadata is rejected rather than silently ignored',async()=>{
 const f=fixture({sessionId:'cs_known',paymentIntentId:'pi_known'});
 await assert.rejects(()=>f.service.event(event('checkout.session.completed',{id:'cs_known'}),'TEST'),{code:'PAYMENT_MISMATCH'});
 assert.equal(f.processed.size,0);assert.equal(f.decisions[0].outcome,'RETRY_OR_REVIEW');
});
test('a known PaymentIntent without metadata is rejected rather than silently ignored',async()=>{
 const f=fixture({sessionId:'cs_known',paymentIntentId:'pi_known'});
 await assert.rejects(()=>f.service.event(event('payment_intent.succeeded',{id:'pi_known'}),'TEST'),{code:'PAYMENT_MISMATCH'});
 assert.equal(f.processed.size,0);assert.equal(f.decisions[0].outcome,'RETRY_OR_REVIEW');
});
test('a malformed payment event without a provider ID is rejected, never acknowledged as unrelated',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.service.event(event('payment_intent.succeeded',{}),'TEST'),{code:'PAYMENT_MISMATCH'});
 assert.equal(f.processed.size,0);assert.equal(f.calls(),0);
});

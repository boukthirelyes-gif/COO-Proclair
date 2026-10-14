import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapActor,type AccessActor} from '../src/lib/access';
import {inspectStripeTest,type StripeOverviewReader} from '../src/providers/stripe-network-overview';

const fixture=()=>({balance:{livemode:false,available:[{amount:123,currency:'cad'},{amount:-10,currency:'usd'}],pending:[{amount:456,currency:'cad'}],object:'balance'},charges:{has_more:true,data:[{id:'ch_fixture123',livemode:false,amount:1000,amount_refunded:200,currency:'cad',created:1791936000,paid:true,refunded:false,status:'succeeded',payment_method_details:{type:'card',card:{brand:'visa',last4:'4242',fingerprint:'PRIVATE'}},metadata:{secret:'PRIVATE'},billing_details:{email:'PRIVATE'},receipt_url:'PRIVATE'}]}});
test('manual Stripe inspection checks all grants, payload and test key before transport',async()=>{
 let reads=0;const reader:StripeOverviewReader=async()=>{reads++;return fixture()};const previous=process.env.STRIPE_SECRET_KEY;
 try{
  for(const permission of ['finance','integrations','crm.read']){
   const actor={...bootstrapActor,permissions:bootstrapActor.permissions.filter(p=>p!==permission)} as AccessActor;
   await assert.rejects(()=>inspectStripeTest({},actor,reader),{code:'FORBIDDEN'});
  }
  process.env.STRIPE_SECRET_KEY='sk_live_fixture';await assert.rejects(()=>inspectStripeTest({},bootstrapActor,reader),{code:'TEST_KEY_REQUIRED'});
  process.env.STRIPE_SECRET_KEY='sk_test_fixture';
  for(const input of [{from:'2026-02-30'},{from:'2026-10-15',to:'2026-10-14'},{startingAfter:'https://example.test'},{approved:true}])await assert.rejects(()=>inspectStripeTest(input,bootstrapActor,reader),{name:'ZodError'});
  assert.equal(reads,0);
 }finally{if(previous===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=previous}
});
test('manual Stripe inspection strips private data and separates currencies with fixed bounded pagination',async()=>{
 const previous=process.env.STRIPE_SECRET_KEY;process.env.STRIPE_SECRET_KEY='sk_test_fixture';
 try{
  const result=await inspectStripeTest({from:'2026-10-14',to:'2026-10-14',startingAfter:'ch_previous'},bootstrapActor,async params=>{
   assert.deepEqual(params,{limit:25,created:{gte:1791936000,lt:1792022400},starting_after:'ch_previous'});return fixture();
  });
  assert.deepEqual(result.balance.available,[{currency:'cad',amountCents:123},{currency:'usd',amountCents:-10}]);
  assert.equal(result.items[0].refundedCents,200);assert.equal(result.items[0].last4,'4242');assert.equal(result.nextCursor,'ch_fixture123');
  assert.equal(result.ledgerEffects,false);assert.equal(result.externalEffects,false);assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
  for(const mutate of [(v:ReturnType<typeof fixture>)=>{v.balance.livemode=true},(v:ReturnType<typeof fixture>)=>{v.charges.data[0].livemode=true},(v:ReturnType<typeof fixture>)=>{v.charges.data[0].amount_refunded=1001},(v:ReturnType<typeof fixture>)=>{v.charges.data=[]}]){
   const value=fixture();mutate(value);await assert.rejects(()=>inspectStripeTest({},bootstrapActor,async()=>value),{code:'STRIPE_RESPONSE_INVALID'});
  }
  await assert.rejects(()=>inspectStripeTest({},bootstrapActor,async()=>{throw Error('PRIVATE provider response sk_test_secret')}),error=>{assert.equal((error as any).code,'STRIPE_READ_UNAVAILABLE');assert.equal(String(error).includes('PRIVATE'),false);return true});
 }finally{if(previous===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=previous}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapActor,presets} from '../src/lib/access';
import {verifyProvider,type ProviderReader} from '../src/providers/verification';
import {providerStatus} from '../src/providers/config';
import {stripeClient,verifyStripe} from '../src/providers/stripe';
const names=['STRIPE_SECRET_KEY','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_PHONE_NUMBER'];
function environment(values:Record<string,string>){const old=Object.fromEntries(names.map(n=>[n,process.env[n]]));for(const n of names)delete process.env[n];Object.assign(process.env,values);return()=>{for(const n of names)if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n]}}
test('connection checks enforce access and never read accounts with missing or live Stripe credentials',async()=>{
 const restore=environment({});let calls=0;const reader:ProviderReader=async()=>{calls++;return {reference:'acct_fixture'}};
 try{await assert.rejects(()=>verifyProvider({provider:'stripe'},{...bootstrapActor,permissions:presets.SELLER},reader),{code:'FORBIDDEN'});assert.equal((await verifyProvider({provider:'stripe'},bootstrapActor,reader)).outcome,'NOT_CONFIGURED');assert.equal((await verifyProvider({provider:'twilio'},bootstrapActor,reader)).outcome,'NOT_CONFIGURED');process.env.STRIPE_SECRET_KEY='sk_live_fixture_not_real';assert.equal((await verifyProvider({provider:'stripe'},bootstrapActor,reader)).outcome,'NOT_CONFIGURED');assert.equal(calls,0);await assert.rejects(()=>verifyProvider({provider:'stripe',secret:'unwanted'},bootstrapActor,reader));}finally{restore()}
});
test('Stripe authentication is distinct from webhook verification and never exposes account details or secrets',async()=>{
 const restore=environment({STRIPE_SECRET_KEY:'sk_test_fixture_not_real'});try{const result=await verifyProvider({provider:'stripe'},bootstrapActor,async()=>({reference:'acct_fixture1234'}));assert.equal(result.authenticated,true);assert.equal(result.outcome,'VERIFIED');assert.equal(result.accountReference,'…1234');assert.equal(result.webhooksVerified,false);assert.equal(result.externalEffects,false);assert.equal(result.mode,'TEST_ONLY');assert.ok(!JSON.stringify(result).includes('sk_test_'));assert.ok(!JSON.stringify(result).includes('acct_fixture'));}finally{restore()}
});
test('Twilio account verification preserves sender ownership and suspended account status without enabling sends',async()=>{
 const restore=environment({TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_AUTH_TOKEN:'fixture-token-not-real'});try{const result=await verifyProvider({provider:'twilio'},bootstrapActor,async()=>({reference:process.env.TWILIO_ACCOUNT_SID!,status:'suspended',senderVerified:false}));assert.equal(result.authenticated,true);assert.equal(result.accountStatus,'suspended');assert.equal(result.senderVerified,false);assert.equal(result.externalEffects,false);assert.equal(result.webhooksVerified,false);assert.ok(!JSON.stringify(result).includes('fixture-token'));}finally{restore()}
});
test('authentication refusals and transient failures return safe, distinct outcomes',async()=>{
 const restore=environment({STRIPE_SECRET_KEY:'sk_test_fixture_not_real'});try{const refused=await verifyProvider({provider:'stripe'},bootstrapActor,async()=>{throw Object.assign(Error('private SDK payload sk_test_fixture_not_real'),{statusCode:401})});assert.equal(refused.outcome,'REJECTED');assert.equal(refused.authenticated,false);const unavailable=await verifyProvider({provider:'stripe'},bootstrapActor,async()=>{throw Error('private SDK payload sk_test_fixture_not_real')});assert.equal(unavailable.outcome,'UNAVAILABLE');assert.equal(unavailable.authenticated,null);const malformed=await verifyProvider({provider:'stripe'},bootstrapActor,async()=>({reference:'not-an-account'}));assert.equal(malformed.outcome,'UNAVAILABLE');assert.ok(!JSON.stringify([refused,unavailable,malformed]).includes('private SDK payload'));assert.ok(!JSON.stringify([refused,unavailable,malformed]).includes('sk_test_fixture'));}finally{restore()}
});
test('Stripe diagnoses wrong credential types and accepts copied whitespace without weakening test-only signatures',async()=>{
 const restore=environment({});const webhook=process.env.STRIPE_WEBHOOK_SECRET,origin=process.env.PROCLAIR_PUBLIC_ORIGIN;
 try{
  let calls=0;const reader:ProviderReader=async()=>{calls++;return {reference:'acct_fixture1234'}};
  for(const [key,pattern] of [['pk_test_private_fixture',/clé Stripe publique/],['sk_live_private_fixture',/paiements réels/],['"sk_test_private_fixture"',/sans guillemets/]] as const){
   process.env.STRIPE_SECRET_KEY=key;const result=await verifyProvider({provider:'stripe'},bootstrapActor,reader);
   assert.equal(result.outcome,'NOT_CONFIGURED');assert.match(result.message,pattern);assert.ok(!JSON.stringify(result).includes(key));
  }
  assert.equal(calls,0);
  process.env.STRIPE_SECRET_KEY='  sk_test_private_fixture\n';delete process.env.STRIPE_WEBHOOK_SECRET;
  process.env.PROCLAIR_PUBLIC_ORIGIN='https://crm.example.test';
  const state=providerStatus();assert.equal(state.stripe.verificationReady,true);assert.equal(state.stripe.configured,false);assert.deepEqual(state.stripe.missing,['STRIPE_WEBHOOK_SECRET']);
  assert.equal((await verifyProvider({provider:'stripe'},bootstrapActor,reader)).authenticated,true);
  process.env.STRIPE_WEBHOOK_SECRET=' sk_test_wrong_webhook ';assert.equal(providerStatus().stripe.configured,false);assert.match(providerStatus().stripe.issues[0],/whsec_/);
  process.env.STRIPE_WEBHOOK_SECRET=' whsec_private_fixture\n';assert.equal(providerStatus().stripe.configured,true);
  const payload=JSON.stringify({id:'evt_fixture',livemode:false,type:'checkout.session.completed',data:{object:{}}});
  const signature=stripeClient().webhooks.generateTestHeaderString({payload,secret:'whsec_private_fixture'});
  assert.equal(verifyStripe(payload,signature).id,'evt_fixture');
  assert.throws(()=>verifyStripe(payload+' ',signature),{code:'INVALID_SIGNATURE'});
  const live=payload.replace('"livemode":false','"livemode":true');const liveSignature=stripeClient().webhooks.generateTestHeaderString({payload:live,secret:'whsec_private_fixture'});
  assert.throws(()=>verifyStripe(live,liveSignature),{code:'LIVE_DISABLED'});
 }finally{restore();if(webhook===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=webhook;if(origin===undefined)delete process.env.PROCLAIR_PUBLIC_ORIGIN;else process.env.PROCLAIR_PUBLIC_ORIGIN=origin}
});

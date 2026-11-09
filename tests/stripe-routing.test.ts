import test from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import type {PrismaClient} from '@prisma/client';
import {StripePayments} from '../src/providers/stripe';

function fixture(enterprise=true,preflightEnterprise=enterprise){
 const row={id:'checkout-local',sessionId:'cs_routing',paymentIntentId:'pi_routing',invoiceId:'invoice-local',amountCents:1000,currency:'CAD',mode:'TEST',enterprise,status:'OPEN'};
 const updates:unknown[]=[],receipts=new Map<string,any>(),decisions:unknown[]=[];
 let legacyTransactions=0,networkCalls=0;
 const tx:any={
  $executeRaw:async()=>1,
  stripeCheckout:{findUnique:async()=>row,findFirst:async()=>preflightEnterprise?row:null,update:async({data}:any)=>{updates.push(data);return {...row,...data}}},
  providerEvent:{findUnique:async()=>null,create:async({data}:any)=>data},
  stripeEventReceipt:{findUnique:async({where}:any)=>receipts.get(where.id),create:async({data}:any)=>{receipts.set(data.id,data);return data}},
  stripeEventDecision:{create:async({data}:any)=>{decisions.push(data);return data}},
 };
 const db={...tx,$transaction:async(fn:any,options:any)=>{if(!options)legacyTransactions++;return fn(tx)}} as PrismaClient;
 const service=new StripePayments(db,()=>{networkCalls++;throw Error('Real network forbidden')});
 const event=(object:unknown,type='checkout.session.completed')=>({id:'evt_routing',type,livemode:false,created:1,data:{object}} as Stripe.Event);
 const object={id:row.sessionId,client_reference_id:row.id,amount_total:1000,currency:'cad',payment_status:'paid',metadata:{proclairCheckoutId:row.id}};
 return {service,event,object,row,updates,receipts,decisions,legacyTransactions:()=>legacyTransactions,networkCalls:()=>networkCalls};
}
test('legacy entrypoint cannot mark an enterprise checkout paid when enterprise marker is missing',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.service.event(f.event(f.object)),{code:'PAYMENT_MISMATCH'});
 assert.equal(f.legacyTransactions(),0);assert.deepEqual(f.updates,[]);assert.equal(f.receipts.size,1);assert.equal(f.decisions.length,1);assert.equal(f.networkCalls(),0);
});
test('provider ID routes enterprise events even when all metadata is missing',async()=>{
 for(const [type,id] of [['checkout.session.completed','cs_routing'],['payment_intent.succeeded','pi_routing']]){
  const f=fixture();await assert.rejects(()=>f.service.event(f.event({id},type)),{code:'PAYMENT_MISMATCH'});
  assert.equal(f.legacyTransactions(),0);assert.deepEqual(f.updates,[]);assert.equal(f.receipts.size,1);assert.equal(f.networkCalls(),0);
 }
});
test('legacy non-enterprise test checkout keeps its demonstration-only behavior',async()=>{
 const f=fixture(false);assert.deepEqual(await f.service.event(f.event(f.object)),{received:true});
 assert.deepEqual(f.updates,[{status:'PAID_TEST'}]);assert.equal(f.legacyTransactions(),1);assert.equal(f.receipts.size,0);assert.equal(f.networkCalls(),0);
});
test('legacy transaction refuses an enterprise row even if the routing lookup missed it',async()=>{
 const f=fixture(true,false);
 await assert.rejects(()=>f.service.event(f.event(f.object)),{code:'PAYMENT_MISMATCH'});
 assert.deepEqual(f.updates,[]);assert.equal(f.legacyTransactions(),1);assert.equal(f.networkCalls(),0);
});
test('legacy entrypoint rejects LIVE before any storage or transport access',async()=>{
 const service=new StripePayments({} as PrismaClient,()=>{throw Error('Network forbidden')});
 await assert.rejects(()=>service.event({livemode:true,data:{object:{metadata:{proclairEnterprise:'1'}}}} as unknown as Stripe.Event),{code:'LIVE_DISABLED'});
});

test('legacy entrypoint reconciles an enterprise TEST payment canonically and idempotently on isolated PostgreSQL',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const {randomUUID}=await import('node:crypto'),{readFile,readdir}=await import('node:fs/promises'),{Client}=await import('pg');
 const {PrismaClient}=await import('@prisma/client'),{PrismaPg}=await import('@prisma/adapter-pg');
 const {StripeEnterprise}=await import('../src/providers/stripe-enterprise'),{FinanceService}=await import('../src/finance/service'),{bootstrapActor}=await import('../src/lib/access');
 const database=process.env.TEST_DATABASE_URL!,schema='stripe_routing_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));
  const finance=new FinanceService(db),customer=await db.customer.create({data:{name:'Synthetic routing customer'}});
  const draft=await finance.createInvoice({customerId:customer.id,paymentMode:'TEST',dueDate:'2027-01-31',items:[{description:'Synthetic service',quantity:1,unitPriceCents:1000}],idempotencyKey:'stripe-routing-invoice'},bootstrapActor),invoice=await finance.issueInvoice(draft.id,{expectedVersion:draft.version},bootstrapActor);
  const row=await db.stripeCheckout.create({data:{invoiceId:invoice.id,amountCents:1000,currency:'CAD',mode:'TEST',enterprise:true,active:true,idempotencyKey:'stripe-routing-checkout',sessionId:'cs_routing_db',status:'OPEN'}});
  const metadata={proclairCheckoutId:row.id,invoiceId:invoice.id,mode:'TEST'};
  const session={id:row.sessionId,livemode:false,client_reference_id:row.id,metadata,amount_total:1000,currency:'cad',payment_status:'paid',payment_intent:'pi_routing_db',status:'complete'};
  const intent={id:'pi_routing_db',livemode:false,amount:1000,amount_received:1000,currency:'cad',status:'succeeded',metadata};
  let canonicalReads=0;
  const fake={checkout:{sessions:{retrieve:async(id:string)=>{assert.equal(id,row.sessionId);canonicalReads++;return session}}},paymentIntents:{retrieve:async(id:string)=>{assert.equal(id,intent.id);canonicalReads++;return intent}}} as unknown as Stripe;
  const service=new StripePayments(db,()=>{throw Error('Legacy transport forbidden')},()=>new StripeEnterprise(db,mode=>{assert.equal(mode,'TEST');return fake},schema));
  const event={id:'evt_routing_db',type:'checkout.session.completed',livemode:false,created:1,data:{object:session}} as unknown as Stripe.Event;
  await service.event(event);assert.equal(canonicalReads,2);
  assert.equal((await db.stripeCheckout.findUniqueOrThrow({where:{id:row.id}})).status,'PAID_TEST');
  assert.equal(await db.payment.count(),1);assert.equal((await finance.getInvoice(invoice.id)).balanceCents,0);
  assert.deepEqual(await service.event(event),{duplicate:true});assert.equal(await db.payment.count(),1);assert.equal(canonicalReads,2);
  assert.equal(await db.providerEvent.count({where:{provider:'STRIPE'}}),0);assert.equal(await db.stripeEventReceipt.count(),1);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

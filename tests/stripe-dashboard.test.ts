import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {stripeDashboard} from '../src/providers/stripe-dashboard';
import {bootstrapActor,userActor,presets} from '../src/lib/access';
const {Client}=createRequire(import.meta.url)('pg');
test('Stripe dashboard denies sellers and invalid dates before database access',async()=>{
 const unavailable={} as PrismaClient;
 const seller=userActor({id:'seller',name:'Seller',role:'SELLER',permissions:presets.SELLER,sessionVersion:1});
 await assert.rejects(()=>stripeDashboard(unavailable,{},seller),{code:'FORBIDDEN'});
 for(const query of [{from:'2026-02-30'},{from:'2026-10-15',to:'2026-10-14'},{page:0},{status:'PAID'},{secret:'unexpected'}])await assert.rejects(()=>stripeDashboard(unavailable,query,bootstrapActor),{name:'ZodError'});
});
test('Stripe dashboard pages local history and counts all matches without mixing currencies or writing payments',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='stripe_dashboard_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));
  const customer=await db.customer.create({data:{name:'Stripe dashboard fixture'}});
  const invoice=await db.invoice.create({data:{customerId:customer.id,number:'TEST-DASHBOARD',status:'ISSUED',dueDate:'2026-10-14',payloadHash:'fixture',subtotalCents:10000,taxCents:0,totalCents:10000,currency:'CAD',idempotencyKey:'dashboard-invoice'}});
  await db.stripeCheckout.createMany({data:Array.from({length:32},(_,index)=>({id:'checkout-'+String(index).padStart(2,'0'),invoiceId:invoice.id,idempotencyKey:'dashboard-'+index,amountCents:index<30?101:500,currency:index<30?'CAD':'USD',status:index<30?'PAID_TEST':'OPEN',url:'https://checkout.stripe.com/private-link',createdAt:new Date('2026-10-14T23:59:59.000Z')}))});
  await db.stripeCheckout.create({data:{invoiceId:invoice.id,idempotencyKey:'excluded-next-day',amountCents:99999,currency:'CAD',createdAt:new Date('2026-10-15T00:00:00.000Z')}});
  await db.providerEvent.create({data:{id:'stripe:evt_fixture_dashboard',provider:'STRIPE',kind:'checkout.session.completed'}});
  const result=await stripeDashboard(db,{from:'2026-10-14',to:'2026-10-14'},bootstrapActor);
  assert.equal(result.total,32);assert.equal(result.items.length,25);assert.equal(result.hasMore,true);
  assert.deepEqual(result.totals,[{currency:'CAD',status:'PAID_TEST',count:30,amountCents:3030},{currency:'USD',status:'OPEN',count:2,amountCents:1000}]);
  assert.equal(result.items[0].invoice.customer.name,customer.name);assert.equal(result.lastWebhook?.kind,'checkout.session.completed');
  assert.equal(JSON.stringify(result).includes('private-link'),false);assert.equal(JSON.stringify(result).includes('evt_fixture_dashboard'),false);
  const second=await stripeDashboard(db,{from:'2026-10-14',to:'2026-10-14',page:2},bootstrapActor);
  assert.equal(second.items.length,7);assert.equal(second.hasMore,false);assert.equal(new Set([...result.items,...second.items].map(row=>row.id)).size,32);
  const paid=await stripeDashboard(db,{status:'PAID_TEST'},bootstrapActor);assert.equal(paid.total,30);assert.equal(paid.totals.length,1);
  const scoped=await stripeDashboard(db,{customerId:customer.id,status:'OPEN'},bootstrapActor);assert.equal(scoped.total,2);assert.equal(scoped.items.every(row=>row.invoice.customer.id===customer.id),true);
  const missing=await stripeDashboard(db,{customerId:'missing-customer'},bootstrapActor);assert.equal(missing.total,0);assert.deepEqual(missing.totals,[]);
  assert.equal(await db.payment.count(),0);assert.equal(await db.auditEvent.count(),0);assert.equal((await db.invoice.findUniqueOrThrow({where:{id:invoice.id}})).status,'ISSUED');
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {bootstrapActor} from '../src/lib/access';
import {dashboardMetrics} from '../src/lib/dashboard-metrics';
const {Client}=createRequire(import.meta.url)('pg');
test('dashboard metrics denies missing CRM access before database queries',async()=>{await assert.rejects(()=>dashboardMetrics({} as PrismaClient,{...bootstrapActor,permissions:[]}),{code:'FORBIDDEN'})});
test('dashboard aggregates native CAD cents, reversals and Toronto movement dates without exposing financial rows',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='metrics_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));



 const customer=await db.customer.create({data:{name:'PRIVATE fixture'}}),property=await db.property.create({data:{customerId:customer.id,address:'PRIVATE fixture'}});await db.contract.create({data:{customerId:customer.id,propertyId:property.id,name:'Fixture',service:'Cleaning',totalVisits:1,priceCents:10000}});
 const invoice=async(key:string,totalCents:number,status='ISSUED',currency='CAD')=>db.invoice.create({data:{customerId:customer.id,status,currency,dueDate:'2026-10-14',subtotalCents:totalCents,taxCents:0,totalCents,idempotencyKey:key,payloadHash:'fixture'}});
 const partial=await invoice('partial',10000),paid=await invoice('paid',5000),foreign=await invoice('foreign',9000,'ISSUED','USD');await invoice('draft',100000,'DRAFT');await invoice('void',100000,'VOID');
 await db.payment.create({data:{invoiceId:partial.id,amountCents:3000,method:'CASH',idempotencyKey:'partial',payloadHash:'fixture',createdAt:new Date('2026-10-15T02:00:00Z')}});
 const reversed=await db.payment.create({data:{invoiceId:partial.id,amountCents:2000,method:'CASH',idempotencyKey:'reversed',payloadHash:'fixture',createdAt:new Date('2026-10-15T02:00:00Z')}});await db.paymentReversal.create({data:{paymentId:reversed.id,reason:'Fixture',actorId:'admin',createdAt:new Date('2026-10-16T02:00:00Z')}});
 await db.payment.create({data:{invoiceId:paid.id,amountCents:5000,method:'CASH',idempotencyKey:'paid',payloadHash:'fixture',createdAt:new Date('2026-10-14T04:00:00Z')}});await db.payment.create({data:{invoiceId:foreign.id,amountCents:9000,method:'CASH',idempotencyKey:'foreign',payloadHash:'fixture'}});
 await db.stripeCheckout.create({data:{invoiceId:partial.id,amountCents:7000,currency:'CAD',status:'PAID_TEST',idempotencyKey:'test-not-payment'}});
 const before=await db.auditEvent.count(),metrics=await dashboardMetrics(db,bootstrapActor,schema);assert.equal(metrics.customers,1);assert.equal(metrics.activeContracts,1);assert.deepEqual(metrics.finance,{receivedCents:8000,issuedCents:15000,outstandingCents:7000,unpaidCount:1,excludedCurrencyCount:1,daily:[{date:'2026-10-14',cents:10000},{date:'2026-10-15',cents:-2000}],recording:'MANUAL_LEDGER',currency:'CAD'});assert.equal(JSON.stringify(metrics).includes('PRIVATE'),false);
 const restricted=await dashboardMetrics(db,{...bootstrapActor,permissions:['crm.read']},schema);assert.equal(restricted.finance,null);
 const old=await invoice('old',1600);await db.payment.createMany({data:Array.from({length:16},(_,i)=>({invoiceId:old.id,amountCents:100,method:'CASH' as const,idempotencyKey:'old-'+i,payloadHash:'fixture',createdAt:new Date('2026-09-'+String(i+1).padStart(2,'0')+'T16:00:00Z')}))});const bounded=await dashboardMetrics(db,bootstrapActor,schema);assert.equal(bounded.finance!.daily.length,14);assert.equal(bounded.finance!.daily[0].date,'2026-09-05');assert.equal(bounded.finance!.receivedCents,9600);assert.equal(await db.auditEvent.count(),before);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

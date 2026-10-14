import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {bootstrapActor} from '../src/lib/access';
import {annualCommission,annualLeaderboard} from '../src/finance/commissions';
const {Client}=createRequire(import.meta.url)('pg');
test('annual commission uses retroactive thresholds and exact cent rounding',()=>{
 for(const [base,rate,commission] of [[0,20,0],[2,20,0],[3,20,1],[9999999,20,2000000],[10000000,25,2500000],[20000000,30,6000000],[30000000,35,10500000],[40000000,40,16000000]]){const result=annualCommission(base);assert.equal(result.ratePercent,rate);assert.equal(result.commissionCents,commission)}
 assert.equal(annualCommission(9999999).remainingToNextCents,1);assert.equal(annualCommission(40000000).nextThresholdCents,null);for(const invalid of [-1,0.1,NaN,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>annualCommission(invalid),{code:'INVALID_COMMISSION_BASE'});
});
test('annual leaderboard validates sales permission and period before database reads',async()=>{
 await assert.rejects(()=>annualLeaderboard({} as PrismaClient,{year:2026},{...bootstrapActor,permissions:[]}),{code:'FORBIDDEN'});await assert.rejects(()=>annualLeaderboard({} as PrismaClient,{year:1900},bootstrapActor));
});
test('annual leaderboard uses signed net sales in Toronto years, tied ranks and permission-scoped personal totals',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='leaderboard_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));



 const a=await db.appUser.create({data:{id:'seller-a',username:'seller.a',name:'Seller A',role:'SELLER',permissions:['sales.write'],passwordHash:'fixture'}}),b=await db.appUser.create({data:{id:'seller-b',username:'seller.b',name:'Seller B',role:'SELLER',permissions:['sales.write'],passwordHash:'fixture',active:false}}),customer=await db.customer.create({data:{name:'PRIVATE customer'}}),property=await db.property.create({data:{customerId:customer.id,address:'PRIVATE address'}});
 let index=0;const sale=async(owner:string|null,amount:number,signedAt:string,status='SIGNED')=>{index++;const contract=await db.contract.create({data:{customerId:customer.id,propertyId:property.id,name:'Fixture '+index,service:'Cleaning',totalVisits:1,priceCents:amount}});return db.serviceAgreement.create({data:{contractId:contract.id,salesOwnerId:owner,status,signedAt:status==='DRAFT'?null:new Date(signedAt),frequency:'ONCE',startDate:'2026-01-01',lines:[],terms:{},subtotalCents:amount,taxCents:10000,totalCents:amount+10000,idempotencyKey:'annual-'+index,payloadHash:'fixture',createdBy:'admin',signer:'PRIVATE signer'}})};
 await sale(a.id,8000000,'2026-01-01T05:00:00Z');await sale(a.id,2000000,'2027-01-01T04:30:00Z');await sale(b.id,10000000,'2026-12-31T17:00:00Z');await sale(null,500000,'2026-10-14T16:00:00Z');await sale(a.id,5000000,'2026-01-01T04:30:00Z');await sale(a.id,100000,'2027-01-01T05:00:00Z');await sale(a.id,99000000,'2026-10-14T16:00:00Z','DRAFT');await sale(a.id,99000000,'2026-10-14T16:00:00Z','ISSUED');
 const audits=await db.auditEvent.count(),global=await annualLeaderboard(db,{year:2026},bootstrapActor,schema);assert.equal(global.mode,'GLOBAL');assert.equal(global.total,2);assert.deepEqual(global.rows.map(r=>[r.id,r.rank,r.baseCents,r.commissionCents]),[['seller-a',1,10000000,2500000],['seller-b',1,10000000,2500000]]);assert.equal(global.summary.baseCents,20000000);assert.equal(global.summary.signedContracts,3);assert.equal(global.summary.unassignedSignedContracts,1);assert.equal(global.rows[1].active,false);assert.equal(JSON.stringify(global).includes('PRIVATE'),false);assert.equal(global.payoutsCreated,false);
 const personal=await annualLeaderboard(db,{year:2026},{...bootstrapActor,id:a.id,permissions:['sales.write']},schema);assert.equal(personal.mode,'PERSONAL');assert.equal(personal.total,1);assert.equal(personal.summary.baseCents,10000000);assert.equal(personal.summary.unassignedSignedContracts,null);assert.equal(JSON.stringify(personal).includes('Seller B'),false);
 const restricted=await annualLeaderboard(db,{year:2026},{...bootstrapActor,id:a.id,permissions:['sales.write','leads.all']},schema);assert.equal(restricted.mode,'PERSONAL');const previous=await annualLeaderboard(db,{year:2025},bootstrapActor,schema);assert.equal(previous.summary.baseCents,5000000);
 const emptyPage=await annualLeaderboard(db,{year:2026,page:2},bootstrapActor,schema);assert.equal(emptyPage.rows.length,0);assert.equal(emptyPage.total,2);assert.equal(emptyPage.summary.baseCents,20000000);assert.equal(await db.auditEvent.count(),audits);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

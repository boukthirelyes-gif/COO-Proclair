import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {Client} from 'pg';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {bootstrapActor,presets} from '../src/lib/access';
import {ServiceAgreements} from '../src/sales/service-agreements';

test('contract owner assignment follows effective sales permissions across enterprise roles', {skip:!process.env.TEST_DATABASE_URL,timeout:60000}, async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='contracts_audit_'+randomUUID().replaceAll('-','');
 const setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));
  const customer=await db.customer.create({data:{name:'Synthetic contract buyer'}}),property=await db.property.create({data:{customerId:customer.id,address:'Synthetic address'}}),service=new ServiceAgreements(db);
  const input={customerId:customer.id,propertyId:property.id,name:'Synthetic service',frequency:'ONCE',startDate:'2027-01-01',lines:[{passageNumber:1,description:'Cleaning',quantity:1,unitPriceCents:10000,taxMode:'QUEBEC'}],terms:{conditions:'Synthetic contract conditions.',cancellation:'Synthetic cancellation terms.',payment:'Synthetic payment conditions.'},idempotencyKey:'audit-owner-contract'};
  const eligible=[];
  for(const role of ['SELLER','MANAGER','ADMIN','OWNER','GENERAL_MANAGER','SALES_MANAGER']){
   const user=await db.appUser.create({data:{username:'audit-'+role.toLowerCase(),name:role,role,permissions:presets[role],passwordHash:'synthetic-unused'}});eligible.push(user);
  }
  const denied=await db.appUser.create({data:{username:'audit-no-grant',name:'No sales grant',role:'SELLER',permissions:['map.read'],passwordHash:'synthetic-unused'}});
  const inactive=await db.appUser.create({data:{username:'audit-inactive',name:'Inactive seller',role:'SELLER',permissions:presets.SELLER,active:false,passwordHash:'synthetic-unused'}});
  const options=await service.options(bootstrapActor);assert.deepEqual(new Set(options.sellers.map(s=>s.id)),new Set(eligible.map(s=>s.id)));
  for(const [index,user] of eligible.entries()){
   const row=await service.create({...input,salesOwnerId:user.id,idempotencyKey:input.idempotencyKey+index},bootstrapActor);assert.equal(row.salesOwnerId,user.id);assert.equal(row.subtotalCents,10000);assert.equal(row.taxCents,1498);
   const changed=await service.updateDraft(row.id,{expectedVersion:row.version,name:input.name,salesOwnerId:eligible[(index+1)%eligible.length].id,frequency:input.frequency,startDate:input.startDate,lines:input.lines,terms:input.terms},bootstrapActor);assert.equal(changed.salesOwnerId,eligible[(index+1)%eligible.length].id);
  }
  for(const user of [denied,inactive])await assert.rejects(()=>service.create({...input,salesOwnerId:user.id,idempotencyKey:input.idempotencyKey+user.id},bootstrapActor),{code:'INVALID_OWNER'});
  const existing=(await service.list(bootstrapActor))[0];
  for(const user of [denied,inactive])await assert.rejects(()=>service.updateDraft(existing.id,{expectedVersion:existing.version,name:input.name,salesOwnerId:user.id,frequency:input.frequency,startDate:input.startDate,lines:input.lines,terms:input.terms},bootstrapActor),{code:'INVALID_OWNER'});
  assert.equal((await db.serviceAgreement.findUniqueOrThrow({where:{id:existing.id}})).version,existing.version);
  assert.equal(await db.contract.count(),eligible.length);assert.equal(await db.visit.count(),0);assert.equal(await db.payment.count(),0);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

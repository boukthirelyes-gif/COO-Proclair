import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {Client} from 'pg';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {presets,userActor} from '../src/lib/access';
import {LeadService} from '../src/sales/leads';
import {SellerQuotes} from '../src/sales/seller-quotes';
import {ServiceAgreements} from '../src/sales/service-agreements';
import {ClientPortal} from '../src/sales/client-portal';

test('accepted quote services survive contract creation, draft edits and passage allocation',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='quote_integrity_'+randomUUID().replaceAll('-','');
 const setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const e of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${e.name}/migration.sql`,'utf8'));
  const seller=await db.appUser.create({data:{username:'integrity-seller',name:'Synthetic seller',role:'SELLER',permissions:presets.SELLER,passwordHash:'unused-synthetic'}}),actor=userActor(seller);
  await db.businessProfile.create({data:{id:'proclair',legalName:'Synthetic issuer'}});
  const lead=await new LeadService(db).create({name:'Synthetic buyer',address:'Synthetic property',pipelineId:'proclair-sales',stageId:'proclair-qualify',idempotencyKey:'integrity-lead'},actor);
  const quotes=new SellerQuotes(db),agreements=new ServiceAgreements(db),portal=new ClientPortal(db);
  const items=[{description:'Window cleaning',quantity:2,unitPriceCents:10000,discountCents:2000,taxMode:'QUEBEC'},{description:'Gutter cleaning',quantity:1,unitPriceCents:10000,discountCents:0,taxMode:'CUSTOM',taxRateBps:0}];
  const q=await quotes.create({leadId:lead.id,expectedLeadVersion:1,approved:true,validUntil:'2027-12-31',items,idempotencyKey:'integrity-quote'},actor);
  const link=await quotes.issue(q.id,{expectedVersion:1},actor);await portal.accept({token:link.path.split('token=')[1],signer:'Synthetic buyer',consent:true});
  const lines=items.map(item=>({...item,passageNumber:1}));
  const input={leadId:lead.id,expectedLeadVersion:2,quoteId:q.id,approved:true,name:'Synthetic agreement',frequency:'CUSTOM',startDate:'2027-01-01',lines,terms:{conditions:'Synthetic agreement conditions.',cancellation:'Synthetic cancellation conditions.',payment:'Synthetic payment conditions.'},idempotencyKey:'integrity-agreement'};
  const changed=lines.map(l=>({...l,description:l.description==='Window cleaning'?'Unquoted pressure washing':l.description}));
  await assert.rejects(()=>agreements.createFromLead({...input,lines:changed},actor),{code:'QUOTE_MISMATCH'});
  // Same net/tax totals, but different quantities and unit prices must be rejected.
  await assert.rejects(()=>agreements.createFromLead({...input,lines:[{...lines[0],quantity:1,unitPriceCents:20000},lines[1]]},actor),{code:'QUOTE_MISMATCH'});
  assert.equal(await db.contract.count(),0);
  // Reordering and allocating the same services to contiguous passages is legitimate.
  const allocated=[{...lines[1],passageNumber:1},{...lines[0],quantity:1,discountCents:1000,passageNumber:2},{...lines[0],quantity:1,discountCents:1000,passageNumber:3}];
  const row=await agreements.createFromLead({...input,lines:allocated},actor);assert.equal(row.sourceQuoteId,q.id);assert.equal(row.subtotalCents,28000);
  const edit={expectedVersion:row.version,name:input.name,salesOwnerId:actor.id,frequency:input.frequency,startDate:input.startDate,lines:changed,terms:input.terms};
  await assert.rejects(()=>agreements.updateDraft(row.id,edit,actor),{code:'QUOTE_MISMATCH'});
  // A custom tax rate equal to the combined Quebec rate must not erase TPS/TVQ semantics.
  await assert.rejects(()=>agreements.updateDraft(row.id,{...edit,lines:[{...lines[0],taxMode:'CUSTOM',taxRateBps:1497.5},lines[1]]},actor),{code:'QUOTE_MISMATCH'});
  assert.equal((await db.serviceAgreement.findUniqueOrThrow({where:{id:row.id}})).version,row.version);
  const updated=await agreements.updateDraft(row.id,{...edit,lines:[...allocated].reverse()},actor);assert.equal(updated.version,row.version+1);
  assert.equal(await db.contract.count(),1);assert.equal(await db.visit.count(),0);assert.equal(await db.payment.count(),0);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

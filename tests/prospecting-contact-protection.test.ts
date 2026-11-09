import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {Client} from 'pg';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {bootstrapActor,presets,userActor} from '../src/lib/access';
import {ProspectingService} from '../src/prospecting/service';
import {LeadService} from '../src/sales/leads';
import {ServiceAgreements} from '../src/sales/service-agreements';
import {SellerQuotes} from '../src/sales/seller-quotes';
import {assertPinContactAllowed} from '../src/prospecting/contact-protection';

test('do-not-contact follows a normalized door address across sellers and pin mutations', {skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='contact_protection_'+randomUUID().replaceAll('-','');
 const setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const e of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${e.name}/migration.sql`,'utf8'));
  const first=await db.appUser.create({data:{username:'contact-one',name:'Synthetic first',role:'SELLER',permissions:presets.SELLER,passwordHash:'unused-synthetic'}});
  const second=await db.appUser.create({data:{username:'contact-two',name:'Synthetic second',role:'SELLER',permissions:presets.SELLER,passwordHash:'unused-synthetic'}});
  const one=userActor(first),two=userActor(second),service=new ProspectingService(db);
  const input={address:'123 Rue École, unité 4, Montréal',latitude:45.5,longitude:-73.5,status:'DO_NOT_CONTACT',notes:'Private restricted note',callbackAt:null,ownerId:first.id};
  const restricted=await service.save(null,input,one);
  const attempt={...input,status:'ACTIVE',notes:'Synthetic note',ownerId:second.id};
  const count=await db.auditEvent.count();
  for(const address of [input.address,'  123   RUE E\u0301COLE, UNITE\u0301 4, MONTRE\u0301AL  ']){
   await assert.rejects(()=>service.save(null,{...attempt,address},two),(error:any)=>{
    assert.equal(error.code,'DO_NOT_CONTACT');assert.equal(error.status,403);
    assert.ok(!error.message.includes(restricted.id));assert.ok(!error.message.includes(first.id));assert.ok(!error.message.includes(input.notes));return true;
   });
  }
  assert.equal(await db.prospectPin.count(),1);assert.equal(await db.auditEvent.count(),count);
  // Retries and concurrent requests cannot recreate an already suppressed door.
  const retries=await Promise.allSettled(Array.from({length:4},()=>service.save(null,attempt,two)));
  assert.ok(retries.every(r=>r.status==='rejected'&&r.reason.code==='DO_NOT_CONTACT'));
  assert.equal(await db.prospectPin.count(),1);assert.equal(await db.auditEvent.count(),count);
  // Identical coordinates must not merge two separate apartment units.
  const otherUnit=await service.save(null,{...attempt,address:'123 Rue École, unité 5, Montréal'},two);
  assert.equal(otherUnit.status,'ACTIVE');
  const beforeMove=await db.prospectPin.findUniqueOrThrow({where:{id:otherUnit.id}});
  await assert.rejects(()=>service.save(otherUnit.id,{...attempt,address:input.address,expectedVersion:otherUnit.version},two),{code:'DO_NOT_CONTACT'});
  assert.deepEqual(await db.prospectPin.findUniqueOrThrow({where:{id:otherUnit.id}}),beforeMove);
  for(const actor of [one,bootstrapActor]){
   await assert.rejects(()=>service.save(restricted.id,{...input,address:'Changed restricted address',expectedVersion:restricted.version},actor),{code:'DO_NOT_CONTACT'});
   await assert.rejects(()=>service.save(restricted.id,{...input,latitude:45.6,expectedVersion:restricted.version},actor),{code:'DO_NOT_CONTACT'});
  }
  // Legacy duplicates are still guarded when the quick-status endpoint is used.
  const duplicate=await db.prospectPin.create({data:{address:input.address,latitude:45.5,longitude:-73.5,status:'NO_HOME',ownerId:second.id,createdBy:'synthetic-legacy'}});
  await assert.rejects(()=>service.quickStatus(duplicate.id,{status:'ACTIVE',expectedVersion:1},two),{code:'DO_NOT_CONTACT'});
  // An administrator must remove the original restriction explicitly, with an audit note.
  await assert.rejects(()=>service.save(restricted.id,{...input,status:'ACTIVE',notes:'',typeId:null,expectedVersion:restricted.version},bootstrapActor),{code:'DO_NOT_CONTACT'});
  const cleared=await service.save(restricted.id,{...input,status:'ACTIVE',notes:'Restriction reviewed and explicitly lifted.',typeId:null,expectedVersion:restricted.version},bootstrapActor);
  assert.equal(cleared.status,'ACTIVE');
  assert.equal((await service.quickStatus(duplicate.id,{status:'ACTIVE',expectedVersion:1},two)).status,'ACTIVE');
  // Category-level Never Knock remains binding even if the old status is inconsistent.
  const restrictedType=await db.mapPinType.findFirstOrThrow({where:{restricted:true}});
  await db.prospectPin.create({data:{address:'456 Synthetic street, unit 1',latitude:45.4,longitude:-73.4,status:'NO_HOME',typeId:restrictedType.id,ownerId:first.id,createdBy:'synthetic-legacy'}});
  await assert.rejects(()=>service.save(null,{...attempt,address:'456 Synthetic street, unit 1',latitude:45.4,longitude:-73.4},two),{code:'DO_NOT_CONTACT'});
  // New restrictions are allowed even when a historical active pin already exists.
  // That older row stays readable, but no later save/quick-status may reactivate it.
  const oldActive=await service.save(null,{...attempt,address:'789 Synthetic road, unit 7'},two);
  const leads=new LeadService(db),leadInput={sourcePinId:oldActive.id,name:'Existing synthetic lead',address:oldActive.address,pipelineId:'proclair-sales',stageId:'proclair-qualify',idempotencyKey:'contact-existing-lead'};
  const oldLead=await leads.create(leadInput,two);
  await service.save(null,{...input,address:oldActive.address},one);
  assert.equal((await service.get(oldActive.id,two)).status,'ACTIVE');
  await assert.rejects(()=>service.save(oldActive.id,{...attempt,address:oldActive.address,expectedVersion:oldActive.version},two),{code:'DO_NOT_CONTACT'});
  await assert.rejects(()=>service.quickStatus(oldActive.id,{status:'SOLD',expectedVersion:oldActive.version},two),{code:'DO_NOT_CONTACT'});
  await assert.rejects(()=>leads.create({...leadInput,idempotencyKey:'new-contact-lead'},two),{code:'DO_NOT_CONTACT'});
  const leadCount=await db.lead.count(),replay=await leads.create(leadInput,two);assert.equal(replay.id,oldLead.id);assert.equal(replay.contactRestricted,true);assert.equal(await db.lead.count(),leadCount);
  assert.equal((await leads.get(oldLead.id,two)).contactRestricted,true);
  assert.equal((await leads.list(two)).leads.find(l=>l.id===oldLead.id)?.contactRestricted,true);
  await assert.rejects(()=>leads.conversionPreview(oldLead.id,bootstrapActor),{code:'DO_NOT_CONTACT'});
  await assert.rejects(()=>leads.convert(oldLead.id,{expectedVersion:1},bootstrapActor),{code:'DO_NOT_CONTACT'});
  assert.equal((await new ServiceAgreements(db).sellerOptions(two)).leads.some(l=>l.id===oldLead.id),false);
  // A source object read before a lock wait must not keep its old identity.
  const stale=await service.save(null,{...attempt,address:'Old source identity'},two);
  let writerReady!:()=>void,releaseWriter!:()=>void;
  const ready=new Promise<void>(resolve=>{writerReady=resolve}),release=new Promise<void>(resolve=>{releaseWriter=resolve});
  const writer=db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928364)`;await tx.prospectPin.update({where:{id:stale.id},data:{address:'Moved and restricted source identity',status:'DO_NOT_CONTACT'}});writerReady();await release;});
  await ready;
  const guarded=db.$transaction(tx=>assertPinContactAllowed(tx,stale));
  releaseWriter();await writer;
  await assert.rejects(()=>guarded,{code:'DO_NOT_CONTACT'});
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

test('contact suppression is scoped to each tenant schema, including source-pin leads', {skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,suffix=randomUUID().replaceAll('-',''),schemas=['contact_tenant_a_'+suffix,'contact_tenant_b_'+suffix];
 const setup=new Client({connectionString:database});await setup.connect();const clients:PrismaClient[]=[];
 try{
  for(const schema of schemas){
   await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
   for(const e of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${e.name}/migration.sql`,'utf8'));
   clients.push(new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})}));
  }
  const [a,b]=clients,address='321 Synthetic independent tenant address';
  const restricted=await new ProspectingService(a).save(null,{address,latitude:45,longitude:-73,status:'DO_NOT_CONTACT'},bootstrapActor);
  const seller=await b.appUser.create({data:{username:'tenant-b-seller',name:'Tenant B synthetic',role:'SELLER',permissions:presets.SELLER,passwordHash:'unused-synthetic'}}),actor=userActor(seller);
  const pin=await new ProspectingService(b).save(null,{address,latitude:45,longitude:-73,status:'ACTIVE'},actor);
  assert.equal(pin.contactAddressKey,restricted.contactAddressKey);
  const leads=new LeadService(b),lead=await leads.create({sourcePinId:pin.id,name:'Independent tenant buyer',address,pipelineId:'proclair-sales',stageId:'proclair-qualify',idempotencyKey:'independent-contact-lead'},actor);
  assert.equal((await leads.get(lead.id,actor)).contactRestricted,false);
  assert.equal((await leads.list(actor)).leads[0].contactRestricted,false);
  assert.equal((await new ServiceAgreements(b).sellerOptions(actor)).leads.some(l=>l.id===lead.id),true);
  const updated=await leads.update(lead.id,{name:'Independent tenant buyer',address,pipelineId:'proclair-sales',stageId:'proclair-qualify',notes:'Unrestricted source-pin update.',expectedVersion:lead.version},actor);assert.equal(updated.contactRestricted,false);assert.equal(updated.version,2);
  assert.equal((await leads.conversionPreview(lead.id,bootstrapActor)).leadId,lead.id);
  const converted=await leads.convert(lead.id,{expectedVersion:updated.version},bootstrapActor);assert.equal(converted.lead.status,'CONVERTED');assert.equal(converted.lead.contactRestricted,false);assert.equal(await b.customer.count(),1);
  await assert.rejects(()=>new ProspectingService(a).save(null,{address,latitude:45,longitude:-73,status:'ACTIVE'},bootstrapActor),{code:'DO_NOT_CONTACT'});
  assert.equal(await a.lead.count(),0);assert.equal(await b.lead.count(),1);
 }finally{for(const db of clients)await db.$disconnect();for(const schema of schemas)await setup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await setup.end()}
});

test('generated contact identity backfills legacy rows and follows writes without merging units', {skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='contact_backfill_'+randomUUID().replaceAll('-','');
 const setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  const migrations=(await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name));
  for(const e of migrations.filter(e=>e.name!=='20261109010000_prospect_contact_identity'))await setup.query(await readFile(`prisma/migrations/${e.name}/migration.sql`,'utf8'));
  await setup.query(`INSERT INTO "ProspectPin" (id,address,latitude,longitude,status,"createdBy","updatedAt") VALUES ($1,$2,45,-73,'DO_NOT_CONTACT','synthetic',now())`,['legacy','\u00a0 123\tRue E\u0301cole, unite\u0301 4, Montréal \u00a0']);
  const prefix='700 ',suffix=', unité 1',unicode=Array.from({length:1000-prefix.length-suffix.length},(_,i)=>String.fromCharCode(0x4e00+(i*7919)%20992)).join(''),longAddress=prefix+unicode+suffix;
  assert.equal(longAddress.length,1000);assert.ok(Buffer.byteLength(longAddress)>2704);
  await setup.query(`INSERT INTO "ProspectPin" (id,address,latitude,longitude,status,"createdBy","updatedAt") VALUES ($1,$2,45,-73,'DO_NOT_CONTACT','synthetic',now())`,['legacy-long',longAddress]);
  await setup.query(await readFile('prisma/migrations/20261109010000_prospect_contact_identity/migration.sql','utf8'));
  const row=await db.prospectPin.findUniqueOrThrow({where:{id:'legacy'}});assert.equal(row.contactAddressKey,'123 rue école, unité 4, montréal');assert.equal(row.status,'DO_NOT_CONTACT');assert.equal(row.version,1);
  const changed=await db.prospectPin.update({where:{id:row.id},data:{address:'123 RUE ÉCOLE, UNITÉ 5, MONTRÉAL'}});assert.equal(changed.contactAddressKey,'123 rue école, unité 5, montréal');assert.notEqual(changed.contactAddressKey,row.contactAddressKey);
  const indexes=await setup.query(`SELECT indexdef FROM pg_indexes WHERE schemaname=$1 AND indexname='ProspectPin_contactAddressKey_idx'`,[schema]);assert.equal(indexes.rows.length,1);assert.match(indexes.rows[0].indexdef,/USING hash \("contactAddressKey"\)/);
  const maps=new ProspectingService(db);
  await assert.rejects(()=>maps.save(null,{address:longAddress,latitude:45,longitude:-73,status:'ACTIVE'},bootstrapActor),{code:'DO_NOT_CONTACT'});
  // A different unit remains a different identity even for maximal UTF-8 input.
  const differentUnit=await maps.save(null,{address:longAddress.slice(0,-1)+'2',latitude:45,longitude:-73,status:'ACTIVE'},bootstrapActor);assert.equal(differentUnit.status,'ACTIVE');
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

test('a later restriction on another pin blocks signed-sale handoff and new seller quotes', {skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='contact_sales_'+randomUUID().replaceAll('-','');
 const setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const e of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${e.name}/migration.sql`,'utf8'));
  await db.businessProfile.create({data:{id:'proclair',legalName:'Synthetic issuer'}});
  const a=await db.appUser.create({data:{username:'sale-contact-one',name:'Synthetic seller',role:'SELLER',permissions:presets.SELLER,passwordHash:'unused-synthetic'}});
  const b=await db.appUser.create({data:{username:'sale-contact-two',name:'Other synthetic seller',role:'SELLER',permissions:presets.SELLER,passwordHash:'unused-synthetic'}});
  const actor=userActor(a),other=userActor(b),maps=new ProspectingService(db),agreements=new ServiceAgreements(db);
  const pin=await maps.save(null,{address:'900 Synthetic contract address',latitude:45.5,longitude:-73.5,status:'ACTIVE'},actor);
  const lead=await new LeadService(db).create({sourcePinId:pin.id,name:'Synthetic buyer',address:pin.address,pipelineId:'proclair-sales',stageId:'proclair-qualify',idempotencyKey:'contact-sale-lead'},actor);
  const input={leadId:lead.id,expectedLeadVersion:1,approved:true,name:'Synthetic restricted sale',frequency:'ONCE',startDate:'2027-01-01',lines:[{passageNumber:1,description:'Cleaning',quantity:1,unitPriceCents:10000}],terms:{conditions:'Synthetic contract conditions.',cancellation:'Synthetic cancellation conditions.',payment:'Synthetic payment conditions.'},idempotencyKey:'contact-sale-agreement'};
  const row=await agreements.createFromLead(input,actor),link=await agreements.issue(row.id,{expectedVersion:row.version},actor);
  await agreements.accept({token:link.path.split('token=')[1],signer:'Synthetic buyer',consent:true});
  const signed=await db.serviceAgreement.findUniqueOrThrow({where:{id:row.id}});
  await maps.save(null,{address:pin.address,latitude:pin.latitude,longitude:pin.longitude,status:'DO_NOT_CONTACT'},other);
  const audits=await db.auditEvent.count();
  await assert.rejects(()=>agreements.submit(row.id,{expectedVersion:signed.version,approved:true},actor),{code:'DO_NOT_CONTACT'});
  await assert.rejects(()=>new SellerQuotes(db).create({leadId:lead.id,expectedLeadVersion:2,approved:true,validUntil:'2027-12-31',items:[{description:'Cleaning',quantity:1,unitPriceCents:10000}],idempotencyKey:'contact-sale-quote'},actor),{code:'DO_NOT_CONTACT'});
  assert.equal(await db.auditEvent.count(),audits);
  const preserved=await db.serviceAgreement.findUniqueOrThrow({where:{id:row.id}});assert.equal(preserved.status,'SIGNED');assert.equal(preserved.submittedAt,null);assert.equal(preserved.version,signed.version);
  assert.equal((await db.prospectPin.findUniqueOrThrow({where:{id:pin.id}})).status,'ACTIVE');
  assert.equal(await db.quote.count(),0);assert.equal(await db.visit.count(),0);assert.equal(await db.payment.count(),0);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

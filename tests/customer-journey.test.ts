import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import pg from 'pg';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {bootstrapActor,presets,userActor,requirePermission,routePermission} from '../src/lib/access';
import {LeadService} from '../src/sales/leads';
import {ProspectingService} from '../src/prospecting/service';
import {QuoteService} from '../src/sales/quotes';
import {SellerQuotes} from '../src/sales/seller-quotes';
import {ClientPortal} from '../src/sales/client-portal';
import {ServiceAgreements} from '../src/sales/service-agreements';
import {CRMService} from '../src/domain/service';
import {FinanceService,calculateItems} from '../src/finance/service';
import {annualLeaderboard} from '../src/finance/commissions';
import {commissionImpact} from '../src/finance/commission-impact';
import {customerDossier} from '../src/lib/customer-dossier';
import {invoiceDocument} from '../src/lib/invoice-document';

test('Quebec taxes round separately after discounts, without changing custom historical rates',()=>{
 const q=calculateItems([{description:'QC',quantity:2,unitPriceCents:10,discountCents:10,taxMode:'QUEBEC',taxRateBps:0}]);
 assert.equal(q.subtotalCents,10);assert.equal(q.items[0].gstCents,1);assert.equal(q.items[0].qstCents,1);assert.equal(q.totalCents,12);
 assert.equal(calculateItems([{description:'Custom unchanged',quantity:1,unitPriceCents:10,taxRateBps:1497.5}]).taxCents,1);
 assert.throws(()=>calculateItems([{description:'Invalid',quantity:1,unitPriceCents:100,discountCents:101,taxRateBps:0}]),{code:'INVALID_DISCOUNT'});
});

test('synthetic journey twice: seller pin → signed quote/contract → completed visit → unique invoice/payment → commission', {skip:!process.env.TEST_DATABASE_URL,timeout:120000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='journey_'+randomUUID().replaceAll('-','');
 const setup=new pg.Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 let db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));
  await db.businessProfile.create({data:{id:'proclair',legalName:'Synthetic Proclair',address:'Adresse synthétique'}});
  const seller=userActor(await db.appUser.create({data:{username:'journey-seller',name:'Synthetic seller',role:'SELLER',permissions:presets.SELLER,passwordHash:'unused'}}));
  const other=userActor(await db.appUser.create({data:{username:'other-seller',name:'Other seller',role:'SELLER',permissions:presets.SELLER,passwordHash:'unused'}}));
  const tech=await db.technician.create({data:{name:'Synthetic technician'}});
  const dispatcher={...bootstrapActor,id:'dispatch-operator',role:'DISPATCHER' as const,accountRole:'DISPATCHER',permissions:presets.DISPATCHER};
  requirePermission(dispatcher,'dispatch');assert.throws(()=>requirePermission(dispatcher,routePermission('invoices/from-visit/x','POST')!),{code:'FORBIDDEN'});
  for(let run=0;run<2;run++){
   const suffix='journey-'+run,pins=new ProspectingService(db),leads=new LeadService(db),quotes=new SellerQuotes(db),agreements=new ServiceAgreements(db),crm=new CRMService(db),finance=new FinanceService(db);
   const pin=await pins.save(null,{address:'Synthetic door '+run,latitude:45.5+run/100,longitude:-73.5,status:'CALLBACK',notes:'Synthetic notes',callbackAt:'2027-01-04T15:00:00Z'},seller);
   assert.equal((await pins.get(pin.id,seller)).callbackAt!.toISOString(),'2027-01-04T15:00:00.000Z');
   const lead=await leads.create({sourcePinId:pin.id,name:'Synthetic buyer '+run,address:pin.address,notes:'Journey notes',idempotencyKey:suffix+'-lead'},seller);
   assert.equal((await leads.create({sourcePinId:pin.id,name:'Synthetic buyer '+run,address:pin.address,notes:'Journey notes',idempotencyKey:suffix+'-lead'},seller)).id,lead.id);
   const item={description:'Cleaning',quantity:2,unitPriceCents:10000,discountCents:1000,taxRateBps:0,taxMode:'QUEBEC' as const};
   const qinput={leadId:lead.id,expectedLeadVersion:1,approved:true,validUntil:'2099-01-01',items:[item],idempotencyKey:suffix+'-quote'};
   const created=await quotes.create(qinput,seller);assert.equal((await quotes.create(qinput,seller)).id,created.id);
   const quote=await db.quote.findUniqueOrThrow({where:{id:created.id}});assert.equal(quote.subtotalCents,19000);assert.equal(quote.taxCents,2845);assert.equal(quote.totalCents,21845);assert.equal(quote.salesOwnerId,seller.id);
   await assert.rejects(()=>quotes.issue(created.id,{expectedVersion:quote.version},other),{code:'NOT_FOUND'});
   const quoteLink=await quotes.issue(created.id,{expectedVersion:quote.version},seller);await new ClientPortal(db).accept({token:quoteLink.path.split('token=')[1],signer:'Synthetic buyer',consent:true});
   const converted=await db.lead.findUniqueOrThrow({where:{id:lead.id}});assert.equal(converted.ownerId,seller.id);assert.ok(converted.convertedCustomerId);
   const agreementInput={leadId:lead.id,expectedLeadVersion:converted.version,quoteId:quote.id,approved:true,name:'Journey contract',frequency:'ONCE',startDate:'2027-01-11',lines:[{...item,passageNumber:1,dueDate:'2027-01-11'}],terms:{conditions:'Synthetic conditions accepted.',cancellation:'Synthetic cancellation terms.',payment:'Manual synthetic payment only.',guarantee:''},idempotencyKey:suffix+'-agreement'};
   const agreement=await agreements.createFromLead(agreementInput,seller);assert.equal((await agreements.createFromLead(agreementInput,seller)).id,agreement.id);
   await assert.rejects(()=>new QuoteService(db).convert(quote.id,{expectedVersion:3,dueDate:'2027-01-31'},bootstrapActor),{code:'CONTRACT_BILLING_REQUIRED'});
   const issued=await agreements.issue(agreement.id,{expectedVersion:agreement.version},seller),acceptance={token:issued.path.split('token=')[1],signer:'Synthetic buyer',consent:true};
   await agreements.accept(acceptance);assert.equal((await agreements.accept(acceptance)).replayed,true);
   let signed=await db.serviceAgreement.findUniqueOrThrow({where:{id:agreement.id}});assert.ok(signed.documentHash);assert.ok(signed.signatureHash);assert.ok(signed.pdfSha256);assert.equal(Buffer.from((await agreements.pdf(signed.id,seller)).pdfBytes!).subarray(0,5).toString(),'%PDF-');
   await assert.rejects(()=>agreements.updateDraft(signed.id,{name:'Silent modification',salesOwnerId:seller.id,frequency:'ONCE',startDate:'2027-01-11',lines:agreementInput.lines,terms:agreementInput.terms,expectedVersion:signed.version},seller),{code:'AGREEMENT_IMMUTABLE'});
   await agreements.submit(signed.id,{expectedVersion:signed.version,approved:true},seller);signed=await db.serviceAgreement.findUniqueOrThrow({where:{id:signed.id}});
   const scheduled=await agreements.schedule(signed.id,{expectedVersion:signed.version,approved:true},dispatcher);assert.deepEqual((await agreements.schedule(signed.id,{expectedVersion:signed.version,approved:true},dispatcher)).visitIds,scheduled.visitIds);
   let visit=await db.visit.findUniqueOrThrow({where:{id:scheduled.visitIds[0]}});assert.equal(visit.customerId,quote.customerId);assert.equal(visit.contractId,agreement.contractId);assert.equal(visit.priceCents,19000);
   await assert.rejects(()=>finance.invoiceCompletedVisit(visit.id,{expectedVisitVersion:visit.version,dueDate:'2027-01-31',idempotencyKey:suffix+'-invoice'},bootstrapActor),{code:'VISIT_NOT_COMPLETED'});
   visit=await crm.transitionVisit(visit.id,{expectedVersion:visit.version,status:'CONFIRMED'},dispatcher);
   visit=await crm.updateVisit(visit.id,{expectedVersion:visit.version,technicianId:tech.id,startsAt:`2027-01-11T${run===0?'13':'15'}:00:00Z`,endsAt:`2027-01-11T${run===0?'14':'16'}:00:00Z`},dispatcher);
   for(const status of ['SCHEDULED','IN_PROGRESS','COMPLETED'])visit=await crm.transitionVisit(visit.id,{expectedVersion:visit.version,status},dispatcher);
   const invoiceInput={expectedVisitVersion:visit.version,dueDate:'2027-01-31',idempotencyKey:suffix+'-invoice'};
   await assert.rejects(()=>finance.invoiceCompletedVisit(visit.id,invoiceInput,seller),{code:'FORBIDDEN'});
   const [draft,replay]=await Promise.all([finance.invoiceCompletedVisit(visit.id,invoiceInput,bootstrapActor),finance.invoiceCompletedVisit(visit.id,{...invoiceInput,idempotencyKey:suffix+'-other-key'},bootstrapActor)]);assert.equal(draft.id,replay.id);assert.equal(draft.sourceVisitId,visit.id);assert.equal(draft.contractId,signed.contractId);assert.equal(draft.totalCents,quote.totalCents);assert.equal(draft.items[0].discountCents,1000);assert.equal(draft.items[0].gstCents,950);assert.equal(draft.items[0].qstCents,1895);
   const invoice=await finance.issueInvoice(draft.id,{expectedVersion:draft.version},bootstrapActor),payment={expectedVersion:invoice.version,amountCents:21845,method:'OTHER',note:'Synthetic test, no external operation',idempotencyKey:suffix+'-payment'};
   const paid=await finance.recordPayment(invoice.id,payment,bootstrapActor);assert.equal((await finance.recordPayment(invoice.id,payment,bootstrapActor)).id,paid.id);assert.equal(paid.balanceCents,0);assert.equal(paid.status,'PAID');assert.match(invoiceDocument(paid),/TPS/);assert.match(invoiceDocument(paid),/TVQ/);
   const year=Number(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric'}).format(signed.signedAt!));
   const board=await annualLeaderboard(db,{year},bootstrapActor,schema);assert.equal(board.rows[0].baseCents,(run+1)*19000);assert.equal(board.rows[0].commissionCents,(run+1)*3800);assert.equal(board.rows[0].signedContracts,run+1);assert.equal(board.policy.version,'SIGNED_HT_ANNUAL_V1');
   const personal=await annualLeaderboard(db,{year},seller,schema);assert.equal(personal.mode,'PERSONAL');assert.equal((await annualLeaderboard(db,{year},other,schema)).rows.length,0);
   await assert.rejects(()=>commissionImpact(db,{year},seller,schema),{code:'FORBIDDEN'});
   const before=await db.payment.count(),impact=await commissionImpact(db,{year},bootstrapActor,schema);assert.equal(impact.historicalObligationsModified,false);assert.equal(impact.registeredPolicy!.id,'SIGNED_HT_ANNUAL_V1');assert.equal(await db.payment.count(),before);
   await crm.createProperty({customerId:quote.customerId,address:'Second synthetic address '+run},bootstrapActor);
   const dossier=await customerDossier(db,quote.customerId,bootstrapActor);assert.equal(dossier.customer.properties.length,2);assert.ok(dossier.customer.visits.some(v=>v.id===visit.id&&v.status==='COMPLETED'));assert.ok(dossier.invoices.some(i=>i.sourceVisitId===visit.id));assert.equal(dossier.customer.contracts[0].agreement!.status,'SIGNED');assert.ok(dossier.activity.length);
   assert.equal((await pins.get(pin.id,seller)).status,'SOLD');await assert.rejects(()=>pins.get(pin.id,other),{code:'NOT_FOUND'});
   // Reconnect to storage; no fixture reinsertion or mock of a business operation.
   await db.$disconnect();db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});assert.equal((await new FinanceService(db).getInvoice(invoice.id)).balanceCents,0);assert.equal((await db.visit.findUniqueOrThrow({where:{id:visit.id}})).status,'COMPLETED');
  }
  assert.equal(await db.invoice.count(),2);assert.equal(await db.payment.count(),2);assert.equal(await db.serviceAgreement.count(),2);assert.equal(await db.customer.count(),2);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

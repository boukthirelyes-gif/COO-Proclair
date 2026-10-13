import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {bootstrapActor,presets} from '../src/lib/access';
import {parseExportCsv,mapExportRows} from '../src/lib/rotor-export-file';
import {RotorFileImports} from '../src/lib/rotor-file-import';
import {RotorCustomerPromotion} from '../src/lib/rotor-customer-promotion';
import {nativeExport} from '../src/lib/native-export';
import {rotorMigrationOverview} from '../src/lib/rotor-migration-overview';
import {rotorCustomerReviewList} from '../src/lib/rotor-customer-review-list';
const {Client}=createRequire(import.meta.url)('pg');
test('mapped CSV preserves quotes and source IDs while excluding unselected sensitive columns',()=>{
 const file=parseExportCsv('\uFEFFid;name;email;notes;auth_token\r\n001;"Alpha; buyer";alpha@example.test;"Two\nlines and ""quotes""";private-value\r\n',';');
 const rows=mapExportRows(file,'CUSTOMER',{externalId:'id',name:'name',email:'email',notes:'notes'},'DOLLARS');
 assert.equal(rows[0].externalId,'001');assert.equal(rows[0].name,'Alpha; buyer');assert.equal(rows[0].notes,'Two\nlines and "quotes"');assert.ok(!JSON.stringify(rows).includes('private-value'));
 assert.throws(()=>mapExportRows(file,'CUSTOMER',{externalId:'id',name:'auth_token'},'DOLLARS'));
 assert.throws(()=>parseExportCsv('id,id\n1,2',','));assert.throws(()=>parseExportCsv('id,name\n1,"unfinished',','));assert.throws(()=>parseExportCsv('id,name\n1,a,b',','));
 assert.throws(()=>parseExportCsv('id,name\n'+Array.from({length:1001},(_,i)=>i+',buyer').join('\n'),','));
});
test('mapped financial exports require explicit units and preserve signed cents and Toronto dates',()=>{
 const file=parseExportCsv('id;amount;currency;status;date\np1;239,99;CAD;paid;2026-11-01\np2;-10,00;CAD;refunded;2026-11-01T15:00:00-05:00',';'),mapping={externalId:'id',amountCents:'amount',currency:'currency',status:'status',occurredAt:'date'};
 const rows=mapExportRows(file,'PAYMENT',mapping,'DOLLARS');assert.equal(rows[0].amountCents,23999);assert.equal(rows[1].amountCents,-1000);assert.equal(rows[0].occurredAt,'2026-11-01T04:00:00.000Z');
 assert.throws(()=>mapExportRows(file,'PAYMENT',mapping,'CENTS'));assert.throws(()=>mapExportRows(file,'PAYMENT',{...mapping,currency:''},'DOLLARS'));
 assert.throws(()=>mapExportRows(parseExportCsv('id;amount;currency;status;date\np;1,001;CAD;paid;2026-11-01',';'),'PAYMENT',mapping,'DOLLARS'));
});
test('file migration stages reviewed customers and immutable financial history with atomic conflicts and pagination',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const schema='fileimport_'+randomUUID().replaceAll('-',''),database=process.env.TEST_DATABASE_URL!,setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const e of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${e.name}/migration.sql`,'utf8'));
  const service=new RotorFileImports(db),promotion=new RotorCustomerPromotion(db),actor=bootstrapActor;
  const customer={externalId:'0001',name:'Alpha CSV buyer',email:'alpha@example.test',phone:'5145550111',address:'Imported address',notes:'Imported notes'},data={kind:'CUSTOMER',rows:[customer,{...customer,externalId:'0002',name:'Beta CSV buyer',email:null,phone:null}]};
  await assert.rejects(()=>service.preview(data,{...actor,permissions:presets.SELLER}),{code:'FORBIDDEN'});
  const preview=await service.preview(data,actor);assert.equal(preview.newRows,2);assert.equal(await db.rotorFileImport.count(),0);assert.equal(await db.customer.count(),0);
  await assert.rejects(()=>service.apply({...data,checksum:preview.checksum,approved:false},actor));
  await assert.rejects(()=>service.apply({...data,rows:[{...customer,name:'Changed'}],checksum:preview.checksum,approved:true},actor),{code:'SOURCE_CHANGED'});
  const [first,second]=await Promise.all([service.apply({...data,checksum:preview.checksum,approved:true},actor),service.apply({...data,checksum:preview.checksum,approved:true},actor)]);assert.equal(first.runId,second.runId);assert.equal(await db.rotorFileImport.count(),1);assert.equal(await db.rotorImportItem.count(),2);assert.equal(await db.customer.count(),0);
  assert.equal((await service.preview({...data,rows:[...data.rows].reverse()},actor)).replayed,true);
  const review=await promotion.preview({runId:first.runId!,externalId:customer.externalId},actor),native=await promotion.apply({runId:first.runId!,externalId:customer.externalId,contentHash:review.contentHash,approved:true},actor);
  assert.equal((await db.customer.findUniqueOrThrow({where:{id:native.customerId}})).notes,customer.notes);assert.equal(await db.property.count(),1);
  const conflict={kind:'CUSTOMER',rows:[{...customer,name:'Different name'},{...customer,externalId:'new-conflicting-client'}]},report=await service.preview(conflict,actor);assert.deepEqual(report.conflicts,['0001']);await assert.rejects(()=>service.apply({...conflict,checksum:report.checksum,approved:true},actor),{code:'SOURCE_CONFLICT'});assert.equal(await db.rotorMirrorRecord.count(),2);
  const payment={externalId:'pay-1',customerExternalId:'0001',invoiceExternalId:'invoice-1',amountCents:23999,currency:'CAD',status:'paid',occurredAt:'2026-10-13T15:00:00Z',reference:'Receipt 1',method:'bank'},payments={kind:'PAYMENT',rows:[payment,{...payment,externalId:'pay-2',customerExternalId:'unmatched',amountCents:-1000,status:'refunded'}]},p=await service.preview(payments,actor);assert.equal(p.totalCents,'22999');await service.apply({...payments,checksum:p.checksum,approved:true},actor);
  assert.equal((await service.apply({...payments,checksum:p.checksum,approved:true},actor)).replayed,true);assert.equal(await db.rotorFinancialArchive.count(),2);
  const financialConflict={kind:'PAYMENT',rows:[{...payment,amountCents:1},{...payment,externalId:'new-rejected-payment'}]},cp=await service.preview(financialConflict,actor);await assert.rejects(()=>service.apply({...financialConflict,checksum:cp.checksum,approved:true},actor),{code:'SOURCE_CONFLICT'});assert.equal(await db.rotorFinancialArchive.count(),2);
  await assert.rejects(()=>service.preview({...payments,rows:[{...payment,currency:'USD'}]},actor));await assert.rejects(()=>service.preview({...payments,rows:[{...payment,cardNumber:'unwanted'}]},actor));
  await assert.rejects(()=>service.preview(payments,{...actor,permissions:actor.permissions.filter(p=>p!=='finance')}),{code:'FORBIDDEN'});
  await assert.rejects(()=>service.archive({...actor,permissions:presets.SELLER},{kind:'PAYMENT'}),{code:'FORBIDDEN'});
  let archive=await service.archive(actor,{kind:'PAYMENT',customerId:native.customerId});assert.equal(archive.total,1);assert.equal(archive.rows[0].customer?.name,customer.name);assert.equal((await service.archive(actor,{kind:'PAYMENT',customerId:'absent'})).total,0);
  const invoices={kind:'INVOICE',rows:[{...payment,externalId:'invoice-1',status:'paid'}]},ip=await service.preview(invoices,actor);await service.apply({...invoices,checksum:ip.checksum,approved:true},actor);assert.equal((await service.archive(actor,{kind:'INVOICE'})).total,1);
  const many={kind:'PAYMENT',rows:Array.from({length:55},(_,i)=>({...payment,externalId:'bulk-'+i}))},mp=await service.preview(many,actor);await service.apply({...many,checksum:mp.checksum,approved:true},actor);archive=await service.archive(actor,{kind:'PAYMENT'});assert.equal(archive.total,57);assert.equal(archive.rows.length,50);const remaining=await service.archive(actor,{kind:'PAYMENT',after:archive.nextCursor!});assert.equal(remaining.rows.length,7);assert.equal(new Set([...archive.rows,...remaining.rows].map(r=>r.id)).size,57);
  const limited=await service.history({...actor,permissions:actor.permissions.filter(p=>p!=='finance')});assert.ok(limited.batches.every(b=>b.kind==='CUSTOMER'));
  const exported=JSON.parse(await nativeExport(db));assert.equal(exported.data.rotorFinancialArchives.length,58);assert.equal(exported.data.rotorFileImports.length,4);
  assert.equal(await db.invoice.count(),0);assert.equal(await db.payment.count(),0);assert.equal(await db.visit.count(),0);assert.equal(await db.auditEvent.count({where:{action:'ROTOR_FILE_IMPORTED'}}),4);
  let overview=await rotorMigrationOverview(db,actor,schema);assert.deepEqual(overview.customers,{staged:2,linked:1,pendingReview:1,sourceConflicts:0});assert.equal(overview.scope,'STORED_DATA_ONLY');assert.equal(overview.transferComplete,false);assert.equal(overview.runs.COMPLETE,1);assert.equal(overview.financial!.PAYMENT.total,57);assert.equal(overview.financial!.PAYMENT.unmatchedCustomers,1);assert.equal(overview.financial!.PAYMENT.missingCustomerReference,0);assert.equal(overview.financial!.PAYMENT.missingInvoice,0);assert.equal(overview.financial!.INVOICE.total,1);
  const withoutFinance=await rotorMigrationOverview(db,{...actor,permissions:actor.permissions.filter(p=>p!=='finance')},schema);assert.equal(withoutFinance.financial,null);await assert.rejects(()=>rotorMigrationOverview(db,{...actor,permissions:presets.SELLER},schema),{code:'FORBIDDEN'});
  await db.rotorMirrorRecord.update({where:{kind_externalId:{kind:'CUSTOMER',externalId:'0001'}},data:{contentHash:'changed-fixture'}});overview=await rotorMigrationOverview(db,actor,schema);assert.equal(overview.customers.sourceConflicts,1);assert.equal(overview.customers.linked,1);assert.equal((await db.customer.findUniqueOrThrow({where:{id:native.customerId}})).name,customer.name);
  await db.rotorFinancialArchive.update({where:{kind_externalId:{kind:'PAYMENT',externalId:'pay-2'}},data:{invoiceExternalId:'missing-invoice'}});await db.rotorFinancialArchive.update({where:{kind_externalId:{kind:'PAYMENT',externalId:'bulk-0'}},data:{customerExternalId:null}});overview=await rotorMigrationOverview(db,actor,schema);assert.equal(overview.financial!.PAYMENT.missingInvoice,1);assert.equal(overview.financial!.PAYMENT.missingCustomerReference,1);assert.equal(overview.financial!.PAYMENT.unmatchedCustomers,1);

  const bulkCustomers={kind:'CUSTOMER',rows:Array.from({length:35},(_,i)=>({...customer,externalId:'review_'+String(i).padStart(3,'0'),name:i===0?'Literal_100%':'Search Client '+i,email:i===34?'late@example.test':null,phone:null}))},bulkPreview=await service.preview(bulkCustomers,actor),bulkRun=await service.apply({...bulkCustomers,checksum:bulkPreview.checksum,approved:true},actor);
  const firstPage=await rotorCustomerReviewList(db,bulkRun.runId!,{},actor,schema);assert.equal(firstPage.total,35);assert.equal(firstPage.rows.length,20);assert.equal(firstPage.rows.some(r=>r.externalId==='review_034'),false);assert.ok(firstPage.rows.every(r=>r.reviewStatus==='PENDING'));
  const lastPage=await rotorCustomerReviewList(db,bulkRun.runId!,{after:firstPage.nextCursor!},actor,schema);assert.equal(lastPage.rows.length,15);assert.equal(lastPage.total,35);assert.equal(lastPage.nextCursor,null);assert.equal(new Set([...firstPage.rows,...lastPage.rows].map(r=>r.externalId)).size,35);
  assert.equal((await rotorCustomerReviewList(db,bulkRun.runId!,{search:'SEARCH CLIENT 34'},actor,schema)).rows[0].externalId,'review_034');assert.equal((await rotorCustomerReviewList(db,bulkRun.runId!,{search:'LATE@EXAMPLE.TEST'},actor,schema)).total,1);assert.equal((await rotorCustomerReviewList(db,bulkRun.runId!,{search:'%'},actor,schema)).total,1);assert.equal((await rotorCustomerReviewList(db,bulkRun.runId!,{search:'Literal_100%'},actor,schema)).total,1);assert.equal((await rotorCustomerReviewList(db,bulkRun.runId!,{search:"' OR true --"},actor,schema)).total,0);
  const oldRows=await rotorCustomerReviewList(db,first.runId!,{status:'SOURCE_CHANGED'},actor,schema);assert.equal(oldRows.total,1);assert.equal(oldRows.rows[0].externalId,'0001');assert.equal(oldRows.rows[0].mapping!.customerId,native.customerId);
  const readOnly={...actor,permissions:['integrations' as const]};assert.equal((await rotorCustomerReviewList(db,first.runId!,{status:'SOURCE_CHANGED'},readOnly,schema)).rows[0].mapping,null);
  const candidate=await promotion.preview({runId:bulkRun.runId!,externalId:'review_034'},actor);await promotion.apply({runId:bulkRun.runId!,externalId:'review_034',contentHash:candidate.contentHash,approved:true},actor);
  assert.equal((await rotorCustomerReviewList(db,bulkRun.runId!,{status:'LINKED'},actor,schema)).total,1);assert.equal((await rotorCustomerReviewList(db,bulkRun.runId!,{status:'PENDING'},actor,schema)).total,34);assert.equal((await rotorCustomerReviewList(db,bulkRun.runId!,{status:'SOURCE_CHANGED'},actor,schema)).total,0);
  await assert.rejects(()=>rotorCustomerReviewList(db,'absent',{},actor,schema),{code:'NOT_FOUND'});await assert.rejects(()=>rotorCustomerReviewList(db,bulkRun.runId!,{}, {...actor,permissions:presets.SELLER},schema),{code:'FORBIDDEN'});await assert.rejects(()=>rotorCustomerReviewList(db,bulkRun.runId!,{status:'INVALID'},actor,schema));await assert.rejects(()=>rotorCustomerReviewList(db,bulkRun.runId!,{secret:'unwanted'},actor,schema));

 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

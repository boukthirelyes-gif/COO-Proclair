import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {FinanceService,calculateItems,createInvoiceSchema} from '../src/finance/service';
const {Client}=createRequire(import.meta.url)('pg');
const admin={id:'finance-test',role:'ADMIN' as const};
test('finance exact integer calculations and strict input validation',()=>{
 const items=createInvoiceSchema.parse({customerId:'x',dueDate:'2027-01-01',idempotencyKey:'test-key-1',items:[{description:'Service',quantity:3,unitPriceCents:101,taxRateBps:5000}]}).items;
 const total=calculateItems(items);assert.equal(total.subtotalCents,303);assert.equal(total.taxCents,152);assert.equal(total.totalCents,455);
 assert.equal(calculateItems([{description:'Fractional rate explicitly configured',quantity:2,unitPriceCents:10000,taxRateBps:997.5}]).taxCents,1995);
 assert.throws(()=>createInvoiceSchema.parse({customerId:'x',dueDate:'2027-01-01',idempotencyKey:'test-key-1',items:[{...items[0],taxRateBps:997.5001}]}));
 assert.throws(()=>calculateItems([{description:'Overflow',quantity:1000000,unitPriceCents:2147483647,taxRateBps:0}]),{code:'AMOUNT_OVERFLOW'});
 assert.throws(()=>createInvoiceSchema.parse({customerId:'x',dueDate:'2027-02-30',idempotencyKey:'test-key-1',items}));
 assert.throws(()=>createInvoiceSchema.parse({customerId:'x',dueDate:'2027-01-01',idempotencyKey:'test-key-1',items:[{...items[0],quantity:1.5}]}));
});
test('finance isolated ledger: invoices numbering payments reversal permissions idempotency and concurrency',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema=`finance_test_${randomUUID().replaceAll('-','')}`,setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));
 const expenseService=new FinanceService(db),expenseInput={vendor:'Supplier',category:'FUEL',description:'Paid fuel',paidDate:'2026-10-09',amountCents:12345,idempotencyKey:'expense-test-1'};
 await assert.rejects(()=>expenseService.recordExpense(expenseInput,{id:'omega',role:'OMEGA'}),{code:'APPROVAL_REQUIRED'});
 await assert.rejects(()=>expenseService.recordExpense({...expenseInput,amountCents:0},admin));
 await assert.rejects(()=>expenseService.recordExpense({...expenseInput,paidDate:'2026-02-30'},admin));
 const duplicates=await Promise.all([expenseService.recordExpense(expenseInput,admin),expenseService.recordExpense(expenseInput,admin)]);assert.equal(duplicates[0].id,duplicates[1].id);assert.equal(await db.expense.count(),1);
 await assert.rejects(()=>expenseService.recordExpense({...expenseInput,amountCents:1},admin),{code:'IDEMPOTENCY_CONFLICT'});
 const expense=duplicates[0];await assert.rejects(()=>expenseService.voidExpense(expense.id,{expectedVersion:1,reason:'Error'},{id:'dispatch',role:'DISPATCHER'}),{code:'FORBIDDEN'});
 await assert.rejects(()=>expenseService.voidExpense(expense.id,{expectedVersion:2,reason:'Error'},admin),{code:'VERSION_CONFLICT'});
 const voidExpense=await expenseService.voidExpense(expense.id,{expectedVersion:1,reason:'Duplicate receipt'},admin);assert.equal(voidExpense.status,'VOID');assert.equal(voidExpense.amountCents,12345);
 await assert.rejects(()=>expenseService.voidExpense(expense.id,{expectedVersion:2,reason:'Again'},admin),{code:'INVALID_TRANSITION'});
 assert.equal((await expenseService.readState()).expenses.length,1);assert.equal(await db.auditEvent.count({where:{entityType:'Expense'}}),2);
 const service=new FinanceService(db),customer=await db.customer.create({data:{name:'Finance test'}}),other=await db.customer.create({data:{name:'Other'}}),property=await db.property.create({data:{customerId:other.id,address:'Other site'}}),contract=await db.contract.create({data:{customerId:other.id,propertyId:property.id,name:'Other',service:'Cleaning',totalVisits:1,priceCents:100}});
 const input={customerId:customer.id,dueDate:'2027-01-01',idempotencyKey:'invoice-test-1',items:[{description:'Service',quantity:2,unitPriceCents:1000,taxRateBps:500}]};
 await assert.rejects(()=>service.createInvoice({...input,contractId:contract.id},admin),{code:'RELATION_MISMATCH'});
 const draft=await service.createInvoice(input,{id:'omega',role:'OMEGA'});assert.equal(draft.status,'DRAFT');assert.equal(draft.totalCents,2100);assert.equal((await service.createInvoice(input,admin)).id,draft.id);
 await assert.rejects(()=>service.createInvoice({...input,dueDate:'2027-01-02'},admin),{code:'IDEMPOTENCY_CONFLICT'});
 await assert.rejects(()=>service.issueInvoice(draft.id,{expectedVersion:1},{id:'omega',role:'OMEGA'}),{code:'APPROVAL_REQUIRED'});
 const issued=await service.issueInvoice(draft.id,{expectedVersion:1},admin);assert.equal(issued.number,'PC-000001');assert.equal(issued.status,'ISSUED');
 await assert.rejects(()=>service.issueInvoice(draft.id,{expectedVersion:1},admin),{code:'VERSION_CONFLICT'});
 const payment={expectedVersion:2,amountCents:1000,method:'BANK_TRANSFER',reference:'statement 123',idempotencyKey:'payment-test-1'};
 await assert.rejects(()=>service.recordPayment(draft.id,{...payment,amountCents:2101},admin),{code:'OVERPAYMENT'});
 const partial=await service.recordPayment(draft.id,payment,admin);assert.equal(partial.status,'PARTIAL');assert.equal(partial.balanceCents,1100);assert.equal((await service.recordPayment(draft.id,payment,admin)).version,3);
 await assert.rejects(()=>service.recordPayment(draft.id,{...payment,amountCents:1001},admin),{code:'IDEMPOTENCY_CONFLICT'});
 await assert.rejects(()=>service.voidInvoice(draft.id,{expectedVersion:3,reason:'Cancel'},admin),{code:'INVALID_TRANSITION'});
 const paid=await service.recordPayment(draft.id,{expectedVersion:3,amountCents:1100,method:'CASH',idempotencyKey:'payment-test-2'},admin);assert.equal(paid.status,'PAID');assert.equal(paid.balanceCents,0);
 const p=paid.payments[0];await assert.rejects(()=>service.reversePayment(p.id,{expectedVersion:4,reason:'Correction'},{id:'dispatcher',role:'DISPATCHER'}),{code:'FORBIDDEN'});
 await assert.rejects(()=>service.reversePayment(p.id,{expectedVersion:3,reason:'Stale'},admin),{code:'VERSION_CONFLICT'});
 const reversed=await service.reversePayment(p.id,{expectedVersion:4,reason:'Wrong statement'},admin);assert.equal(reversed.status,'PARTIAL');assert.equal(reversed.payments.length,2);assert.equal(reversed.balanceCents,p.amountCents);
 await assert.rejects(()=>service.reversePayment(p.id,{expectedVersion:5,reason:'Again'},admin),{code:'ALREADY_REVERSED'});
 const p2=reversed.payments.find((entry:any)=>!entry.reversal)!;const unpaid=await service.reversePayment(p2.id,{expectedVersion:5,reason:'Refund recorded separately'},admin);assert.equal(unpaid.status,'ISSUED');const voided=await service.voidInvoice(draft.id,{expectedVersion:6,reason:'Duplicate invoice'},admin);assert.equal(voided.status,'VOID');assert.equal(voided.number,issued.number);
 await assert.rejects(()=>service.updateDraft(draft.id,{expectedVersion:7,dueDate:input.dueDate,items:input.items},admin),{code:'IMMUTABLE_INVOICE'});
 const fractional=await service.createInvoice({...input,idempotencyKey:'fractional-rate',items:[{description:'Explicit rate',quantity:2,unitPriceCents:10000,taxRateBps:997.5}]},admin);assert.equal(fractional.taxCents,1995);assert.equal(fractional.items[0].taxRateBps,997.5);
 const editable=await service.createInvoice({...input,idempotencyKey:'editable-draft'},admin);const edited=await service.updateDraft(editable.id,{expectedVersion:1,dueDate:'2027-01-02',items:[{description:'Correction',quantity:1,unitPriceCents:300,taxRateBps:0}]},admin);assert.equal(edited.totalCents,300);assert.equal(edited.version,2);assert.equal((await service.createInvoice({...input,idempotencyKey:'editable-draft'},admin)).totalCents,300);const cancelledDraft=await service.voidInvoice(editable.id,{expectedVersion:2,reason:'Incorrect draft'},admin);assert.equal(cancelledDraft.number,null);assert.equal(cancelledDraft.status,'VOID');
 const drafts=await Promise.all([service.createInvoice({...input,idempotencyKey:'invoice-test-2'},admin),service.createInvoice({...input,idempotencyKey:'invoice-test-3'},admin)]);const concurrent=await Promise.all(drafts.map(d=>service.issueInvoice(d.id,{expectedVersion:1},admin)));assert.equal(new Set(concurrent.map(d=>d.number)).size,2);
 const target=concurrent[0];const attempts=await Promise.allSettled([service.recordPayment(target.id,{expectedVersion:2,amountCents:1500,method:'CASH',idempotencyKey:'parallel-pay-1'},admin),service.recordPayment(target.id,{expectedVersion:2,amountCents:1500,method:'CASH',idempotencyKey:'parallel-pay-2'},admin)]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal((await service.getInvoice(target.id)).balanceCents,600);
 assert.equal((await service.listPayments()).filter(p=>p.status==='REVERSED').length,2);assert.equal(await db.auditEvent.count({where:{action:'PAYMENT_REVERSED'}}),2);
 // Separate clients retain real PostgreSQL concurrency despite the per-client queue.
 const secondDb=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{const parallelService=new FinanceService(secondDb),crossDraft=await service.createInvoice({...input,idempotencyKey:'cross-client-draft'},admin),crossIssued=await service.issueInvoice(crossDraft.id,{expectedVersion:1},admin);const crossInput={expectedVersion:crossIssued.version,amountCents:2100,method:'CASH',idempotencyKey:'cross-client-payment'};const crossResults=await Promise.all([service.recordPayment(crossIssued.id,crossInput,admin),parallelService.recordPayment(crossIssued.id,crossInput,admin)]);assert.equal(crossResults[0].balanceCents,0);assert.equal(crossResults[1].balanceCents,0);assert.equal(await db.payment.count({where:{invoiceId:crossIssued.id}}),1);}finally{await secondDb.$disconnect();}

 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end();}
});

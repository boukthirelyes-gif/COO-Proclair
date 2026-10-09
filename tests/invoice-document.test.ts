import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceDocument,invoiceDocumentCsp} from '../src/lib/invoice-document';
test('print document escapes client data, shows precise amounts and marks non-payable documents',()=>{
 const row={number:'PC-000001',status:'PARTIAL',dueDate:'2026-10-31',currency:'CAD',issuedAt:new Date('2026-10-10T01:00:00Z'),customer:{name:'<script>alert(1)</script>',email:null,phone:null},contract:null,items:[{description:'<img src=x onerror=alert(1)>',quantity:2,unitPriceCents:10000,taxRateBps:997.5,subtotalCents:20000,taxCents:1995}],subtotalCents:20000,taxCents:1995,totalCents:21995,paidCents:10000,balanceCents:11995,voidReason:null};
 const html=invoiceDocument(row);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<img'));assert.match(html,/9\.975 %/);assert.match(html,/219,95/);assert.match(html,/119,95/);assert.match(html,/2026-10-09/);assert.match(invoiceDocumentCsp,/frame-ancestors 'none'/);
 const draft=invoiceDocument({...row,number:null,status:'DRAFT'});assert.match(draft,/facture non émise/);assert.ok(!draft.includes('Solde à payer'));
 const cancelled=invoiceDocument({...row,status:'VOID',voidReason:'<b>error</b>'});assert.ok(cancelled.includes('&lt;b&gt;error&lt;/b&gt;'));assert.ok(!cancelled.includes('Solde à payer'));
});

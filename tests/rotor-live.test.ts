import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRotorLivePage} from '../src/lib/rotor-live';
import {routePermission} from '../src/lib/access';

test('Rotor payments keep original IDs and money without creating financial records',()=>{
 const raw={data:[{id:'pay-1',status:'succeeded',total_amount_cents:27479,currency:'cad',payment_method:'e-transfer',customer:{first_name:'Alex',last_name:'Exemple'},invoice:{invoice_number:'INV-001'},access_token:'do-not-expose',payment_date:'2026-10-12T21:15:15Z'}],pagination:{page:1,total:780,has_more:true}};
 const result=normalizeRotorLivePage('payments',raw,1,25);
 assert.equal(result.source,'ROTOR');assert.equal(result.mode,'READ_ONLY_LIVE');
 assert.equal(result.total,780);assert.equal(result.rows[0].amountCents,27479);
 assert.equal(result.rows[0].id,'pay-1');
 assert.equal(result.rows[0].customer,'Alex Exemple');
 assert.equal(JSON.stringify(result).includes('do-not-expose'),false);
});
test('Rotor invoices preserve number, totals and paid status',()=>{
 const raw={data:[{id:'inv-1',invoice_number:'INV-009',total_cents:41276,status:'paid',currency:'cad',customer:{first_name:'François',last_name:'Test'},created_at:'2026-10-09T16:10:18Z'}],pagination:{page:1,total:882,has_more:false}};
 const result=normalizeRotorLivePage('invoices',raw,1,25);
 assert.equal(result.rows[0].reference,'INV-009');
 assert.equal(result.rows[0].status,'paid');
 assert.equal(result.rows[0].amountCents,41276);
});
test('Only SMS content and necessary metadata are shown; provider internals stay hidden',()=>{
 const raw={data:[{id:'msg-1',created_at:'2026-10-13T14:01:42Z',content:'Bonjour',direction:'inbound',channel:'sms',status:'delivered',contact_phone:'+14505551234',thread_id:'surge-private-id',secret:'secret'}],pagination:{page:1,total:3437,has_more:true}};
 const result=normalizeRotorLivePage('sms',raw,1,25);
 assert.equal(result.rows[0].content,'Bonjour');
 assert.equal(result.rows[0].phone,'+14505551234');
 assert.equal(JSON.stringify(result).includes('surge-private-id'),false);
 assert.equal(JSON.stringify(result).includes('secret'),false);
});
test('Missing pagination, duplicate too-large pages and empty continued pages are rejected',()=>{
 assert.throws(()=>normalizeRotorLivePage('sms',{data:[]},1,25));
 assert.throws(()=>normalizeRotorLivePage('payments',{data:[{},{}],pagination:{page:1,has_more:true}},1,1));
 assert.throws(()=>normalizeRotorLivePage('payments',{data:[],pagination:{page:1,has_more:true}},1,25));
 assert.throws(()=>normalizeRotorLivePage('payments',{data:[{id:'same'},{id:'same'}],pagination:{page:1,has_more:false}},1,25));
});
test('Direct Rotor read paths are allowed according to financial and CRM permissions',()=>{
 assert.equal(routePermission('integrations/rotor/live/payments','GET'),'finance');
 assert.equal(routePermission('integrations/rotor/live/invoices','GET'),'finance');
 assert.equal(routePermission('integrations/rotor/live/sms','GET'),'crm.read');
 assert.equal(routePermission('integrations/rotor/live/payments','POST'),'integrations');
 assert.equal(routePermission('integrations/rotor/live/sms','POST'),'integrations');
});

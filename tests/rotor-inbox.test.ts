import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRotorInbox} from '../src/lib/rotor-inbox';
const example={data:[{
 id:'84b34ae1-566b-4360-9422-c34899d3bacc',channel:'sms',
 direction:'outbound',content:'Message test',contact_phone:'+15145550001',
 status:'delivered',created_at:'2026-10-13T14:01:42.332005+00:00',
}],pagination:{page:1,limit:100,total:3437,has_more:true}};
test('normalizes a Rotor SMS page without modifying its contents',()=>{
 const result=normalizeRotorInbox(example,1);
 assert.equal(result.messages[0].content,'Message test');
 assert.equal(result.pagination.total,3437);
 assert.equal(result.messages[0].channel,'sms');
});
test('rejects non-SMS responses instead of mixing mailboxes',()=>{
 assert.throws(()=>normalizeRotorInbox({...example,data:[{...example.data[0],channel:'email'}]},1));
});
test('rejects repeated message IDs and incoherent pagination',()=>{
 assert.throws(()=>normalizeRotorInbox({...example,data:[example.data[0],example.data[0]]},1));
 assert.throws(()=>normalizeRotorInbox(example,2));
});
test('rejects oversized message payloads',()=>{
 assert.throws(()=>normalizeRotorInbox({...example,data:[{...example.data[0],content:'x'.repeat(20001)}]},1));
});

test('requires a valid offset-aware timestamp and SMS direction',()=>{
 assert.throws(()=>normalizeRotorInbox({...example,data:[{...example.data[0],created_at:'not-a-date'}]},1));
 assert.throws(()=>normalizeRotorInbox({...example,data:[{...example.data[0],direction:'unknown'}]},1));
});
test('rejects pages containing more than 100 messages',()=>{
 const messages=Array.from({length:101},(_,index)=>({...example.data[0],id:'id-'+index}));
 assert.throws(()=>normalizeRotorInbox({...example,data:messages},1));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceRotorCheckpoint,rotorCompleteness,type RotorCheckpoint} from '../src/lib/rotor-pagination';
const start=():RotorCheckpoint=>({page:1,pages:0,received:0,total:null,done:false,lastHash:null});
test('Migration passes 2000 pages without truncating and reconciles 100025 synthetic records',()=>{
 let p=start();const total=100025;
 for(let n=0;n<4001;n++)p=advanceRotorCheckpoint(p,25,total,n<4000,String(n));
 assert.equal(p.received,total);assert.equal(p.done,true);assert.equal(p.pages,4001);
 assert.equal(rotorCompleteness({CUSTOMER:p}).categories.CUSTOMER.confidence,'SOURCE_TOTAL_RECONCILED');
});
test('Unknown totals are never converted to zero or a certified migration',()=>{
 const p=advanceRotorCheckpoint(start(),7,null,false,'a');
 const r=rotorCompleteness({CUSTOMER:p});assert.equal(r.migrationCertified,false);
 assert.equal(r.categories.CUSTOMER.accessible,null);assert.equal(r.categories.CUSTOMER.remaining,null);
 assert.equal(r.categories.CUSTOMER.confidence,'END_REPORTED_TOTAL_UNKNOWN');
});
test('Retry resumes the same saved checkpoint and source total survives omitted metadata',()=>{
 const saved=advanceRotorCheckpoint(start(),25,50,true,'one');
 assert.throws(()=>advanceRotorCheckpoint(saved,0,50,true,'two'),{code:'ROTOR_PROTOCOL'});
 assert.equal(saved.page,2);assert.equal(saved.received,25);
 const resumed=advanceRotorCheckpoint(JSON.parse(JSON.stringify(saved)),25,null,false,'two');
 assert.equal(resumed.total,50);assert.equal(resumed.received,50);
});
test('Changing totals, repeated pages, contradictory end and unsafe counters fail closed',()=>{
 const p=advanceRotorCheckpoint(start(),25,60,true,'one');
 assert.throws(()=>advanceRotorCheckpoint(p,25,61,true,'two'),{code:'ROTOR_TOTAL_CHANGED'});
 assert.throws(()=>advanceRotorCheckpoint(p,25,60,true,'one'),{code:'ROTOR_PAGE_REPEAT'});
 assert.throws(()=>advanceRotorCheckpoint(p,25,60,false,'two'),{code:'ROTOR_COUNT_MISMATCH'});
 assert.throws(()=>advanceRotorCheckpoint(start(),25,25,true,'x'),{code:'ROTOR_COUNT_MISMATCH'});
 assert.throws(()=>advanceRotorCheckpoint({...p,page:Number.MAX_SAFE_INTEGER},1,null,false,'x'),{code:'ROTOR_PROTOCOL'});
});

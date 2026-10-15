import test from 'node:test';
import assert from 'node:assert/strict';
import {findAvailableSlot,type BusySlot} from '../src/domain/fill-slots';
const at=(time:string)=>new Date('2026-10-14T'+time+':00-04:00');
const visit=(start:string,end:string):BusySlot=>({startsAt:at(start),endsAt:at(end)});
const bounds=()=>[at('08:00'),at('17:00')] as const;
const times=(slot:ReturnType<typeof findAvailableSlot>)=>slot?[slot.startsAt.toISOString(),slot.endsAt.toISOString()]:null;
test('slot allocator respects buffers before and after existing visits and exact boundaries',()=>{
 const [start,finish]=bounds();
 assert.deepEqual(times(findAvailableSlot(start,finish,90,[visit('10:00','11:00')])),times({startsAt:at('08:00'),endsAt:at('09:30')}));
 assert.deepEqual(times(findAvailableSlot(start,finish,91,[visit('10:00','11:00')])),times({startsAt:at('11:30'),endsAt:at('13:01')}));
 assert.deepEqual(times(findAvailableSlot(start,finish,540,[])),times({startsAt:start,endsAt:finish}));
 assert.equal(findAvailableSlot(start,finish,541,[]),null);
 assert.equal(findAvailableSlot(start,finish,1,[visit('07:00','17:00')]),null);
 assert.deepEqual(times(findAvailableSlot(start,finish,30,[visit('16:30','17:00'),visit('08:00','15:00')])),times({startsAt:at('15:30'),endsAt:at('16:00')}));
});
test('an oversized candidate cannot consume an earlier slot needed by a later smaller visit',()=>{
 const [start,finish]=bounds(),busy=[visit('10:00','16:00')];
 assert.equal(findAvailableSlot(start,finish,120,busy),null);
 assert.deepEqual(times(findAvailableSlot(start,finish,90,busy)),times({startsAt:at('08:00'),endsAt:at('09:30')}));
});
test('existing and proposed adjacent/overlapping busy periods are sorted without changing their dates',()=>{
 const [start,finish]=bounds(),busy=[visit('11:00','12:00'),visit('08:00','09:00'),visit('09:20','10:30')];
 const before=JSON.stringify({start,finish,busy});
 const slot=findAvailableSlot(start,finish,60,busy);
 assert.deepEqual(times(slot),times({startsAt:at('12:30'),endsAt:at('13:30')}));
 assert.equal(JSON.stringify({start,finish,busy}),before);
 slot!.startsAt.setHours(0);assert.equal(JSON.stringify({start,finish,busy}),before);
});
test('incomplete intervals and invalid inputs conservatively prevent automatic proposals',()=>{
 const [start,finish]=bounds();
 for(const busy of [[{startsAt:null,endsAt:at('10:00')}],[{startsAt:at('09:00'),endsAt:null}],[{startsAt:new Date(NaN),endsAt:at('10:00')}],[visit('10:00','09:00')],[visit('10:00','10:00')]])assert.equal(findAvailableSlot(start,finish,60,busy),null);
 for(const duration of [0,-1,NaN,Infinity,0.5,Number.MAX_SAFE_INTEGER])assert.equal(findAvailableSlot(start,finish,duration,[]),null);
 for(const buffer of [-1,NaN,Infinity,0.5,Number.MAX_SAFE_INTEGER])assert.equal(findAvailableSlot(start,finish,60,[],buffer),null);
 assert.equal(findAvailableSlot(new Date(NaN),finish,60,[]),null);
 assert.equal(findAvailableSlot(finish,start,60,[]),null);
 assert.deepEqual(times(findAvailableSlot(start,finish,60,[visit('08:00','09:00')],0)),times({startsAt:at('09:00'),endsAt:at('10:00')}));
});

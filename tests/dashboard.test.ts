import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardVisits} from '../src/lib/dashboard';
test('dashboard orders future active visits, excludes closed work and counts Toronto today',()=>{
 const rows=[{id:'later',status:'CONFIRMED',startsAt:'2026-10-13T14:00:00Z'},{id:'today',status:'SCHEDULED',startsAt:'2026-10-12T20:00:00Z'},{id:'done',status:'COMPLETED',startsAt:'2026-10-12T12:00:00Z'},{id:'cancelled',status:'CANCELLED',startsAt:'2026-10-12T22:00:00Z'},{id:'waiting',status:'CONFIRMED',startsAt:null},{id:'followup',status:'NEEDS_FOLLOWUP',startsAt:null}];
 const result=dashboardVisits(rows,new Date('2026-10-12T16:00:00Z'));assert.deepEqual(result.upcoming.map(v=>v.id),['today','later']);assert.equal(result.today.length,2);assert.equal(result.completedToday,1);assert.equal(result.unplanned.length,2);assert.equal(result.followup.length,1);
});

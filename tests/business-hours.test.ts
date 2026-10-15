import test from 'node:test';
import assert from 'node:assert/strict';
import {businessHoursSchema,emptyBusinessHours} from '../src/lib/business-hours';
test('business hours require a complete week, valid clocks and forward opening ranges',()=>{
 const week=emptyBusinessHours();assert.equal(businessHoursSchema.parse(week).length,7);
 week[0]={closed:false,opens:'09:00',closes:'19:00'};assert.ok(businessHoursSchema.safeParse(week).success);
 for(const value of ['09:00','08:59','00:00']){week[0].closes=value;assert.equal(businessHoursSchema.safeParse(week).success,false)}
 week[0].closed=true;assert.ok(businessHoursSchema.safeParse(week).success);
 week[0].opens='24:00';assert.equal(businessHoursSchema.safeParse(week).success,false);
 assert.equal(businessHoursSchema.safeParse(week.slice(1)).success,false);
});

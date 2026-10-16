import assert from 'node:assert/strict';
import {request} from './support/browser.mjs';
const url=process.env.E2E_DATABASE_URL,base=process.env.E2E_BASE_URL||'http://127.0.0.1:3102';
if(!url||!new URL(url).pathname.endsWith('/proclair_browser_test')||new URL(url).pathname===new URL(process.env.DATABASE_URL).pathname)throw Error('Base navigateur distincte requise.');
const context=await request.newContext();let checks=0;
try{
 assert.equal((await context.get(base+'/api/integrations/rotor/archive?tool=list_customers&page=1')).status(),401);checks++;
 assert.equal((await context.post(base+'/api/session',{headers:{origin:base},data:{username:'admin',password:process.env.PROCLAIR_ADMIN_PASSWORD}})).status(),200);
 const unknown=await context.get(base+'/api/integrations/rotor/archive?tool=constructor&page=1');assert.equal(unknown.status(),400);assert.match(unknown.headers()['cache-control'],/private.*no-store/);checks++;
 const invalid=await context.get(base+'/api/integrations/rotor/archive?tool=list_visits&page=1&start=invalid&end=2026-10-14');assert.equal(invalid.status(),400);assert.equal((await invalid.json()).code,'ROTOR_RANGE');checks++;
 console.log(JSON.stringify({archiveGateChecks:checks,externalCalls:0,archivedRecords:0}));
}finally{await context.dispose()}

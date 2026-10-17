import test from 'node:test';
import assert from 'node:assert/strict';
import {operationalReadiness} from '../src/lib/operational-readiness';
const unavailable={stripe:{configured:false,livePaymentsEnabled:false},twilio:{configured:false,sendingEnabled:false,voiceEnabled:false}};
test('missing prerequisites block operations without exposing environment values',()=>{
 const result=operationalReadiness({PROCLAIR_SESSION_SECRET:'private-short-value'},unavailable);
 assert.equal(result.blocked,10);
 assert.equal(result.commercialReadiness,'NOT_CERTIFIED');
 assert.equal(JSON.stringify(result).includes('private-short-value'),false);
 assert.equal(result.checks.find(c=>c.id==='tenant-isolation')?.status,'REQUIRES_VALIDATION');
});
test('complete configuration never certifies real operations or commercial readiness',()=>{
 const result=operationalReadiness({PROCLAIR_PUBLIC_ORIGIN:'https://crm.example.test',PROCLAIR_SESSION_SECRET:'x'.repeat(32),PROCLAIR_ADMIN_PASSWORD:'x'.repeat(12),CRON_SECRET:'x'.repeat(32),NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:'public-test-placeholder',GOOGLE_ROUTES_API_KEY:'synthetic_server_key'}, {stripe:{configured:true,livePaymentsEnabled:false},twilio:{configured:true,sendingEnabled:false,voiceEnabled:false}});
 assert.deepEqual(result.checks.filter(c=>c.status==='BLOCKED').map(c=>c.id),['live-payments','sms','voice']);
 assert.equal(result.requiresValidation,5);
 assert.ok(result.checks.every(c=>c.status!=='READY' as string));
 assert.equal(JSON.stringify(result).includes('public-test-placeholder'),false);
});
test('origin validation rejects credentials, HTTP, paths and query strings',()=>{
 for(const origin of ['http://crm.example.test','https://user:password@crm.example.test','https://crm.example.test/path','https://crm.example.test?key=private','invalid']){
  const result=operationalReadiness({PROCLAIR_PUBLIC_ORIGIN:origin},unavailable);
  assert.equal(result.checks.find(c=>c.id==='origin')?.status,'BLOCKED');
  assert.equal(JSON.stringify(result).includes(origin),false);
 }
});

test('runtime browser key configuration is recognized without publishing the key',()=>{const key='synthetic_browser_key_12345',result=operationalReadiness({GOOGLE_MAPS_BROWSER_API_KEY:key},unavailable);assert.equal(result.checks.find(c=>c.id==='maps')?.status,'CONFIGURED_UNVERIFIED');assert.ok(!JSON.stringify(result).includes(key))});

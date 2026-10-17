import test from 'node:test';
import assert from 'node:assert/strict';
import {providerHealthSummary} from '../src/lib/provider-health';

test('provider health never claims that configuration proves a live connection', () => {
  const result=providerHealthSummary(
    {stripe:{configured:true},twilio:{configured:true}},
    {connected:true,grantedScopes:['inbox:read']},
  );
  assert.deepEqual(result,{
    stripe:'CONFIGURED_UNVERIFIED',
    sms:'CONFIGURED_UNVERIFIED',
    rotorInbox:'AUTHORIZED_UNVERIFIED',
    routing:'NOT_CONFIGURED',
  });
});

test('missing configuration and Rotor scope are shown as unavailable', () => {
  assert.deepEqual(providerHealthSummary(
    {stripe:{configured:false},twilio:{configured:false}},
    {connected:true,grantedScopes:['customers:read']},
  ),{
    stripe:'NOT_CONFIGURED',
    sms:'NOT_CONFIGURED',
    rotorInbox:'NOT_AUTHORIZED',
    routing:'NOT_CONFIGURED',
  });
  assert.equal(providerHealthSummary(
    {stripe:{configured:false},twilio:{configured:true}},
    {connected:false,grantedScopes:['inbox:read']},
  ).rotorInbox,'NOT_AUTHORIZED');
});

test('provider health never includes credentials or phone numbers', () => {
  const result=providerHealthSummary(
    {stripe:{configured:true},twilio:{configured:true}},
    {connected:true,grantedScopes:['inbox:read']},
  );
  const serialized=JSON.stringify(result);
  assert.equal(serialized.includes('sk_test_'),false);
  assert.equal(serialized.includes('AUTH_TOKEN'),false);
  assert.equal(serialized.includes('+1'),false);
});

test('configured routing is explicitly unverified',()=>{assert.equal(providerHealthSummary({stripe:{configured:false},twilio:{configured:false}},{connected:false,grantedScopes:[]},true).routing,'CONFIGURED_UNVERIFIED')});

import test from 'node:test';
import assert from 'node:assert/strict';
import {schemaProbeReady,securityMigrationReady, type SchemaProbe} from '../src/lib/schema-health';

const complete: SchemaProbe = {
  loginBucket: '"LoginBucket"',
  appUser: '"AppUser"',
  customer: '"Customer"',
  migrations: '_proclair_migrations',
  accountMfa:'AccountMfa',securityEpoch:'SecuritySessionEpoch',invitations:'UserInvitation',
};

test('health fails closed when the schema probe is absent or has unexpected cardinality', () => {
  assert.equal(schemaProbeReady(null), false);
  assert.equal(schemaProbeReady(undefined), false);
  assert.equal(schemaProbeReady([]), false);
  assert.equal(schemaProbeReady([complete, complete]), false);
});

test('health detects missing login, application, or migration tables', () => {
  for (const key of Object.keys(complete) as (keyof SchemaProbe)[]) {
    assert.equal(schemaProbeReady([{...complete, [key]: null}]), false, key);
    assert.equal(schemaProbeReady([{...complete, [key]: ''}]), false, key);
  }
});

test('health passes only when the representative schema objects exist', () => {
  assert.equal(schemaProbeReady([complete]), true);
});

test('health requires the security migration marker, not only database connectivity',()=>{assert.equal(securityMigrationReady(null),false);assert.equal(securityMigrationReady([]),false);assert.equal(securityMigrationReady([{ready:false}]),false);assert.equal(securityMigrationReady([{ready:true}]),true);});

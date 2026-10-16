import test from 'node:test';
import assert from 'node:assert/strict';
import {schemaProbeReady, type SchemaProbe} from '../src/lib/schema-health';

const complete: SchemaProbe = {
  loginBucket: '"LoginBucket"',
  appUser: '"AppUser"',
  customer: '"Customer"',
  migrations: '_proclair_migrations',
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
const run=(extra:Record<string,string|undefined>)=>spawnSync(process.execPath,['--import','tsx','scripts/preview-migrate.ts'],{encoding:'utf8',env:{NODE_ENV:'test',PATH:process.env.PATH,...extra}});
test('preview deployment refuses absent credentials, production aliases and production execution',()=>{
 const url='postgresql://synthetic:fake@localhost:1/production';
 for(const env of [{VERCEL_ENV:'preview',DATABASE_URL:url},{VERCEL_ENV:'preview',DATABASE_URL:url,PROCLAIR_PREVIEW_DATABASE_URL:url},{VERCEL_ENV:'production',PROCLAIR_PREVIEW_DATABASE_URL:url}]){
  const result=run(env);assert.notEqual(result.status,0);assert.doesNotMatch(result.stderr,/ECONNREFUSED/);assert.ok(!result.stderr.includes(url));
 }
});
test('preview deployment migrates an empty isolated schema and repeats without duplicates',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const client=new Client({connectionString:process.env.TEST_DATABASE_URL});await client.connect();const schema='preview_build_'+randomUUID().replaceAll('-','');
 try{
  await client.query(`CREATE SCHEMA "${schema}"`);const url=new URL(process.env.TEST_DATABASE_URL!);url.searchParams.set('options','-c search_path='+schema);
  const env={VERCEL_ENV:'preview',DATABASE_URL:'postgresql://fake:synthetic@production.invalid/live',PROCLAIR_PREVIEW_DATABASE_URL:url.toString()};
  const first=run(env);assert.equal(first.status,0,first.stderr);await client.query(`SET search_path TO "${schema}"`);
  const before=await client.query('SELECT count(*)::int AS count FROM "_proclair_migrations"');assert.ok(before.rows[0].count>0);
  await client.query('SELECT * FROM "LoginBucket" LIMIT 0');await client.query('SELECT * FROM "SecuritySessionEpoch" LIMIT 0');
  const second=run(env);assert.equal(second.status,0,second.stderr);const after=await client.query('SELECT count(*)::int AS count FROM "_proclair_migrations"');assert.equal(after.rows[0].count,before.rows[0].count);
 }finally{await client.query('SET search_path TO public');await client.query(`DROP SCHEMA "${schema}" CASCADE`);await client.end();}
});

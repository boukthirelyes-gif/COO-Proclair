import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {checkPassword,issueSession,actorFor,sameOrigin,requestIsSecure} from '../src/lib/auth';
process.env.PROCLAIR_SESSION_SECRET = 'test-only-secret-not-used-in-runtime-1234567890';
process.env.PROCLAIR_ADMIN_PASSWORD = 'test-only-password-123456';
test('password comparison accepts configured secret and rejects wrong password',()=>{
  assert.equal(checkPassword('test-only-password-123456'),true);
  assert.equal(checkPassword('wrong'),false);
});
test('signed session verifies admin while forged body fails',()=>{
  const token = issueSession();
  assert.deepEqual(actorFor(new NextRequest('http://localhost/api/state',{headers:{cookie:`proclair_session=${token}`}})),{id:'admin',role:'ADMIN'});
  const forged = Buffer.from(JSON.stringify({id:'admin',role:'ADMIN',expires:Date.now()+999999})).toString('base64url')+'.'+token.split('.')[1];
  assert.equal(actorFor(new NextRequest('http://localhost/api/state',{headers:{cookie:`proclair_session=${forged}`}})),null);
});
test('missing and malformed sessions are not authorized',()=>{
  for (const token of ['', 'hello', 'hello.world.more', 'invalid.invalid']) assert.equal(actorFor(new NextRequest('http://localhost/api/state',{headers:{cookie:`proclair_session=${token}`}})),null);
});
test('writes require matching origin',()=>{
  assert.equal(sameOrigin(new NextRequest('http://localhost/api/customers',{headers:{origin:'http://localhost'}})),true);
  assert.equal(sameOrigin(new NextRequest('http://localhost/api/customers',{headers:{origin:'https://evil.example'}})),false);
  assert.equal(sameOrigin(new NextRequest('http://localhost/api/customers')),false);
});
test('Next internal hostname is distinct from browser Host while external origins stay blocked',()=>{
  assert.equal(sameOrigin(new NextRequest('http://localhost:3001/api/customers',{headers:{host:'127.0.0.1:3001',origin:'http://127.0.0.1:3001'}})),true);
  assert.equal(sameOrigin(new NextRequest('http://localhost:3001/api/customers',{headers:{host:'127.0.0.1:3001',origin:'http://attacker.example'}})),false);
});

test('configured origin normalizes a trailing slash while authorizing only the exact Vercel deployment',()=>{
 const old=Object.fromEntries(['PROCLAIR_PUBLIC_ORIGIN','VERCEL','VERCEL_URL'].map(key=>[key,process.env[key]]));
 try{
  process.env.PROCLAIR_PUBLIC_ORIGIN='https://coo-proclair.vercel.app/';process.env.VERCEL='1';process.env.VERCEL_URL='coo-proclair-fixture-proclair.vercel.app';
  const req=(origin:string)=>new NextRequest('http://localhost/api/session',{headers:{host:'coo-proclair-fixture-proclair.vercel.app',origin}});
  assert.equal(sameOrigin(req('https://coo-proclair.vercel.app')),true);assert.equal(sameOrigin(req('https://coo-proclair-fixture-proclair.vercel.app')),true);
  assert.equal(sameOrigin(req('https://attacker.vercel.app')),false);assert.equal(sameOrigin(req('https://coo-proclair-fixture-proclair.vercel.app.evil.example')),false);
  process.env.VERCEL='0';assert.equal(sameOrigin(req('https://coo-proclair-fixture-proclair.vercel.app')),false);
  process.env.PROCLAIR_PUBLIC_ORIGIN='https://coo-proclair.vercel.app/?view=dashboard';assert.throws(()=>sameOrigin(req('https://coo-proclair.vercel.app')),{code:'AUTH_ORIGIN_CONFIGURATION',status:503});
 }finally{for(const [key,value] of Object.entries(old))value===undefined?delete process.env[key]:process.env[key]=value}
});
test('HTTPS proxy supports login origin and secure cookies without trusting forwarded-host',()=>{
 const old=process.env.PROCLAIR_PUBLIC_ORIGIN;delete process.env.PROCLAIR_PUBLIC_ORIGIN;
 try{
  const request=new NextRequest('http://localhost:3000/api/session',{headers:{host:'crm.example.com',origin:'https://crm.example.com','x-forwarded-proto':'https','x-forwarded-host':'attacker.example'}});
  assert.equal(sameOrigin(request),true);assert.equal(requestIsSecure(request),true);
  assert.equal(sameOrigin(new NextRequest('http://localhost:3000/api/session',{headers:{host:'crm.example.com',origin:'https://attacker.example','x-forwarded-proto':'https','x-forwarded-host':'attacker.example'}})),false);
 }finally{old===undefined?delete process.env.PROCLAIR_PUBLIC_ORIGIN:process.env.PROCLAIR_PUBLIC_ORIGIN=old}
});
test('missing admin configuration is distinct from invalid credentials without exposing secrets',()=>{
 const old=process.env.PROCLAIR_ADMIN_PASSWORD;delete process.env.PROCLAIR_ADMIN_PASSWORD;
 try{assert.throws(()=>checkPassword('wrong'),{code:'AUTH_CONFIGURATION_REQUIRED',status:503})}finally{process.env.PROCLAIR_ADMIN_PASSWORD=old}
});

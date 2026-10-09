import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {checkPassword,issueSession,actorFor,sameOrigin} from '../src/lib/auth';
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

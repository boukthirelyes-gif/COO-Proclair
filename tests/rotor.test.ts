import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {beginRotor,completeRotor,rotorStatus,disconnectRotor,rotorTools,seal,unseal,callbackUrl} from '../src/lib/rotor';
test('Rotor OAuth uses PKCE, encrypted persistence, read scopes and single-use callback',async()=>{
 const cwd=process.cwd(),origin=process.env.PROCLAIR_PUBLIC_ORIGIN,secret=process.env.PROCLAIR_SESSION_SECRET,originalFetch=globalThis.fetch,dir=await mkdtemp(join(tmpdir(),'proclair-rotor-'));
 process.env.PROCLAIR_SESSION_SECRET='test-secret-'.repeat(5);process.env.PROCLAIR_PUBLIC_ORIGIN='https://crm.example.test';process.chdir(dir);
 try{
 const envelope=seal({token:'private'});assert.ok(!envelope.includes('private'));assert.equal(unseal(envelope).token,'private');assert.throws(()=>unseal('invalid'));
 process.env.PROCLAIR_PUBLIC_ORIGIN='http://crm.example.test';assert.throws(callbackUrl);process.env.PROCLAIR_PUBLIC_ORIGIN='https://crm.example.test';
 const calls:any[]=[];globalThis.fetch=async(url:any,options:any)=>{calls.push({url,options});if(url.endsWith('/register'))return Response.json({client_id:'registered-client'});if(url.endsWith('/token'))return Response.json({access_token:'sensitive-access',token_type:'Bearer',expires_in:3600});const payload=JSON.parse(options.body);if(payload.method==='initialize')return Response.json({jsonrpc:'2.0',id:1,result:{protocolVersion:'2025-03-26'}},{headers:{'mcp-session-id':'session'}});if(payload.method==='notifications/initialized')return new Response(null,{status:202});return Response.json({jsonrpc:'2.0',id:2,result:{tools:[{name:'customers_list',description:'Read customers'}]}})};
 assert.equal((await rotorStatus()).connected,false);const flow=await beginRotor(),authorization=new URL(flow.url);assert.equal(authorization.searchParams.get('code_challenge_method'),'S256');assert.ok(!authorization.searchParams.get('scope')!.includes(':write'));const state=authorization.searchParams.get('state')!;
 await assert.rejects(()=>completeRotor(flow.cookie,'wrong','code'),{code:'OAUTH_STATE'});await completeRotor(flow.cookie,state,'authorization-code');assert.equal((await rotorStatus()).connected,true);assert.ok(!(await readFile(join(dir,'.local/rotor/connection'),'utf8')).includes('sensitive-access'));
 await assert.rejects(()=>completeRotor(flow.cookie,state,'authorization-code'),{code:'OAUTH_STATE'});const tools=await rotorTools();assert.equal(tools.tools[0].name,'customers_list');assert.ok(calls.every(call=>!String(call.options.body).includes('tools/call')));
 assert.equal((await disconnectRotor()).remoteRevoked,false);assert.equal((await rotorStatus()).connected,false);
 }finally{globalThis.fetch=originalFetch;process.chdir(cwd);if(origin===undefined)delete process.env.PROCLAIR_PUBLIC_ORIGIN;else process.env.PROCLAIR_PUBLIC_ORIGIN=origin;if(secret===undefined)delete process.env.PROCLAIR_SESSION_SECRET;else process.env.PROCLAIR_SESSION_SECRET=secret;await rm(dir,{recursive:true,force:true});}
});

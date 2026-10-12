import test from 'node:test';
import assert from 'node:assert/strict';
import {withRotorStorage,type RotorStorage} from '../src/lib/rotor-store';
import {beginRotor,completeRotor,rotorReadPage} from '../src/lib/rotor';
import {normalizeRotorBatch,previewRotorMirror,applyRotorMirror} from '../src/lib/rotor-mirror';

function memoryStorage():RotorStorage{
 const rows=new Map<string,string>(),consumed=new Set<string>();
 return {
  async read(k){return rows.get(k)??null},
  async write(k,v){rows.set(k,v)},
  async remove(k){rows.delete(k)},
  async consume(k){if(consumed.has(k))return false;consumed.add(k);return true},
  async exclusive<T>(fn:()=>Promise<T>){return fn()},
 };
}
const customers=[{id:'cust-one',first_name:'Marie',last_name:'Test',email:'marie@example.test',phone:'555-0101',status:'active',address:{street1:'12 Rue Test',city:'Valleyfield',state:'QC',zip:'J6S 1A1'}}];
const jobs=[{id:'job-one',job_number:'0001',customer:{id:'cust-one'},status:'active',line_items:[{title:'Vitres extérieures'}],start_date:'2026-10-12T14:00:00Z'}];
const visits=[{id:123,job_id:'job-one',customer:{id:'cust-one'},job:{job_number:'0001'},service_type:'Vitres',status:'scheduled',start:'2026-10-15T13:00:00Z',end:'2026-10-15T14:00:00Z',address:{street1:'12 Rue Test',city:'Valleyfield'}}];

async function setup(fn:()=>Promise<void>){
 const prevFetch=globalThis.fetch;
 const secret=process.env.PROCLAIR_SESSION_SECRET,origin=process.env.PROCLAIR_PUBLIC_ORIGIN;
 process.env.PROCLAIR_SESSION_SECRET='unit-test-'.repeat(6);
 process.env.PROCLAIR_PUBLIC_ORIGIN='https://crm.example.test';
 let called:string[]=[];
 globalThis.fetch=async(url:any,options:any)=>{
  const target=String(url);
  if(target.endsWith('/oauth/register'))return Response.json({client_id:'mock-client'});
  if(target.endsWith('/oauth/token'))return Response.json({access_token:'mock-access',refresh_token:'mock-refresh',token_type:'Bearer',expires_in:3600});
  assert.equal(target,'https://mcp.getrotor.com/mcp');
  const request=JSON.parse(options.body);
  if(request.method==='initialize')return Response.json({jsonrpc:'2.0',id:request.id,result:{protocolVersion:'2025-03-26'}},{headers:{'mcp-session-id':'test-session'}});
  if(request.method==='notifications/initialized')return new Response(null,{status:202});
  assert.equal(request.method,'tools/call');
  called.push(request.params.name);
  assert.deepEqual(Object.keys(request.params.arguments).sort(),request.params.name==='list_visits'?['end','limit','page','start']:['limit','page']);
  const data=request.params.name==='list_customers'?customers:request.params.name==='list_jobs'?jobs:request.params.name==='list_visits'?visits:null;
  assert.ok(data,'Only allowlisted read tools may be called');
  return Response.json({jsonrpc:'2.0',id:request.id,result:{content:[{type:'text',text:JSON.stringify({data,pagination:{page:1,limit:25,total:1,has_more:false}})}]}});
 };
 try{
  await withRotorStorage(memoryStorage(),async()=>{
   const flow=await beginRotor();
   const state=new URL(flow.url).searchParams.get('state')!;
   await completeRotor(flow.cookie,state,'mock-auth-code');
   await fn();
  });
  assert.ok(called.length>0);
  assert.ok(called.every(name=>['list_customers','list_jobs','list_visits'].includes(name)));
 }finally{
  globalThis.fetch=prevFetch;
  if(secret===undefined)delete process.env.PROCLAIR_SESSION_SECRET;else process.env.PROCLAIR_SESSION_SECRET=secret;
  if(origin===undefined)delete process.env.PROCLAIR_PUBLIC_ORIGIN;else process.env.PROCLAIR_PUBLIC_ORIGIN=origin;
 }
}

test('Rotor mirror normalizes actual customer/job/visit record shapes and preserves source IDs',async()=>setup(async()=>{
 const batch=await rotorReadPage(1,25,'2026-10-01T00:00:00-04:00','2026-10-20T00:00:00-04:00');
 const records=normalizeRotorBatch(batch);
 assert.equal(records.length,3);
 assert.deepEqual(records.map(r=>[r.kind,r.externalId]),[['CUSTOMER','cust-one'],['JOB','job-one'],['VISIT','123']]);
 assert.equal(records[0].name,'Marie Test');
 assert.equal(records[2].customerExternalId,'cust-one');
 assert.equal(records[2].jobExternalId,'job-one');
 assert.equal(records[2].address,'12 Rue Test, Valleyfield');
}));
test('Rotor mirror validates page and date range before any network request',async()=>{
 await assert.rejects(()=>rotorReadPage(0,25,'2026-10-01','2026-10-02'),{code:'ROTOR_PAGE'});
 await assert.rejects(()=>rotorReadPage(1,25,'2026-10-01','2026-12-01'),{code:'ROTOR_RANGE'});
});
test('Read-only preview does not import; repeated confirmation is idempotent',async()=>setup(async()=>{
 const rows=new Map<string,any>(),audits:any[]=[];
 const fakeDb:any={
  async $transaction(fn:any){return fn({
   rotorMirrorRecord:{async upsert({where,create,update}:any){const key=where.kind_externalId.kind+':'+where.kind_externalId.externalId;rows.set(key,rows.has(key)?{...rows.get(key),...update}:create);return rows.get(key)}},
   auditEvent:{async create({data}:any){audits.push(data)}},
  })},
 };
 const start='2026-10-01T00:00:00-04:00',end='2026-10-20T00:00:00-04:00';
 const preview=await previewRotorMirror(1,start,end);
 assert.deepEqual(preview.counts,{customers:1,jobs:1,visits:1});
 assert.equal(rows.size,0);
 await applyRotorMirror(fakeDb,1,start,end);
 await applyRotorMirror(fakeDb,1,start,end);
 assert.equal(rows.size,3);
 assert.equal(audits.length,2);
 assert.equal(audits[0].after.readOnly,true);
}));

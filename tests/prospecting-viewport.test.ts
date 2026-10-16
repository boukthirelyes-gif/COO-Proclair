import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {prospectingViewport,viewportQuery} from '../src/prospecting/viewport';
import {bootstrapActor,presets,userActor} from '../src/lib/access';
const {Client}=createRequire(import.meta.url)('pg');
test('viewport rejects invalid bounds and unexpected query parameters',()=>{
 const bounds={south:-90,north:90,west:-180,east:180,zoom:2};
 assert.equal(viewportQuery.parse(bounds).zoom,2);
 for(const extra of [{south:91},{south:30,north:20},{zoom:23},{all:true},{west:-181}])assert.throws(()=>viewportQuery.parse({...bounds,...extra}));
});
test('viewport denies access before querying storage',async()=>{
 await assert.rejects(()=>prospectingViewport({} as PrismaClient,{south:-90,north:90,west:-180,east:180,zoom:2},{...bootstrapActor,permissions:[]}),{code:'FORBIDDEN'});
});
test('real PostgreSQL viewport aggregates 100/1000/10000 doors without leaking another seller',{skip:!process.env.TEST_DATABASE_URL,timeout:120000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='viewport_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const e of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${e.name}/migration.sql`,'utf8'));
  const one=await db.appUser.create({data:{username:'viewport-one',name:'One',role:'SELLER',permissions:presets.SELLER,passwordHash:'fixture'}}),two=await db.appUser.create({data:{username:'viewport-two',name:'Two',role:'SELLER',permissions:presets.SELLER,passwordHash:'fixture'}}),actor=userActor(one),bounds={south:44,north:47,west:-75,east:-71,zoom:10};
  await db.prospectPin.create({data:{id:'foreign',address:'PRIVATE FOREIGN',latitude:45,longitude:-73,ownerId:two.id,createdBy:'fixture'}});
  const measurements=[];
  for(const size of [100,1000,10000]){
   await db.prospectPin.deleteMany({where:{ownerId:one.id}});
   await db.prospectPin.createMany({data:Array.from({length:size},(_,i)=>({id:'door_'+i,address:i===0?'Target_100%':'Door '+i,notes:'CONFIDENTIAL NOTE',latitude:45+(i%100)*.01,longitude:-74+Math.floor(i/100)*.01,ownerId:one.id,status:i%2?'NO_HOME':'SOLD',createdBy:'fixture'}))});
   const durations=[];let result;
   for(let i=0;i<6;i++){const start=performance.now();result=await prospectingViewport(db,bounds,actor,schema);if(i)durations.push(performance.now()-start)}
   assert.equal(result!.total,size);assert.ok(result!.markerCount<=512);assert.equal(result!.points.reduce((n,p)=>n+p.count,0),size);
   const payload=JSON.stringify(result);assert.ok(!payload.includes('CONFIDENTIAL'));assert.ok(!payload.includes('PRIVATE FOREIGN'));assert.ok(!payload.includes('ownerId'));
   durations.sort((a,b)=>a-b);measurements.push({pins:size,markers:result!.markerCount,jsonBytes:Buffer.byteLength(payload),medianMs:durations[2],maxMs:durations[4]});
  }
  assert.equal((await prospectingViewport(db,{...bounds,search:'Target_100%'},actor,schema)).total,1);
  assert.equal((await prospectingViewport(db,{...bounds,status:'SOLD'},actor,schema)).total,5000);
  await assert.rejects(()=>prospectingViewport(db,{...bounds,ownerId:two.id},actor,schema),{code:'FORBIDDEN'});
  assert.equal((await prospectingViewport(db,{...bounds,ownerId:two.id},bootstrapActor,schema)).total,1);
  await db.prospectPin.createMany({data:[179.9,-179.9].map((longitude,i)=>({id:'dateline_'+i,address:'Dateline',latitude:0,longitude,ownerId:one.id,createdBy:'fixture'}))});
  assert.equal((await prospectingViewport(db,{south:-1,north:1,west:170,east:-170,zoom:2},actor,schema)).total,2);
  assert.equal((await prospectingViewport(db,{south:89,north:90,west:-180,east:180,zoom:22},actor,schema)).total,0);
  await setup.query(`UPDATE "ProspectPin" SET latitude=-85+((substring(id from 6))::int%100)*1.7, longitude=-179+floor((substring(id from 6))::int/100)*3.58 WHERE id LIKE 'door_%'`);
  const worldwide=await prospectingViewport(db,{south:-90,north:90,west:-180,east:180,zoom:22},actor,schema);
  assert.equal(worldwide.total,10002);assert.ok(worldwide.markerCount<=512);
  await mkdir('.local/omega-ultra',{recursive:true});await writeFile('.local/omega-ultra/map-benchmark.json',JSON.stringify({kind:'REAL_POSTGRESQL_SYNTHETIC_DATA_NOT_BROWSER_OR_GOOGLE',measurements},null,2));
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

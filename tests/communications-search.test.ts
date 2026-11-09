import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {Client} from 'pg';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {CommunicationsHub} from '../src/providers/communications';
import {bootstrapActor} from '../src/lib/access';

test('text containing digits does not become a phone search; formatted phone and escaped text remain searchable',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='communications_search_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});
 await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
  for(const e of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${e.name}/migration.sql`,'utf8'));
  const target='+15145551234',unrelated='+14165551234',hub=new CommunicationsHub(db,schema);
  await db.smsMessage.createMany({data:[{phone:target,direction:'INBOUND',body:'superhub-ab12cd34 ancienne facture 50%_done',status:'received'},{phone:unrelated,direction:'INBOUND',body:'Completely unrelated',status:'received'}]});
  for(const query of ['superhub-ab12cd34 ancienne','facture 50%_done']){
   const result=await hub.list({query},bootstrapActor);assert.equal(result.total,1);assert.equal(result.items[0].phone,target);
  }
  assert.equal((await hub.list({query:'client 555 inconnu'},bootstrapActor)).total,0);
  assert.equal((await hub.list({query:'50%Xdone'},bootstrapActor)).total,0);
  for(const query of ['+1 (514) 555-1234','514-555-1234']){
   const result=await hub.list({query},bootstrapActor);assert.equal(result.total,1);assert.equal(result.items[0].phone,target);
  }
  assert.equal((await hub.list({query:'555-1234'},bootstrapActor)).total,2);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

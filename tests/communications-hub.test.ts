import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {CommunicationsHub,classifyCommunication} from '../src/providers/communications';
import {bootstrapActor,userActor,presets} from '../src/lib/access';
const {Client}=createRequire(import.meta.url)('pg');
test('OMEGA communication heuristics block opt-out and never promise financial or schedule actions',()=>{assert.equal(classifyCommunication(' ARRÊT ').draft,null);assert.equal(classifyCommunication('URGENT fuite').priority,'HIGH');assert.equal(classifyCommunication('payer facture').kind,'BILLING');assert.match(classifyCommunication('report rendez-vous').draft!,/avant de confirmer/);});
test('native conversations paginate and search full history, preserve ambiguous client matches and STOP',{skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='hub_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{for(const e of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${e.name}/migration.sql`,'utf8'));
 const hub=new CommunicationsHub(db,schema),phone='+15145551234',other='+14165551234';
 await db.customer.createMany({data:[{name:'Alice',phone:'514-555-1234'},{name:'Shared contact',phone:'+1 (514) 555-1234'},{name:'Unique customer',phone:'4165551234'}]});
 await db.smsMessage.createMany({data:[{phone,direction:'INBOUND',body:'ancienne facture spéciale',status:'received',createdAt:new Date('2026-10-01')},{phone,direction:'INBOUND',body:'STOP',status:'received',createdAt:new Date('2026-10-02')},{phone:other,direction:'OUTBOUND',body:'Bonjour',status:'sent',createdAt:new Date('2026-10-03')}]});
 await db.phoneCall.create({data:{sid:'CA'+'1'.repeat(32),phone,direction:'inbound',status:'completed',durationSeconds:40}});
 await db.smsConsent.create({data:{phone,granted:false,optedOut:true}});
 const first=await hub.list({pageSize:1},bootstrapActor);assert.equal(first.total,2);assert.equal(first.items.length,1);assert.equal((await hub.list({query:'ancienne facture'},bootstrapActor)).total,1);assert.equal((await hub.list({query:'Unique customer'},bootstrapActor)).items[0].association.status,'UNIQUE');assert.equal((await hub.list({query:'%'},bootstrapActor)).total,0);
 const detail=await hub.detail(phone,bootstrapActor);assert.equal(detail.association.status,'AMBIGUOUS');assert.equal(detail.association.customer,null);assert.equal(detail.messages.length,2);assert.equal(detail.calls[0].durationSeconds,40);const draft=await hub.draft(phone,bootstrapActor);assert.equal(draft.draft,null);assert.equal(draft.canSend,false);assert.equal(await db.smsMessage.count(),3);
 const viewer=userActor({id:'viewer',name:'Viewer',role:'VIEWER',permissions:presets.VIEWER,sessionVersion:1});await assert.rejects(()=>hub.list({},viewer),{code:'FORBIDDEN'});const noOmega={...bootstrapActor,permissions:bootstrapActor.permissions.filter(p=>p!=='omega')};await assert.rejects(()=>hub.draft(other,noOmega),{code:'FORBIDDEN'});await assert.rejects(()=>hub.detail('5145551234',bootstrapActor));
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end();}
});

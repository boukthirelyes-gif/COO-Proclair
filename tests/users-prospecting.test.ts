import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {NextRequest} from 'next/server';
import {UserService,bootstrapActor,presets,userActor,routePermission,requirePermission} from '../src/lib/access';
import {resolveActor,authenticate} from '../src/lib/user-session';
import {issueSession} from '../src/lib/auth';
import {ProspectingService} from '../src/prospecting/service';
import {nativeExport} from '../src/lib/native-export';
const {Client}=createRequire(import.meta.url)('pg');
process.env.PROCLAIR_SESSION_SECRET='isolated-test-session-secret-users-1234567890';
test('permission grants default to denial and seller cannot reach privileged modules',()=>{
 const actor=userActor({id:'seller',name:'Seller',role:'SELLER',permissions:[...presets.SELLER,'finance'],sessionVersion:1});assert.ok(!actor.permissions.includes('finance'));
 for(const route of ['finance/state','export/native','users','settings/business','integrations/rotor','quotes','worker/tick','customers','omega/apply','portal/links'])assert.throws(()=>requirePermission(actor,routePermission(route,'POST')!),{code:'FORBIDDEN'});
 assert.equal(routePermission('prospecting/x/history','GET'),'map.read');assert.throws(()=>routePermission('new-sensitive-route','GET'),{code:'FORBIDDEN'});
});
test('users revoke sessions, pins enforce ownership, do-not-contact, CAS and exports omit password hashes',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const database=process.env.TEST_DATABASE_URL!,schema='users_'+randomUUID().replaceAll('-',''),setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});
 try{
 for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));
 const users=new UserService(db),map=new ProspectingService(db),password='synthetic-account-password-'+randomUUID(),fields={username:'seller.one',name:'Seller One',role:'SELLER',permissions:presets.SELLER,active:true};
 const one=await users.create({...fields,password},bootstrapActor),two=await users.create({...fields,username:'seller.two',name:'Seller Two',password},bootstrapActor);assert.ok(!('passwordHash'in one));assert.ok(!(JSON.stringify(await users.list(bootstrapActor))).includes(password));
 const stored=await db.appUser.findUniqueOrThrow({where:{id:one.id}});assert.notEqual(stored.passwordHash,password);assert.notEqual(stored.passwordHash,(await db.appUser.findUniqueOrThrow({where:{id:two.id}})).passwordHash);
 await assert.rejects(()=>users.create({...fields,username:'attacker',permissions:['map.read','finance'],password},bootstrapActor));const actor=await authenticate(db,{username:' SELLER.ONE ',password});assert.ok(actor);assert.equal(await authenticate(db,{username:'seller.one',password:'wrong'}),null);
 const request=new NextRequest('http://localhost/api/state',{headers:{cookie:'proclair_session='+issueSession({id:actor.id,role:actor.accountRole,sessionVersion:actor.sessionVersion})}});assert.equal((await resolveActor(db,request))?.id,one.id);const callbackRequest=new NextRequest('https://crm.example.test/api/integrations/rotor/callback',{headers:{cookie:'rotor_actor='+issueSession({id:actor.id,role:actor.accountRole,sessionVersion:actor.sessionVersion},600000)}});assert.equal(await resolveActor(db,callbackRequest),null);assert.equal((await resolveActor(db,callbackRequest,'rotor_actor'))?.id,one.id);
 await assert.rejects(()=>users.list(actor),{code:'FORBIDDEN'});
 const input={address:'Synthetic door',latitude:45.5,longitude:-73.5,status:'NOT_KNOCKED',notes:'Synthetic note',callbackAt:null,ownerId:one.id};const pin=await map.save(null,input,actor),otherActor=userActor(await db.appUser.findUniqueOrThrow({where:{id:two.id}}));
 assert.equal((await map.list(actor)).pins.length,1);assert.equal((await map.list(otherActor)).pins.length,0);await assert.rejects(()=>map.save(pin.id,{...input,ownerId:two.id,expectedVersion:1},otherActor),{code:'NOT_FOUND'});await assert.rejects(()=>map.history(pin.id,otherActor),{code:'NOT_FOUND'});await assert.rejects(()=>map.save(null,{...input,ownerId:two.id},actor),{code:'FORBIDDEN'});await assert.rejects(()=>map.save(null,{...input,latitude:91},actor));await assert.rejects(()=>map.save(null,{...input,status:'CALLBACK'},actor),{code:'CALLBACK_REQUIRED'});
 const updated=await map.save(pin.id,{...input,status:'DO_NOT_CONTACT',expectedVersion:1},actor);await assert.rejects(()=>map.save(pin.id,{...input,expectedVersion:1},actor),{code:'VERSION_CONFLICT'});await assert.rejects(()=>map.save(pin.id,{...input,expectedVersion:updated.version},actor),{code:'DO_NOT_CONTACT'});
 const reassign=await map.save(pin.id,{...input,status:'DO_NOT_CONTACT',ownerId:two.id,expectedVersion:2},bootstrapActor);assert.equal((await map.list(actor)).pins.length,0);assert.equal((await map.list(otherActor)).pins[0].id,pin.id);await assert.rejects(()=>map.history(pin.id,actor),{code:'NOT_FOUND'});const unlocked=await map.save(pin.id,{...input,ownerId:two.id,notes:'Restriction levée avec justification',expectedVersion:reassign.version},bootstrapActor);assert.equal(unlocked.status,'NOT_KNOCKED');assert.equal((await map.history(pin.id,otherActor)).length,4);
 const exportBody=await nativeExport(db);assert.ok(!exportBody.includes('passwordHash'));assert.ok(!exportBody.includes(stored.passwordHash));assert.ok(!exportBody.includes(password));assert.equal(JSON.parse(exportBody).counts.prospectPins,1);
 const disabled=await users.update(one.id,{...fields,active:false,expectedVersion:1},bootstrapActor);assert.equal(disabled.version,2);assert.equal(await resolveActor(db,callbackRequest,'rotor_actor'),null);assert.equal(await resolveActor(db,request),null);assert.equal(await authenticate(db,{username:fields.username,password}),null);await users.update(one.id,{...fields,expectedVersion:2},bootstrapActor);assert.equal(await resolveActor(db,request),null);
 const renewed=await authenticate(db,{username:fields.username,password});assert.ok(renewed);const cookie=new NextRequest('http://localhost',{headers:{cookie:'proclair_session='+issueSession({id:renewed.id,role:renewed.accountRole,sessionVersion:renewed.sessionVersion})}});await users.update(one.id,{...fields,permissions:['map.read'],expectedVersion:3,password:password+'reset'},bootstrapActor);assert.equal(await resolveActor(db,cookie),null);assert.equal(await authenticate(db,{username:fields.username,password}),null);assert.deepEqual((await authenticate(db,{username:fields.username,password:password+'reset'}))?.permissions,['map.read']);
 const adminFields={username:'second.admin',name:'Second admin',role:'ADMIN',permissions:presets.ADMIN,active:true},admin=await users.create({...adminFields,password},bootstrapActor),adminActor=userActor(await db.appUser.findUniqueOrThrow({where:{id:admin.id}}));await assert.rejects(()=>users.update(admin.id,{...adminFields,active:false,expectedVersion:1},adminActor),{code:'SELF_LOCKOUT'});await assert.rejects(()=>users.update(one.id,{...fields,expectedVersion:1},bootstrapActor),{code:'VERSION_CONFLICT'});
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end()}
});

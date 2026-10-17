import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {NextRequest} from 'next/server';
import {UserService,bootstrapActor,presets,userActor,routePermission,requirePermission} from '../src/lib/access';
import {presets as uiPresets} from '../src/lib/access-ui';
import {authenticate,resolveActor} from '../src/lib/user-session';
import {issueSession} from '../src/lib/auth';
import {revokeUserSessions,securityOverview,recordLogin} from '../src/lib/security-management';
import {UserInvitations} from '../src/lib/user-invitations';
import {AccountMfaService,verifyAccountMfa} from '../src/lib/account-mfa';
import {base32,totpAt,matchedStep,decryptMfa} from '../src/lib/totp';
import {EmployeePortal} from '../src/lib/employee-portal';
const {Client}=createRequire(import.meta.url)('pg');
async function isolated(fn:(db:PrismaClient)=>Promise<void>){const schema='enterprise_'+randomUUID().replaceAll('-',''),connection=new Client({connectionString:process.env.TEST_DATABASE_URL});await connection.connect();await connection.query(`CREATE SCHEMA "${schema}"`);await connection.query(`SET search_path TO "${schema}"`);const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.TEST_DATABASE_URL},{schema})});try{for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await connection.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));await fn(db)}finally{await db.$disconnect();await connection.query(`DROP SCHEMA "${schema}" CASCADE`);await connection.end();}}
const password='synthetic-enterprise-password-only';
const cookie=(actor:any,duration?:number)=>new NextRequest('http://localhost/api/state',{headers:{cookie:'proclair_session='+issueSession({id:actor.id,role:actor.accountRole,sessionVersion:actor.sessionVersion},duration)}});
process.env.PROCLAIR_SESSION_SECRET='synthetic-enterprise-session-secret-only-1234567890';
process.env.PROCLAIR_ADMIN_PASSWORD=password;
test('enterprise role ceilings agree between UI and backend; technicians cannot enter privileged routes',()=>{
 assert.deepEqual(uiPresets,presets);
 for(const role of ['SELLER','TECHNICIAN']){const actor=userActor({id:'fixture',name:'Fixture',role,permissions:[...presets[role],'users','finance'],sessionVersion:1});assert.ok(!actor.permissions.includes('users'));for(const route of ['users','finance/state','security/overview','security/revoke','integrations/rotor','settings/business'])assert.throws(()=>requirePermission(actor,routePermission(route,'POST')!),{code:'FORBIDDEN'});}
});
test('copied admin and employee sessions are rejected after global revocation, expiry and changes',{skip:!process.env.TEST_DATABASE_URL},async()=>isolated(async db=>{
 const admin=await authenticate(db,{password});assert.ok(admin);const copied=cookie(admin);assert.equal((await resolveActor(db,copied))?.id,'admin');await revokeUserSessions(db,{userId:'admin',approved:true},admin);assert.equal(await resolveActor(db,copied),null);const refreshed=await authenticate(db,{password});assert.equal(refreshed?.sessionVersion,1);assert.ok(await resolveActor(db,cookie(refreshed)));assert.equal(await resolveActor(db,cookie(refreshed,-1)),null);
 const service=new UserService(db),created=await service.create({username:'seller.fixture',name:'Fixture seller',role:'SELLER',permissions:presets.SELLER,password},refreshed!),actor=userActor({...created,sessionVersion:1}),session=cookie(actor);
 await revokeUserSessions(db,{userId:actor.id,approved:true},actor);assert.equal(await resolveActor(db,session),null);await assert.rejects(()=>revokeUserSessions(db,{userId:'admin',approved:true},actor),{code:'FORBIDDEN'});
 await recordLogin(db,'unknown-private-name',null);const events=JSON.stringify(await db.auditEvent.findMany());assert.ok(!events.includes(password));assert.ok(!events.includes('unknown-private-name'));assert.ok(!events.includes(copied.cookies.get('proclair_session')!.value));
}));
test('enterprise roles and technician bindings are persisted with database ceilings and protected owners',{skip:!process.env.TEST_DATABASE_URL},async()=>isolated(async db=>{
 const service=new UserService(db);for(const role of ['OWNER','GENERAL_MANAGER','SALES_MANAGER','OPERATIONS_MANAGER','TECHNICIAN','OFFICE']){const row=await service.create({username:'fixture.'+role.toLowerCase(),name:role,role,permissions:presets[role],password},bootstrapActor);assert.equal(row.role,role);}
 await assert.rejects(()=>db.appUser.create({data:{username:'bad.tech',name:'Bad fixture',role:'TECHNICIAN',permissions:['finance'],passwordHash:'synthetic'}}));
 const administrator=await service.create({username:'named.admin',name:'Named admin',role:'ADMIN',permissions:presets.ADMIN,password},bootstrapActor),namedAdmin=userActor({...administrator,sessionVersion:1});await assert.rejects(()=>service.create({username:'other.owner',name:'Owner',role:'OWNER',permissions:presets.OWNER,password},namedAdmin),{code:'FORBIDDEN'});
 const owner=await db.appUser.findFirstOrThrow({where:{role:'OWNER'}});await assert.rejects(()=>service.update(owner.id,{expectedVersion:owner.version,username:owner.username,name:owner.name,role:owner.role,permissions:owner.permissions,active:false},namedAdmin),{code:'FORBIDDEN'});
 const report=await securityOverview(db,bootstrapActor);assert.equal(report.activeUsers,7);assert.equal(report.activeSessions,null);assert.equal(report.mfa,'OPTIONAL_TOTP');
}));
test('employee portal isolates visits, redacts finance, preserves completed work and rejects stale access',{skip:!process.env.TEST_DATABASE_URL},async()=>isolated(async db=>{
 const a=await db.technician.create({data:{name:'Technician A'}}),b=await db.technician.create({data:{name:'Technician B'}}),service=new UserService(db),row=await service.create({username:'technician.fixture',name:'Technician',role:'TECHNICIAN',permissions:presets.TECHNICIAN,technicianId:a.id,password},bootstrapActor),actor=userActor({...row,sessionVersion:1}),portal=new EmployeePortal(db);
 const customer=await db.customer.create({data:{name:'Synthetic customer',notes:'PRIVATE CUSTOMER NOTES',email:'private@example.test'}}),property=await db.property.create({data:{customerId:customer.id,address:'Synthetic address'}}),contract=await db.contract.create({data:{customerId:customer.id,propertyId:property.id,name:'Synthetic contract',service:'Windows',totalVisits:2,priceCents:20000}}),job=await db.job.create({data:{customerId:customer.id,propertyId:property.id,contractId:contract.id,name:'Synthetic job'}});
 const fields={customerId:customer.id,propertyId:property.id,contractId:contract.id,jobId:job.id,service:'Windows',status:'IN_PROGRESS' as const,durationMinutes:60,startsAt:new Date('2027-01-15T14:00:00Z'),endsAt:new Date('2027-01-15T15:00:00Z'),priceCents:10000,passageNumber:1,notes:'PRIVATE VISIT NOTES',technicianInstructions:'Instructions tech'};
 const own=await db.visit.create({data:{...fields,technicianId:a.id}}),other=await db.visit.create({data:{...fields,passageNumber:2,technicianId:b.id}}),list=await portal.visits({date:'2027-01-15'},actor);assert.equal(list.total,1);assert.equal(list.visits[0].id,own.id);assert.equal(list.visits[0].technicianInstructions,'Instructions tech');assert.ok(!JSON.stringify(list).includes('PRIVATE VISIT NOTES'));assert.ok(!JSON.stringify(list).includes('priceCents'));assert.ok(!JSON.stringify(list).includes('PRIVATE CUSTOMER NOTES'));assert.ok(!JSON.stringify(list).includes('private@example.test'));
 await assert.rejects(()=>portal.complete(other.id,{expectedVersion:1,actualDurationMinutes:60,approved:true},actor),{code:'NOT_FOUND'});await assert.rejects(()=>portal.visits({date:'2027-01-15',technicianId:b.id},actor));
 await db.visit.update({where:{id:own.id},data:{status:'SCHEDULED'}});await portal.start(own.id,{expectedVersion:1,approved:true},actor);await portal.start(own.id,{expectedVersion:1,approved:true},actor);assert.equal(await db.auditEvent.count({where:{action:'EMPLOYEE_VISIT_STARTED'}}),1);
 const result=await portal.complete(own.id,{expectedVersion:2,actualDurationMinutes:55,approved:true},actor);assert.equal(result.status,'COMPLETED');await portal.complete(own.id,{expectedVersion:2,actualDurationMinutes:55,approved:true},actor);assert.equal(await db.auditEvent.count({where:{action:'EMPLOYEE_VISIT_COMPLETED'}}),1);assert.equal((await portal.visits({date:'2027-01-15'},actor)).total,1);
 await revokeUserSessions(db,{userId:row.id,approved:true},bootstrapActor);await assert.rejects(()=>portal.complete(own.id,{expectedVersion:2,actualDurationMinutes:55,approved:true},actor),{code:'EMPLOYEE_NOT_ASSIGNED'});
}));

test('TOTP matches the public RFC 6238 SHA1 vector and rejects expired/replayed steps',()=>{
 const secret=base32(Buffer.from('12345678901234567890'));assert.equal(totpAt(secret,1),'287082');assert.equal(matchedStep(secret,'287082',59000),1);assert.equal(matchedStep(secret,'287082',59000,1),null);assert.equal(matchedStep(secret,'287082',180000),null);
});
test('MFA enrollment is voluntary, encrypted, verified, revokes sessions and consumes recovery codes once',{skip:!process.env.TEST_DATABASE_URL},async()=>isolated(async db=>{
 let now=Date.now();const service=new AccountMfaService(db,()=>now),identity=await authenticate(db,{password});assert.ok(identity);const session=cookie(identity);
 await assert.rejects(()=>service.begin({password:'incorrect'},identity),{code:'INVALID_CREDENTIALS'});
 const enrollment=await service.begin({password},identity),stored=await db.accountMfa.findUniqueOrThrow({where:{actorId:'admin'}});assert.equal(stored.enabled,false);assert.ok(!stored.encryptedSecret.includes(enrollment.secret));assert.equal(decryptMfa(stored.encryptedSecret,'admin'),enrollment.secret);assert.throws(()=>decryptMfa(stored.encryptedSecret,'other'));
 const step=Math.floor(now/30000),enabled=await service.confirm({code:totpAt(enrollment.secret,step)},identity);assert.equal(enabled.recoveryCodes.length,10);assert.equal(await resolveActor(db,session),null);assert.equal(await authenticate(db,{password}),null);assert.equal(await verifyAccountMfa(db,'admin',totpAt(enrollment.secret,step),now),false);
 const fresh=await authenticate(db,{password,code:enabled.recoveryCodes[0]});assert.ok(fresh);assert.equal(await authenticate(db,{password,code:enabled.recoveryCodes[0]}),null);
 const concurrent=await Promise.all([verifyAccountMfa(db,'admin',totpAt(enrollment.secret,step+1),now+30000),verifyAccountMfa(db,'admin',totpAt(enrollment.secret,step+1),now+30000)]);assert.equal(concurrent.filter(Boolean).length,1);
 await assert.rejects(()=>service.begin({password},fresh),{code:'MFA_ALREADY_ENABLED'});await assert.rejects(()=>service.disable({password,code:'INVALID',approved:true},fresh),{code:'MFA_INVALID'});
 await service.disable({password,code:enabled.recoveryCodes[1],approved:true},fresh);assert.equal(await resolveActor(db,cookie(fresh)),null);assert.ok(await authenticate(db,{password}));
 const audits=JSON.stringify(await db.auditEvent.findMany());for(const secret of [password,enrollment.secret,...enabled.recoveryCodes])assert.ok(!audits.includes(secret));assert.equal(await db.accountMfa.count(),0);
}));
test('MFA pending seeds expire and revoked identities cannot activate them',{skip:!process.env.TEST_DATABASE_URL},async()=>isolated(async db=>{
 let now=Date.now();const service=new AccountMfaService(db,()=>now),identity=await authenticate(db,{password});assert.ok(identity);const enrollment=await service.begin({password},identity);now+=601000;
 await assert.rejects(()=>service.confirm({code:totpAt(enrollment.secret,Math.floor(now/30000))},identity),{code:'MFA_ENROLLMENT_EXPIRED'});
 now=Date.now();const next=await service.begin({password},identity);await revokeUserSessions(db,{userId:'admin',approved:true},identity);await assert.rejects(()=>service.confirm({code:totpAt(next.secret,Math.floor(now/30000))},identity),{code:'SESSION_REVOKED'});
}));

test('invitations activate only the intended inactive account, keep tokens out of storage and reject replay',{skip:!process.env.TEST_DATABASE_URL},async()=>isolated(async db=>{
 const invites=new UserInvitations(db),created=await invites.create({username:'invited.fixture',name:'Invited fixture',role:'TECHNICIAN',permissions:presets.TECHNICIAN},bootstrapActor),token=new URLSearchParams(created.invitation.path.split('#')[1]).get('token')!;
 assert.equal(created.user.active,false);assert.equal(created.invitation.delivery,'NOT_SENT');assert.ok(!JSON.stringify(await db.userInvitation.findMany()).includes(token));assert.equal(await authenticate(db,{username:created.user.username,password}),null);
 await assert.rejects(()=>invites.accept({token,password,role:'OWNER'}));const simultaneous=await Promise.allSettled([invites.accept({token,password}),invites.accept({token,password})]);assert.equal(simultaneous.filter(r=>r.status==='fulfilled').length,1);const activated=simultaneous.find(r=>r.status==='fulfilled');assert.ok(activated&&activated.status==='fulfilled');assert.equal(activated.value.username,created.user.username);assert.ok(await authenticate(db,{username:created.user.username,password}));await assert.rejects(()=>invites.accept({token,password:'different-password-value'}),{code:'INVITATION_INVALID'});assert.equal(await authenticate(db,{username:created.user.username,password:'different-password-value'}),null);
 const events=JSON.stringify(await db.auditEvent.findMany());assert.ok(!events.includes(token));assert.ok(!events.includes(password));assert.equal(await db.auditEvent.count({where:{action:'USER_INVITATION_ACCEPTED'}}),1);
}));
test('expired, revoked, changed and replaced invitations cannot activate or change permissions',{skip:!process.env.TEST_DATABASE_URL},async()=>isolated(async db=>{
 let now=new Date();const invites=new UserInvitations(db,()=>now),created=await invites.create({username:'pending.fixture',name:'Pending',role:'SELLER',permissions:presets.SELLER},bootstrapActor),token=(path:string)=>new URLSearchParams(path.split('#')[1]).get('token')!;
 const next=await invites.issue({userId:created.user.id,expectedVersion:1,approved:true},bootstrapActor);await assert.rejects(()=>invites.accept({token:token(created.invitation.path),password}),{code:'INVITATION_INVALID'});await invites.revoke({id:next.id,approved:true},bootstrapActor);await assert.rejects(()=>invites.accept({token:token(next.path),password}),{code:'INVITATION_INVALID'});
 const expired=await invites.issue({userId:created.user.id,expectedVersion:1,approved:true},bootstrapActor);now=new Date(now.getTime()+73*3600000);await assert.rejects(()=>invites.accept({token:token(expired.path),password}),{code:'INVITATION_INVALID'});now=new Date();const stale=await invites.issue({userId:created.user.id,expectedVersion:1,approved:true},bootstrapActor);
 await new UserService(db).update(created.user.id,{expectedVersion:1,username:created.user.username,name:'Changed',role:'SELLER',permissions:[],active:false},bootstrapActor);await assert.rejects(()=>invites.accept({token:token(stale.path),password}),{code:'INVITATION_INVALID'});
 const actor=userActor({id:created.user.id,name:'Seller',role:'SELLER',permissions:presets.SELLER,sessionVersion:1});await assert.rejects(()=>invites.issue({userId:created.user.id,expectedVersion:2,approved:true},actor),{code:'FORBIDDEN'});assert.equal((await db.appUser.findUniqueOrThrow({where:{id:created.user.id}})).active,false);
}));

test('persistent MFA guessing limits survive retries while recovery and expiration restore access',{skip:!process.env.TEST_DATABASE_URL},async()=>isolated(async db=>{
 const now=Date.now(),service=new AccountMfaService(db,()=>now),actor=await authenticate(db,{password});assert.ok(actor);const enrollment=await service.begin({password},actor),step=Math.floor(now/30000),enabled=await service.confirm({code:totpAt(enrollment.secret,step)},actor);
 for(let i=0;i<5;i++)assert.equal(await verifyAccountMfa(db,'admin','INVALID',now),false);
 assert.ok((await new AccountMfaService(db).status(actor)).blockedUntil);assert.equal(await verifyAccountMfa(db,'admin',totpAt(enrollment.secret,step+1),now+30000),false);
 assert.equal(await verifyAccountMfa(db,'admin',enabled.recoveryCodes[0],now+30000),true);assert.equal((await db.accountMfa.findUniqueOrThrow({where:{actorId:'admin'}})).failedAttempts,0);
 for(let i=0;i<5;i++)assert.equal(await verifyAccountMfa(db,'admin','INVALID',now+30000),false);
 const later=now+16*60000;assert.equal(await verifyAccountMfa(db,'admin',totpAt(enrollment.secret,Math.floor(later/30000)),later),true);assert.equal(await db.auditEvent.count({where:{action:'MFA_RATE_BLOCKED'}}),2);
}));
test('demoting an inviter invalidates outstanding invitations and stale administrative calls',{skip:!process.env.TEST_DATABASE_URL},async()=>isolated(async db=>{
 const service=new UserService(db),named=await service.create({username:'inviter.fixture',name:'Inviter',role:'ADMIN',permissions:presets.ADMIN,password},bootstrapActor),actor=userActor({...named,sessionVersion:1}),invites=new UserInvitations(db),pending=await invites.create({username:'target.fixture',name:'Target',role:'SELLER',permissions:presets.SELLER},actor),token=new URLSearchParams(pending.invitation.path.split('#')[1]).get('token')!;
 await service.update(named.id,{expectedVersion:1,username:named.username,name:named.name,role:'OFFICE',permissions:presets.OFFICE,active:false},bootstrapActor);
 await assert.rejects(()=>invites.accept({token,password}),{code:'INVITATION_INVALID'});await assert.rejects(()=>invites.issue({userId:pending.user.id,expectedVersion:1,approved:true},actor),{code:'SESSION_REVOKED'});
 await assert.rejects(()=>service.create({username:'stale.create',name:'Blocked',role:'SELLER',permissions:presets.SELLER,password},actor),{code:'SESSION_REVOKED'});
 await assert.rejects(()=>service.update(pending.user.id,{expectedVersion:1,username:pending.user.username,name:'Blocked',role:'SELLER',permissions:presets.SELLER,active:true},actor),{code:'SESSION_REVOKED'});
 await assert.rejects(()=>revokeUserSessions(db,{userId:pending.user.id,approved:true},actor),{code:'SESSION_REVOKED'});
 assert.equal((await db.appUser.findUniqueOrThrow({where:{id:pending.user.id}})).active,false);
}));

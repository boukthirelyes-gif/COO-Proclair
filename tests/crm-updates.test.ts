import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {Client}=createRequire(import.meta.url)('pg');
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {CRMService,updateCustomerSchema,updateContractSchema} from '../src/domain/service';
const database=process.env.TEST_DATABASE_URL;
test('CRM updates accept explicit clearing and reject unrecognized or empty edits',()=>{
 assert.equal(updateCustomerSchema.parse({expectedVersion:1,email:''}).email,null);
 assert.equal(updateCustomerSchema.parse({expectedVersion:1,email:null}).email,null);
 for(const input of [{expectedVersion:1},{expectedVersion:1,name:''},{expectedVersion:1,email:'invalid'},{expectedVersion:1,id:'other'}])assert.equal(updateCustomerSchema.safeParse(input).success,false);
 assert.equal(updateContractSchema.safeParse({expectedVersion:1,customerId:'other'}).success,false);
 assert.equal(updateContractSchema.safeParse({expectedVersion:1,totalVisits:0}).success,false);
});
test('CRM edits preserve omitted values, audit snapshots, reject stale changes and protect existing passages',{skip:!database},async()=>{
 const schema=`crm_updates_${randomUUID().replaceAll('-','')}`;const setup=new Client({connectionString:database});await setup.connect();await setup.query(`CREATE SCHEMA "${schema}"`);await setup.query(`SET search_path TO "${schema}"`);for(const entry of (await readdir('prisma/migrations',{withFileTypes:true})).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))){await setup.query(await readFile(`prisma/migrations/${entry.name}/migration.sql`,'utf8'));}
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:database},{schema})});const crm=new CRMService(db);const admin={id:'crm-test',role:'ADMIN' as const};
 try{
 const customer=await crm.createCustomer({name:'Client',email:'client@example.com',phone:'123',notes:'Conserver'},admin);
 const updated=await crm.updateCustomer(customer.id,{expectedVersion:1,name:'Client révisé'},admin);assert.equal(updated.version,2);assert.equal(updated.email,customer.email);assert.equal(updated.phone,'123');assert.equal(updated.notes,'Conserver');
 await assert.rejects(()=>crm.updateCustomer(customer.id,{expectedVersion:1,phone:'456'},admin),{code:'VERSION_CONFLICT'});
 const cleared=await crm.updateCustomer(customer.id,{expectedVersion:2,email:'',phone:null,notes:''},{id:'dispatch',role:'DISPATCHER'});assert.equal(cleared.email,null);assert.equal(cleared.phone,null);assert.equal(cleared.notes,'');
 const event=await db.auditEvent.findFirstOrThrow({where:{entityId:customer.id,action:'UPDATE'},orderBy:{createdAt:'asc'}});assert.equal((event.before as any).name,'Client');assert.equal((event.after as any).name,'Client révisé');assert.equal(event.actorId,admin.id);
 await assert.rejects(()=>crm.updateCustomer(customer.id,{expectedVersion:3,name:'Omega'},{id:'omega',role:'OMEGA'}),{code:'APPROVAL_REQUIRED'});
 await assert.rejects(()=>crm.updateCustomer(customer.id,{expectedVersion:3,name:'Viewer'},{id:'viewer',role:'VIEWER'}),{code:'FORBIDDEN'});
 const property=await crm.createProperty({customerId:customer.id,address:'1 Rue Test'},admin);const contract=await crm.createContract({customerId:customer.id,propertyId:property.id,name:'Contrat',service:'Lavage',totalVisits:5,priceCents:50000},admin);const job=await crm.createJob({customerId:customer.id,propertyId:property.id,contractId:contract.id,name:'Travail'},admin);
 const visitInput={customerId:customer.id,propertyId:property.id,contractId:contract.id,jobId:job.id,service:'Lavage',passageNumber:4,durationMinutes:60,priceCents:10000,status:'CONFIRMED'};const visit=await crm.createVisit(visitInput,admin);
 const auditCount=await db.auditEvent.count();await assert.rejects(()=>crm.updateContract(contract.id,{expectedVersion:1,totalVisits:3,name:'Ne pas enregistrer'},admin),{code:'PASSAGES_EXIST'});assert.equal((await db.contract.findUniqueOrThrow({where:{id:contract.id}})).name,'Contrat');assert.equal(await db.auditEvent.count(),auditCount);
 const revised=await crm.updateContract(contract.id,{expectedVersion:1,totalVisits:4,name:'Révisé',service:'Vitrage',priceCents:60000},admin);assert.equal(revised.version,2);assert.equal((await db.visit.findUniqueOrThrow({where:{id:visit.id}})).priceCents,10000);assert.equal((await db.visit.findUniqueOrThrow({where:{id:visit.id}})).service,'Lavage');
 await assert.rejects(()=>crm.updateContract(contract.id,{expectedVersion:1,active:false},admin),{code:'VERSION_CONFLICT'});await assert.rejects(()=>crm.updateContract(contract.id,{expectedVersion:2,active:false},{id:'omega',role:'OMEGA'}),{code:'APPROVAL_REQUIRED'});
 await crm.updateContract(contract.id,{expectedVersion:2,active:false},admin);
 await assert.rejects(()=>crm.createVisit({...visitInput,passageNumber:1},admin),{code:'CONTRACT_INVALID'});
 const [tech]=await crm.bootstrapTechnicians(admin);await assert.rejects(()=>crm.updateVisit(visit.id,{expectedVersion:1,technicianId:tech.id,startsAt:'2027-01-04T13:00:00.000Z',endsAt:'2027-01-04T14:00:00.000Z'},admin),{code:'INACTIVE_CONTRACT'});
 const contractAudit=await db.auditEvent.findFirstOrThrow({where:{entityId:contract.id,action:'UPDATE'},orderBy:{createdAt:'desc'}});assert.equal((contractAudit.before as any).active,true);assert.equal((contractAudit.after as any).active,false);
 }finally{await db.$disconnect();await setup.query(`DROP SCHEMA "${schema}" CASCADE`);await setup.end();}
});

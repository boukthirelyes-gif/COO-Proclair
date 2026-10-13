import type {PrismaClient} from '@prisma/client';
import {z} from 'zod';
import type {AccessActor} from './access';
export type SearchResult={kind:string;id:string;label:string;detail:string;view:string;customerId?:string};
export async function globalSearch(db:PrismaClient,query:unknown,actor:AccessActor){
 const q=z.string().trim().min(2).max(120).parse(query),has=(p:string)=>actor.permissions.some(x=>x===p),digits=q.replace(/\D/g,''),contains={contains:q,mode:'insensitive' as const},results:SearchResult[]=[];
 const jobs:Promise<void>[]=[];
 if(has('crm.read')){
 jobs.push(db.customer.findMany({where:{OR:[{name:contains},{email:contains},{phone:contains},...(digits.length>=3?[{normalizedPhone:{contains:digits}}]:[]),{properties:{some:{address:contains}}}]},take:8,orderBy:{name:'asc'},select:{id:true,name:true,email:true,phone:true}}).then(rows=>{for(const r of rows)results.push({kind:'Clients',id:r.id,label:r.name,detail:r.phone||r.email||'Dossier client',view:'customers',customerId:r.id})}));
 jobs.push(db.contract.findMany({where:{OR:[{name:contains},{service:contains},{customer:{name:contains}}]},take:8,orderBy:{createdAt:'desc'},select:{id:true,name:true,service:true,customerId:true}}).then(rows=>{for(const r of rows)results.push({kind:'Contrats',id:r.id,label:r.name,detail:r.service,view:'contracts',customerId:r.customerId})}));
 jobs.push(db.visit.findMany({where:{OR:[{service:contains},{customer:{name:contains}},{property:{address:contains}}]},take:8,orderBy:{createdAt:'desc'},select:{id:true,service:true,customerId:true,status:true}}).then(rows=>{for(const r of rows)results.push({kind:'Visites',id:r.id,label:r.service,detail:r.status,view:'visits',customerId:r.customerId})}));
 }
 if(has('finance'))jobs.push(db.invoice.findMany({where:{OR:[{number:contains},{customer:{name:contains}}]},take:8,orderBy:{createdAt:'desc'},select:{id:true,number:true,status:true,customerId:true}}).then(rows=>{for(const r of rows)results.push({kind:'Factures',id:r.id,label:r.number||'Facture brouillon',detail:r.status,view:'invoices',customerId:r.customerId})}));
 if(has('leads.read'))jobs.push(db.lead.findMany({where:{...(has('leads.all')?{}:{ownerId:actor.id}),OR:[{name:contains},{email:contains},{phone:contains},{address:contains}]},take:8,orderBy:{updatedAt:'desc'},select:{id:true,name:true,address:true,status:true}}).then(rows=>{for(const r of rows)results.push({kind:'Prospects',id:r.id,label:r.name,detail:r.address||r.status,view:'leads'})}));
 if(has('map.read'))jobs.push(db.prospectPin.findMany({where:{...(has('map.all')?{}:{ownerId:actor.id}),OR:[{address:contains},{notes:contains}]},take:8,orderBy:{createdAt:'desc'},select:{id:true,address:true,status:true}}).then(rows=>{for(const r of rows)results.push({kind:'Pins',id:r.id,label:r.address,detail:r.status,view:'map'})}));
 if(has('users'))jobs.push(db.appUser.findMany({where:{OR:[{name:contains},{username:contains}]},take:8,orderBy:{name:'asc'},select:{id:true,name:true,role:true}}).then(rows=>{for(const r of rows)results.push({kind:'Employés',id:r.id,label:r.name,detail:r.role,view:'users'})}));
 await Promise.all(jobs);results.sort((a,b)=>a.kind.localeCompare(b.kind)||a.label.localeCompare(b.label));return {query:q,results,perCategoryLimit:8,limited:true};
}

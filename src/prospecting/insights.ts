import type {PrismaClient} from '@prisma/client';
import {mapWhere} from './query';
import {requirePermission,type AccessActor} from '../lib/access';
export async function prospectingInsights(db:PrismaClient,input:unknown,actor:AccessActor){
 requirePermission(actor,'map.read');const where=mapWhere(input,actor),all=actor.permissions.includes('map.all'),leadsAllowed=actor.permissions.includes('leads.read'),moneyAllowed=actor.permissions.includes('sales.write')||actor.permissions.includes('finance');
 const leadScope={sourcePin:{is:where},...(!all?{ownerId:actor.id}:{})};
 const [statuses,territories,sellers,leads,converted,quotes,signed,visited,wonLeads]=await Promise.all([
 db.prospectPin.groupBy({by:['status'],where,_count:{_all:true}}),
 db.prospectPin.groupBy({by:['territoryId'],where,_count:{_all:true},orderBy:{_count:{territoryId:'desc'}},take:100}),
 db.prospectPin.groupBy({by:['ownerId'],where,_count:{_all:true},orderBy:{_count:{ownerId:'desc'}},take:100}),
 leadsAllowed?db.lead.count({where:leadScope}):null,
 leadsAllowed?db.lead.count({where:{...leadScope,convertedCustomerId:{not:null}}}):null,
 leadsAllowed?db.quote.count({where:{sourceLead:{is:leadScope}}}):null,
 moneyAllowed?db.serviceAgreement.aggregate({where:{status:'SIGNED',sourceLead:{is:leadScope},...(!all?{salesOwnerId:actor.id}:{})},_sum:{subtotalCents:true},_count:{_all:true}}):null,db.prospectPin.count({where:{...where,lastVisitedAt:{not:null}}}),moneyAllowed&&leadsAllowed?db.lead.count({where:{...leadScope,salesAgreements:{some:{status:'SIGNED',...(!all?{salesOwnerId:actor.id}:{})}}}}):null]);
 const [territoryNames,sellerNames]=await Promise.all([db.salesTerritory.findMany({where:{id:{in:territories.flatMap(t=>t.territoryId?[t.territoryId]:[])}},select:{id:true,name:true}}),db.appUser.findMany({where:{id:{in:sellers.flatMap(s=>s.ownerId?[s.ownerId]:[])}},select:{id:true,name:true}})]);
 const total=statuses.reduce((n,r)=>n+r._count._all,0),count=(s:string)=>statuses.find(r=>r.status===s)?._count._all??0;
 return {total,visitedDoors:visited,statuses:statuses.map(r=>({status:r.status,count:r._count._all})),doorsWithOutcome:total-count('NOT_KNOCKED'),callbacks:count('CALLBACK'),leads,convertedCustomers:converted,quotes,signedContracts:signed?._count._all??null,signedSubtotalCents:signed?._sum.subtotalCents??(moneyAllowed?0:null),conversionRate:leads&&wonLeads!==null?Math.round(wonLeads/leads*10000)/100:0,territories:territories.map(r=>({id:r.territoryId,name:territoryNames.find(t=>t.id===r.territoryId)?.name??'Sans territoire',count:r._count._all})),sellers:sellers.map(r=>({id:r.ownerId,name:sellerNames.find(s=>s.id===r.ownerId)?.name??'Non attribué',count:r._count._all})),groupLimit:100,source:'PERSISTED_SCOPED_RECORDS',note:'Les portes avec résultat ne constituent pas une preuve de déplacement physique. Ventes : contrats actuellement signés hors taxes liés aux prospects filtrés.'};
}

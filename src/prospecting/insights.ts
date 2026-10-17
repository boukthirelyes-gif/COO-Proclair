import {Prisma,type PrismaClient} from '@prisma/client';
import {mapQuery,mapWhere} from './query';
import {DomainError} from '../domain/rules';
import {requirePermission,type AccessActor} from '../lib/access';
/** All figures share a read snapshot. The schema parameter is internal, for isolated tests only. */
export async function prospectingInsights(db:PrismaClient,input:unknown,actor:AccessActor,schema='public'){
 requirePermission(actor,'map.read');if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))throw new DomainError('INVALID_SCHEMA','Stockage invalide.',500);
 const q=mapQuery.parse(input),where=mapWhere(q,actor),all=actor.permissions.includes('map.all'),leadsAllowed=actor.permissions.includes('leads.read'),moneyAllowed=actor.permissions.includes('sales.write')||actor.permissions.includes('finance');
 const leadScope={sourcePin:{is:where},...(!all?{ownerId:actor.id}:{})},conditions:Prisma.Sql[]=[Prisma.sql`TRUE`];
 if(where.ownerId)conditions.push(Prisma.sql`p."ownerId"=${where.ownerId}`);
 for(const key of ['status','typeId','territoryId'] as const)if(q[key])conditions.push(Prisma.sql`${Prisma.raw('p."'+key+'"')}=${q[key]}`);
 if(where.createdAt?.gte)conditions.push(Prisma.sql`p."createdAt">=${where.createdAt.gte}`);if(where.createdAt?.lt)conditions.push(Prisma.sql`p."createdAt"<${where.createdAt.lt}`);
 if(q.search){const search='%'+q.search.replace(/[\\%_]/g,'\\$&')+'%';conditions.push(Prisma.sql`(p.address ILIKE ${search} OR p.notes ILIKE ${search})`)}
 const table=(name:string)=>Prisma.raw('"'+schema+'"."'+name+'"'),filter=Prisma.join(conditions,' AND ');
 return db.$transaction(async tx=>{
 const [statuses,territories,sellers,leads,converted,quotes,signed,visited,wonLeads,territorySales,activity]=await Promise.all([
 tx.prospectPin.groupBy({by:['status'],where,_count:{_all:true}}),
 tx.prospectPin.groupBy({by:['territoryId'],where,_count:{_all:true},orderBy:{_count:{territoryId:'desc'}},take:100}),
 tx.prospectPin.groupBy({by:['ownerId'],where,_count:{_all:true},orderBy:{_count:{ownerId:'desc'}},take:100}),
 leadsAllowed?tx.lead.count({where:leadScope}):null,
 leadsAllowed?tx.lead.count({where:{...leadScope,convertedCustomerId:{not:null}}}):null,
 leadsAllowed?tx.quote.count({where:{sourceLead:{is:leadScope}}}):null,
 moneyAllowed?tx.serviceAgreement.aggregate({where:{status:'SIGNED',sourceLead:{is:leadScope},...(!all?{salesOwnerId:actor.id}:{})},_sum:{subtotalCents:true},_count:{_all:true}}):null,
 tx.prospectPin.count({where:{...where,lastVisitedAt:{not:null}}}),
 moneyAllowed&&leadsAllowed?tx.lead.count({where:{...leadScope,salesAgreements:{some:{status:'SIGNED',...(!all?{salesOwnerId:actor.id}:{})}}}}):null,
 moneyAllowed?tx.$queryRaw<{id:string|null;signedContracts:number;signedProspects:number;signedSubtotalCents:string}[]>(Prisma.sql`SELECT p."territoryId" AS id,count(a.id)::int AS "signedContracts",count(DISTINCT l.id)::int AS "signedProspects",sum(a."subtotalCents")::text AS "signedSubtotalCents" FROM ${table('ProspectPin')} p JOIN ${table('Lead')} l ON l."sourcePinId"=p.id JOIN ${table('ServiceAgreement')} a ON a."sourceLeadId"=l.id WHERE ${filter} AND a.status='SIGNED' ${all?Prisma.empty:Prisma.sql`AND l."ownerId"=${actor.id} AND a."salesOwnerId"=${actor.id}`} GROUP BY p."territoryId" ORDER BY count(a.id) DESC LIMIT 100`):[],
 tx.$queryRaw<{id:string;passages:number;doors:number}[]>(Prisma.sql`SELECT e."actorId" AS id,count(*)::int AS passages,count(DISTINCT p.id)::int AS doors FROM ${table('AuditEvent')} e JOIN ${table('ProspectPin')} p ON p.id=e."entityId" WHERE e.action='PROSPECT_DOOR_VISITED' AND e."entityType"='ProspectPin' AND ${filter} ${all?Prisma.empty:Prisma.sql`AND e."actorId"=${actor.id}`} GROUP BY e."actorId" ORDER BY count(*) DESC LIMIT 100`)
 ]);
 const sellerIds=[...new Set([...sellers.flatMap(s=>s.ownerId?[s.ownerId]:[]),...activity.map(a=>a.id)])];
 const [territoryNames,sellerNames]=await Promise.all([tx.salesTerritory.findMany({where:{id:{in:territories.flatMap(t=>t.territoryId?[t.territoryId]:[])}},select:{id:true,name:true}}),tx.appUser.findMany({where:{id:{in:sellerIds}},select:{id:true,name:true}})]);
 const cents=(value:string|number|null|undefined)=>{const n=Number(value??0);if(!Number.isSafeInteger(n)||n<0)throw new DomainError('METRICS_RANGE','Total monétaire hors de la précision autorisée.',413);return n};
 const total=statuses.reduce((n,r)=>n+r._count._all,0),count=(s:string)=>statuses.find(r=>r.status===s)?._count._all??0;
 return {total,visitedDoors:visited,statuses:statuses.map(r=>({status:r.status,count:r._count._all})),doorsWithOutcome:total-count('NOT_KNOCKED'),callbacks:count('CALLBACK'),leads,convertedCustomers:converted,quotes,signedContracts:signed?._count._all??null,signedSubtotalCents:moneyAllowed?cents(signed?._sum.subtotalCents):null,conversionRate:leads&&wonLeads!==null?Math.round(wonLeads/leads*10000)/100:0,
 territories:territories.map(r=>{const sales=territorySales.find(t=>t.id===r.territoryId),known=moneyAllowed&&(Boolean(sales)||territorySales.length<100);return {id:r.territoryId,name:territoryNames.find(t=>t.id===r.territoryId)?.name??'Sans territoire',count:r._count._all,signedContracts:known?sales?.signedContracts??0:null,signedSubtotalCents:known?cents(sales?.signedSubtotalCents):null,signedDoorRate:known&&r._count._all?Math.round((sales?.signedProspects??0)/r._count._all*10000)/100:null}}),
 sellers:sellerIds.slice(0,100).map(id=>({id,name:sellerNames.find(s=>s.id===id)?.name??'Compte historique',assignedDoors:sellers.find(s=>s.ownerId===id)?._count._all??0,declaredPassages:activity.find(a=>a.id===id)?.passages??0,visitedDoors:activity.find(a=>a.id===id)?.doors??0})),groupLimit:100,source:'PERSISTED_SCOPED_RECORDS',note:'Cohorte de portes selon les filtres, revenus actuellement signés HT. Les passages sont déclarés volontairement ; les compteurs ne constituent pas une preuve GPS ni des encaissements.'};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:15000});
}

import {Prisma,type PrismaClient} from '@prisma/client';
import {DomainError} from '../domain/rules';
import {requirePermission,type AccessActor} from '../lib/access';

export type OmegaOperationItem={id:string;label:string;detail:string;view:string;customerId?:string};
export type OmegaOperationGroup={key:string;label:string;priority:'URGENT'|'HIGH'|'NORMAL';reason:string;total:number;items:OmegaOperationItem[]};
/** Deterministic operational priorities from a single consistent, read-only snapshot. */
export async function omegaOperations(db:PrismaClient,actor:AccessActor,now=new Date(),schema='public'){
 requirePermission(actor,'omega');requirePermission(actor,'crm.read');
 if(!Number.isFinite(now.getTime()))throw new DomainError('INVALID_DATE','Date de consultation invalide.',400);
 if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))throw new DomainError('INVALID_SCHEMA','Configuration de stockage invalide.',500);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const scope={timezone:'America/Toronto',today,finance:actor.permissions.includes('finance'),communications:actor.permissions.includes('integrations'),worker:actor.accountRole==='ADMIN'};
 const stamp=(value:Date)=>new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',dateStyle:'short',timeStyle:'short'}).format(value);
 const table=(name:string)=>Prisma.raw(`"${schema}"."${name}"`);
 return db.$transaction(async tx=>{
  const groups:OmegaOperationGroup[]=[];
  const visitGroup=async(key:string,label:string,priority:OmegaOperationGroup['priority'],reason:string,where:Prisma.VisitWhereInput)=>{
   const total=await tx.visit.count({where});
   const rows=await tx.visit.findMany({where,take:10,orderBy:[{startsAt:{sort:'asc',nulls:'last'}},{createdAt:'asc'},{id:'asc'}],select:{id:true,customerId:true,service:true,status:true,startsAt:true,customer:{select:{name:true}}}});
   groups.push({key,label,priority,reason,total,items:rows.map(row=>({id:row.id,label:row.customer.name,detail:row.service+' · '+row.status+(row.startsAt?' · '+stamp(row.startsAt):''),view:'visits',customerId:row.customerId}))});
  };
  await visitGroup('OVERDUE_VISITS','Visites en retard','URGENT','Le début prévu est passé sans démarrage, ou la fin prévue est passée pour une visite en cours.',{OR:[{startsAt:{lt:now},status:{in:['SCHEDULED','CONFIRMED']}},{endsAt:{lt:now},status:'IN_PROGRESS'}]});
  await visitGroup('UNCONFIRMED_VISITS','Visites à confirmer','HIGH','Une confirmation humaine ou une replanification est encore nécessaire.',{status:{in:['PENDING','PROPOSED','RESCHEDULED']}});
  await visitGroup('CONFIRMED_UNSCHEDULED','Visites confirmées à placer','NORMAL','Ces visites confirmées n’ont pas de créneau et leur contrat est actif.',{status:'CONFIRMED',startsAt:null,contract:{active:true}});
  if(scope.worker){
   const where={status:{in:['FAILED','DEAD_LETTER']}},total=await tx.workerJob.count({where});
   const rows=await tx.workerJob.findMany({where,take:10,orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,date:true,status:true,attempts:true,maxAttempts:true}});
   groups.push({key:'WORKER_FAILURES',label:'Préparations OMEGA en échec',priority:'HIGH',reason:'Une préparation a échoué ou épuisé ses tentatives ; examinez-la avant toute relance.',total,items:rows.map(row=>({id:row.id,label:'Préparation du '+row.date,detail:row.status+' · '+row.attempts+'/'+row.maxAttempts+' tentatives',view:'omega'}))});
  }
  if(scope.communications){
   const where={status:{in:['DRAFT','APPROVED']},dueAt:{lt:now}},total=await tx.communicationFollowUp.count({where});
   const rows=await tx.communicationFollowUp.findMany({where,take:10,orderBy:[{dueAt:'asc'},{id:'asc'}],select:{id:true,sourceKind:true,status:true,dueAt:true}});
   groups.push({key:'COMMUNICATION_FOLLOWUPS',label:'Suivis de communications échus',priority:'HIGH',reason:'L’échéance d’un suivi ouvert est passée. La validité de la source doit être vérifiée avant toute action.',total,items:rows.map(row=>({id:row.id,label:'Suivi '+row.sourceKind,detail:row.status+' · '+stamp(row.dueAt),view:'omega'}))});
  }
  if(scope.finance){
   // Same native balance rule as FinanceService: exclude reversed payments;
   // Stripe test checkouts and Rotor archives never affect this ledger.
   const rows=await tx.$queryRaw<{id:string;number:string|null;customerId:string;name:string;dueDate:string;currency:string;balance:bigint;total:bigint}[]>(Prisma.sql`
    WITH balances AS (
     SELECT i."id", i."number", i."customerId", c."name", i."dueDate", i."currency",
      i."totalCents"::bigint-COALESCE((SELECT SUM(p."amountCents") FROM ${table('Payment')} p
       WHERE p."invoiceId"=i."id" AND NOT EXISTS(SELECT 1 FROM ${table('PaymentReversal')} r WHERE r."paymentId"=p."id")),0) AS balance
     FROM ${table('Invoice')} i JOIN ${table('Customer')} c ON c."id"=i."customerId"
     WHERE i."status"='ISSUED' AND i."dueDate"<${today}
    ) SELECT *, COUNT(*) OVER() AS total FROM balances WHERE balance>0 ORDER BY "dueDate", "id" LIMIT 10
   `);
   groups.push({key:'OVERDUE_INVOICES',label:'Factures natives échues',priority:'HIGH',reason:'La date d’échéance est passée à Toronto et un solde reste dû après paiements non annulés.',total:Number(rows[0]?.total??0),items:rows.map(row=>({id:row.id,label:row.number||row.id,detail:row.name+' · '+row.dueDate+' · '+(Number(row.balance)/100).toLocaleString('fr-CA',{style:'currency',currency:row.currency}),view:'invoices',customerId:row.customerId}))});
  }
  const rank={URGENT:0,HIGH:1,NORMAL:2};groups.sort((a,b)=>rank[a.priority]-rank[b.priority]);
  return {generatedAt:now.toISOString(),mode:'READ_ONLY' as const,source:'POSTGRESQL' as const,externalEffects:false,scope,groups};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

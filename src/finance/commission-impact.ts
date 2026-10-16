import {effectivePaymentCents} from './payment-balance';
import type {PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {DomainError,dayBounds} from '../domain/rules';
import {requirePermission,type AccessActor} from '../lib/access';
import {annualCommission,COMMISSION_POLICY_VERSION} from './commissions';
/** Read-only comparison, never an instruction to alter a historic commission or payout. */
export async function commissionImpact(db:PrismaClient,input:unknown,actor:AccessActor,schema='public'){
 requirePermission(actor,'finance');requirePermission(actor,'leads.all');requirePermission(actor,'sales.write');
 const {year}=z.object({year:z.coerce.number().int().min(2000).max(2100)}).strict().parse(input);
 const start=dayBounds(`${year}-01-01`).start,end=dayBounds(`${year+1}-01-01`).start;
 return db.$transaction(async tx=>{
 const agreements=await tx.serviceAgreement.findMany({where:{status:'SIGNED',signedAt:{gte:start,lt:end}},include:{contract:{include:{visits:{where:{status:'COMPLETED',startsAt:{gte:start,lt:end}}},invoices:{where:{paymentMode:'LIVE'},include:{payments:{where:{createdAt:{gte:start,lt:end}},include:{reversal:true,stripeRefunds:true}}}}}}},take:1001});
 if(agreements.length>1000)throw new DomainError('REPORT_TOO_LARGE','Exporter cette période par lots avant toute migration.',413);
 const sellers=new Map<string,{signedCents:number;servedAndCollectedHypothesisCents:number;contracts:number}>();
 for(const agreement of agreements){if(!agreement.salesOwnerId)continue;const c=agreement.contract;
  const served=c.visits.reduce((n,v)=>n+v.priceCents,0);
  const collected=c.invoices.filter(i=>i.status!=='VOID').reduce((n,i)=>{const paid=i.payments.filter(p=>!p.reversal).reduce((a,p)=>a+BigInt(effectivePaymentCents(p)),0n);return n+(i.totalCents?Number((paid*BigInt(i.subtotalCents))/BigInt(i.totalCents)):0)},0);
  const row=sellers.get(agreement.salesOwnerId)||{signedCents:0,servedAndCollectedHypothesisCents:0,contracts:0};row.signedCents+=agreement.subtotalCents;row.servedAndCollectedHypothesisCents+=Math.min(served,collected);row.contracts++;sellers.set(agreement.salesOwnerId,row);
 }
 const rows=[...sellers].map(([sellerId,row])=>{const signed=annualCommission(row.signedCents),comparison=annualCommission(row.servedAndCollectedHypothesisCents);return {sellerId,...row,signedCommissionCents:signed.commissionCents,comparisonCommissionCents:comparison.commissionCents,differenceCents:signed.commissionCents-comparison.commissionCents}});
 return {year,policyVersion:COMMISSION_POLICY_VERSION,registeredPolicy:await tx.commissionPolicy.findUnique({where:{id:COMMISSION_POLICY_VERSION}}),rows,excludedLegacyContracts:await tx.contract.count({where:{agreement:null}}),inactiveSignedContracts:agreements.filter(a=>!a.contract.active).length,signedContractsWithoutSeller:agreements.filter(a=>!a.salesOwnerId).length,historicalObligationsModified:false,payoutsCreated:false,limitations:['La comparaison servi/encaissé est une hypothèse documentée, pas une reconstitution des commissions historiques.','Seuls les accords natifs signés dans la période et les paiements/visites datés dans la période sont comparés.','Les contrats sans accord natif et les commissions externes nécessitent un rapprochement humain.','Un contrat désactivé n’est pas automatiquement une vente annulée : rapprocher les accords signés inactifs avant toute correction.',
'Aucune dette, commission historique ou écriture de paiement n’est réécrite.']};
 },{isolationLevel:'RepeatableRead'});
}

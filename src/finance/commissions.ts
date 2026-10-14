import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {dayBounds,DomainError} from '../domain/rules';
import {requirePermission,type AccessActor} from '../lib/access';
const tiers=[{threshold:0,rate:20},{threshold:10000000,rate:25},{threshold:20000000,rate:30},{threshold:30000000,rate:35},{threshold:40000000,rate:40}];
export function annualCommission(baseCents:number){
 if(!Number.isSafeInteger(baseCents)||baseCents<0)throw new DomainError('INVALID_COMMISSION_BASE','Assiette en centimes positifs entiers requise.');
 const tier=tiers.findLast(t=>baseCents>=t.threshold)!,next=tiers.find(t=>t.threshold>baseCents);
 return {baseCents,ratePercent:tier.rate,commissionCents:Number((BigInt(baseCents)*BigInt(tier.rate)+50n)/100n),nextThresholdCents:next?.threshold??null,remainingToNextCents:next?next.threshold-baseCents:0};
}
function exact(value:bigint|number){const result=Number(value);if(!Number.isSafeInteger(result)||result<0)throw new DomainError('AMOUNT_OVERFLOW','Le classement dépasse les montants représentables.',422);return result;}
export async function annualLeaderboard(db:PrismaClient,input:unknown,actor:AccessActor,schema='public'){
 requirePermission(actor,'sales.write');
 const {year,page}=z.object({year:z.coerce.number().int().min(2000).max(2100),page:z.coerce.number().int().min(1).max(4000).default(1)}).strict().parse(input);
 if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))throw new DomainError('INVALID_SCHEMA','Configuration de stockage invalide.',500);
 const start=dayBounds(year+'-01-01').start,end=dayBounds((year+1)+'-01-01').start,global=actor.permissions.includes('leads.all')&&actor.permissions.includes('finance');
 const table=(name:string)=>Prisma.raw(`"${schema}"."${name}"`),scope=global?Prisma.sql`TRUE`:Prisma.sql`a."salesOwnerId"=${actor.id}`;
 const eligible=Prisma.sql`SELECT a."salesOwnerId" AS id,SUM(a."subtotalCents"::bigint)::bigint AS base,COUNT(*)::bigint AS contracts
  FROM ${table('ServiceAgreement')} a WHERE a."status"='SIGNED' AND a."signedAt">=${start} AND a."signedAt"<${end} AND a."salesOwnerId" IS NOT NULL AND ${scope} GROUP BY a."salesOwnerId"`;
 return db.$transaction(async tx=>{
  const [totals]=await tx.$queryRaw<{sellers:bigint;base:bigint;contracts:bigint}[]>(Prisma.sql`WITH eligible AS (${eligible}) SELECT COUNT(*)::bigint AS sellers,COALESCE(SUM(base),0)::bigint AS base,COALESCE(SUM(contracts),0)::bigint AS contracts FROM eligible`);
  const rows=await tx.$queryRaw<{id:string;name:string;active:boolean;base:bigint;contracts:bigint;rank:bigint}[]>(Prisma.sql`WITH eligible AS (${eligible}) SELECT e.*,u."name",u."active",RANK() OVER(ORDER BY e.base DESC)::bigint AS rank FROM eligible e JOIN ${table('AppUser')} u ON u."id"=e.id ORDER BY e.base DESC,e.id LIMIT 25 OFFSET ${(page-1)*25}`);
  const unassigned=global?await tx.serviceAgreement.count({where:{status:'SIGNED',signedAt:{gte:start,lt:end},salesOwnerId:null}}):null;
  return {year,page,pageSize:25,total:exact(totals.sellers),mode:global?'GLOBAL':'PERSONAL',timezone:'America/Toronto',currency:'CAD',policy:{basis:'SIGNED_SALES_EXCLUDING_TAX',application:'RETROACTIVE_ANNUAL_PER_SELLER',start:start.toISOString(),endExclusive:end.toISOString(),rounding:'HALF_UP_TO_CENT',tiers},summary:{baseCents:exact(totals.base),signedContracts:exact(totals.contracts),unassignedSignedContracts:unassigned},rows:rows.map(row=>({id:row.id,name:row.name,active:row.active,rank:exact(row.rank),signedContracts:exact(row.contracts),...annualCommission(exact(row.base))})),externalEffects:false,payoutsCreated:false};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

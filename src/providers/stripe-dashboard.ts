import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {requirePermission,type AccessActor} from '../lib/access';

export const stripeCheckoutStatuses=['PREPARING','OPEN','PENDING','PAID_TEST','EXPIRED','FAILED'] as const;
const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
 const date=new Date(value+'T00:00:00.000Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
},'Date invalide.');
const filters=z.object({status:z.enum(['ALL',...stripeCheckoutStatuses]).default('ALL'),customerId:z.string().min(1).max(100).optional(),from:calendarDate.optional(),to:calendarDate.optional(),page:z.coerce.number().int().min(1).max(100000).default(1)}).strict().refine(value=>!value.from||!value.to||value.from<=value.to,'La fin doit suivre le début.');

/** Local signed-webhook history only. Never contacts Stripe or changes the ledger. */
export async function stripeDashboard(db:PrismaClient,input:unknown,actor:AccessActor){
 requirePermission(actor,'finance');
 const query=filters.parse(input),pageSize=25;
 const createdAt:Prisma.DateTimeFilter={};
 if(query.from)createdAt.gte=new Date(query.from+'T00:00:00.000Z');
 if(query.to)createdAt.lt=new Date(new Date(query.to+'T00:00:00.000Z').getTime()+86400000);
 const where:Prisma.StripeCheckoutWhereInput={...(query.status==='ALL'?{}:{status:query.status}),...(query.customerId?{invoice:{customerId:query.customerId}}:{}),...(query.from||query.to?{createdAt}:{})};
 return db.$transaction(async tx=>{
  const total=await tx.stripeCheckout.count({where});
  const items=await tx.stripeCheckout.findMany({where,take:pageSize,skip:(query.page-1)*pageSize,orderBy:[{createdAt:'desc'},{id:'desc'}],select:{id:true,invoiceId:true,amountCents:true,currency:true,status:true,createdAt:true,invoice:{select:{number:true,customer:{select:{id:true,name:true}}}}}});
  const groups=await tx.stripeCheckout.groupBy({by:['currency','status'],where,_count:{_all:true},_sum:{amountCents:true},orderBy:[{currency:'asc'},{status:'asc'}]});
  const lastWebhook=await tx.providerEvent.findFirst({where:{provider:'STRIPE'},orderBy:[{createdAt:'desc'},{id:'desc'}],select:{kind:true,createdAt:true}});
  return {mode:'TEST_ONLY' as const,source:'LOCAL_CHECKOUTS' as const,externalEffects:false,ledgerEffects:false,filters:query,pageSize,total,hasMore:query.page*pageSize<total,items,totals:groups.map(group=>({currency:group.currency,status:group.status,count:group._count._all,amountCents:group._sum.amountCents??0})),lastWebhook,dateBasis:'UTC_CHECKOUT_CREATED_AT' as const};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}

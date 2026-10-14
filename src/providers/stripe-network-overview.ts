import Stripe from 'stripe';
import {z} from 'zod';
import {DomainError} from '../domain/rules';
import {requirePermission,type AccessActor} from '../lib/access';

const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v},'Date invalide.');
const querySchema=z.object({from:date.optional(),to:date.optional(),startingAfter:z.string().regex(/^ch_[a-zA-Z0-9]{1,100}$/).optional()}).strict().refine(v=>!v.from||!v.to||v.from<=v.to,'La fin doit suivre le début.');
const integer=z.number().int().safe();
const currency=z.string().regex(/^[a-z]{3}$/);
const money=z.object({amount:integer,currency});
const charge=z.object({id:z.string().regex(/^ch_[a-zA-Z0-9]{1,100}$/),livemode:z.literal(false),amount:integer.nonnegative(),amount_refunded:integer.nonnegative(),currency,created:integer.nonnegative(),paid:z.boolean(),refunded:z.boolean(),status:z.enum(['succeeded','pending','failed']),payment_method_details:z.object({type:z.string().max(40),card:z.object({brand:z.string().max(40),last4:z.string().regex(/^\d{4}$/)}).optional()}).nullable().optional()}).refine(v=>v.amount_refunded<=v.amount,'Remboursement invalide.');
const response=z.object({balance:z.object({livemode:z.literal(false),available:z.array(money).max(100),pending:z.array(money).max(100)}),charges:z.object({has_more:z.boolean(),data:z.array(charge).max(25)})});
export type StripeOverviewReader=(params:Stripe.ChargeListParams)=>Promise<{balance:unknown;charges:unknown}>;
const read:StripeOverviewReader=async params=>{
 const client=new Stripe(process.env.STRIPE_SECRET_KEY!,{timeout:10000,maxNetworkRetries:0});
 const [balance,charges]=await Promise.all([client.balance.retrieve(),client.charges.list(params)]);
 return {balance,charges};
};

/** Explicit manual, test-mode provider read. Never records or settles native payments. */
export async function inspectStripeTest(input:unknown,actor:AccessActor,reader:StripeOverviewReader=read){
 for(const permission of ['finance','integrations','crm.read'] as const)requirePermission(actor,permission);
 const query=querySchema.parse(input);
 if(!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))throw new DomainError('TEST_KEY_REQUIRED','Configurez une clé Stripe de test. Les opérations réelles sont désactivées.',409);
 const created:{gte?:number;lt?:number}={};
 if(query.from)created.gte=Math.floor(new Date(query.from+'T00:00:00Z').getTime()/1000);
 if(query.to)created.lt=Math.floor(new Date(query.to+'T00:00:00Z').getTime()/1000)+86400;
 try{
  const raw=await reader({limit:25,...(query.from||query.to?{created}:{}),...(query.startingAfter?{starting_after:query.startingAfter}:{})});
  const parsed=response.safeParse(raw);
  if(!parsed.success)throw new DomainError('STRIPE_RESPONSE_INVALID','Réponse Stripe incompatible avec la consultation en mode test.',502);
  const {balance,charges}=parsed.data;
  if(charges.has_more&&!charges.data.length)throw new DomainError('STRIPE_RESPONSE_INVALID','Pagination Stripe incomplète.',502);
  return {mode:'TEST_ONLY' as const,source:'STRIPE_API' as const,externalEffects:false,ledgerEffects:false,checkedAt:new Date().toISOString(),dateBasis:'UTC_CHARGE_CREATED_AT' as const,filters:query,pageSize:25,hasMore:charges.has_more,nextCursor:charges.has_more?charges.data.at(-1)!.id:null,balance:{available:balance.available.map(v=>({currency:v.currency,amountCents:v.amount})),pending:balance.pending.map(v=>({currency:v.currency,amountCents:v.amount}))},items:charges.data.map(v=>({id:v.id,amountCents:v.amount,refundedCents:v.amount_refunded,currency:v.currency,createdAt:new Date(v.created*1000).toISOString(),paid:v.paid,refunded:v.refunded,status:v.status,method:v.payment_method_details?.type??null,brand:v.payment_method_details?.card?.brand??null,last4:v.payment_method_details?.card?.last4??null}))};
 }catch(error){
  if(error instanceof DomainError)throw error;
  throw new DomainError('STRIPE_READ_UNAVAILABLE','Consultation Stripe indisponible. Aucun paiement ni remboursement effectué.',503);
 }
}

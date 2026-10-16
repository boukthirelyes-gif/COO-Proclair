import Stripe from 'stripe';
import {createHash} from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {DomainError} from '../domain/rules';
import type {AccessActor} from '../lib/access';
import {paymentsTotal} from '../finance/payment-balance';
import {publicOrigin} from './config';
import {stripeAdmin,stripeModeSchema,stripeModeClient,assertStripeOperation,stripeEnterpriseConfiguration,type StripeMode} from './stripe-modes';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const key=z.string().min(8).max(100),id=z.string().min(1).max(100),amount=z.number().int().positive().max(2147483647);
const paymentInclude={reversal:true,stripeRefunds:true} as const;
const ref=(value:any)=>typeof value==='string'?value:value?.id;
function matching(condition:unknown,code='PAYMENT_MISMATCH'):asserts condition {if(!condition)throw new DomainError(code,'Événement non rapproché : identité, mode, devise, montant ou état incompatibles.',409)}
export class StripeEnterprise {
 constructor(public db:PrismaClient,private client:(mode:StripeMode)=>Stripe=stripeModeClient,private schema='public'){if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))throw new DomainError('INVALID_SCHEMA','Configuration du stockage invalide.',500)}
 private async transaction<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{for(let attempt=0;;attempt++){try{return await this.db.$transaction(fn,{isolationLevel:'Serializable',timeout:20000})}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&['P2034','P2002'].includes(e.code)&&attempt<3)continue;throw e}}}
 async checkout(input:unknown,actor:AccessActor){
  stripeAdmin(actor);const v=z.object({mode:stripeModeSchema,invoiceId:id,amountCents:amount,idempotencyKey:key,approved:z.literal(true)}).strict().parse(input);
  assertStripeOperation(v.mode);const origin=publicOrigin();
  const row=await this.transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928366)`;
   const prior=await tx.stripeCheckout.findUnique({where:{idempotencyKey:'enterprise:'+v.mode+':'+v.idempotencyKey}});
   if(prior){matching(prior.enterprise&&prior.mode===v.mode&&prior.invoiceId===v.invoiceId&&prior.amountCents===v.amountCents,'IDEMPOTENCY_CONFLICT');if(!prior.sessionId&&Date.now()-prior.createdAt.getTime()>23*3600000)throw new DomainError('CHECKOUT_REVIEW_REQUIRED','Préparation ancienne : rapprocher Stripe avant toute nouvelle tentative.',409);return prior}
   const invoice=await tx.invoice.findUnique({where:{id:v.invoiceId},include:{payments:{include:paymentInclude}}});
   matching(invoice&&invoice.status==='ISSUED'&&invoice.currency==='CAD'&&invoice.paymentMode===v.mode,'INVOICE_MODE_MISMATCH');
   matching(v.amountCents<=invoice.totalCents-paymentsTotal(invoice.payments),'OVERPAYMENT');
   if(await tx.stripeCheckout.findFirst({where:{invoiceId:invoice.id,enterprise:true,active:true}}))throw new DomainError('PAYMENT_IN_FLIGHT','Un lien Stripe réserve déjà cette facture. Réutilisez-le ou expirez-le.',409);
   const created=await tx.stripeCheckout.create({data:{invoiceId:invoice.id,amountCents:v.amountCents,currency:'CAD',mode:v.mode,enterprise:true,active:true,idempotencyKey:'enterprise:'+v.mode+':'+v.idempotencyKey}});
   await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.role,action:'STRIPE_CHECKOUT_APPROVED',entityType:'StripeCheckout',entityId:created.id,after:{mode:v.mode,amountCents:v.amountCents,invoiceId:invoice.id}}});return created;
  });
  if(row.sessionId)return row;
  try{
   const metadata={proclairEnterprise:'1',proclairCheckoutId:row.id,invoiceId:row.invoiceId,mode:row.mode};
   const session=await this.client(v.mode).checkout.sessions.create({mode:'payment',allowed_payment_method_types:['card'],line_items:[{price_data:{currency:'cad',unit_amount:row.amountCents,product_data:{name:v.mode==='TEST'?'PROCLAIR — TEST':'PROCLAIR — facture'}},quantity:1}],client_reference_id:row.id,metadata,payment_intent_data:{metadata},success_url:origin+'/?view=stripe',cancel_url:origin+'/?view=stripe',expires_at:Math.floor(row.createdAt.getTime()/1000)+1800},{idempotencyKey:'proclair-enterprise:'+v.mode+':'+row.id});
   matching(session.id&&session.url&&session.livemode===(v.mode==='LIVE'),'MODE_MISMATCH');
   return await this.transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928366)`;const current=await tx.stripeCheckout.findUniqueOrThrow({where:{id:row.id}});if(current.sessionId){matching(current.sessionId===session.id);return current}return tx.stripeCheckout.update({where:{id:row.id},data:{sessionId:session.id,url:session.url,status:'OPEN'}})});
  }catch(error){if(error instanceof DomainError)throw error;throw new DomainError('CHECKOUT_UNAVAILABLE','Stripe indisponible. La réservation est conservée ; réessayez avec la même clé.',503)}
 }
 async expire(input:unknown,actor:AccessActor){
  stripeAdmin(actor);const v=z.object({mode:stripeModeSchema,checkoutId:id,approved:z.literal(true)}).strict().parse(input);assertStripeOperation(v.mode);
  const row=await this.db.stripeCheckout.findFirst({where:{id:v.checkoutId,mode:v.mode,enterprise:true}});if(!row?.sessionId)throw new DomainError('NOT_FOUND','Lien Stripe introuvable.',404);
  if(!row.active)return {expired:row.status==='EXPIRED',status:row.status};
  try{await this.client(v.mode).checkout.sessions.expire(row.sessionId)}catch{throw new DomainError('EXPIRATION_UNAVAILABLE','Expiration non confirmée par Stripe. La réservation est conservée.',503)}
  // A signed expiry webhook or explicit reconciliation is authoritative; no browser-only release.
  return {requested:true,status:'WAITING_FOR_RECONCILIATION'};
 }
 async reconcile(input:unknown,actor:AccessActor){
  stripeAdmin(actor);const v=z.object({mode:stripeModeSchema,checkoutId:id,approved:z.literal(true)}).strict().parse(input);
  const row=await this.db.stripeCheckout.findFirst({where:{id:v.checkoutId,mode:v.mode,enterprise:true}});if(!row?.sessionId)throw new DomainError('NOT_FOUND','Lien Stripe introuvable.',404);
  try{const session=await this.client(v.mode).checkout.sessions.retrieve(row.sessionId);return await this.applyCanonical(v.mode,row.id,session)}catch(error){if(error instanceof DomainError)throw error;throw new DomainError('STRIPE_UNAVAILABLE','Rapprochement Stripe indisponible. Aucun succès déduit.',503)}
 }
 private async applyCanonical(mode:StripeMode,checkoutId:string,session:Stripe.Checkout.Session,expectedIntent?:string){
  const row=await this.db.stripeCheckout.findFirst({where:{id:checkoutId,mode,enterprise:true}});matching(row,'TRANSACTION_NOT_FOUND');
  matching(session.id===row.sessionId&&session.livemode===(mode==='LIVE')&&session.client_reference_id===row.id&&session.metadata?.proclairCheckoutId===row.id&&session.metadata?.invoiceId===row.invoiceId&&session.metadata?.mode===mode&&session.currency==='cad'&&session.amount_total===row.amountCents);
  const piId=ref(session.payment_intent);if(expectedIntent)matching(piId===expectedIntent);
  let intent:Stripe.PaymentIntent|null=null;
  if(piId)intent=await this.client(mode).paymentIntents.retrieve(piId);
  if(intent)matching(intent.id===piId&&intent.livemode===(mode==='LIVE')&&intent.currency==='cad'&&intent.amount===row.amountCents&&intent.metadata?.proclairCheckoutId===row.id&&intent.metadata?.invoiceId===row.invoiceId&&intent.metadata?.mode===mode);
  const paid=!!intent&&intent.status==='succeeded'&&session.payment_status==='paid';
  if(paid)matching(intent!.amount_received===row.amountCents);
  return this.transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928366)`;
   const current=await tx.stripeCheckout.findUniqueOrThrow({where:{id:row.id},include:{payment:true}});
   if(current.payment)return {status:current.status,paymentId:current.payment.id,replayed:true};
   if(paid){
    const invoice=await tx.invoice.findUniqueOrThrow({where:{id:row.invoiceId},include:{payments:{include:paymentInclude}}});
    matching(invoice.status==='ISSUED'&&invoice.currency==='CAD'&&invoice.paymentMode===mode,'INVOICE_MODE_MISMATCH');
    matching(row.amountCents<=invoice.totalCents-paymentsTotal(invoice.payments),'OVERPAYMENT_REVIEW_REQUIRED');
    if(current.paymentIntentId)matching(current.paymentIntentId===piId);
    const payment=await tx.payment.create({data:{invoiceId:invoice.id,stripeCheckoutId:row.id,mode,amountCents:row.amountCents,method:'STRIPE',reference:piId,idempotencyKey:'stripe-ledger:'+mode+':'+row.id,payloadHash:hash({mode,checkoutId:row.id,paymentIntentId:piId,amountCents:row.amountCents})}});
    await tx.invoice.update({where:{id:invoice.id},data:{version:{increment:1}}});
    await tx.stripeCheckout.update({where:{id:row.id},data:{status:mode==='TEST'?'PAID_TEST':'PAID',active:false,paymentIntentId:piId}});
    await tx.auditEvent.create({data:{actorId:'stripe:'+mode,actorRole:'PROVIDER',action:'STRIPE_PAYMENT_RECONCILED',entityType:'Invoice',entityId:invoice.id,after:{mode,paymentId:payment.id,checkoutId:row.id,amountCents:row.amountCents}}});return {status:'RECONCILED',paymentId:payment.id,replayed:false};
   }
   const expired=session.status==='expired',failed=!!intent&&['requires_payment_method','canceled'].includes(intent.status);
   const status=expired?'EXPIRED':failed?'FAILED':'PENDING';
   await tx.stripeCheckout.update({where:{id:row.id},data:{status,active:!expired,...(piId?{paymentIntentId:piId}:{})}});return {status,paymentId:null,replayed:false};
  });
 }
 async requestRefund(input:unknown,actor:AccessActor){
  stripeAdmin(actor);const v=z.object({mode:stripeModeSchema,paymentId:id,amountCents:amount,reason:z.string().trim().min(5).max(500),idempotencyKey:key,approved:z.literal(true)}).strict().parse(input);assertStripeOperation(v.mode);
  const row=await this.transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928366)`;
   const prior=await tx.stripeRefund.findUnique({where:{idempotencyKey:'refund:'+v.mode+':'+v.idempotencyKey}});
   if(prior){if(!prior.providerRefundId&&Date.now()-prior.createdAt.getTime()>23*3600000)throw new DomainError('REFUND_REVIEW_REQUIRED','Demande ancienne : rapprocher Stripe avant toute nouvelle tentative.',409);matching(prior.mode===v.mode&&prior.paymentId===v.paymentId&&prior.amountCents===v.amountCents&&prior.reason===v.reason,'IDEMPOTENCY_CONFLICT');return prior}
   const payment=await tx.payment.findFirst({where:{id:v.paymentId,mode:v.mode,method:'STRIPE'},include:{stripeCheckout:true,stripeRefunds:true,reversal:true}});
   matching(payment?.stripeCheckout?.enterprise&&!payment.reversal,'TRANSACTION_NOT_FOUND');
   const reserved=payment.stripeRefunds.filter(r=>!['FAILED','CANCELED'].includes(r.status)).reduce((n,r)=>n+r.amountCents,0);matching(v.amountCents<=payment.amountCents-reserved,'REFUND_EXCEEDS_PAYMENT');
   const created=await tx.stripeRefund.create({data:{paymentId:payment.id,mode:v.mode,amountCents:v.amountCents,reason:v.reason,idempotencyKey:'refund:'+v.mode+':'+v.idempotencyKey}});
   await tx.auditEvent.create({data:{actorId:actor.id,actorRole:actor.role,action:'STRIPE_REFUND_APPROVED',entityType:'StripeRefund',entityId:created.id,after:{mode:v.mode,paymentId:payment.id,amountCents:v.amountCents,reason:v.reason}}});return created;
  });
  if(row.providerRefundId)return row;
  const payment=await this.db.payment.findUniqueOrThrow({where:{id:row.paymentId}});
  try{const refund=await this.client(v.mode).refunds.create({payment_intent:payment.reference!,amount:row.amountCents,metadata:{proclairRefundId:row.id,mode:v.mode}},{idempotencyKey:'proclair-refund:'+v.mode+':'+row.id});matching(refund.id&&ref(refund.payment_intent)===payment.reference&&refund.amount===row.amountCents);
   // Creation only reserves funds. Signed webhook/canonical refresh confirms the ledger effect.
   return await this.transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928366)`;const current=await tx.stripeRefund.findUniqueOrThrow({where:{id:row.id}});if(current.providerRefundId){matching(current.providerRefundId===refund.id);return current}return tx.stripeRefund.update({where:{id:row.id},data:{providerRefundId:refund.id,status:'PENDING'}})});
  }catch(error){if(error instanceof DomainError)throw error;throw new DomainError('REFUND_UNAVAILABLE','Remboursement non confirmé. Réutilisez la même clé ; la réservation est conservée.',503)}
 }
 private async applyRefund(mode:StripeMode,providerRefundId:string){
  const refund=await this.client(mode).refunds.retrieve(providerRefundId),piId=ref(refund.payment_intent);
  matching(refund.id===providerRefundId&&refund.currency==='cad'&&Number.isSafeInteger(refund.amount)&&refund.amount>0);
  // Refund objects do not expose livemode in every API version; their owning PaymentIntent does.
  const intent=await this.client(mode).paymentIntents.retrieve(piId);matching(intent.id===piId&&intent.livemode===(mode==='LIVE')&&intent.currency==='cad');
  const payment=await this.db.payment.findFirst({where:{mode,method:'STRIPE',reference:piId},include:{stripeCheckout:true}});if(!payment?.stripeCheckout?.enterprise)throw new DomainError('TRANSACTION_NOT_FOUND','Paiement Stripe non encore rapproché : réessayer après confirmation.',503);
  return this.transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928366)`;
   const byProvider=await tx.stripeRefund.findUnique({where:{mode_providerRefundId:{mode,providerRefundId}}});
   const byRequest=refund.metadata?.proclairRefundId?await tx.stripeRefund.findUnique({where:{id:refund.metadata.proclairRefundId}}):null;
   if(byProvider&&byRequest)matching(byProvider.id===byRequest.id);
   const prior=byProvider||byRequest;if(prior)matching(prior.mode===mode&&prior.paymentId===payment.id&&prior.amountCents===refund.amount&&(!prior.providerRefundId||prior.providerRefundId===providerRefundId));
   if(prior?.status==='SUCCEEDED')return {status:'SUCCEEDED',replayed:true};
   const status=refund.status==='succeeded'?'SUCCEEDED':refund.status==='failed'?'FAILED':refund.status==='canceled'?'CANCELED':'PENDING';
   if(status==='SUCCEEDED'){const total=await tx.stripeRefund.aggregate({where:{paymentId:payment.id,status:'SUCCEEDED',...(prior?{id:{not:prior.id}}:{})},_sum:{amountCents:true}});matching((total._sum.amountCents||0)+refund.amount<=payment.amountCents,'REFUND_EXCEEDS_PAYMENT')}
   const data={mode,paymentId:payment.id,providerRefundId,amountCents:refund.amount,status};
   const row=prior?await tx.stripeRefund.update({where:{id:prior.id},data}):await tx.stripeRefund.create({data:{...data,reason:'Remboursement confirmé depuis Stripe',idempotencyKey:'stripe-refund:'+mode+':'+providerRefundId}});
   if(status==='SUCCEEDED'){await tx.invoice.update({where:{id:payment.invoiceId},data:{version:{increment:1}}});await tx.auditEvent.create({data:{actorId:'stripe:'+mode,actorRole:'PROVIDER',action:'STRIPE_REFUND_RECONCILED',entityType:'Invoice',entityId:payment.invoiceId,after:{mode,refundId:row.id,paymentId:payment.id,amountCents:refund.amount}}})}
   return {status,refundId:row.id,replayed:false};
  });
 }
 async refreshRefund(input:unknown,actor:AccessActor){stripeAdmin(actor);const v=z.object({mode:stripeModeSchema,refundId:id,approved:z.literal(true)}).strict().parse(input);const row=await this.db.stripeRefund.findFirst({where:{id:v.refundId,mode:v.mode}});if(!row?.providerRefundId)throw new DomainError('NOT_FOUND','Remboursement sans identifiant Stripe : réessayez la demande avec la même clé.',404);try{return await this.applyRefund(v.mode,row.providerRefundId)}catch(e){if(e instanceof DomainError)throw e;throw new DomainError('STRIPE_UNAVAILABLE','Actualisation Stripe indisponible.',503)}}
 async event(event:Stripe.Event,mode:StripeMode){
  matching(event.livemode===(mode==='LIVE'),'MODE_MISMATCH');matching(/^evt_[a-zA-Z0-9_]+$/.test(event.id),'INVALID_EVENT');
  const object=event.data.object as any,receiptId=mode+':'+event.id,payloadHash=hash(event);
  const snapshot={objectId:typeof object.id==='string'?object.id:null,currency:typeof object.currency==='string'?object.currency:null,amount:typeof object.amount==='number'?object.amount:null,paymentStatus:typeof object.payment_status==='string'?object.payment_status:null,status:typeof object.status==='string'?object.status:null,amountTotal:typeof object.amount_total==='number'?object.amount_total:null,invoiceId:typeof object.metadata?.invoiceId==='string'?object.metadata.invoiceId:null,created:event.created};
  await this.transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928366)`;const prior=await tx.stripeEventReceipt.findUnique({where:{id:receiptId}});if(prior){matching(prior.payloadHash===payloadHash,'EVENT_ID_COLLISION');return}await tx.stripeEventReceipt.create({data:{id:receiptId,mode,stripeEventId:event.id,kind:event.type,payloadHash,snapshot}})});
  const processedId='stripe-enterprise:'+receiptId;
  if(await this.db.providerEvent.findUnique({where:{id:processedId}}))return {duplicate:true};
  try{
   let result:unknown={ignored:true};
   if(event.type.startsWith('checkout.session.')||event.type.startsWith('payment_intent.')){
    const checkoutId=object.metadata?.proclairCheckoutId;
    const row=checkoutId?await this.db.stripeCheckout.findFirst({where:{id:checkoutId,mode,enterprise:true}}):null;
    if(!row?.sessionId)throw new DomainError('TRANSACTION_NOT_FOUND','Transaction Stripe absente ou préparation en cours.',503);
    if(event.type.startsWith('checkout.session.'))matching(object.id===row.sessionId&&object.client_reference_id===row.id&&object.metadata?.invoiceId===row.invoiceId&&object.currency==='cad'&&object.amount_total===row.amountCents);
    else matching(object.metadata?.invoiceId===row.invoiceId&&object.currency==='cad'&&object.amount===row.amountCents);
    const session=await this.client(mode).checkout.sessions.retrieve(row.sessionId);
    result=await this.applyCanonical(mode,row.id,session,event.type.startsWith('payment_intent.')?object.id:undefined);
   }else if(event.type.startsWith('refund.'))result=await this.applyRefund(mode,object.id);
   else if(event.type==='charge.refunded'){const refunds=await this.client(mode).refunds.list({payment_intent:ref(object.payment_intent),limit:100});if(refunds.has_more)throw new DomainError('REFUND_REVIEW_REQUIRED','Plus de 100 remboursements : rapprochement paginé requis.',503);result=await Promise.all(refunds.data.map(refund=>this.applyRefund(mode,refund.id)))}
   await this.transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928366)`;if(!await tx.providerEvent.findUnique({where:{id:processedId}})){await tx.providerEvent.create({data:{id:processedId,provider:'STRIPE_ENTERPRISE_'+mode,kind:event.type}});await tx.stripeEventDecision.create({data:{receiptId,outcome:'PROCESSED'}})}});
   return {received:true,result};
  }catch(error){const code=error instanceof DomainError?error.code:'STRIPE_UNAVAILABLE';await this.db.stripeEventDecision.create({data:{receiptId,outcome:'RETRY_OR_REVIEW',code}});if(error instanceof DomainError)throw error;throw new DomainError('STRIPE_UNAVAILABLE','Stripe indisponible : événement conservé, rapprochement à réessayer.',503)}
 }
 async dashboard(input:unknown,actor:AccessActor){
  stripeAdmin(actor);const v=z.object({mode:stripeModeSchema,page:z.coerce.number().int().min(1).max(100000).default(1),customerId:id.optional()}).strict().parse(input),skip=(v.page-1)*25;
  return this.db.$transaction(async tx=>{
   const where={enterprise:true,mode:v.mode,...(v.customerId?{invoice:{customerId:v.customerId}}:{})};
   const invoiceWhere={paymentMode:v.mode,currency:'CAD',...(v.customerId?{customerId:v.customerId}:{})};
   const [transactions,total,invoices,invoiceCount,groups,events,received,refunded]=await Promise.all([
    tx.stripeCheckout.findMany({where,skip,take:25,orderBy:[{createdAt:'desc'},{id:'desc'}],include:{invoice:{select:{number:true,customerId:true,customer:{select:{name:true}}}},payment:{include:{stripeRefunds:true}}}}),tx.stripeCheckout.count({where}),
    tx.invoice.findMany({where:invoiceWhere,skip,take:25,orderBy:[{createdAt:'desc'},{id:'desc'}],include:{customer:{select:{name:true}},payments:{include:paymentInclude}}}),tx.invoice.count({where:invoiceWhere}),
    tx.stripeCheckout.groupBy({by:['status'],where,_count:{_all:true},_sum:{amountCents:true}}),
    tx.stripeEventReceipt.findMany({where:{mode:v.mode},take:25,orderBy:{receivedAt:'desc'},include:{decisions:{orderBy:{createdAt:'desc'},take:1}}}),
    tx.payment.aggregate({where:{mode:v.mode,method:'STRIPE',...(v.customerId?{invoice:{customerId:v.customerId}}:{})},_sum:{amountCents:true}}),
    tx.stripeRefund.aggregate({where:{mode:v.mode,status:'SUCCEEDED',...(v.customerId?{payment:{invoice:{customerId:v.customerId}}}:{})},_sum:{amountCents:true}}),
   ]);
   const table=(name:string)=>Prisma.raw(`"${this.schema}"."${name}"`);
   const customerBalances=await tx.$queryRaw<{id:string;name:string;balanceCents:bigint}[]>(Prisma.sql`WITH balances AS (SELECT i."customerId",i."totalCents"::bigint-COALESCE((SELECT SUM(p."amountCents"::bigint-COALESCE((SELECT SUM(r."amountCents"::bigint) FROM ${table('StripeRefund')} r WHERE r."paymentId"=p.id AND r.status='SUCCEEDED'),0)) FROM ${table('Payment')} p WHERE p."invoiceId"=i.id AND NOT EXISTS(SELECT 1 FROM ${table('PaymentReversal')} x WHERE x."paymentId"=p.id)),0) AS due FROM ${table('Invoice')} i WHERE i."paymentMode"=${v.mode} AND i.currency='CAD' AND i.status='ISSUED' AND ${v.customerId?Prisma.sql`i."customerId"=${v.customerId}`:Prisma.sql`TRUE`}) SELECT c.id,c.name,SUM(b.due)::bigint AS "balanceCents" FROM balances b JOIN ${table('Customer')} c ON c.id=b."customerId" GROUP BY c.id,c.name ORDER BY c.id LIMIT 25 OFFSET ${skip}`);
   return {mode:v.mode,currency:'CAD',receivedCents:received._sum.amountCents||0,refundedCents:refunded._sum.amountCents||0,netReceivedCents:(received._sum.amountCents||0)-(refunded._sum.amountCents||0),customerBalances:customerBalances.map(c=>({...c,balanceCents:Number(c.balanceCents)})),configuration:stripeEnterpriseConfiguration(),page:v.page,pageSize:25,total,invoiceCount,transactions,totals:groups.map(g=>({status:g.status,count:g._count._all,amountCents:g._sum.amountCents||0})),invoices:invoices.map(({payments,...i})=>({...i,paidCents:paymentsTotal(payments),balanceCents:i.totalCents-paymentsTotal(payments),status:i.status==='ISSUED'?(paymentsTotal(payments)===i.totalCents?'PAID':paymentsTotal(payments)>0?'PARTIAL':'ISSUED'):i.status})),events,source:'CONFIRMED_SERVER_LEDGER',bankBalanceVerified:false};
  },{isolationLevel:'RepeatableRead'});
 }
}

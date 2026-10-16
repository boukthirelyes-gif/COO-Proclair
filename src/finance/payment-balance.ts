type PaymentLike={amountCents:number;reversal?:unknown;stripeRefunds?:{status:string;amountCents:number}[]};
export function effectivePaymentCents(payment:PaymentLike){return payment.reversal?0:payment.amountCents-(payment.stripeRefunds||[]).filter(r=>r.status==='SUCCEEDED').reduce((n,r)=>n+r.amountCents,0)}
export function paymentsTotal(payments:PaymentLike[]){return payments.reduce((n,p)=>n+effectivePaymentCents(p),0)}

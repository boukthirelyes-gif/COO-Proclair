import {DomainError} from '../domain/rules';
export type PriceInput={quantity:number;unitPriceCents:number;discountCents?:number;taxRateBps:number;taxMode?:'CUSTOM'|'QUEBEC'};
export function priceLine(item:PriceInput){
 const discount=item.discountCents??0;
 if(!Number.isSafeInteger(discount)||discount<0)throw new DomainError('INVALID_DISCOUNT','Remise en centimes positifs requise.');
 const net=BigInt(item.quantity)*BigInt(item.unitPriceCents)-BigInt(discount);
 if(net<0n)throw new DomainError('INVALID_DISCOUNT','La remise dépasse le montant de la ligne.');
 const gst=item.taxMode==='QUEBEC'?(net*5n+50n)/100n:0n;
 const qst=item.taxMode==='QUEBEC'?(net*9975n+50000n)/100000n:0n;
 const tax=item.taxMode==='QUEBEC'?gst+qst:(net*BigInt(Math.round(item.taxRateBps*1000))+5000000n)/10000000n;
 return {net,tax,gst,qst};
}

export function dollarsToCents(value:string):number{
 const normalized=value.trim().replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(normalized))throw new Error('Saisissez un montant en dollars avec deux décimales maximum.');const [whole,fraction='']=normalized.split('.'),cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));if(cents>2147483647n)throw new Error('Ce montant dépasse la limite autorisée.');return Number(cents)
}
export function centsToDollars(cents:number){if(!Number.isSafeInteger(cents)||cents<0)throw new Error('Montant invalide.');return `${Math.floor(cents/100)}.${String(cents%100).padStart(2,'0')}`}

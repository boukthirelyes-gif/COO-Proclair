import {torontoDate} from './toronto';
export type FileKind='CUSTOMER'|'INVOICE'|'PAYMENT';
export const fileFields=(kind:FileKind)=>kind==='CUSTOMER'?[['externalId','Identifiant Rotor',true],['name','Nom du client',true],['email','Courriel',false],['phone','Téléphone',false],['address','Adresse',false],['notes','Notes',false]] as const:[['externalId','Identifiant Rotor',true],['customerExternalId','Identifiant client Rotor',false],['invoiceExternalId','Identifiant facture Rotor',false],['amountCents','Montant',true],['currency','Devise',true],['status','État dans Rotor',true],['occurredAt','Date de la source',true],['reference','Référence',false],['method','Méthode',false]] as const;
export const sensitiveColumn=(name:string)=>/password|secret|token|authorization|cookie|card.?number|cvc|cvv|bank.?account|iban|numero.?carte|numéro.?carte/i.test(name);
export function parseExportCsv(text:string,delimiter:string){
 if(![',',';','\t'].includes(delimiter))throw Error('Séparateur invalide.');
 if(text.length>2000000)throw Error('Fichier trop volumineux : 2 Mo maximum.');
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
 function cell(){row.push(field);field='';closed=false}
 function line(){cell();if(row.some(value=>value.trim()))rows.push(row);row=[];if(rows.length>1001)throw Error('Maximum 1 000 lignes par fichier. Fractionnez cet export sans changer ses identifiants.');}
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=c;continue}
  if(c==='"'){if(field||closed)throw Error('Guillemet inattendu dans le CSV.');quoted=true}
  else if(c===delimiter)cell();else if(c==='\r'||c==='\n'){line();if(c==='\r'&&text[i+1]==='\n')i++}
  else {if(closed)throw Error('Caractère inattendu après un champ entre guillemets.');field+=c}
 }
 if(quoted)throw Error('Champ entre guillemets non terminé.');if(field||row.length||closed)line();
 if(rows.length<2)throw Error('Le fichier doit contenir un en-tête et au moins une ligne.');
 const headers=rows.shift()!.map(h=>h.trim());if(headers.some(h=>!h)||new Set(headers).size!==headers.length)throw Error('En-têtes vides ou dupliqués.');
 for(let i=0;i<rows.length;i++)if(rows[i].length!==headers.length)throw Error('Nombre de colonnes incorrect à la ligne '+(i+2)+'.');
 return {headers,rows};
}
function amount(value:string,unit:string){
 const v=value.trim().replace(',','.');if(unit==='CENTS'){if(!/^-?\d+$/.test(v))throw Error('Montant en cents entier requis.');const n=BigInt(v);if(n>2147483647n||n< -2147483647n)throw Error('Montant hors limite.');return Number(n)}
 if(unit!=='DOLLARS'||! /^-?\d+(?:\.\d{1,2})?$/.test(v))throw Error('Montant en dollars avec deux décimales maximum requis.');
 const negative=v.startsWith('-'),[whole,fraction='']=v.replace(/^-/,'').split('.'),n=(BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')))*(negative?-1n:1n);if(n>2147483647n||n< -2147483647n)throw Error('Montant hors limite.');return Number(n);
}
export function mapExportRows(file:ReturnType<typeof parseExportCsv>,kind:FileKind,mapping:Record<string,string>,unit:string){
 const fields=fileFields(kind);for(const [key,label,required] of fields){if(required&&!mapping[key])throw Error('Associez la colonne : '+label);if(mapping[key]&&(!file.headers.includes(mapping[key])||sensitiveColumn(mapping[key])))throw Error('Colonne absente ou sensible : '+label)}
 return file.rows.map((row,i)=>{try{const out:Record<string,any>={};for(const [key] of fields){const column=mapping[key],value=column?row[file.headers.indexOf(column)].trim():'';out[key]=value||null}if(kind!=='CUSTOMER'){out.amountCents=amount(out.amountCents??'',unit);if(/^\d{4}-\d{2}-\d{2}$/.test(out.occurredAt??''))out.occurredAt=torontoDate(out.occurredAt+'T00:00');}else out.notes=out.notes??'';return out}catch(e:any){throw Error('Ligne '+(i+2)+' : '+e.message)}});
}

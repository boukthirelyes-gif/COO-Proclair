import {stripeSecretKey,stripeKeyProblem} from './stripe-credentials';
import Stripe from 'stripe';
import twilio from 'twilio';
import {z} from 'zod';
import {requirePermission,type AccessActor} from '../lib/access';
type Provider='stripe'|'twilio';
type Reading={reference:string;status?:string;senderVerified?:boolean|null};
export type ProviderReader=(provider:Provider)=>Promise<Reading>;
export function verificationReady(provider:Provider){return provider==='stripe'?stripeKeyProblem()===null:!!process.env.TWILIO_AUTH_TOKEN&&/^AC[a-fA-F0-9]{32}$/.test(process.env.TWILIO_ACCOUNT_SID??'')}
const read:ProviderReader=async provider=>{
 if(provider==='stripe'){const client=new Stripe(stripeSecretKey(),{timeout:10000,maxNetworkRetries:0}),account=await client.accounts.retrieve(null);return {reference:account.id}}
 const sid=process.env.TWILIO_ACCOUNT_SID!,client=twilio(sid,process.env.TWILIO_AUTH_TOKEN!,{timeout:10000,autoRetry:false}),account=await client.api.accounts(sid).fetch();
 if(account.sid!==sid)throw Object.assign(Error('Account mismatch'),{status:403});
 const phone=process.env.TWILIO_PHONE_NUMBER;
 const senderVerified=phone&&/^\+[1-9]\d{7,14}$/.test(phone)?(await client.incomingPhoneNumbers.list({phoneNumber:phone,limit:1})).some(n=>n.accountSid===sid&&n.phoneNumber===phone):null;
 return {reference:account.sid,status:account.status,senderVerified};
};
export async function verifyProvider(input:unknown,actor:AccessActor,reader:ProviderReader=read){
 requirePermission(actor,'integrations');const {provider}=z.object({provider:z.enum(['stripe','twilio'])}).strict().parse(input);
 const common={provider,checkedAt:new Date().toISOString(),mode:provider==='stripe'?'TEST_ONLY':'READ_ONLY',webhooksVerified:false,externalEffects:false,accountReference:null as string|null,accountStatus:null as string|null,senderVerified:null as boolean|null};
 if(!verificationReady(provider))return {...common,outcome:'NOT_CONFIGURED',authenticated:false,message:provider==='stripe'?stripeKeyProblem()!:'Ajoutez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN dans Vercel, puis redéployez.'};
 try{
  const value=await reader(provider);if(!value.reference||!(provider==='stripe'?/^acct_[a-zA-Z0-9]+$/:/^AC[a-fA-F0-9]{32}$/).test(value.reference))throw Error('Invalid response');
  return {...common,outcome:'VERIFIED',authenticated:true,accountReference:'…'+value.reference.slice(-4),accountStatus:provider==='twilio'&&['active','suspended','closed'].includes(value.status??'')?value.status??null:null,senderVerified:value.senderVerified??null,message:provider==='stripe'?'Clé Stripe de test reconnue. Aucun paiement créé.':'Identifiants Twilio reconnus. Aucun SMS ni appel exécuté.'};
 }catch(error:any){const rejected=[401,403].includes(Number(error?.statusCode??error?.status));return {...common,outcome:rejected?'REJECTED':'UNAVAILABLE',authenticated:rejected?false:null,message:rejected?'Le fournisseur a refusé les identifiants. Vérifiez les variables Vercel.':'Vérification indisponible. Réessayez plus tard ; aucun résultat d’authentification confirmé.'}}
}

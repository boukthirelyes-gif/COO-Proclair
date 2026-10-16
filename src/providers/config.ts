import {stripeEnterpriseConfiguration} from './stripe-modes';
import {stripeSecretKey,stripeWebhookSecret,stripeKeyProblem} from './stripe-credentials';
import {verificationReady} from './verification';
import {DomainError} from '../domain/rules';
export function publicOrigin(){const raw=process.env.PROCLAIR_PUBLIC_ORIGIN;if(!raw)throw new DomainError('NOT_CONFIGURED','Adresse publique HTTPS absente.',503);const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new DomainError('NOT_CONFIGURED','Adresse publique HTTPS invalide.',503);return u.origin;}
export function providerStatus(){
 let origin:string|null=null;try{origin=publicOrigin()}catch{}
 const twilio=['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_PHONE_NUMBER'].filter(n=>!process.env[n]);
 const stripe=[...(!stripeSecretKey()?['STRIPE_SECRET_KEY']:[]),...(!stripeWebhookSecret()?['STRIPE_WEBHOOK_SECRET']:[])];
 const twilioIssues:string[]=[];const stripeIssues:string[]=[];
 if(process.env.TWILIO_ACCOUNT_SID&&!/^AC[a-fA-F0-9]{32}$/.test(process.env.TWILIO_ACCOUNT_SID))twilioIssues.push('Le SID du compte Twilio doit commencer par AC et contenir 32 caractères hexadécimaux.');
 if(process.env.TWILIO_PHONE_NUMBER&&!/^\+[1-9]\d{7,14}$/.test(process.env.TWILIO_PHONE_NUMBER))twilioIssues.push('Le numéro Twilio doit être au format international E.164.');
 if(stripeSecretKey()&&stripeKeyProblem())stripeIssues.push(stripeKeyProblem()!);
 if(stripeWebhookSecret()&&!stripeWebhookSecret().startsWith('whsec_'))stripeIssues.push('STRIPE_WEBHOOK_SECRET doit contenir le secret de signature whsec_ du webhook, pas une clé API.');
 const twilioConfigured=!!origin&&!twilio.length&&!twilioIssues.length;
 const forward=process.env.TWILIO_FORWARD_TO;
 const validForward=!!forward&&/^\+[1-9]\d{7,14}$/.test(forward)&&forward!==process.env.TWILIO_PHONE_NUMBER;
 if(process.env.TWILIO_VOICE_ENABLED==='true'&&(!forward||!/^\+[1-9]\d{7,14}$/.test(forward)||forward===process.env.TWILIO_PHONE_NUMBER))twilioIssues.push('Le transfert vocal nécessite une destination internationale différente du numéro Twilio.');
 return {stripeEnterprise:stripeEnterpriseConfiguration(),deployment:{environment:process.env.VERCEL_ENV==='production'?'Production':process.env.VERCEL_ENV==='preview'?'Preview':'Local',revision:process.env.VERCEL_GIT_COMMIT_SHA?.match(/^[a-f0-9]{40}$/i)?.[0].slice(0,7)??null},twilio:{verificationReady:verificationReady('twilio'),configured:twilioConfigured,verified:false,issues:twilioIssues,missing:[...twilio,...(!origin?['PROCLAIR_PUBLIC_ORIGIN']:[])],sendingEnabled:twilioConfigured&&process.env.TWILIO_SEND_ENABLED==='true',voiceEnabled:twilioConfigured&&process.env.TWILIO_VOICE_ENABLED==='true'&&validForward,webhooks:origin?{sms:origin+'/api/webhooks/twilio/sms',status:origin+'/api/webhooks/twilio/status',voice:origin+'/api/webhooks/twilio/voice',calls:origin+'/api/webhooks/twilio/calls'}:null},stripe:{verificationReady:verificationReady('stripe'),configured:!!origin&&!stripe.length&&!stripeIssues.length,verified:false,issues:stripeIssues,mode:'TEST_ONLY',missing:[...stripe,...(!origin?['PROCLAIR_PUBLIC_ORIGIN']:[])],webhook:origin?origin+'/api/webhooks/stripe':null,livePaymentsEnabled:stripeEnterpriseConfiguration().livePaymentsEnabled}};
}
export async function boundedBody(request:Request,limit=65536){const reader=request.body?.getReader();if(!reader)return '';const parts:Uint8Array[]=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new DomainError('TOO_LARGE','Requête trop volumineuse.',413)}parts.push(value)}}finally{reader.releaseLock()}return Buffer.concat(parts).toString('utf8');}

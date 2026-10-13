import {DomainError} from '../domain/rules';
export function publicOrigin(){const raw=process.env.PROCLAIR_PUBLIC_ORIGIN;if(!raw)throw new DomainError('NOT_CONFIGURED','Adresse publique HTTPS absente.',503);const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new DomainError('NOT_CONFIGURED','Adresse publique HTTPS invalide.',503);return u.origin;}
export function providerStatus(){
 let origin:string|null=null;try{origin=publicOrigin()}catch{}
 const twilio=['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_PHONE_NUMBER'].filter(n=>!process.env[n]);
 const stripe=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'].filter(n=>!process.env[n]);
 const twilioIssues:string[]=[];const stripeIssues:string[]=[];
 if(process.env.TWILIO_ACCOUNT_SID&&!/^AC[a-fA-F0-9]{32}$/.test(process.env.TWILIO_ACCOUNT_SID))twilioIssues.push('Le SID du compte Twilio doit commencer par AC et contenir 32 caractères hexadécimaux.');
 if(process.env.TWILIO_PHONE_NUMBER&&!/^\+[1-9]\d{7,14}$/.test(process.env.TWILIO_PHONE_NUMBER))twilioIssues.push('Le numéro Twilio doit être au format international E.164.');
 if(process.env.STRIPE_SECRET_KEY&&!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_'))stripeIssues.push('Cette livraison exige une clé Stripe de test (sk_test_). Les clés réelles sont refusées.');
 const twilioConfigured=!!origin&&!twilio.length&&!twilioIssues.length;
 const forward=process.env.TWILIO_FORWARD_TO;
 const validForward=!!forward&&/^\+[1-9]\d{7,14}$/.test(forward)&&forward!==process.env.TWILIO_PHONE_NUMBER;
 if(process.env.TWILIO_VOICE_ENABLED==='true'&&(!forward||!/^\+[1-9]\d{7,14}$/.test(forward)||forward===process.env.TWILIO_PHONE_NUMBER))twilioIssues.push('Le transfert vocal nécessite une destination internationale différente du numéro Twilio.');
 return {twilio:{configured:twilioConfigured,verified:false,issues:twilioIssues,missing:[...twilio,...(!origin?['PROCLAIR_PUBLIC_ORIGIN']:[])],sendingEnabled:twilioConfigured&&process.env.TWILIO_SEND_ENABLED==='true',voiceEnabled:twilioConfigured&&process.env.TWILIO_VOICE_ENABLED==='true'&&validForward,webhooks:origin?{sms:origin+'/api/webhooks/twilio/sms',status:origin+'/api/webhooks/twilio/status',voice:origin+'/api/webhooks/twilio/voice',calls:origin+'/api/webhooks/twilio/calls'}:null},stripe:{configured:!!origin&&!stripe.length&&!stripeIssues.length,verified:false,issues:stripeIssues,mode:'TEST_ONLY',missing:[...stripe,...(!origin?['PROCLAIR_PUBLIC_ORIGIN']:[])],webhook:origin?origin+'/api/webhooks/stripe':null,livePaymentsEnabled:false}};
}
export async function boundedBody(request:Request,limit=65536){const reader=request.body?.getReader();if(!reader)return '';const parts:Uint8Array[]=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new DomainError('TOO_LARGE','Requête trop volumineuse.',413)}parts.push(value)}}finally{reader.releaseLock()}return Buffer.concat(parts).toString('utf8');}

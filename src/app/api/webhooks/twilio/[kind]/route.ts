import twilio from 'twilio';
import {prisma} from '@/lib/db';
import {boundedBody,publicOrigin} from '@/providers/config';
import {Communications,verifyTwilio,phoneSchema} from '@/providers/twilio';
import {receptionGreeting,receptionInput} from '@/providers/voice-reception';
import {webhookError} from '@/providers/http';

export const runtime='nodejs';

export async function POST(request:Request,{params}:{params:Promise<{kind:string}>}){
 try{
  const {kind}=await params;
  if(!['sms','status','voice','voice-input','calls'].includes(kind))
   return Response.json({error:'Webhook inconnu.'},{status:404});
  if(new URL(request.url).search)
   return Response.json({error:'Paramètres URL interdits.'},{status:400});
  if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))
   return Response.json({error:'Formulaire attendu.'},{status:415});
  const p=verifyTwilio('/api/webhooks/twilio/'+kind,await boundedBody(request),request.headers.get('x-twilio-signature'));
  const service=new Communications(prisma);
  const xmlHeaders={'Content-Type':'text/xml','Cache-Control':'no-store'};
  const response=new twilio.twiml.VoiceResponse();
  if(kind==='sms'){
   await service.inbound(p);
   return new Response('<Response/>',{headers:xmlHeaders});
  }
  if(kind==='status'){
   await service.status(p);
   return new Response(null,{status:204});
  }
  // Signed speech/DTMF callbacks are not new call events and must not overwrite call status.
  const target=phoneSchema.safeParse(process.env.TWILIO_FORWARD_TO);
  const canForward=process.env.TWILIO_VOICE_ENABLED==='true'&&
   target.success&&target.data!==process.env.TWILIO_PHONE_NUMBER&&target.data!==p.From;
  const receptionistOn=process.env.TWILIO_RECEPTIONIST_ENABLED==='true'&&canForward;
  if(kind==='voice-input'){
   if(p.To!==process.env.TWILIO_PHONE_NUMBER)
    return Response.json({error:'Numéro Twilio incorrect.'},{status:400});
   if(!receptionistOn){
    response.reject({reason:'busy'});
    return new Response(response.toString(),{headers:xmlHeaders});
   }
   return new Response(receptionInput(publicOrigin(),p,target.data,process.env.TWILIO_PHONE_NUMBER!),{headers:xmlHeaders});
  }
  await service.call(p.DialCallStatus?
   {...p,CallStatus:p.DialCallStatus,CallDuration:p.DialCallDuration||p.CallDuration}:p);
  if(kind==='voice'){
   if(p.To!==process.env.TWILIO_PHONE_NUMBER)
    return Response.json({error:'Numéro Twilio incorrect.'},{status:400});
   if(receptionistOn){
    return new Response(receptionGreeting(publicOrigin()),{headers:xmlHeaders});
   }
   if(canForward){
    response.dial({action:publicOrigin()+'/api/webhooks/twilio/calls',method:'POST',timeout:20},target.data);
   }else response.reject({reason:'busy'});
   return new Response(response.toString(),{headers:xmlHeaders});
  }
  return new Response(null,{status:204});
 }catch(e){return webhookError(e)}
}

import {prisma} from '@/lib/db';
import {boundedBody} from '@/providers/config';
import {StripePayments,verifyStripe} from '@/providers/stripe';
import {StripeEnterprise} from '@/providers/stripe-enterprise';
import {stripeModeSchema,verifyModeEvent} from '@/providers/stripe-modes';
import {webhookError} from '@/providers/http';
export const runtime='nodejs';
export async function POST(request:Request){try{
 const raw=await boundedBody(request,262144),signature=request.headers.get('stripe-signature'),selected=new URL(request.url).searchParams.get('mode');
 if(selected!==null){const mode=stripeModeSchema.parse(selected),event=verifyModeEvent(raw,signature,mode);return Response.json(await new StripeEnterprise(prisma).event(event,mode))}
 const event=verifyStripe(raw,signature);return Response.json(await new StripePayments(prisma).event(event));
}catch(e){return webhookError(e)}}

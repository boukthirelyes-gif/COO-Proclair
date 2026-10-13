import {prisma} from '@/lib/db';
import {boundedBody} from '@/providers/config';
import {StripePayments,verifyStripe} from '@/providers/stripe';
import {webhookError} from '@/providers/http';
export const runtime='nodejs';
export async function POST(request:Request){try{const event=verifyStripe(await boundedBody(request,262144),request.headers.get('stripe-signature'));return Response.json(await new StripePayments(prisma).event(event))}catch(e){return webhookError(e)}}

import {prisma} from '@/lib/db';
import {boundedBody} from '@/providers/config';
import {CommunicationCenter,verifyEmailWebhook} from '@/providers/communication-center';
import {webhookError} from '@/providers/http';
export const runtime='nodejs';
export async function POST(request:Request){try{const raw=await boundedBody(request),verified=verifyEmailWebhook(raw,request.headers);return Response.json(await new CommunicationCenter(prisma).emailEvent(verified.event,verified.eventId))}catch(e){return webhookError(e)}}

import {z} from 'zod';
import {prisma} from '@/lib/db';
import {CommunicationCenter} from '@/providers/communication-center';
import {boundedBody} from '@/providers/config';
import {webhookError} from '@/providers/http';
export async function POST(request:Request){try{const value=z.object({token:z.string().min(10).max(500)}).strict().parse(JSON.parse(await boundedBody(request,2048)));return Response.json(await new CommunicationCenter(prisma).unsubscribe(value.token),{headers:{'Cache-Control':'no-store'}})}catch(e){return webhookError(e)}}

import {DomainError} from '../domain/rules';
import {ZodError} from 'zod';
export function webhookError(error:unknown){if(error instanceof DomainError)return Response.json({error:error.message,code:error.code},{status:error.status});if(error instanceof ZodError)return Response.json({error:'Événement invalide.'},{status:400});return Response.json({error:'Webhook indisponible. Réessayez.'},{status:503})}

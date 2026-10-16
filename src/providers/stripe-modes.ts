import Stripe from 'stripe';
import {z} from 'zod';
import {DomainError} from '../domain/rules';
import {requirePermission,type AccessActor} from '../lib/access';
export const stripeModeSchema=z.enum(['TEST','LIVE']);
export type StripeMode=z.infer<typeof stripeModeSchema>;
export function stripeAdmin(actor:AccessActor){requirePermission(actor,'finance');requirePermission(actor,'integrations');if(actor.accountRole!=='ADMIN'||actor.role!=='ADMIN')throw new DomainError('FORBIDDEN','Administration Stripe réservée à un administrateur humain.',403)}
export function modeCredentials(mode:StripeMode){
 const test=(process.env.STRIPE_TEST_SECRET_KEY||(process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_test_')?process.env.STRIPE_SECRET_KEY:undefined))?.trim()||'';
 const key=mode==='TEST'?test:process.env.STRIPE_LIVE_SECRET_KEY?.trim()||'';
 const secret=mode==='TEST'?(process.env.STRIPE_TEST_WEBHOOK_SECRET||process.env.STRIPE_WEBHOOK_SECRET)?.trim()||'':process.env.STRIPE_LIVE_WEBHOOK_SECRET?.trim()||'';
 const otherSecret=mode==='TEST'?process.env.STRIPE_LIVE_WEBHOOK_SECRET?.trim():(process.env.STRIPE_TEST_WEBHOOK_SECRET||process.env.STRIPE_WEBHOOK_SECRET)?.trim();
 return {key,secret,valid:key.startsWith(mode==='TEST'?'sk_test_':'sk_live_')&&secret.startsWith('whsec_')&&secret!==otherSecret};
}
export function livePaymentsEnabled(){return process.env.STRIPE_LIVE_PAYMENTS_ENABLED==='true'&&(process.env.STRIPE_LIVE_APPROVAL_REFERENCE?.trim().length??0)>=12&&modeCredentials('LIVE').valid}
export function assertStripeOperation(mode:StripeMode){if(!modeCredentials(mode).valid)throw new DomainError('STRIPE_MODE_CONFIGURATION','Clé et secret webhook distincts requis pour ce mode Stripe.',409);if(mode==='LIVE'&&!livePaymentsEnabled())throw new DomainError('LIVE_DISABLED','Paiements réels désactivés : activation serveur et référence d’autorisation explicites requises.',403)}
export function stripeModeClient(mode:StripeMode){const config=modeCredentials(mode);if(!config.valid)throw new DomainError('STRIPE_MODE_CONFIGURATION','Configuration Stripe du mode indisponible.',503);return new Stripe(config.key,{maxNetworkRetries:1,timeout:10000})}
export function verifyModeEvent(raw:string,signature:string|null,mode:StripeMode){const {secret,valid}=modeCredentials(mode);if(!valid||!signature)throw new DomainError('INVALID_SIGNATURE','Signature Stripe absente ou configuration du mode invalide.',403);let event:Stripe.Event;try{event=Stripe.webhooks.constructEvent(raw,signature,secret)}catch{throw new DomainError('INVALID_SIGNATURE','Signature Stripe invalide.',403)}if(event.livemode!==(mode==='LIVE'))throw new DomainError('MODE_MISMATCH','Événement Stripe reçu dans le mauvais environnement.',403);return event}
export function stripeEnterpriseConfiguration(){return {testConfigured:modeCredentials('TEST').valid,liveConfigured:modeCredentials('LIVE').valid,livePaymentsEnabled:livePaymentsEnabled(),activationRequires:'SERVER_FLAG_AND_APPROVAL_REFERENCE_AND_HUMAN_ADMIN',keysExposed:false}}

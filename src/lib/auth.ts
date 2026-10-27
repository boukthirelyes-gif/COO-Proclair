import { createHmac, randomBytes, timingSafeEqual, scryptSync } from 'node:crypto';
import { NextRequest } from 'next/server';
import {DomainError} from '../domain/rules';

const COOKIE = 'proclair_session';
const secret = () => {
  const value = process.env.PROCLAIR_SESSION_SECRET;
  if (!value || value.length < 32) throw new DomainError('AUTH_CONFIGURATION_REQUIRED','Connexion indisponible : configurez PROCLAIR_SESSION_SECRET (32 caractères minimum) dans les variables privées de l’hébergement.',503);
  return value;
};
export function checkPassword(password: string): boolean {
  const expected = process.env.PROCLAIR_ADMIN_PASSWORD;
  if (!expected || expected.length < 12) throw new DomainError('AUTH_CONFIGURATION_REQUIRED','Connexion administrateur indisponible : configurez PROCLAIR_ADMIN_PASSWORD (12 caractères minimum) dans les variables privées de l’hébergement.',503);
  return timingSafeEqual(scryptSync(password, secret(), 32), scryptSync(expected, secret(), 32));
}
export function issueSession(identity: {id:string;role:string;sessionVersion?:number}={id:'admin',role:'ADMIN'},durationMs=8*60*60*1000) {
  const body = Buffer.from(JSON.stringify({...identity,expires:Date.now()+durationMs,nonce:randomBytes(16).toString('hex')})).toString('base64url');
  return body + '.' + createHmac('sha256', secret()).update(body).digest('base64url');
}
/** @deprecated Signature-only helper. Authenticated endpoints must use resolveActor for revocation and current grants. */
export function actorFor(request: NextRequest): {id:string;role:'ADMIN'} | null {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const [body,signature,extra] = token.split('.');
  if (!body || !signature || extra) return null;
  const expected = createHmac('sha256', secret()).update(body).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) return null;
  try { const session = JSON.parse(Buffer.from(body,'base64url').toString());
    return session.expires > Date.now() && session.id === 'admin' && session.role === 'ADMIN' ? {id:'admin',role:'ADMIN'} : null;
  } catch { return null; }
}
function normalizedOrigin(raw:string):string|null {
  try {const url=new URL(raw.trim());return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash?url.origin:null;}catch{return null;}
}
/** HTTPS may terminate at the hosting proxy before the request reaches Next. */
export function requestIsSecure(request:NextRequest) {
  return request.nextUrl.protocol==='https:' || request.headers.get('x-forwarded-proto')==='https' || process.env.VERCEL==='1' || normalizedOrigin(process.env.PROCLAIR_PUBLIC_ORIGIN||'')?.startsWith('https://')===true;
}
export function sameOrigin(request: NextRequest) {
  const origin=request.headers.get('origin');if(!origin)return false;
  const configured=process.env.PROCLAIR_PUBLIC_ORIGIN;
  const primary=configured?normalizedOrigin(configured):null;
  if(configured&&!primary)throw new DomainError('AUTH_ORIGIN_CONFIGURATION','Adresse publique invalide : configurez PROCLAIR_PUBLIC_ORIGIN avec le domaine HTTPS du CRM, sans chemin, paramètres ni fragment.',503);
  const allowed=new Set<string>();if(primary)allowed.add(primary);
  // VERCEL_URL is trusted server configuration. Never allow all preview domains
  // or use an untrusted forwarded-host header as an additional origin.
  const deployment=process.env.VERCEL_URL;
  if(process.env.VERCEL==='1'&&deployment&&/^[a-zA-Z0-9-]+\.vercel\.app$/.test(deployment))allowed.add('https://'+deployment.toLowerCase());
  if(!configured){
    const host=request.headers.get('host');
    const protocol=requestIsSecure(request)?'https:':'http:';
    const fallback=host?normalizedOrigin(protocol+'//'+host):normalizedOrigin(new URL(request.url).origin);
    if(fallback)allowed.add(fallback);
  }
  return allowed.has(origin);
}
export const sessionCookie = COOKIE;

export function readSession(request:NextRequest,cookieName=COOKIE):{id:string;role:string;sessionVersion?:number}|null {
 const token=request.cookies.get(cookieName)?.value;if(!token||token.length>2048)return null;
 const [body,signature,extra]=token.split('.');if(!body||!signature||extra)return null;
 const expected=createHmac('sha256',secret()).update(body).digest(),actual=Buffer.from(signature,'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 try{const value=JSON.parse(Buffer.from(body,'base64url').toString());return typeof value.id==='string'&&typeof value.role==='string'&&Number.isFinite(value.expires)&&value.expires>Date.now()?value:null}catch{return null}
}

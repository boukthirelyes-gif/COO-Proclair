import { createHmac, randomBytes, timingSafeEqual, scryptSync } from 'node:crypto';
import { NextRequest } from 'next/server';

const COOKIE = 'proclair_session';
const secret = () => {
  const value = process.env.PROCLAIR_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('PROCLAIR_SESSION_SECRET doit contenir au moins 32 caractères.');
  return value;
};
export function checkPassword(password: string): boolean {
  const expected = process.env.PROCLAIR_ADMIN_PASSWORD;
  if (!expected || expected.length < 12) throw new Error('PROCLAIR_ADMIN_PASSWORD doit contenir au moins 12 caractères.');
  return timingSafeEqual(scryptSync(password, secret(), 32), scryptSync(expected, secret(), 32));
}
export function issueSession(identity: {id:string;role:string;sessionVersion?:number}={id:'admin',role:'ADMIN'},durationMs=8*60*60*1000) {
  const body = Buffer.from(JSON.stringify({...identity,expires:Date.now()+durationMs,nonce:randomBytes(16).toString('hex')})).toString('base64url');
  return body + '.' + createHmac('sha256', secret()).update(body).digest('base64url');
}
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
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  // Require browser origin for writes; read-only GET can be used by monitoring.
  const configured = process.env.PROCLAIR_PUBLIC_ORIGIN;
  const host = request.headers.get('host');
  const expected = configured || (host ? `${request.nextUrl.protocol}//${host}` : new URL(request.url).origin);
  return origin === expected;
}
export const sessionCookie = COOKIE;

export function readSession(request:NextRequest,cookieName=COOKIE):{id:string;role:string;sessionVersion?:number}|null {
 const token=request.cookies.get(cookieName)?.value;if(!token||token.length>2048)return null;
 const [body,signature,extra]=token.split('.');if(!body||!signature||extra)return null;
 const expected=createHmac('sha256',secret()).update(body).digest(),actual=Buffer.from(signature,'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 try{const value=JSON.parse(Buffer.from(body,'base64url').toString());return typeof value.id==='string'&&typeof value.role==='string'&&Number.isFinite(value.expires)&&value.expires>Date.now()?value:null}catch{return null}
}

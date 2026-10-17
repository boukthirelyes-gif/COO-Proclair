import {NextRequest,NextResponse} from 'next/server';
import {ZodError} from 'zod';
import {prisma} from '@/lib/db';
import {sameOrigin,requestIsSecure} from '@/lib/auth';
import {resolveDatabaseUrl} from '@/lib/database-url';
import {DomainError} from '@/domain/rules';
import {SaasControl,saasCookie} from '@/saas/control';
import {SaasTenant} from '@/saas/tenant';
import {SaasTeam} from '@/saas/team';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
async function handle(request:NextRequest){
 try{
  if(process.env.PROCLAIR_SAAS_ENABLED!=='true')throw new DomainError('SAAS_DISABLED','Portail SaaS non activé dans cet environnement.',503);
  const path=request.nextUrl.pathname.slice('/api/saas'.length).split('/').filter(Boolean),method=request.method;
  if(method!=='GET'&&!sameOrigin(request))throw new DomainError('ORIGIN_NOT_ALLOWED','Origine non autorisée.',403);
  let input:unknown={};if(method!=='GET'){const length=Number(request.headers.get('content-length')||0);if(length>100000)throw new DomainError('PAYLOAD_TOO_LARGE','Requête trop volumineuse.',413);const text=await request.text();if(text.length>100000)throw new DomainError('PAYLOAD_TOO_LARGE','Requête trop volumineuse.',413);try{input=JSON.parse(text||'{}')}catch{throw new DomainError('INVALID_JSON','JSON invalide.',400);}}
  const control=new SaasControl(prisma),team=new SaasTeam(control),tenant=new SaasTenant(control,resolveDatabaseUrl(process.env));
  if(method==='POST'&&['register','login'].includes(path[0])&&path.length===1){const result=path[0]==='register'?await control.register(input):await control.login(input),{token,...body}=result;const response=json(body,path[0]==='register'?201:200);response.cookies.set(saasCookie,token,{httpOnly:true,sameSite:'strict',secure:requestIsSecure(request),path:'/api/saas',maxAge:8*3600});return response;}
  if(method==='POST'&&path.join('/')==='invitations/accept')return json(await team.accept(input));
  const identity=await control.identity(request.cookies.get(saasCookie)?.value);if(!identity)throw new DomainError('AUTH_REQUIRED','Connexion SaaS requise.',401);
  if(method==='GET'&&path.join('/')==='session')return json({identity,organizations:await control.memberships(identity),platformAdmin:control.isPlatform(identity)});
  if(method==='POST'&&path.join('/')==='logout'){const response=json(await control.logout(identity));response.cookies.set(saasCookie,'',{path:'/api/saas',maxAge:0});return response;}
  if(method==='GET'&&path.join('/')==='platform')return json(await control.platform(identity));
  if(method==='POST'&&path.join('/')==='platform/plans')return json(await control.configurePlan(input,identity));
  if(method==='POST'&&path[0]==='platform'&&path[1]==='subscriptions'&&path.length===3)return json(await control.changePlan(path[2],input,identity));
  if(path[0]!=='organizations'||!path[1])throw new DomainError('NOT_FOUND','Route SaaS introuvable.',404);const slug=path[1],resource=path[2];
  if(method==='GET'&&path.length===2){const m=await control.organization(slug,identity);return json({organization:{id:m.organizationId,name:m.organization.name,slug,status:m.organization.status,settings:m.organization.settings},role:m.role});}
  if(method==='GET'&&path.length===3){
   if(resource==='subscription')return json(await control.subscription(slug,identity));
   if(resource==='integrations')return json(await control.integrations(slug,identity));
   if(resource==='members')return json(await team.members(slug,identity));
   if(resource==='omega')return json(await tenant.omega(slug,identity));
   if(resource==='usage')return json(await tenant.usage(slug,identity));
   if(resource==='pins')return json(await tenant.pins(slug,Object.fromEntries(request.nextUrl.searchParams),identity));
   if(['customers','contracts','visits','invoices'].includes(resource))return json(await tenant.list(slug,resource,Object.fromEntries(request.nextUrl.searchParams),identity));
  }
  if(method==='GET'&&resource==='customers'&&path.length===4)return json(await tenant.customer(slug,path[3],identity));
  if(method==='POST'&&path.length===3){
   if(resource==='settings')return json(await control.configure(slug,input,identity));
   if(resource==='integrations')return json(await control.configureIntegration(slug,input,identity));
   if(resource==='invitations')return json(await team.invite(slug,input,identity),201);
   if(['customers','properties','contracts'].includes(resource))return json(await tenant.mutate(slug,resource,input,identity),201);
  }
  if(method==='POST'&&resource==='subscription'&&path[3]==='cancel'&&path.length===4)return json(await control.cancel(slug,input,identity));
  if(method==='PATCH'&&resource==='members'&&path.length===4)return json(await team.update(slug,path[3],input,identity));
  throw new DomainError('NOT_FOUND','Fonction SaaS non disponible ; aucun repli vers Proclair.',404);
 }catch(error){if(error instanceof DomainError)return json({error:error.message,code:error.code},error.status);if(error instanceof ZodError)return json({error:'Données invalides.',code:'INVALID_INPUT'},422);if(error&&typeof error==='object'&&'code'in error&&error.code==='P2002')return json({error:'Identifiant déjà utilisé ou conflit de données.',code:'CONFLICT'},409);return json({error:'Service SaaS indisponible. Aucune opération externe confirmée.',code:'SAAS_ERROR'},503);}
}
export const GET=handle;export const POST=handle;export const PATCH=handle;

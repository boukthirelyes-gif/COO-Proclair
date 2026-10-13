import {verifyProvider} from '@/providers/verification';
import {RotorFileImports} from '@/lib/rotor-file-import';
import {SalesFollowUps} from '@/omega/sales-followups';
import {SellerQuotes} from '@/sales/seller-quotes';
import {providerStatus} from '@/providers/config';
import {Communications} from '@/providers/twilio';
import {StripePayments} from '@/providers/stripe';
import {TerritoryService} from '@/prospecting/territories';
import {ServiceAgreements} from '@/sales/service-agreements';
import {dashboardMetrics} from '@/lib/dashboard-metrics';
import {RotorCustomerPromotion} from '@/lib/rotor-customer-promotion';
import {customerDossier} from '@/lib/customer-dossier';
import {omegaAssistant} from '@/omega/assistant';
import {RotorImportService} from '@/lib/rotor-import';
import {globalSearch} from '@/lib/global-search';
import {LeadService} from '@/sales/leads';
import parity from '@/data/rotor-parity.json';
import {systemHealth} from '@/lib/system-health';
import {RotorCapabilityRegistry} from '@/lib/rotor-capabilities';
import {RotorMapService,validateRotorSchema} from '@/lib/rotor-map';
import {RotorMonitor} from '@/lib/rotor-monitor';
import {resolveActor,authenticate} from '@/lib/user-session';
import {UserService,routePermission,requirePermission} from '@/lib/access';
import {ProspectingService} from '@/prospecting/service';
import {beginRotor,completeRotor,rotorStatus,rotorTools,disconnectRotor,renewRotor,revokeRotor} from '@/lib/rotor';
import {cronAuthorized,takeLoginAttempt} from '@/lib/production-auth';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import {previewRotorMirror,applyRotorMirror,listRotorMirror} from '@/lib/rotor-mirror';
import { prisma } from '@/lib/db';
import { issueSession, sameOrigin, sessionCookie } from '@/lib/auth';
import { CRMService } from '@/domain/service';
import { DomainError } from '@/domain/rules';
import { OmegaWorker } from '@/omega/worker';
import {saveBusinessProfile} from '@/lib/business-profile';
import {nativeExport} from '@/lib/native-export';
import {ClientPortal} from '@/sales/client-portal';
import {QuoteService} from '@/sales/quotes';
import { FinanceService } from '@/finance/service';
import {invoiceDocument,invoiceDocumentCsp} from '@/lib/invoice-document';
import {csvRows, sumCents} from '@/lib/finance-export';
export const runtime = 'nodejs';
export const maxDuration = 60;
const service = new CRMService(prisma);
const worker = new OmegaWorker(prisma);
const finance = new FinanceService(prisma);
const quotes=new QuoteService(prisma);
const agreements=new ServiceAgreements(prisma);
const portal=new ClientPortal(prisma);
const leads=new LeadService(prisma);
const rotorPromotion=new RotorCustomerPromotion(prisma);
const rotorImports=new RotorImportService(prisma);
const registry=new RotorCapabilityRegistry(prisma);
const rotorMap=new RotorMapService(prisma);
const rotorMonitor=new RotorMonitor(prisma);
const users=new UserService(prisma);
const territories=new TerritoryService(prisma);
const prospecting=new ProspectingService(prisma);
const rotorSyncInput=z.object({page:z.number().int().min(1).max(2000),start:z.string().datetime({offset:true}),end:z.string().datetime({offset:true})}).strict();
function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({error:'Champs invalides.',details:error.flatten()}, {status:400});
  if (error instanceof DomainError) return NextResponse.json({error:error.message,code:error.code}, {status:error.status});
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'P2002' || error.code === 'P2034' || error.code === 'P2025') return NextResponse.json({error:'Conflit de données. Rechargez puis réessayez.',code:'CONFLICT'}, {status:409});
    if (error.code === 'P2003') return NextResponse.json({error:'Référence inexistante.',code:'INVALID_REFERENCE'}, {status:400});
  }
  // Log only bounded diagnostic codes. Never log error.message, meta details,
  // SQL, request bodies, or environment variables: those may contain secrets.
  const diagnostic: Record<string, string> = {
    kind: error instanceof Error ? error.name : 'Unknown'
  };
  if (error && typeof error === 'object') {
    const safeCode = (value: unknown) =>
      typeof value === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(value) ? value : null;
    const details = error as {code?: unknown; meta?: unknown; cause?: unknown};
    const prismaCode = safeCode(details.code);
    if (prismaCode) diagnostic.prismaCode = prismaCode;
    const meta = details.meta && typeof details.meta === 'object'
      ? details.meta as Record<string, unknown> : null;
    const sqlState = safeCode(meta?.code);
    if (sqlState) diagnostic.sqlState = sqlState;
    const nested = meta?.driverAdapterError;
    const rootCause = details.cause && typeof details.cause === 'object' ? details.cause as Record<string, unknown> : null;
    const nestedError = nested && typeof nested === 'object' ? nested as Record<string, unknown> : null;
    for (const [prefix, source] of [['cause', rootCause], ['adapter', nestedError]] as const) {
      if (!source) continue;
      const kind = safeCode(source.name) ?? safeCode(source.kind);
      const code = safeCode(source.code) ?? safeCode(source.originalCode);
      if (kind) diagnostic[prefix + 'Kind'] = kind;
      if (code) diagnostic[prefix + 'Code'] = code;
      const deeper = source.cause && typeof source.cause === 'object' ? source.cause as Record<string, unknown> : null;
      const deeperCode = safeCode(deeper?.code) ?? safeCode(deeper?.originalCode);
      if (deeperCode) diagnostic[prefix + 'InnerCode'] = deeperCode;
    }
    if (nested && typeof nested === 'object') {
      const adapter = nested as {cause?: unknown};
      if (adapter.cause && typeof adapter.cause === 'object') {
        const driver = adapter.cause as {originalCode?: unknown; code?: unknown};
        const driverCode = safeCode(driver.originalCode) ?? safeCode(driver.code);
        if (driverCode) diagnostic.driverCode = driverCode;
      }
    }
  }
  console.error('Erreur API Proclair', diagnostic);
  return NextResponse.json({error:'Service indisponible. Consultez les journaux serveur.'}, {status:503});
}
export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname.slice('/api/'.length);
    if(path==='cron/compatibility'){if(!cronAuthorized(request.headers.get('authorization')))return NextResponse.json({error:'Authentification cron requise.'},{status:401});return NextResponse.json(await rotorMonitor.tick());}
    if (path === 'cron/omega') {
      if(!cronAuthorized(request.headers.get('authorization')))return NextResponse.json({error:'Authentification cron requise.'},{status:401});
      return NextResponse.json(await worker.tick(),{headers:{'Cache-Control':'no-store'}});
    }
    if (path === 'health') { await prisma.$queryRaw`SELECT 1`; return NextResponse.json({status:'ok',database:'connected'}); }
    if(path==='integrations/rotor/callback') {
      const cookie=request.cookies.get('rotor_oauth')?.value;
      // OAuth redirects are cross-site: the normal Strict session cookie is absent.
      // A separate signed Lax context, scoped to this callback, rechecks current access.
      const callbackActor=await resolveActor(prisma,request,'rotor_actor');if(!callbackActor)throw new DomainError('UNAUTHORIZED','Connexion requise.',401);requirePermission(callbackActor,'integrations');
      if(!cookie)throw new DomainError('OAUTH_STATE','Session de connexion absente.',400);
      await completeRotor(cookie,request.nextUrl.searchParams.get('state')||'',request.nextUrl.searchParams.get('code')||'');
      await prisma.auditEvent.create({data:{actorId:callbackActor.id,actorRole:callbackActor.role,action:'ROTOR_CONNECTED',entityType:'Integration',entityId:'rotor',after:{access:'READ_ONLY'}}});
      const response=NextResponse.redirect(new URL('/?view=integrations',process.env.PROCLAIR_PUBLIC_ORIGIN!));response.cookies.set('rotor_oauth','',{path:'/api/integrations/rotor/callback',maxAge:0});response.cookies.set('rotor_actor','',{path:'/api/integrations/rotor/callback',maxAge:0});return response;
    }
    const actor = await resolveActor(prisma,request);
    if (!actor) return NextResponse.json({error:'Connexion requise.'},{status:401});
    const grant=routePermission(path,request.method);if(grant)requirePermission(actor,grant);
    if(path==='sales/followups'||path==='omega/sales-followups')return NextResponse.json(await new SalesFollowUps(prisma).board(actor));
    if(path==='sales/options')return NextResponse.json(await agreements.sellerOptions(actor));
    if(path==='sales/contracts')return NextResponse.json(await agreements.sellerList(actor));
    if(path==='sales/quotes')return NextResponse.json(await new SellerQuotes(prisma).list(actor));
    if(/^sales\/contracts\/[^/]+\/pdf$/.test(path)){const pdf=await agreements.pdf(path.split('/')[2],actor);return new NextResponse(new Uint8Array(pdf.pdfBytes!),{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline; filename=proclair-contract.pdf','Cache-Control':'private, no-store'}});}
    if(path==='integrations/providers')return NextResponse.json(providerStatus());
    if(path==='integrations/communications')return NextResponse.json(await new Communications(prisma).list(actor));
    if(path==='finance/stripe')return NextResponse.json(await new StripePayments(prisma).list(actor));
    if(path==='dashboard/metrics')return NextResponse.json(await dashboardMetrics(prisma,actor),{headers:{'Cache-Control':'private, no-store'}});
    if(path==='agreements')return NextResponse.json(await agreements.list(actor));
    if(path==='agreements/options')return NextResponse.json(await agreements.options(actor));
    if(/^agreements\/[^/]+\/pdf$/.test(path)){const pdf=await agreements.pdf(path.split('/')[1],actor);return new NextResponse(new Uint8Array(pdf.pdfBytes!),{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline; filename=proclair-contract.pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
    if(path==='search')return NextResponse.json(await globalSearch(prisma,request.nextUrl.searchParams.get('q'),actor),{headers:{'Cache-Control':'private, no-store'}});
    if(path==='leads')return NextResponse.json(await leads.list(actor));
    if(/^leads\/[^/]+\/history$/.test(path))return NextResponse.json(await leads.history(path.split('/')[1],actor));
    if(/^leads\/[^/]+$/.test(path))return NextResponse.json(await leads.get(path.split('/')[1],actor));
    if(/^prospecting\/[^/]+$/.test(path))return NextResponse.json(await prospecting.get(path.split('/')[1],actor));
    if(path==='system/health')return NextResponse.json(await systemHealth(prisma));
    if(path==='system/parity')return NextResponse.json(parity);
    if(path==='integrations/rotor/files')return NextResponse.json(await new RotorFileImports(prisma).history(actor),{headers:{'Cache-Control':'private, no-store'}});
    if(path==='finance/rotor/archive')return NextResponse.json(await new RotorFileImports(prisma).archive(actor,Object.fromEntries(request.nextUrl.searchParams)),{headers:{'Cache-Control':'private, no-store'}});
    if(path==='integrations/rotor/imports')return NextResponse.json(await rotorImports.list(actor),{headers:{'Cache-Control':'private, no-store'}});
    if(/^integrations\/rotor\/imports\/[^/]+\/customers$/.test(path)){const runId=path.split('/')[3],after=request.nextUrl.searchParams.get('after')||'';if(after.length>128)throw new DomainError('INVALID_CURSOR','Curseur trop long.');const rows=await prisma.rotorImportItem.findMany({where:{runId,kind:'CUSTOMER',...(after?{externalId:{gt:after}}:{})},orderBy:{externalId:'asc'},take:21,select:{externalId:true,normalized:true,contentHash:true,change:true}});return NextResponse.json({rows:rows.slice(0,20),nextCursor:rows.length>20?rows[19].externalId:null},{headers:{'Cache-Control':'private, no-store'}});}
    if(/^integrations\/rotor\/imports\/[^/]+$/.test(path))return NextResponse.json(await rotorImports.report(path.split('/')[3],actor),{headers:{'Cache-Control':'private, no-store'}});
    if(path==='integrations/rotor/capabilities')return NextResponse.json(await registry.state());
    if(path==='integrations/rotor/pins'){const rows=await prisma.rotorMapPin.findMany({take:2000,orderBy:{syncedAt:'desc'}}),ids=rows.map(p=>p.customerExternalId).filter((v):v is string=>Boolean(v));const [native,mirrored]=await Promise.all([prisma.customer.findMany({where:{rotorExternalId:{in:ids}},select:{id:true,name:true,rotorExternalId:true}}),prisma.rotorMirrorRecord.findMany({where:{kind:'CUSTOMER',externalId:{in:ids}},select:{externalId:true,name:true}})]);const pins=rows.map(p=>({...p,customerReference:p.customerExternalId?{externalId:p.customerExternalId,nativeId:native.find(c=>c.rotorExternalId===p.customerExternalId)?.id??null,name:native.find(c=>c.rotorExternalId===p.customerExternalId)?.name??mirrored.find(c=>c.externalId===p.customerExternalId)?.name??null}:null}));if(Buffer.byteLength(JSON.stringify(pins))>3500000)throw new DomainError('MAP_TOO_LARGE','Le miroir nécessite une recherche paginée plus précise.',413);return NextResponse.json(pins);}
    if(path==='territories')return NextResponse.json(await territories.list(actor));
    if(path==='users')return NextResponse.json(await users.list(actor));
    if(path==='prospecting')return NextResponse.json(await prospecting.list(actor,request.nextUrl.searchParams.get('after'),Object.fromEntries([...request.nextUrl.searchParams].filter(([name])=>name!=='after'))));
    if(/^prospecting\/[^/]+\/history$/.test(path))return NextResponse.json(await prospecting.history(path.split('/')[1],actor));
    if(path==='settings/business')return NextResponse.json(await prisma.businessProfile.findUnique({where:{id:'proclair'}}));
    if(path==='export/native')return new NextResponse(await nativeExport(prisma),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="proclair-export-'+new Date().toISOString().slice(0,10)+'.json"','Cache-Control':'private, no-store'}});
    if (path === 'integrations/rotor') return NextResponse.json(await rotorStatus(),{headers:{'Cache-Control':'no-store'}});
    if (path === 'integrations/rotor/mirror') return NextResponse.json(await listRotorMirror(prisma),{headers:{'Cache-Control':'no-store'}});
    if (path === 'session') return NextResponse.json({actor});
    if(/^quotes\/[^/]+\/print$/.test(path)){const quote=await quotes.get(path.split('/')[1]);return new NextResponse(invoiceDocument({...quote,items:quote.items as any,dueDate:quote.validUntil,contract:null,paidCents:0,balanceCents:0,voidReason:quote.status==='VOID'?quote.decisionNote:null},'quote'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Content-Security-Policy':invoiceDocumentCsp,'X-Content-Type-Options':'nosniff'}});}
    if(path==='quotes')return NextResponse.json(await quotes.list());
    if (path === 'worker/state') return NextResponse.json(await worker.state());
    if (path === 'finance/state' || path === 'finance/export') {
      const {invoices,payments,expenses} = await finance.readState();
      const issued = invoices.filter(invoice => !['DRAFT','VOID'].includes(invoice.status));
      const expenseTotalCents=sumCents(expenses.filter(e=>e.status==='RECORDED').map(e=>e.amountCents));
      const summary = {expenseTotalCents,cashBalanceCents:sumCents(issued.map(i=>i.paidCents))-expenseTotalCents,issuedTotalCents:sumCents(issued.map(invoice=>invoice.totalCents)),receivedCents:sumCents(issued.map(invoice=>invoice.paidCents)),outstandingCents:sumCents(issued.map(invoice=>invoice.balanceCents)),draftCount:invoices.filter(invoice=>invoice.status==='DRAFT').length};
      if (path === 'finance/state') return NextResponse.json({invoices,payments,expenses,summary});
      const kind = request.nextUrl.searchParams.get('kind') || 'invoices';
      if (!['invoices','payments','expenses'].includes(kind)) return NextResponse.json({error:'Export inconnu.'},{status:400});
      const columns = kind==='expenses' ? ['id','vendor','category','description','paidDate','amountCents','currency','reference','status','voidReason'] : kind==='invoices' ? ['number','customer','status','currency','dueDate','subtotalCents','taxCents','totalCents','paidCents','balanceCents'] : ['id','invoice','customer','status','currency','amountCents','method','reference','createdAt','reversalReason'];
      const rows = kind==='expenses' ? expenses : kind==='invoices' ? invoices.map(invoice=>({...invoice,customer:invoice.customer.name})) : payments.map(payment=>({...payment,invoice:payment.invoice.number||payment.invoice.id,customer:payment.invoice.customer.name,currency:payment.invoice.currency,createdAt:payment.createdAt.toISOString(),reversalReason:payment.reversal?.reason||''}));
      return new NextResponse(csvRows(columns,rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="proclair-${kind}.csv"`,'Cache-Control':'no-store'}});
    }
    if (/^invoices\/[^/]+\/print$/.test(path)) {
      const invoice=await finance.getInvoice(path.split('/')[1]);
      return new NextResponse(invoiceDocument(invoice),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Content-Security-Policy':invoiceDocumentCsp,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
    }
    if (/^invoices\/[^/]+$/.test(path)) return NextResponse.json(await finance.getInvoice(path.split('/')[1]));
    if (/^omega\/plans\/[^/]+$/.test(path)) {
      const plan = await prisma.omegaPlan.findUnique({where:{id:path.split('/')[2]}});
      if (!plan) return NextResponse.json({error:'Plan introuvable.'},{status:404});
      return NextResponse.json({...plan,limitations:['Planificateur déterministe ; seules les visites déjà confirmées sont admissibles.','Marge fixe de 30 minutes : trajet routier et contraintes du client à vérifier.']});
    }
    if (path === 'state') {
      const capabilities={actor,permissions:actor.permissions};
      if(!actor.permissions.includes('crm.read'))return NextResponse.json({...capabilities,customers:[],properties:[],contracts:[],jobs:[],visits:[],technicians:[],audits:[],plans:[]});
      const [customers,properties,contracts,jobs,visits,technicians,audits,plans] = await Promise.all([service.listCustomers(),service.listProperties(),service.listContracts(),service.listJobs(),service.listVisits(),service.listTechnicians(),actor.permissions.includes('audit')?service.listAudit():Promise.resolve([]),actor.permissions.includes('omega')?prisma.omegaPlan.findMany({orderBy:{createdAt:'desc'},take:30}):Promise.resolve([])]);
      return NextResponse.json({...capabilities,customers,properties,contracts,jobs,visits,technicians,audits:actor.permissions.includes('audit')?audits:[],plans:actor.permissions.includes('omega')?plans:[]});
    }
    if(/^(contracts|visits)\/[^/]+$/.test(path)){const [kind,id]=path.split('/');const row=kind==='contracts'?await prisma.contract.findUnique({where:{id}}):await prisma.visit.findUnique({where:{id}});if(!row)throw new DomainError('NOT_FOUND','Dossier introuvable.',404);return NextResponse.json(row,{headers:{'Cache-Control':'private, no-store'}});}
    if(/^customers\/[^/]+\/dossier$/.test(path))return NextResponse.json(await customerDossier(prisma,path.split('/')[1],actor),{headers:{'Cache-Control':'private, no-store'}});
    if (path.startsWith('customers/')) return NextResponse.json(await service.getCustomer(path.split('/')[1]));
    return NextResponse.json({error:'Route introuvable.'},{status:404});
  } catch(error) { return errorResponse(error); }
}
async function mutate(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({error:'Origine non autorisée.'},{status:403});
    const text = await request.text();
    if (Buffer.byteLength(text) > (['/api/integrations/rotor/files/preview','/api/integrations/rotor/files/apply'].includes(request.nextUrl.pathname)?750000:65536)) return NextResponse.json({error:'Requête trop volumineuse.'},{status:413});
    let input: unknown;
    try { input = JSON.parse(text || '{}'); } catch { return NextResponse.json({error:'JSON invalide.'},{status:400}); }
    const path = request.nextUrl.pathname.slice('/api/'.length);
    if (path === 'session' && request.method === 'POST') {
      const loginName=input&&typeof input==='object'&&'username'in input&&typeof input.username==='string'?input.username.trim().toLowerCase().slice(0,100):'admin';
      if (!await takeLoginAttempt(prisma,Date.now(),loginName)) return NextResponse.json({error:'Trop de tentatives. Réessayez dans une minute.'},{status:429});
      const identity=await authenticate(prisma,input);
      if(!identity)return NextResponse.json({error:'Identifiants invalides.'},{status:401});
      const response = NextResponse.json({actor:identity});
      response.cookies.set(sessionCookie, issueSession({id:identity.id,role:identity.accountRole,sessionVersion:identity.sessionVersion}), {httpOnly:true,sameSite:'strict',secure:request.nextUrl.protocol==='https:'||Boolean(process.env.PROCLAIR_PUBLIC_ORIGIN?.startsWith('https://')),path:'/',maxAge:8*60*60});
      return response;
    }
    if(path==='agreements/portal/read'&&request.method==='POST')return NextResponse.json(await agreements.portalRead(input));
    if(path==='agreements/portal/accept'&&request.method==='POST')return NextResponse.json(await agreements.accept(input));
    if(path==='agreements/portal/pdf'&&request.method==='POST'){const pdf=await agreements.portalPdf(input);return new NextResponse(new Uint8Array(pdf.pdfBytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename=proclair-contract.pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
    if(path==='portal/read'&&request.method==='POST')return NextResponse.json(await portal.read(input));
    if(path==='portal/accept'&&request.method==='POST')return NextResponse.json(await portal.accept(input));
    const actor = await resolveActor(prisma,request);
    if (!actor) return NextResponse.json({error:'Connexion requise.'},{status:401});
    const grant=routePermission(path,request.method);if(grant)requirePermission(actor,grant);
    if(/^sales\/contracts\/[^/]+$/.test(path)&&request.method==='PATCH')return NextResponse.json(await agreements.updateDraft(path.split('/')[2],input,actor));
    if(/^sales\/contracts\/[^/]+\/revoke$/.test(path)&&request.method==='POST')return NextResponse.json(await agreements.revoke(path.split('/')[2],actor));
    if(['sales/followups','omega/sales-followups'].includes(path)&&request.method==='POST')return NextResponse.json(await new SalesFollowUps(prisma).propose(input,actor),{status:201});
    if(/^(sales\/followups|omega\/sales-followups)\/[^/]+$/.test(path)&&request.method==='PATCH')return NextResponse.json(await new SalesFollowUps(prisma).review(path.split('/')[2],input,actor));
    if(path==='integrations/providers/verify'&&request.method==='POST'){const result=await verifyProvider(input,actor);await prisma.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:'PROVIDER_CONNECTION_CHECKED',entityType:'Integration',entityId:result.provider,after:{outcome:result.outcome,externalEffects:false}}});return NextResponse.json(result)}
    if(path==='integrations/rotor/files/preview'&&request.method==='POST')return NextResponse.json(await new RotorFileImports(prisma).preview(input,actor));
    if(path==='integrations/rotor/files/apply'&&request.method==='POST')return NextResponse.json(await new RotorFileImports(prisma).apply(input,actor));
    if(path==='sales/contracts'&&request.method==='POST')return NextResponse.json(await agreements.createFromLead(input,actor),{status:201});
    if(path==='sales/quotes'&&request.method==='POST')return NextResponse.json(await new SellerQuotes(prisma).create(input,actor),{status:201});
    if(/^sales\/quotes\/[^/]+$/.test(path)&&request.method==='PATCH')return NextResponse.json(await new SellerQuotes(prisma).edit(path.split('/')[2],input,actor));
    if(/^sales\/quotes\/[^/]+\/issue$/.test(path)&&request.method==='POST')return NextResponse.json(await new SellerQuotes(prisma).issue(path.split('/')[2],input,actor));
    if(/^sales\/contracts\/[^/]+\/issue$/.test(path)&&request.method==='POST')return NextResponse.json(await agreements.issue(path.split('/')[2],input,actor));
    if(/^sales\/contracts\/[^/]+\/submit$/.test(path)&&request.method==='POST')return NextResponse.json(await agreements.submit(path.split('/')[2],input,actor));
    if(path==='integrations/communications/consent'&&request.method==='POST')return NextResponse.json(await new Communications(prisma).consent(input,actor));
    if(path==='integrations/communications/send'&&request.method==='POST')return NextResponse.json(await new Communications(prisma).send(input,actor));
    if(path==='finance/stripe/checkout'&&request.method==='POST')return NextResponse.json(await new StripePayments(prisma).checkout(input,actor));
    if (path === 'session/logout') { const response = NextResponse.json({ok:true}); response.cookies.set(sessionCookie,'',{path:'/',maxAge:0}); return response; }
    if(request.method==='PATCH'&&/^agreements\/[^/]+$/.test(path))return NextResponse.json(await agreements.updateDraft(path.split('/')[1],input,actor));
    if(request.method==='POST'&&/^agreements\/[^/]+\/issue$/.test(path))return NextResponse.json(await agreements.issue(path.split('/')[1],input,actor));
    if(request.method==='POST'&&/^agreements\/[^/]+\/schedule$/.test(path))return NextResponse.json(await agreements.schedule(path.split('/')[1],input,actor));
    if(request.method==='POST'&&/^agreements\/[^/]+\/revoke$/.test(path))return NextResponse.json(await agreements.revoke(path.split('/')[1],actor));
    if(request.method==='POST'&&/^prospecting\/[^/]+\/status$/.test(path))return NextResponse.json(await prospecting.quickStatus(path.split('/')[1],input,actor));
    if(request.method==='POST'&&/^integrations\/rotor\/imports\/[^/]+\/step$/.test(path))return NextResponse.json(await rotorImports.step(path.split('/')[3],actor));
    if(path==='integrations/rotor/imports'&&request.method==='POST')return NextResponse.json(await rotorImports.create(input,actor),{status:201});
    if(request.method==='PATCH'&&/^leads\/[^/]+$/.test(path))return NextResponse.json(await leads.update(path.split('/')[1],input,actor));
    if(request.method==='PATCH'&&/^territories\/[^/]+$/.test(path))return NextResponse.json(await territories.save(path.split('/')[1],input,actor));
    if(request.method==='PATCH'&&/^users\/[^/]+$/.test(path))return NextResponse.json(await users.update(path.split('/')[1],input,actor));
    if(request.method==='PATCH'&&/^prospecting\/[^/]+$/.test(path))return NextResponse.json(await prospecting.save(path.split('/')[1],input,actor));
    if (request.method === 'PATCH' && /^visits\/[^/]+$/.test(path)) return NextResponse.json(await service.updateVisit(path.split('/')[1],input,actor));
    if (request.method === 'PATCH' && /^customers\/[^/]+$/.test(path)) return NextResponse.json(await service.updateCustomer(path.split('/')[1],input,actor));
    if (request.method === 'PATCH' && /^contracts\/[^/]+$/.test(path)) return NextResponse.json(await service.updateContract(path.split('/')[1],input,actor));
    if (request.method === 'PATCH' && /^invoices\/[^/]+$/.test(path)) return NextResponse.json(await finance.updateDraft(path.split('/')[1],input,actor));
    if(request.method==='PATCH'&&/^quotes\/[^/]+$/.test(path))return NextResponse.json(await quotes.edit(path.split('/')[1],input,actor));
    if (request.method !== 'POST') return NextResponse.json({error:'Méthode non autorisée.'},{status:405});
    if (/^worker\/jobs\/[^/]+\/retry$/.test(path)) return NextResponse.json(await worker.retryJob(path.split('/')[2],input,actor));
    if (/^visits\/[^/]+\/transition$/.test(path)) return NextResponse.json(await service.transitionVisit(path.split('/')[1],input,actor));
    if (/^invoices\/[^/]+\/issue$/.test(path)) return NextResponse.json(await finance.issueInvoice(path.split('/')[1],input,actor));
    if (/^invoices\/[^/]+\/void$/.test(path)) return NextResponse.json(await finance.voidInvoice(path.split('/')[1],input,actor));
    if (/^expenses\/[^/]+\/void$/.test(path)) return NextResponse.json(await finance.voidExpense(path.split('/')[1],input,actor));
    if (/^payments\/[^/]+\/reverse$/.test(path)) return NextResponse.json(await finance.reversePayment(path.split('/')[1],input,actor));
    if(/^quotes\/[^/]+\/(issue|accept|decline|void)$/.test(path))return NextResponse.json(await quotes.decide(path.split('/')[1],path.split('/')[2],input,actor));
    if(/^quotes\/[^/]+\/convert$/.test(path))return NextResponse.json(await quotes.convert(path.split('/')[1],input,actor));
    if(/^leads\/[^/]+\/stage$/.test(path))return NextResponse.json(await leads.move(path.split('/')[1],input,actor));
    if(/^leads\/[^/]+\/conversion-preview$/.test(path))return NextResponse.json(await leads.conversionPreview(path.split('/')[1],actor));
    if(/^leads\/[^/]+\/convert$/.test(path))return NextResponse.json(await leads.convert(path.split('/')[1],input,actor));
    if(/^integrations\/rotor\/capabilities\/[^/]+\/acknowledge$/.test(path))return NextResponse.json(await registry.acknowledge(path.split('/')[3],input,actor));
    switch(path) {
      case 'leads':return NextResponse.json(await leads.create(input,actor),{status:201});
      case 'integrations/rotor/monitor':return NextResponse.json(await rotorMonitor.configure(input,actor));
      case 'integrations/rotor/pin-types':return NextResponse.json(await rotorMap.refreshTypes(actor));
      case 'integrations/rotor/pins/preview':return NextResponse.json(await rotorMap.preview(input,actor));
      case 'integrations/rotor/pins/import':return NextResponse.json(await rotorMap.importPage(input,actor));
      case 'integrations/rotor/pins/activity':return NextResponse.json(await rotorMap.readChecked('summarize_map_pin_activity',input,actor));
      case 'users':return NextResponse.json(await users.create(input,actor),{status:201});
      case 'prospecting':return NextResponse.json(await prospecting.save(null,input,actor),{status:201});
      case 'integrations/rotor/connect': {
        const scopeInput=z.object({scopes:z.array(z.string()).max(30).optional()}).strict().parse(input);const flow=await beginRotor(scopeInput.scopes);const response=NextResponse.json({url:flow.url});response.cookies.set('rotor_actor',issueSession({id:actor.id,role:actor.accountRole,sessionVersion:actor.sessionVersion},600000),{httpOnly:true,secure:true,sameSite:'lax',path:'/api/integrations/rotor/callback',maxAge:600});response.cookies.set('rotor_oauth',flow.cookie,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/integrations/rotor/callback',maxAge:600});return response;
      }
      case 'integrations/rotor/renew': {const state=await renewRotor();await prisma.auditEvent.create({data:{actorId:actor.id,actorRole:actor.role,action:'ROTOR_RENEWED',entityType:'Integration',entityId:'rotor',after:{access:'READ_ONLY'}}});return NextResponse.json(state);}
      case 'integrations/rotor/revoke': {const result=await revokeRotor();await prisma.auditEvent.create({data:{actorId:actor.id,actorRole:actor.role,action:'ROTOR_REVOKED',entityType:'Integration',entityId:'rotor',after:result}});return NextResponse.json(result);}
      case 'integrations/rotor/tools': {const discovery=await rotorTools();await registry.record(discovery,actor);return NextResponse.json(discovery);}
      case 'integrations/rotor/sync/preview': {
        const v=rotorSyncInput.parse(input);for(const name of ['list_customers','list_jobs','list_visits'])validateRotorSchema((await registry.schema(name)).inputSchema,name==='list_visits'?{page:v.page,limit:25,start:v.start,end:v.end}:{page:v.page,limit:25});
        return NextResponse.json(await previewRotorMirror(v.page,v.start,v.end));
      }
      case 'integrations/rotor/sync/apply': {
        const v=rotorSyncInput.extend({approved:z.literal(true)}).parse(input);for(const name of ['list_customers','list_jobs','list_visits'])validateRotorSchema((await registry.schema(name)).inputSchema,name==='list_visits'?{page:v.page,limit:25,start:v.start,end:v.end}:{page:v.page,limit:25});
        return NextResponse.json(await applyRotorMirror(prisma,v.page,v.start,v.end));
      }
      case 'integrations/rotor/disconnect': {const result=await disconnectRotor();await prisma.auditEvent.create({data:{actorId:actor.id,actorRole:actor.role,action:'ROTOR_DISCONNECTED_LOCAL',entityType:'Integration',entityId:'rotor',after:{connected:false,remoteRevoked:false}}});return NextResponse.json(result);}
      case 'portal/links': return NextResponse.json(await portal.create(input,actor));
      case 'portal/revoke': return NextResponse.json(await portal.revoke(input,actor));
      case 'settings/business': return NextResponse.json(await saveBusinessProfile(prisma,input,actor));
      case 'quotes': return NextResponse.json(await quotes.create(input,actor),{status:201});
      case 'integrations/rotor/promotion/preview': return NextResponse.json(await rotorPromotion.preview(input,actor));
      case 'integrations/rotor/promotion/apply': return NextResponse.json(await rotorPromotion.apply(input,actor));
      case 'agreements': return NextResponse.json(await agreements.create(input,actor),{status:201});
      case 'omega/assistant': return NextResponse.json(await omegaAssistant(prisma,input,actor));
      case 'territories': return NextResponse.json(await territories.save(null,input,actor),{status:201});
      case 'customers': return NextResponse.json(await service.createCustomer(input,actor),{status:201});
      case 'properties': return NextResponse.json(await service.createProperty(input,actor),{status:201});
      case 'contracts': return NextResponse.json(await service.createContract(input,actor),{status:201});
      case 'jobs': return NextResponse.json(await service.createJob(input,actor),{status:201});
      case 'visits': return NextResponse.json(await service.createVisit(input,actor),{status:201});
      case 'expenses': return NextResponse.json(await finance.recordExpense(input,actor),{status:201});
      case 'invoices': return NextResponse.json(await finance.createInvoice(input,actor),{status:201});
      case 'payments': {
        if (!input || typeof input !== 'object' || !('invoiceId' in input) || typeof input.invoiceId !== 'string') return NextResponse.json({error:'Facture requise.'},{status:400});
        const {invoiceId,...payment} = input;
        return NextResponse.json(await finance.recordPayment(invoiceId,payment,actor),{status:201});
      }
      case 'omega/preview': return NextResponse.json(await service.previewFill(input,actor));
      case 'omega/apply': requirePermission(actor,'dispatch');return NextResponse.json(await service.applyFill(input,actor));
      case 'worker/state': return NextResponse.json(await worker.configure(input as {enabled:boolean},actor));
      case 'worker/tick': return NextResponse.json(await worker.tick());
      case 'worker/run': {
        if (!input || typeof input !== 'object' || !('date' in input) || typeof input.date !== 'string') return NextResponse.json({error:'Date requise.'},{status:400});
        return NextResponse.json(await worker.enqueue(input.date,actor),{status:201});
      }
      default: return NextResponse.json({error:'Route introuvable.'},{status:404});
    }
  } catch(error) { return errorResponse(error); }
}
export const POST = mutate;
export const PATCH = mutate;

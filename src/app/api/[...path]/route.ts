import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/db';
import { actorFor, checkPassword, issueSession, sameOrigin, sessionCookie } from '@/lib/auth';
import { CRMService } from '@/domain/service';
import { DomainError } from '@/domain/rules';
import { OmegaWorker } from '@/omega/worker';
import { FinanceService } from '@/finance/service';
import {invoiceDocument,invoiceDocumentCsp} from '@/lib/invoice-document';
import {csvRows, sumCents} from '@/lib/finance-export';
export const runtime = 'nodejs';
const service = new CRMService(prisma);
const worker = new OmegaWorker(prisma);
const finance = new FinanceService(prisma);
let failedLogins = 0;
let loginWindow = Date.now();
function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({error:'Champs invalides.',details:error.flatten()}, {status:400});
  if (error instanceof DomainError) return NextResponse.json({error:error.message,code:error.code}, {status:error.status});
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'P2002' || error.code === 'P2034' || error.code === 'P2025') return NextResponse.json({error:'Conflit de données. Rechargez puis réessayez.',code:'CONFLICT'}, {status:409});
    if (error.code === 'P2003') return NextResponse.json({error:'Référence inexistante.',code:'INVALID_REFERENCE'}, {status:400});
  }
  console.error('Erreur API Proclair', error instanceof Error ? error.name : 'Unknown');
  return NextResponse.json({error:'Service indisponible. Consultez les journaux serveur.'}, {status:503});
}
export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname.slice('/api/'.length);
    if (path === 'health') { await prisma.$queryRaw`SELECT 1`; return NextResponse.json({status:'ok',database:'connected'}); }
    const actor = actorFor(request);
    if (!actor) return NextResponse.json({error:'Connexion requise.'},{status:401});
    if (path === 'session') return NextResponse.json({actor});
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
      const [customers,properties,contracts,jobs,visits,technicians,audits,plans] = await Promise.all([service.listCustomers(),service.listProperties(),service.listContracts(),service.listJobs(),service.listVisits(),service.listTechnicians(),service.listAudit(),prisma.omegaPlan.findMany({orderBy:{createdAt:'desc'},take:30})]);
      return NextResponse.json({customers,properties,contracts,jobs,visits,technicians,audits,plans});
    }
    if (path.startsWith('customers/')) return NextResponse.json(await service.getCustomer(path.split('/')[1]));
    return NextResponse.json({error:'Route introuvable.'},{status:404});
  } catch(error) { return errorResponse(error); }
}
async function mutate(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({error:'Origine non autorisée.'},{status:403});
    const text = await request.text();
    if (Buffer.byteLength(text) > 65536) return NextResponse.json({error:'Requête trop volumineuse.'},{status:413});
    let input: unknown;
    try { input = JSON.parse(text || '{}'); } catch { return NextResponse.json({error:'JSON invalide.'},{status:400}); }
    const path = request.nextUrl.pathname.slice('/api/'.length);
    if (path === 'session' && request.method === 'POST') {
      if (Date.now()-loginWindow > 60_000) {loginWindow=Date.now();failedLogins=0;}
      if (failedLogins >= 8) return NextResponse.json({error:'Trop de tentatives. Réessayez dans une minute.'},{status:429});
      if (!input || typeof input !== 'object' || !('password' in input) || typeof input.password !== 'string' || input.password.length > 256 || !checkPassword(input.password)) {
        failedLogins++;
        return NextResponse.json({error:'Identifiants invalides.'},{status:401});
      }
      const response = NextResponse.json({actor:{id:'admin',role:'ADMIN'}});
      response.cookies.set(sessionCookie, issueSession(), {httpOnly:true,sameSite:'strict',secure:request.nextUrl.protocol==='https:',path:'/',maxAge:8*60*60});
      return response;
    }
    const actor = actorFor(request);
    if (!actor) return NextResponse.json({error:'Connexion requise.'},{status:401});
    if (path === 'session/logout') { const response = NextResponse.json({ok:true}); response.cookies.set(sessionCookie,'',{path:'/',maxAge:0}); return response; }
    if (request.method === 'PATCH' && /^visits\/[^/]+$/.test(path)) return NextResponse.json(await service.updateVisit(path.split('/')[1],input,actor));
    if (request.method === 'PATCH' && /^customers\/[^/]+$/.test(path)) return NextResponse.json(await service.updateCustomer(path.split('/')[1],input,actor));
    if (request.method === 'PATCH' && /^contracts\/[^/]+$/.test(path)) return NextResponse.json(await service.updateContract(path.split('/')[1],input,actor));
    if (request.method === 'PATCH' && /^invoices\/[^/]+$/.test(path)) return NextResponse.json(await finance.updateDraft(path.split('/')[1],input,actor));
    if (request.method !== 'POST') return NextResponse.json({error:'Méthode non autorisée.'},{status:405});
    if (/^visits\/[^/]+\/transition$/.test(path)) return NextResponse.json(await service.transitionVisit(path.split('/')[1],input,actor));
    if (/^invoices\/[^/]+\/issue$/.test(path)) return NextResponse.json(await finance.issueInvoice(path.split('/')[1],input,actor));
    if (/^invoices\/[^/]+\/void$/.test(path)) return NextResponse.json(await finance.voidInvoice(path.split('/')[1],input,actor));
    if (/^expenses\/[^/]+\/void$/.test(path)) return NextResponse.json(await finance.voidExpense(path.split('/')[1],input,actor));
    if (/^payments\/[^/]+\/reverse$/.test(path)) return NextResponse.json(await finance.reversePayment(path.split('/')[1],input,actor));
    switch(path) {
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
      case 'omega/apply': return NextResponse.json(await service.applyFill(input,actor));
      case 'worker/state': return NextResponse.json(await worker.configure(input as {enabled:boolean},actor));
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

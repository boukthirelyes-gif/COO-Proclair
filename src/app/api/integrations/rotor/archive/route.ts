import {NextRequest,NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {resolveActor} from '@/lib/user-session';
import {requireArchivePermissions,safeArchiveError} from '@/lib/private-export';
import {rotorArchiveRead,type RotorArchiveTool} from '@/lib/rotor';

export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';

/**
 * Authenticated, READ-ONLY, one-page relay for a browser-generated private
 * Rotor archive. No data is written to GitHub, Vercel filesystem or logs.
 * All exported records are returned only to the authorized CRM session.
 */
const allowed=new Set<RotorArchiveTool>([
 'list_customers','list_leads','list_jobs','list_invoices','list_payments',
 'search_map_pins','list_service_plans','list_messages','list_quotes',
 'list_tasks','list_company_members','list_message_templates','list_campaigns',
 'list_pipelines','list_pipeline_stages','list_map_pin_types',
 'list_visits','list_timesheets','list_visit_timers','list_payroll',
]);
const ranged=new Set<RotorArchiveTool>(['list_visits','list_timesheets','list_visit_timers','list_payroll']);
const unpaged=new Set<RotorArchiveTool>(['list_pipelines','list_pipeline_stages','list_map_pin_types']);
const replyHeaders={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
export async function GET(request:NextRequest){
 try{
  const actor=await resolveActor(prisma,request);
  if(!actor)return NextResponse.json({error:'Connexion requise.'},{status:401,headers:replyHeaders});
  requireArchivePermissions(actor,'list_customers');
  const query=request.nextUrl.searchParams;
  const tool=query.get('tool') as RotorArchiveTool|null;
  if(!tool||!allowed.has(tool))return NextResponse.json({error:'Catégorie export inconnue.'},{status:400,headers:replyHeaders});
  requireArchivePermissions(actor,tool);
  const args:Record<string,unknown>={};
  if(!unpaged.has(tool)){
   const page=Number(query.get('page')),limit=Number(query.get('limit')||'100');
   if(!Number.isSafeInteger(page)||page<1||page>=Number.MAX_SAFE_INTEGER||![25,50,100].includes(limit))
    return NextResponse.json({error:'Pagination invalide.'},{status:400,headers:replyHeaders});
   args.page=page;args.limit=limit;
   if(ranged.has(tool)){
    const start=query.get('start'),end=query.get('end');
    if(!start||!end)return NextResponse.json({error:'Période requise.'},{status:400,headers:replyHeaders});
    args.start=start;args.end=end;
   }
  }
  const result=await rotorArchiveRead(tool,args);
  return NextResponse.json(result,{headers:replyHeaders});
 }catch(e){
  // Never leak API keys, customer records or message bodies into the logs.
  const code=safeArchiveError(e);
  const invalid=['ROTOR_PAGE','ROTOR_RANGE','ROTOR_ARGUMENTS'].includes(code),auth=['ROTOR_AUTH','ROTOR_REAUTH','ROTOR_SCOPE'].includes(code),config=['CONFIG_REQUIRED','AUTH_CONFIGURATION_REQUIRED','CREDENTIAL_STORE'].includes(code);
  const status=code==='FORBIDDEN'?403:invalid?400:config?503:code==='ROTOR_RATE_LIMIT'?429:auth?409:502;
  const message=code==='FORBIDDEN'?'Accès à l’export refusé.':
   code==='ROTOR_SCOPE'?'Droit de lecture Rotor manquant. Reconnectez Rotor avec les autorisations de lecture nécessaires.':
   (code==='ROTOR_AUTH'||code==='ROTOR_REAUTH')?'Connexion Rotor absente ou expirée. Reconnectez-la dans Intégrations.':
   code==='ROTOR_RATE_LIMIT'?'Rotor limite temporairement les demandes, réessayez.':
   invalid?'Paramètres d’export invalides.':config?'Configuration d’export indisponible. Vérifiez les paramètres privés du CRM.':
   'Rotor ne répond pas à cette page. Réessayez ou réduisez la taille des pages.';
  return NextResponse.json({error:message,code},{status,headers:replyHeaders});
 }
}

import {SalesFollowUps} from './sales-followups';
import type {PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {DomainError} from '@/domain/rules';
import {requirePermission,type AccessActor} from '@/lib/access';
import {FinanceService} from '@/finance/service';
import {RotorInboxService} from '@/lib/rotor-inbox';
import {CommunicationFollowUps} from '@/providers/communication-followups';
const examples=['Combien de contrats actifs avons-nous ?','Qui n’a pas encore confirmé ?','Montre les factures impayées.','Quels clients ont des visites restantes ?','Remplis les routes de demain.'];
export async function omegaAssistant(db:PrismaClient,input:unknown,actor:AccessActor,dbSchema='public'){
 requirePermission(actor,'omega');requirePermission(actor,'crm.read');const {message}=z.object({message:z.string().trim().min(1).max(500)}).strict().parse(input),q=message.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();let response:any={mode:'ASSISTED',executed:false,source:'POSTGRESQL',generatedAt:new Date().toISOString(),examples};
 if(/suivi.*communication/.test(q)){
   if(!actor.permissions.includes('integrations'))response={...response,intent:'NOT_CONNECTED',answer:'Votre rôle ne permet pas de consulter les suivis de communications. Aucun SMS ou appel consulté.',rows:[]};
   else{const board=await new CommunicationFollowUps(db,undefined,dbSchema).list({status:'OPEN'},actor);response={...response,intent:'COMMUNICATION_FOLLOWUPS',answer:`${board.total} suivi(s) de communications ouvert(s). Examinez le tableau Suivis SMS et appels ci-dessous ; les sources modifiées ou désabonnées restent bloquées. Aucun contact externe effectué.`,rows:[],limited:board.total>board.pageSize};}
 }
 else if(/suivi.*vent|propositions?.*relance|relances?.*commercial/.test(q)){const board=await new SalesFollowUps(db).board(actor);response={...response,intent:'SALES_FOLLOWUPS',answer:`${board.candidates.length} dossier(s) éligible(s) affiché(s), ${board.tasks.filter((t:any)=>!['DONE','DISMISSED'].includes(t.status)).length} suivi(s) ouvert(s). Examinez le tableau de supervision avant de préparer ou approuver un suivi. Aucun message envoyé.`,rows:[],limited:board.limited}}
 else if(/contrats? actif/.test(q)){const [count,rows]=await Promise.all([db.contract.count({where:{active:true}}),db.contract.findMany({where:{active:true},take:20,orderBy:{createdAt:'desc'},select:{id:true,name:true,service:true,customerId:true}})]);response={...response,intent:'ACTIVE_CONTRACTS',answer:`${count} contrat(s) actif(s) enregistré(s).`,rows:rows.map(r=>({id:r.id,label:r.name,detail:r.service,view:'contracts',customerId:r.customerId})),limited:count>20}}
 else if(/confirm/.test(q)&&!/sms|message/.test(q)){const where={status:{in:['PENDING','PROPOSED','RESCHEDULED'] as any[]}};const [count,rows]=await Promise.all([db.visit.count({where}),db.visit.findMany({where,take:20,orderBy:{createdAt:'asc'},select:{id:true,service:true,status:true,customerId:true,customer:{select:{name:true}}}})]);response={...response,intent:'UNCONFIRMED',answer:`${count} visite(s) à confirmer ou replanifier. OMEGA ne les confirme pas automatiquement.`,rows:rows.map(r=>({id:r.id,label:r.customer.name,detail:r.service+' · '+r.status,view:'visits',customerId:r.customerId})),limited:count>20}}
 else if(/facture|impaye/.test(q)){requirePermission(actor,'finance');const {invoices}=await new FinanceService(db).readState(),unpaid=invoices.filter(i=>!['DRAFT','VOID'].includes(i.status)&&i.balanceCents>0),total=unpaid.reduce((n,i)=>n+i.balanceCents,0);response={...response,intent:'UNPAID_INVOICES',answer:`${unpaid.length} facture(s) impayée(s), solde total ${(total/100).toLocaleString('fr-CA',{style:'currency',currency:'CAD'})}. Aucun rappel envoyé.`,rows:unpaid.slice(0,20).map(r=>({id:r.id,label:r.number||r.id,detail:r.customer.name+' · '+(r.balanceCents/100).toLocaleString('fr-CA',{style:'currency',currency:'CAD'}),view:'invoices',customerId:r.customerId})),limited:unpaid.length>20}}
 else if(/restant|non servi/.test(q)){const contracts=await db.contract.findMany({where:{active:true},take:1001,select:{id:true,name:true,totalVisits:true,customerId:true,_count:{select:{visits:{where:{status:'COMPLETED'}}}}}});if(contracts.length>1000)throw new DomainError('OMEGA_SCOPE_TOO_LARGE','Filtrez les contrats avant cette analyse.',413);const rows=contracts.map(c=>({...c,remaining:Math.max(0,c.totalVisits-c._count.visits)})).filter(c=>c.remaining>0);response={...response,intent:'REMAINING_VISITS',answer:`${rows.length} contrat(s) actif(s) ont des passages restants selon les réalisations enregistrées. Ce calcul n’indique pas un encaissement.`,rows:rows.slice(0,20).map(c=>({id:c.id,label:c.name,detail:c.remaining+' passage(s) restant(s)',view:'contracts',customerId:c.customerId})),limited:rows.length>20}}
 else if(/rempl|route|planif/.test(q)){response={...response,intent:'PREPARE_PLAN',answer:'Je peux préparer une proposition pour les visites déjà confirmées. Le plan respecte les capacités et horaires ; les trajets utilisent encore une marge fixe, sans fournisseur de routage. Choisissez la date puis préparez le plan ci-dessous. L’application exigera votre approbation.',rows:[],action:'PREVIEW_PLAN'}}
 else if(/sms|texto|message texte|messages? clients?|suivis? sms/.test(q)){
   if(!actor.permissions.includes('integrations')){
    response={...response,intent:'NOT_CONNECTED',answer:'Accès aux SMS Rotor non autorisé pour ce rôle. Aucune conversation consultée ni réponse envoyée.',rows:[]};
   }else{
   const review=await new RotorInboxService(db).followups(actor);
   response={...response,intent:'ROTOR_SMS_FOLLOWUPS',
    answer:review.items.length+' conversation(s) dont le dernier SMS importé est entrant. Vérifiez le contexte dans Rotor avant toute réponse. Ces propositions ne confirment pas une visite et aucun SMS n’a été envoyé.',
    rows:review.items.map(item=>({id:item.customerId||item.externalId,label:item.customerName||item.phone||'Numéro non fourni',detail:item.body.slice(0,140),view:item.customerId?'customers':'integrations',customerId:item.customerId||undefined})),
    limited:review.partial||review.items.length>=20};
   }
 }
 else if(/sms|appel|courriel|commission|retouche/.test(q)){response={...response,intent:'NOT_CONNECTED',answer:'Cette demande nécessite un module ou un fournisseur qui n’est pas connecté pour cette action. Aucun message, appel, paiement ou calcul de commission exécuté.',rows:[]}}
 else response={...response,intent:'HELP',answer:'Choisissez une demande ci-dessous. Cet assistant utilise des requêtes métier déterministes sur les données réelles ; aucun modèle de langage n’est connecté.',rows:[]};
 await db.auditEvent.create({data:{actorId:actor.id,actorRole:actor.accountRole,action:'OMEGA_ASSISTANT_READ',entityType:'OmegaAssistant',entityId:response.intent,after:{intent:response.intent,source:'POSTGRESQL',executed:false,displayed:response.rows.length}}});return response;
}

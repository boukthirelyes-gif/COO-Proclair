/**
 * Deterministic French SMS triage for Rotor's read-only inbox.
 * Generates copy-ready drafts; never sends messages or modifies appointments.
 * Text is untrusted client input. Rules are priority ordered.
 */
export type SmsTriageKind =
 'OPT_OUT'|'URGENT'|'COMPLAINT'|'CANCELLATION'|'RESCHEDULE'|
 'PAYMENT'|'QUOTE'|'SCHEDULING'|'SERVICE_QUESTION'|'OTHER';
export type SmsTriage = {
 kind: SmsTriageKind;
 label: string;
 priority: 'urgent'|'high'|'normal';
 humanReviewRequired: boolean;
 suggestedReply: string|null;
 note: string;
 delivery: 'COPY_ONLY';
};

function normalized(text:string){
 return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLowerCase().slice(0,8000);
}
function contains(text:string,patterns:RegExp[]){
 return patterns.some(pattern=>pattern.test(text));
}
function draft(kind:SmsTriageKind,label:string,priority:SmsTriage['priority'],reply:string|null,note:string):SmsTriage{
 return {kind,label,priority,humanReviewRequired:true,suggestedReply:reply,note,delivery:'COPY_ONLY'};
}
const defaultReply='Bonjour, merci pour votre message! Je vérifie votre dossier et je vous reviens dès que possible. Merci, Proclair.';
export function suggestRotorSmsReply(body:string):SmsTriage{
 const raw=body.trim();
 const s=normalized(raw);
 if(!s)return draft('OTHER','Message vide','normal',null,'Aucune proposition sans message.');
 if(contains(s,[/^\s*(stop|stopall|unsubscribe|desabonn\w*|arret|quitte?r|quit)\s*[.!]?\s*$/,/\b(ne (m|'|me )?contactez plus|cessez? de m.ecrire|retirez? mon numero|desinscrivez[- ]?moi)\b/]))
  return draft('OPT_OUT','Désabonnement','urgent',null,'Ne pas répondre automatiquement. Appliquer et vérifier le désabonnement auprès du fournisseur.');
 if(contains(s,[/\b(urgence|urgent|danger|blessure|blesse|accident|inondation|fuite|police|incendie)\b/]))
  return draft('URGENT','Urgence','urgent',null,'Contacter humainement et sans délai; aucun engagement ni action automatique.');
 if(contains(s,[/\b(brise|bris[eé]e?|casse|endommage|rayure|dommage|reclamation|plainte|insatisfait|decu|avocat|rembours)\b/,/\b(mauvais travail|pas content|pas satisfait|qualite du lavage)\b/]))
  return draft('COMPLAINT','Plainte ou dommage','high',
   'Bonjour, merci de nous avoir écrit. Je prends votre situation au sérieux et je vais vérifier le dossier avec notre équipe pour vous revenir avec une solution. Merci, Proclair.',
   'Validation humaine obligatoire avant toute promesse, remboursement ou reconnaissance de responsabilité.');
 if(contains(s,[/\b(annul|annulation|cancel)\w*\b/]))
  return draft('CANCELLATION','Annulation demandée','high',
   'Bonjour! J’ai bien reçu votre demande d’annulation. Je vais vérifier votre rendez-vous et vous confirmer la suite. Merci, Proclair.',
   'Ne pas annuler sans vérifier le client, le contrat et le calendrier.');
 if(contains(s,[/\b(report|deplac|replanif|changer|remettre|repouss|reschedul)\w*\b/,/\b(autre date|autre jour|pas disponible|pas la cette journee)\b/]))
  return draft('RESCHEDULE','Report demandé','high',
   'Bonjour! Pas de problème, j’ai bien reçu votre demande de changement de date. Je vais vérifier les disponibilités et vous proposer une autre plage. Rien n’est confirmé pour le moment. Merci, Proclair.',
   'Aucune modification d’horaire avant validation de capacité et du rendez-vous existant.');
 if(contains(s,[/\b(facture|facturation|payer|paiement|versement|credit|debit|carte|interac|recu|transaction)\b/]))
  return draft('PAYMENT','Question de paiement','high',
   'Bonjour! Merci pour ton message. Je vais vérifier ton dossier et la facture avant de te confirmer les détails du paiement. Merci, Proclair.',
   'Vérifier les montants et le statut réel, ne jamais demander des informations de carte par SMS.');
 if(contains(s,[/\b(prix|combien|cout|tarif|soumission|estimation|devis|rabais)\b/]))
  return draft('QUOTE','Demande de prix','normal',
   'Bonjour! Oui, on peut regarder ça. Pour te donner un prix juste, peux-tu me confirmer l’adresse et ce que tu aimerais faire laver (extérieur, intérieur ou les deux)? Merci, Proclair.',
   'Ne pas inventer de devis : vérifier dimensions, services, extras et tarification avant de chiffrer.');
 if(contains(s,[/\b(quand|dispo|disponibilite|reserve|reservation|book|horaire|rdv|rendez-vous|passer|venir|visite|semaine prochaine)\b/]))
  return draft('SCHEDULING','Disponibilité ou réservation','normal',
   'Bonjour! Merci pour ton message. On va regarder les disponibilités dans ton secteur et on te confirme une plage avant de réserver quoi que ce soit. Merci, Proclair.',
   'Ne pas promettre une date ni réserver sans contrôler la disponibilité et le contrat.');
 if(contains(s,[/\b(moustiquaires?|fenetres?|vitres?|interieur|exterieur|cadrages?|portes?|garages?|pluie|etre present|a la maison)\b/]))
  return draft('SERVICE_QUESTION','Question sur le lavage','normal',
   'Bonjour! Pour les lavages extérieurs, les fenêtres doivent être fermées et les moustiquaires extérieures retirées avant notre passage. Tu n’as généralement pas besoin d’être sur place pour l’extérieur. Si tu as une question particulière, écris-moi et je vais vérifier. Merci, Proclair.',
   'Vérifier que la question concerne bien un lavage extérieur; personnaliser avant envoi.');
 return draft('OTHER','À analyser','normal',defaultReply,
  'Intention inconnue : vérifier la conversation et la fiche client.');
}

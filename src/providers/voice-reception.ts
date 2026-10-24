import twilio from 'twilio';

/**
 * Receptionist V1: transparent, deterministic TwiML only.
 * No AI model, recording, invented appointments, or database mutations.
 * Never expose a new number to it until the operator validates a Preview call.
 */
const lang='fr-CA';
function clean(s:string){
 return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().slice(0,300);
}
function signedAction(origin:string){return origin+'/api/webhooks/twilio/voice-input';}
function signedCallAction(origin:string){return origin+'/api/webhooks/twilio/calls';}
function say(r:twilio.twiml.VoiceResponse,text:string){
 r.say({language:lang},text);
}
function forward(r:twilio.twiml.VoiceResponse,origin:string,target:string,from:string,ownPhone:string){
 // Call routing is enabled only by the outer signed webhook and guarded a second time.
 if(!/^\+[1-9]\d{7,14}$/.test(target)||target===from||target===ownPhone){
  say(r,'Je ne peux pas vous transférer en ce moment. Vous pouvez rappeler pendant les heures de bureau.');
  r.hangup();
  return;
 }
 say(r,'Je vous transfère maintenant à notre équipe.');
 r.dial({action:signedCallAction(origin),method:'POST',timeout:20},target);
 say(r,'Notre équipe est indisponible pour le moment. Merci de votre appel.');
 r.hangup();
}
export function receptionGreeting(origin:string){
 const r=new twilio.twiml.VoiceResponse();
 const g=r.gather({
  input:['speech','dtmf'],action:signedAction(origin),method:'POST',
  language:lang,speechModel:'phone_call',speechTimeout:'auto',
  timeout:5,numDigits:1,actionOnEmptyResult:true
 });
 g.say({language:lang},
  'Bonjour, vous avez joint Proclair. Je suis la réceptionniste automatisée. '+
  'Pour une estimation, dites estimation ou faites le un. '+
  'Pour un rendez-vous, un report ou une annulation, faites le deux. '+
  'Pour une facture ou un paiement, faites le trois. '+
  'Pour préparer votre lavage, faites le quatre. '+
  'Pour parler à une personne, faites le zéro.');
 return r.toString();
}
export function receptionInput(origin:string,p:Record<string,string>,target:string,ownPhone:string){
 const r=new twilio.twiml.VoiceResponse();
 const digits=(p.Digits||'').trim();
 const words=clean(p.SpeechResult||'');
 const human=digits==='0'||/humain|personne|agent|employe|representant|parler|plainte|reclamation|urgent|emergency|human|operator/.test(words);
 if(human||(!digits&&!words)){forward(r,origin,target,p.From||'',ownPhone);return r.toString();}
 if(digits==='1'||/prix|tarif|cout|estim|soumission|quote|price/.test(words)){
  say(r,'Nos prix dépendent du nombre de fenêtres et du travail demandé. Nous lavons les vitres extérieures, les cadrages et les portes. Un membre de notre équipe doit vérifier votre adresse et préparer une soumission. Appuyez sur zéro pour lui parler.');
 }else if(digits==='2'||/rendez|r.d.v|planif|reservation|book|horaire|deplac|report|annul|schedule|appointment/.test(words)){
  say(r,'Pour réserver, déplacer ou annuler une visite, nous devons consulter votre dossier et les disponibilités. Aucun rendez-vous n’est confirmé par ce menu. Appuyez sur zéro pour parler à notre équipe.');
 }else if(digits==='3'||/factur|paiement|payment|invoice|credit|carte/.test(words)){
  say(r,'Pour une question de facture ou de paiement, notre équipe pourra vérifier votre dossier. Nous ne demandons jamais votre numéro de carte dans ce menu. Appuyez sur zéro pour lui parler.');
 }else if(digits==='4'||/moustiquaire|prepar|fenetre|pluie|lavage|screen|window/.test(words)){
  say(r,'Avant un lavage extérieur, assurez-vous que les fenêtres sont fermées et retirez les moustiquaires extérieures. Vous n’avez généralement pas besoin d’être présent pour les travaux extérieurs. Appuyez sur zéro pour toute question.');
 }else{
  say(r,'Je n’ai pas compris votre demande. Je vais vous transférer à notre équipe.');
  forward(r,origin,target,p.From||'',ownPhone);
  return r.toString();
 }
 const again=r.gather({input:['dtmf'],action:signedAction(origin),method:'POST',numDigits:1,timeout:7,actionOnEmptyResult:true});
 again.say({language:lang},'Appuyez sur zéro pour parler à une personne, ou raccrochez si vous avez toutes les informations.');
 say(r,'Merci d’avoir appelé Proclair.');
 r.hangup();
 return r.toString();
}

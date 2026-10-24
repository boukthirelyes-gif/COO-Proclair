import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestRotorSmsReply} from '../src/omega/sms-drafts';

test('opt-out always suppresses draft and is urgent',()=>{
 for(const message of ['STOP','ARRÊT','unsubscribe','Retirez mon numéro']){
  const r=suggestRotorSmsReply(message);
  assert.equal(r.kind,'OPT_OUT',message);
  assert.equal(r.suggestedReply,null);
  assert.equal(r.priority,'urgent');
  assert.equal(r.delivery,'COPY_ONLY');
 }
});
test('urgent safety messages do not get a normal auto reply',()=>{
 const r=suggestRotorSmsReply('Urgence, mon garage est inondé');
 assert.equal(r.kind,'URGENT');
 assert.equal(r.suggestedReply,null);
 assert.equal(r.priority,'urgent');
});
test('complaints never promise a refund or acknowledge blame',()=>{
 const r=suggestRotorSmsReply('Vous avez brisé ma vitre, je veux être remboursé');
 assert.equal(r.kind,'COMPLAINT');
 assert.equal(r.priority,'high');
 assert.doesNotMatch(r.suggestedReply!,/on vous rembourse|notre faute/i);
});
test('reschedule and cancellations are distinct and never confirm a change',()=>{
 const cancel=suggestRotorSmsReply('Je veux annuler ma visite');
 const report=suggestRotorSmsReply('Peut-on déplacer mon rendez-vous?');
 assert.equal(cancel.kind,'CANCELLATION');
 assert.equal(report.kind,'RESCHEDULE');
 assert.match(cancel.note,/Ne pas annuler/);
 assert.match(report.suggestedReply!,/Rien n’est confirmé/);
});
test('questions about prices do not invent costs',()=>{
 const r=suggestRotorSmsReply('Combien pour laver les fenêtres de ma maison?');
 assert.equal(r.kind,'QUOTE');
 assert.doesNotMatch(r.suggestedReply!,/\$\s*\d|\d+\s*\$/);
 assert.match(r.suggestedReply!,/adresse/i);
});
test('scheduling and service questions are draft-only',()=>{
 const a=suggestRotorSmsReply('Êtes-vous disponibles la semaine prochaine?');
 const b=suggestRotorSmsReply('Dois-je enlever les moustiquaires?');
 assert.equal(a.kind,'SCHEDULING');
 assert.equal(b.kind,'SERVICE_QUESTION');
 for(const item of [a,b]){
  assert.equal(item.humanReviewRequired,true);
  assert.equal(item.delivery,'COPY_ONLY');
 }
});
test('unknown messages get a bounded, noncommittal acknowledgment',()=>{
 const r=suggestRotorSmsReply('Salut, je voulais juste vous joindre');
 assert.equal(r.kind,'OTHER');
 assert.match(r.suggestedReply!,/vérifie votre dossier/);
 assert.equal(suggestRotorSmsReply(' ').suggestedReply,null);
});

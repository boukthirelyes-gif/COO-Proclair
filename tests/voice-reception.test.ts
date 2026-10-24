import test from 'node:test';
import assert from 'node:assert/strict';
import {receptionGreeting,receptionInput} from '../src/providers/voice-reception';

const origin='https://preview.example.test';
const own='+15145550000';
const agent='+15145551111';
const caller='+15145552222';

test('voice greeting identifies automation and uses signed POST speech/DTMF callback',()=>{
 const xml=receptionGreeting(origin);
 assert.match(xml,/réceptionniste automatisée/);
 assert.match(xml,/input="speech dtmf"/);
 assert.match(xml,/language="fr-CA"/);
 assert.match(xml,/method="POST"/);
 assert.match(xml,/\/api\/webhooks\/twilio\/voice-input/);
 assert.doesNotMatch(xml,/<Record/);
 assert.doesNotMatch(xml,/<Dial/);
});
test('phone menu answers common requests without confirming a reservation or taking a payment',()=>{
 const appointment=receptionInput(origin,{From:caller,Digits:'2'},agent,own);
 assert.match(appointment,/Aucun rendez-vous n’est confirmé/);
 assert.doesNotMatch(appointment,/<Dial/);
 assert.doesNotMatch(appointment,/<Record/);
 const payment=receptionInput(origin,{From:caller,SpeechResult:'paiement facture'},agent,own);
 assert.match(payment,/numéro de carte/);
 assert.doesNotMatch(payment,/<Dial/);
});
test('human escalation transfers to configured distinct number, never to caller or self',()=>{
 const dial=receptionInput(origin,{From:caller,Digits:'0'},agent,own);
 assert.match(dial,/<Dial/);
 assert.match(dial,/\/api\/webhooks\/twilio\/calls/);
 assert.match(dial,/\+15145551111/);
 const loop=receptionInput(origin,{From:caller,Digits:'0'},own,own);
 assert.doesNotMatch(loop,/<Dial/);
 const backToCaller=receptionInput(origin,{From:caller,Digits:'0'},caller,own);
 assert.doesNotMatch(backToCaller,/<Dial/);
});
test('unknown or silent requests escalate rather than hallucinate answers',()=>{
 assert.match(receptionInput(origin,{From:caller,SpeechResult:'ça marche pas'},agent,own),/<Dial/);
 assert.match(receptionInput(origin,{From:caller},agent,own),/<Dial/);
});

import type {Prisma,VisitStatus} from '@prisma/client';
import {dayBounds,localParts} from '../domain/rules';

type Period={from:string;toExclusive:string;label:string};
type ConfirmationQuery={intent:'CONFIRMED'|'UNCONFIRMED';where:Prisma.VisitWhereInput;period:Period|null;label:string;statuses:VisitStatus[]}|{clarification:string};
const shift=(day:string,offset:number)=>new Date(new Date(day+'T12:00:00Z').getTime()+offset*86400000).toISOString().slice(0,10);
/** Bounded deterministic parsing; explicit unsupported date/time markers require clarification. */
export function confirmationQuery(message:string,now:Date):ConfirmationQuery{
 const q=message.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'");
 const statusRemainder=q.replace(/\b(?:non[ -]+confirm|sans\s+confirm|a\s+confirmer|pas(?:\s+[a-z']+){0,3}\s+confirm)[a-z]*\b/g,' ');
 const negative=statusRemainder!==q,positive=/\bconfirme(?:e?s?)?\b/.test(statusRemainder);
 if(negative&&positive)return {clarification:'Précisez un seul groupe : visites confirmées ou visites à confirmer. Aucune visite modifiée.'};
 if(!negative&&!positive)return {clarification:'Précisez si vous cherchez les visites confirmées ou les visites à confirmer. Aucune visite modifiée.'};
 const requests=[/\baujourd'hui\b|\baujourd hui\b/.test(q),/\bdemain\b/.test(q),/\bcette semaine\b/.test(q)];
 const remainder=q.replace(/\baujourd'hui\b|\baujourd hui\b|\bdemain\b|\bcette semaine\b/g,'');
 const unsupported=/\b(?:hier|avant|apres|depuis|jusqu['a-z]*|entre|d'ici|futur\w*|passe\w*|heure\w*|janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|semaine|mois|annee|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|prochain\w*|dernier\w*|matin\w*|soir\w*|midi|week[ -]*end|dans|jours?)\b|\b\d{4}(?:-\d{2}-\d{2})?\b|\b\d{1,2}[/:h]\d{0,2}\b/.test(remainder)||/\bapres[ -]+demain\b/.test(q);
 if(requests.filter(Boolean).length>1||unsupported)return {clarification:'Précisez une seule période prise en charge : aujourd’hui, demain ou cette semaine (Toronto). Les autres périodes et heures nécessitent une sélection dans le calendrier. Aucune visite modifiée.'};
 const p=localParts(now),today=`${p.year}-${p.month}-${p.day}`;
 let period:Period|null=null;
 if(requests[0]||requests[1]){const day=shift(today,requests[1]?1:0);period={from:day,toExclusive:shift(day,1),label:(requests[1]?'demain':'aujourd’hui')+' ('+day+', Toronto)'};}
 if(requests[2]){const dayNumber=new Date(today+'T12:00:00Z').getUTCDay(),monday=shift(today,-((dayNumber+6)%7));period={from:monday,toExclusive:shift(monday,7),label:'cette semaine (du '+monday+' au '+shift(monday,6)+', Toronto)'};}
 const statuses:VisitStatus[]=negative?['PENDING','PROPOSED','RESCHEDULED']:['CONFIRMED','SCHEDULED'];
 const where:Prisma.VisitWhereInput={status:{in:statuses},...(period?{startsAt:{gte:dayBounds(period.from).start,lt:dayBounds(period.toExclusive).start}}:{})};
 return {intent:negative?'UNCONFIRMED':'CONFIRMED',where,period,label:negative?'à confirmer ou replanifier':'confirmée(s) ou planifiée(s)',statuses};
}

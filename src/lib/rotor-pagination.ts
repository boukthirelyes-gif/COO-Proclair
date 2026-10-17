import {DomainError} from '@/domain/rules';

export type RotorCheckpoint={page:number;pages:number;received:number;total:number|null;done:boolean;lastHash:string|null};

/** Advance only inside the same transaction as the page's records. No page-count cap. */
export function advanceRotorCheckpoint(point:RotorCheckpoint,received:number,total:number|null,hasMore:boolean,hash:string):RotorCheckpoint{
 if(!Number.isSafeInteger(point.page)||point.page<1||point.page>=Number.MAX_SAFE_INTEGER||!Number.isSafeInteger(received)||received<0||received>25||typeof hasMore!=='boolean'||(hasMore&&received===0)||point.done)
  throw new DomainError('ROTOR_PROTOCOL','Pagination invalide ou checkpoint déjà terminé.',502);
 if(total!==null&&(!Number.isSafeInteger(total)||total<0))throw new DomainError('ROTOR_PROTOCOL','Total Rotor invalide.',502);
 if(point.total!==null&&total!==null&&point.total!==total)throw new DomainError('ROTOR_TOTAL_CHANGED','Le total Rotor a changé pendant la lecture. Relancez un lot cohérent ; aucune page partielle enregistrée.',409);
 const count=point.received+received,knownTotal=total??point.total;
 if(!Number.isSafeInteger(count)||!Number.isSafeInteger(point.pages+1))throw new DomainError('ROTOR_PROTOCOL','Compteur trop grand.',502);
 if(knownTotal!==null&&(count>knownTotal||(!hasMore&&count!==knownTotal)||(hasMore&&count>=knownTotal)))
  throw new DomainError('ROTOR_COUNT_MISMATCH','Le total annoncé ne correspond pas à la progression des identifiants uniques.',502);
 if(point.lastHash===hash&&hasMore)throw new DomainError('ROTOR_PAGE_REPEAT','Rotor répète une page sans progression.',502);
 return {...point,page:point.page+1,pages:point.pages+1,received:count,total:knownTotal,done:!hasMore,lastHash:hash};
}

/** A completed scope never certifies the migration of unavailable categories. */
export function rotorCompleteness(points:Partial<Record<string,RotorCheckpoint>>){
 return {migrationCertified:false,categories:Object.fromEntries(Object.entries(points).filter((entry):entry is [string,RotorCheckpoint]=>Boolean(entry[1])).map(([kind,p])=>[kind,{
  accessible:p.total,traversed:p.received,remaining:p.total===null?null:Math.max(0,p.total-p.received),
  confidence:!p.done?'INCOMPLETE':p.total===null?'END_REPORTED_TOTAL_UNKNOWN':'SOURCE_TOTAL_RECONCILED',
  explanation:!p.done?'Des pages restent à parcourir.':p.total===null?'Fin annoncée par Rotor ; exhaustivité non certifiable sans total fiable.':'Total annoncé rapproché dans le périmètre choisi ; les catégories absentes restent exclues.',
 }]))};
}

'use client';
import {useEffect,useRef,useState} from 'react';
const statusLabels:Record<string,string>={DRAFT:'À examiner',APPROVED:'Approuvée',DONE:'Traitée',DISMISSED:'Écartée',PENDING:'En attente',PROPOSED:'Proposée',CONFIRMED:'Confirmée',SCHEDULED:'Planifiée',IN_PROGRESS:'En cours',COMPLETED:'Terminée',CANCELLED:'Annulée',RESCHEDULED:'À replanifier',ACTIVE:'Actif',DO_NOT_CONTACT:'Ne pas contacter',CONVERTED:'Converti'};
const actionLabels:Record<string,string>={OMEGA_MISSION_APPROVE:'Mission approuvée',OMEGA_MISSION_DONE:'Traitement consigné',OMEGA_MISSION_DISMISS:'Mission écartée'};
const date=(v:string|null)=>v?new Date(v).toLocaleString('fr-CA',{timeZone:'America/Toronto'}):'Non renseigné';
export default function OmegaMissionDetail({id,onClose,onReview}:{id:string;onClose:()=>void;onReview:(mission:any)=>void}){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),dialog=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const controller=new AbortController();setData(null);setError('');
  fetch('/api/omega/supervisor/mission?id='+encodeURIComponent(id),{cache:'no-store',signal:controller.signal}).then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.error||'Fiche de mission indisponible.');if(!controller.signal.aborted)setData(v)}).catch(e=>{if(e.name!=='AbortError')setError(e.message)});
  return()=>controller.abort();
 },[id]);
 useEffect(()=>{
  const trigger=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const keydown=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();close.current();return}
   if(e.key!=='Tab')return;
   const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')??[]).filter(element=>element.getClientRects().length>0);
   const first=controls[0],last=controls.at(-1);if(!first)return;
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  };
  document.addEventListener('keydown',keydown);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);if(trigger?.isConnected)trigger.focus()};
 },[]);
 return <div className="omega-mission-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}><section className="omega-mission-dialog" role="dialog" aria-modal="true" aria-labelledby="omega-mission-detail-heading" ref={dialog}>
  <header><div><span className="eyebrow">OMEGA / EXPLICATION ET DÉCISIONS</span><h2 id="omega-mission-detail-heading">Fiche de mission OMEGA</h2></div><button onClick={onClose} aria-label="Fermer la fiche de mission">Fermer</button></header>
  {error&&<p role="alert" className="notice">{error}</p>}{!data&&!error&&<p role="status">Lecture de la mission et de sa source…</p>}
  {data&&<><div className="omega-mission-detail-title"><strong>{data.mission.label}</strong><span className="badge">{statusLabels[data.mission.status]}</span><p>{data.mission.detail}</p></div>
   <div className="omega-mission-explanation"><h3>Pourquoi OMEGA a préparé cette mission</h3><p>{data.explanation}</p><small>Créée le {date(data.mission.createdAt)} · Toronto. La préparation n’exécute aucune action client.</small></div>
   <section className={'omega-source-proof '+(data.source.current?'current':'changed')}><h3>Vérification du dossier source</h3><p role="status">{data.source.reason}</p><dl><div><dt>État actuel</dt><dd>{statusLabels[data.source.status]||data.source.status||'Dossier absent'}</dd></div><div><dt>Règle encore applicable</dt><dd>{data.source.eligible?'Oui':'Non'}</dd></div>{data.mission.rule==='LEAD_CALLBACK'?<><div><dt>Échéance du rappel</dt><dd>{date(data.source.followUpAt)}</dd></div><div><dt>Restriction de prospection</dt><dd>{data.source.restricted?'Oui':'Non'}</dd></div></>:<><div><dt>Début prévu</dt><dd>{date(data.source.startsAt)}</dd></div><div><dt>Fin prévue</dt><dd>{date(data.source.endsAt)}</dd></div><div><dt>Contrat actif</dt><dd>{data.source.contractActive===null?'Non renseigné':data.source.contractActive?'Oui':'Non'}</dd></div><div><dt>Technicien affecté</dt><dd>{data.source.technicianAssigned?'Oui':'Non'}</dd></div></>}</dl><small>Vérifié le {date(data.checkedAt)} · Toronto. Les droits et la source seront revérifiés lors de votre décision.</small></section>
   <section className="omega-mission-history"><h3>Chronologie de la mission</h3><ol><li><strong>Mission préparée</strong><small>{date(data.mission.createdAt)} · OMEGA</small></li>{data.history.events.map((event:any)=><li key={event.id}><strong>{actionLabels[event.action]}</strong><small>{date(event.createdAt)} · {event.actor}</small>{event.note&&<p>{event.note}</p>}</li>)}</ol>{!data.history.allowed?<p>Votre rôle ne permet pas de consulter les décisions du journal d’audit.</p>:!data.history.events.length&&<p>Aucune décision auditée enregistrée.</p>}{data.history.hasMore&&<p>Les 25 premières décisions sont affichées. Consultez le journal d’audit pour la suite.</p>}</section>
   {data.mission.note&&<p className="notice">Dernière note : {data.mission.note}</p>}
   <footer><p>Lecture seule : aucun message, paiement ou changement de planning.</p>{['DRAFT','APPROVED'].includes(data.mission.status)&&<button className="primary" onClick={()=>onReview({...data.mission,current:data.source.current})}>Revoir la décision de cette mission</button>}</footer>
  </>}
 </section></div>
}

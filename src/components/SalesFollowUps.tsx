'use client';
import {useEffect,useState} from 'react';
import {torontoInput,torontoDate} from '@/lib/toronto';
type Row=Record<string,any>;
const reasons:Record<string,string>={CALLBACK_DUE:'Rappel arrivé à échéance',QUOTE_REMINDER:'Devis en attente d’accord',SIGNATURE_REMINDER:'Contrat en attente de signature',HANDOFF:'Vente signée à transmettre',DISPATCH:'Passages à préparer'};
const statuses:Record<string,string>={DRAFT:'À approuver',APPROVED:'Approuvée · traitement manuel',DONE:'Traitée manuellement',DISMISSED:'Écartée'};
const isOpen=(row:Row)=>['DRAFT','APPROVED'].includes(row.status);
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-CA');
export default function SalesFollowUps({global=false,navigate}:{global?:boolean;navigate:(view:string)=>void}){
 const [data,setData]=useState<Row|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState<Row|null>(null),[due,setDue]=useState(''),[review,setReview]=useState<Row|null>(null),[draft,setDraft]=useState(''),[note,setNote]=useState('');
 const [filter,setFilter]=useState('OPEN'),[search,setSearch]=useState(''),[reviewDue,setReviewDue]=useState('');
 const base=global?'/api/omega/sales-followups':'/api/sales/followups';
 async function request(path='',body?:Row,method='POST'){
  const r=await fetch(base+path,body?{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),v=await r.json();
  if(!r.ok)throw Error(v.error||'Suivi indisponible.');return v;
 }
 async function load(){const next=await request();setData(next);setReview(current=>{if(!current)return null;const row=next.tasks.find((row:Row)=>row.id===current.id);return row&&row.version===current.version?{...current,current:row.current,restricted:row.restricted}:null})}
 useEffect(()=>{load().catch(e=>setError(e.message))},[global]);
 async function propose(e:React.FormEvent){
  e.preventDefault();if(!selected)return;setBusy(true);setError('');setMessage('');
  try{await request('',{sourceKind:selected.sourceKind,sourceId:selected.sourceId,reason:selected.reason,fingerprint:selected.fingerprint,dueAt:torontoDate(due)});setSelected(null);setFilter('OPEN');setSearch('');setMessage('Proposition enregistrée. Aucun message envoyé.');await load()}
  catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function apply(action:string){
  if(!review)return;setBusy(true);setError('');setMessage('');
  try{
   await request('/'+review.id,{expectedVersion:review.version,action,approved:true,...(action==='APPROVE'?{draft}:{}),...(action==='RESCHEDULE'?{dueAt:torontoDate(reviewDue)}:{}),...(note.trim()?{note}:{})},'PATCH');
   setReview(null);setMessage(action==='APPROVE'?'Proposition approuvée pour traitement manuel. Aucun envoi automatique.':action==='DONE'?'Traitement manuel consigné. Aucune livraison de message revendiquée.':action==='RESCHEDULE'?'Échéance du suivi modifiée. Aucun rendez-vous ni message créé.':'Proposition écartée.');await load();
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 const tasks:Row[]=data?.tasks??[],reference=data?new Date(data.generatedAt).getTime():0;
 const overdue=(row:Row)=>isOpen(row)&&new Date(row.dueAt).getTime()<reference;
 const matches=(row:Row)=>normalize([row.label,reasons[row.reason]??'',statuses[row.status]??''].join(' ')).includes(normalize(search.trim()));
 const visible=tasks.filter(row=>matches(row)&&(filter==='ALL'||filter==='OPEN'&&isOpen(row)||filter==='OVERDUE'&&overdue(row)||filter==='CLOSED'&&!isOpen(row)||row.status===filter)).sort((a,b)=>Number(!isOpen(a))-Number(!isOpen(b))||new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()||a.id.localeCompare(b.id));
 return <section className="panel" aria-busy={busy}>
  <div className="panel-heading"><div><span className="eyebrow">OMEGA / SUIVI COMMERCIAL</span><h2>{global?'Supervision des ventes':'Mes suivis proposés par OMEGA'}</h2></div><button disabled={busy} onClick={()=>{setError('');load().catch(e=>setError(e.message))}}>Actualiser les suivis</button></div>
  <p>Propositions déterministes sur les dossiers enregistrés. Approuver prépare un suivi interne ; aucun SMS, appel, courriel, paiement ou rendez-vous n’est exécuté.</p>
  {error&&<p role="alert" className="notice">{error}</p>}{message&&<p role="status" className="notice success">{message}</p>}
  {!data?<p>Analyse des dossiers…</p>:<>
   {data.limited&&<p className="notice">Affichage borné à 100 dossiers par catégorie et 100 suivis. Les suivis ouverts sont chargés en priorité. Cette liste n’est pas exhaustive.</p>}
   <div className="stats" aria-label="Résumé des suivis chargés">
    {[['Suivis ouverts',tasks.filter(isOpen).length],['Échéances dépassées',tasks.filter(overdue).length],['À approuver',tasks.filter(t=>t.status==='DRAFT').length],['Dossiers à revérifier',tasks.filter(t=>isOpen(t)&&!t.current).length]].map(([label,count])=><div className="stat" key={label}><span>{label}</span><b>{count}</b></div>)}
   </div>
   <small>Compteurs sur les suivis chargés, au {new Date(data.generatedAt).toLocaleString('fr-CA',{timeZone:'America/Toronto'})} · Toronto. Actualisez pour recalculer les échéances.</small>
   <h3>Dossiers à examiner</h3>
   <div className="table-wrap"><table><thead><tr><th>Dossier</th><th>Motif</th><th>Action</th></tr></thead><tbody>{data.candidates.map((c:Row)=><tr key={c.sourceKind+c.sourceId+c.reason}>
    <td>{c.label}</td><td>{reasons[c.reason]}</td><td><button disabled={busy||tasks.some(t=>t.sourceKind===c.sourceKind&&t.sourceId===c.sourceId&&t.reason===c.reason&&t.sourceFingerprint===c.fingerprint)} onClick={()=>{setSelected(c);setDue(torontoInput(c.proposedDueAt));setReview(null);setError('');setMessage('')}}>Préparer une proposition</button><button onClick={()=>navigate(c.view)}>Ouvrir le module</button></td>
   </tr>)}</tbody></table></div>
   {!data.candidates.length&&<p>Aucun dossier éligible dans votre périmètre.</p>}
   {selected&&<form onSubmit={propose}><h3>{reasons[selected.reason]} · {selected.label}</h3><p>{selected.draft}</p><label>Échéance du suivi (Toronto)<input required type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label><button className="primary" disabled={busy}>Enregistrer la proposition</button><button type="button" disabled={busy} onClick={()=>setSelected(null)}>Annuler la proposition</button></form>}
   <h3>Suivis enregistrés</h3>
   <div className="form-grid">
    <label>Rechercher dans les suivis chargés<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Dossier, motif ou état"/></label>
    <label>Afficher les suivis<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="OPEN">Ouverts</option><option value="OVERDUE">Échéance dépassée</option><option value="DRAFT">À approuver</option><option value="APPROVED">Approuvés</option><option value="CLOSED">Clôturés</option><option value="ALL">Tous les suivis chargés</option></select></label>
   </div>
   <p aria-live="polite">{visible.length} suivi(s) affiché(s) sur {tasks.length} chargé(s). Les échéances les plus proches apparaissent en premier.</p>
   <div className="table-wrap"><table aria-label="Suivis commerciaux enregistrés"><thead><tr><th>Dossier</th><th>Échéance · Toronto</th><th>État</th><th>Supervision</th></tr></thead><tbody>{visible.map(t=><tr key={t.id}>
    <td>{t.label}<small>{reasons[t.reason]}</small></td><td>{new Date(t.dueAt).toLocaleString('fr-CA',{timeZone:'America/Toronto'})}{overdue(t)&&<small>Échéance dépassée</small>}</td>
    <td>{statuses[t.status]}{!t.current&&isOpen(t)&&<small>Dossier modifié ou suivi devenu inutile</small>}{t.completionNote&&<small>Compte rendu : {t.completionNote}</small>}</td>
    <td>{isOpen(t)&&<button disabled={busy} onClick={()=>{setReview(t);setDraft(t.draft);setNote('');setReviewDue(torontoInput(t.dueAt));setSelected(null);setError('');setMessage('')}}>Examiner le suivi</button>}</td>
   </tr>)}</tbody></table></div>
   {!tasks.length?<p>Aucun suivi enregistré.</p>:!visible.length&&<p>Aucun suivi ne correspond à ces filtres.</p>}
   {review&&<div className="panel"><h3>Examiner · {review.label}</h3>
    {!review.current&&<p className="notice">Le dossier a changé ou est restreint. Écartez ce suivi puis actualisez les dossiers.</p>}
    {review.status==='DRAFT'?<label>Texte proposé pour traitement manuel<textarea maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)}/></label>:<p style={{whiteSpace:'pre-wrap'}}>{review.draft}</p>}
    <label>Nouvelle échéance du suivi (Toronto)<input type="datetime-local" value={reviewDue} onChange={e=>setReviewDue(e.target.value)}/></label>
    <button disabled={busy||!review.current||!reviewDue||reviewDue===torontoInput(review.dueAt)} onClick={()=>apply('RESCHEDULE')}>Reporter le suivi</button>
    <label>Compte rendu du traitement manuel<textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label>
    {review.status==='DRAFT'&&<button className="primary" disabled={busy||!review.current||draft.trim().length<3} onClick={()=>apply('APPROVE')}>Approuver ce suivi</button>}
    {review.status==='APPROVED'&&<button className="primary" disabled={busy||!review.current||note.trim().length<3} onClick={()=>apply('DONE')}>Consigner le traitement manuel</button>}
    <button disabled={busy} onClick={()=>apply('DISMISS')}>Écarter ce suivi</button><button disabled={busy} onClick={()=>setReview(null)}>Fermer l’examen</button>
   </div>}
  </>}
 </section>
}

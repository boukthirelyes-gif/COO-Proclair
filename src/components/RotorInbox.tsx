'use client';
import {useEffect,useState} from 'react';

type Message={
 externalId:string;phone:string|null;direction:string;body:string;
 status:string|null;messageAt:string;contactId:string|null;threadId:string|null;
};
const dateLabel=(value:string)=>new Intl.DateTimeFormat('fr-CA',{
 timeZone:'America/Toronto',dateStyle:'medium',timeStyle:'short',
}).format(new Date(value));
export default function RotorInbox({connected,grantedScopes}:{connected:boolean;grantedScopes:string[]}){
 const [rows,setRows]=useState<Message[]>([]);
 const [total,setTotal]=useState(0);
 const [sourceTotal,setSourceTotal]=useState<number|null>(null);
 const [page,setPage]=useState(1);
 const [hasMore,setHasMore]=useState<boolean|null>(null);
 const [search,setSearch]=useState('');
 const [query,setQuery]=useState('');
 const [historyPage,setHistoryPage]=useState(1);
 const [filteredTotal,setFilteredTotal]=useState(0);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [auto,setAuto]=useState<any>(null);
 const [followups,setFollowups]=useState<any[]>([]);
 const authorized=connected&&grantedScopes.includes('inbox:read');
 async function loadAux(){
  const results=await Promise.all([
   fetch('/api/integrations/rotor/messages/auto',{cache:'no-store'}),
   fetch('/api/integrations/rotor/messages/followups',{cache:'no-store'}),
  ]);
  const a=await results[0].json(),b=await results[1].json();
  if(!results[0].ok||!results[1].ok)throw new Error(a.error||b.error||'Synchronisation indisponible.');
  setAuto(a);setFollowups(b.items||[]);
 }
 async function toggleAuto(){
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/integrations/rotor/messages/auto',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({enabled:!auto.enabled})});
   const data=await r.json();if(!r.ok)throw new Error(data.error||'Changement impossible.');
   setAuto(data);setNotice(data.enabled?'Synchronisation quotidienne activée (lecture seule).':'Synchronisation quotidienne désactivée.');
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function load(){
  const params=new URLSearchParams({page:String(historyPage)});
  if(query.trim())params.set('q',query.trim());
  const r=await fetch('/api/integrations/rotor/messages?'+params.toString(),{cache:'no-store'});
  const data=await r.json();
  if(!r.ok)throw new Error(data.error||'Historique Rotor indisponible.');
  setRows(data.rows);setTotal(data.localTotal);setFilteredTotal(data.total);
 }
 useEffect(()=>{if(connected)void load().catch(e=>setError(e.message))},[connected,query,historyPage]);
 useEffect(()=>{if(connected)void loadAux().catch(e=>setError(e.message))},[connected]);
 async function sync(){
  setBusy(true);setError('');setNotice('');
  try{
   const r=await fetch('/api/integrations/rotor/messages/sync',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({page,approved:true}),
   });
   const data=await r.json();
   if(!r.ok)throw new Error(data.error||'Import SMS Rotor indisponible.');
   setHasMore(data.hasMore);setSourceTotal(data.sourceTotal);
   await Promise.all([load(),loadAux()]);
   setNotice(data.imported+' SMS de la page '+page+' importés ou actualisés. Aucun SMS envoyé.');
  }catch(e:any){setError(e.message)}
  finally{setBusy(false)}
 }
 const filtered=rows;
 return <section className="panel" aria-busy={busy}>
  <div className="panel-heading"><h2>Boîte SMS Rotor / Surge</h2><button disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}>Actualiser</button></div>
  <p>Copie locale en lecture seule des SMS Rotor. Le numéro professionnel et les conversations restent chez Rotor/Surge. Cette boîte n’envoie pas de messages.</p>
  {!authorized&&<p className="notice" role="status">Pour importer les SMS, connectez Rotor ci-dessus avec le droit <code>inbox:read</code>, puis cliquez sur « Découvrir les outils disponibles ». Aucune clé Twilio nécessaire.</p>}
  {error&&<p className="notice" role="alert">{error}</p>}
  {notice&&<p className="notice success" role="status">{notice}</p>}
  <div className="panel" style={{marginBottom:16}}>
   <h3>Synchronisation automatique des SMS</h3>
   <p>Import des 100 SMS Rotor les plus récents une fois par jour à 13:30 UTC via Vercel. Désactivée par défaut. Si plus de 100 nouveaux messages arrivent entre deux passages, une importation manuelle des pages suivantes peut être nécessaire.</p>
   <p>État : <strong>{auto===null?'Vérification…':auto.enabled?'Activée':'Désactivée'}</strong>{auto?.lastRunAt?' · Dernier contrôle '+dateLabel(auto.lastRunAt):''}</p>
   {auto?.lastErrorCode&&<p role="alert">Dernière erreur de synchronisation : {auto.lastErrorCode}</p>}
   <button disabled={busy||!authorized||!auto} onClick={toggleAuto}>{auto?.enabled?'Désactiver la synchronisation':'Activer la synchronisation quotidienne'}</button>
  </div>
  <div className="toolbar" style={{flexWrap:'wrap'}}>
   <label>Page source Rotor <input type="number" min={1} max={2000} value={page} onChange={e=>{setPage(Math.max(1,Math.min(2000,Number(e.target.value)||1)));setHasMore(null)}}/></label>
   <button className="primary" disabled={!authorized||busy} onClick={sync}>Importer cette page (100 max.)</button>
   {hasMore&&page<2000&&<button disabled={busy} onClick={()=>{setPage(p=>p+1);setHasMore(null)}}>Page suivante →</button>}
  </div>
  <p><strong>{total}</strong> SMS dans le miroir local{sourceTotal!==null?' · '+sourceTotal+' éléments annoncés par Rotor pour la recherche SMS':''}. Import page par page uniquement sur demande.</p>
  <form onSubmit={e=>{e.preventDefault();setHistoryPage(1);setQuery(search)}} className="toolbar">
   <input aria-label="Rechercher dans tous les SMS Rotor importés" placeholder="Rechercher dans l'historique importé..." value={search} onChange={e=>setSearch(e.target.value)}/>
   <button type="submit">Rechercher</button>
   <button type="button" onClick={()=>{setSearch('');setQuery('');setHistoryPage(1)}}>Effacer</button>
  </form>
  <div style={{overflowX:'auto'}}><table>
   <thead><tr><th>Date · Toronto</th><th>Téléphone</th><th>Sens</th><th>Texte</th><th>État</th></tr></thead>
   <tbody>{filtered.map(m=><tr key={m.externalId}>
    <td>{dateLabel(m.messageAt)}</td>
    <td>{m.phone||'—'}</td>
    <td>{m.direction==='inbound'?'Reçu':'Envoyé'}</td>
    <td style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxWidth:450}}>{m.body}</td>
    <td>{m.status||'—'}</td>
   </tr>)}</tbody>
  </table></div>
  {!rows.length&&<p>Aucun SMS Rotor correspondant dans l'historique importé.</p>}
  <div className="toolbar"><span>{filteredTotal} résultat(s) dans l'historique importé.</span><button disabled={busy||historyPage===1} onClick={()=>setHistoryPage(p=>Math.max(1,p-1))}>← Précédent</button><span>Page {historyPage}</span><button disabled={busy||historyPage*100>=filteredTotal} onClick={()=>setHistoryPage(p=>p+1)}>Suivant →</button></div>
  <small>Recherche paginée dans les messages déjà importés. Aucun envoi ni transfert de numéro.</small>
  <h3>Conversations à examiner (lecture seule)</h3>
  <p>Le dernier SMS connu de ces conversations est entrant. Vérifiez Rotor avant de répondre : un message hors de la période importée peut manquer.</p>
  {followups.length?followups.map(item=><article className="service-contract" key={item.externalId}><strong>{item.customerName||item.phone||'Client non rapproché'}</strong><small>{dateLabel(item.messageAt)} · SMS reçu</small><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.body}</p></article>):<p>Aucun suivi détecté dans les messages importés.</p>}
 </section>
}

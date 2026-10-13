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
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const authorized=connected&&grantedScopes.includes('inbox:read');
 async function load(){
  const r=await fetch('/api/integrations/rotor/messages',{cache:'no-store'});
  const data=await r.json();
  if(!r.ok)throw new Error(data.error||'Historique Rotor indisponible.');
  setRows(data.rows);setTotal(data.total);
 }
 useEffect(()=>{if(connected)void load().catch(e=>setError(e.message))},[connected]);
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
   await load();
   setNotice(data.imported+' SMS de la page '+page+' importés ou actualisés. Aucun SMS envoyé.');
  }catch(e:any){setError(e.message)}
  finally{setBusy(false)}
 }
 const filtered=rows.filter(m=>(m.phone+' '+m.body+' '+(m.status||'')).toLowerCase().includes(search.toLowerCase()));
 return <section className="panel" aria-busy={busy}>
  <div className="panel-heading"><h2>Boîte SMS Rotor / Surge</h2><button disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}>Actualiser</button></div>
  <p>Copie locale en lecture seule des SMS Rotor. Le numéro professionnel et les conversations restent chez Rotor/Surge. Cette boîte n’envoie pas de messages.</p>
  {!authorized&&<p className="notice" role="status">Pour importer les SMS, connectez Rotor ci-dessus avec le droit <code>inbox:read</code>, puis cliquez sur « Découvrir les outils disponibles ». Aucune clé Twilio nécessaire.</p>}
  {error&&<p className="notice" role="alert">{error}</p>}
  {notice&&<p className="notice success" role="status">{notice}</p>}
  <div className="toolbar" style={{flexWrap:'wrap'}}>
   <label>Page source Rotor <input type="number" min={1} max={2000} value={page} onChange={e=>{setPage(Math.max(1,Math.min(2000,Number(e.target.value)||1)));setHasMore(null)}}/></label>
   <button className="primary" disabled={!authorized||busy} onClick={sync}>Importer cette page (100 max.)</button>
   {hasMore&&page<2000&&<button disabled={busy} onClick={()=>{setPage(p=>p+1);setHasMore(null)}}>Page suivante →</button>}
  </div>
  <p><strong>{total}</strong> SMS dans le miroir local{sourceTotal!==null?' · '+sourceTotal+' éléments annoncés par Rotor pour la recherche SMS':''}. Import page par page uniquement sur demande.</p>
  <input aria-label="Filtrer les SMS Rotor importés" placeholder="Rechercher téléphone ou message..." value={search} onChange={e=>setSearch(e.target.value)}/>
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
  {!rows.length&&<p>Aucun SMS Rotor importé pour l’instant.</p>}
  {rows.length>0&&<small>Affichage des 100 SMS locaux les plus récents. Aucun envoi ni transfert de numéro.</small>}
 </section>
}

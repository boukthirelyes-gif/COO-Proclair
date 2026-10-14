'use client';
import {useCallback,useEffect,useState} from 'react';

type Kind='payments'|'sms'|'invoices';
type Row={
 id:string;date:string;status:string;amountCents?:number|null;currency?:string;
 method?:string;customer?:string;reference?:string;direction?:string;phone?:string;content?:string;
};
type Page={source:'ROTOR';mode:'READ_ONLY_LIVE';kind:Kind;page:number;limit:number;total:number|null;hasMore:boolean;rows:Row[]};
const title:Record<Kind,string>={
 payments:'Paiements Rotor — Stripe et autres modes',
 sms:'SMS Rotor — numéro Surge existant',
 invoices:'Factures Rotor — source de référence'
};
const money=(cents:number|null|undefined,currency?:string)=>typeof cents==='number'
 ?new Intl.NumberFormat('fr-CA',{style:'currency',currency:(currency||'CAD').toUpperCase()}).format(cents/100):'—';
const date=(value:string)=>{if(!value)return '—';const d=new Date(value);return Number.isFinite(d.getTime())?
 new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',dateStyle:'short',timeStyle:'short'}).format(d):'—'};

export default function RotorLive({kind}:{kind:Kind}){
 const [page,setPage]=useState(1),[data,setData]=useState<Page|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const refresh=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{
  let active=true;
  const controller=new AbortController();
  setLoading(true);setError('');
  fetch('/api/integrations/rotor/live/'+kind+'?page='+page+'&limit=25',{signal:controller.signal,cache:'no-store'})
   .then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||'Connexion Rotor indisponible.');return body as Page})
   .then(d=>{if(active)setData(d)})
   .catch(e=>{if(active){setData(null);setError(e.message||'Lecture Rotor impossible.')}})
   .finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false;controller.abort()};
 },[kind,page,revision]);
 return <section className="panel" aria-busy={loading}>
  <div className="panel-heading"><div><h2>{title[kind]}</h2><p>Lecture directe de Rotor. Aucun doublon créé ; aucun paiement débité et aucun SMS envoyé.</p></div>
   <button onClick={refresh} disabled={loading}>Actualiser</button></div>
  {error&&<p className="notice" role="alert">{error} <span>Si les droits manquent, ouvrez Intégrations → Rotor et reconnectez avec {kind==='payments'?'payments:read':kind==='sms'?'inbox:read':'invoices:read'}.</span></p>}
  {loading&&<p role="status">Lecture de Rotor…</p>}
  {data&&!loading&&<><p role="status">Source : Rotor · {data.total===null?'Total non annoncé':data.total.toLocaleString('fr-CA')+' éléments'} · page {data.page} · données à la demande (pas une synchronisation automatique).</p>
   <div style={{overflowX:'auto'}}><table><thead><tr><th>Date</th>{kind==='sms'?<><th>Numéro</th><th>Direction</th><th>Texte</th></>:<><th>Client</th><th>Référence</th><th>Montant</th>{kind==='payments'&&<th>Moyen</th>}</>}<th>État</th></tr></thead>
    <tbody>{data.rows.map(r=><tr key={r.id}><td>{date(r.date)}</td>
     {kind==='sms'?<><td>{r.phone||'—'}</td><td>{r.direction==='inbound'?'Reçu':r.direction==='outbound'?'Envoyé':r.direction||'—'}</td><td style={{minWidth:250,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{r.content||'—'}</td></>:<><td>{r.customer||'—'}</td><td>{r.reference||'—'}</td><td>{money(r.amountCents,r.currency)}</td>{kind==='payments'&&<td>{r.method||'—'}</td>}</>}
     <td>{r.status||'—'}</td></tr>)}</tbody></table></div>
   {!data.rows.length&&<p>Aucune entrée pour cette page.</p>}
   <div className="toolbar" style={{flexWrap:'wrap',marginTop:12}}><button disabled={page<=1||loading} onClick={()=>setPage(p=>Math.max(1,p-1))}>← Précédent</button><span>Page {page}</span><button disabled={!data.hasMore||loading} onClick={()=>setPage(p=>p+1)}>Suivant →</button></div>
  </>}
 </section>;
}

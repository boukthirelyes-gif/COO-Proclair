'use client';
import {useEffect,useState} from 'react';
export default function Integrations(){
 const [state,setState]=useState<any>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[tools,setTools]=useState<any>(null),[revoking,setRevoking]=useState(false);
 const [mirror,setMirror]=useState<any>(null),[syncPreview,setSyncPreview]=useState<any>(null);
 const [syncPage,setSyncPage]=useState(1);
 const [syncStart,setSyncStart]=useState(()=>new Date(Date.now()-7*86400000).toISOString().slice(0,10));
 const [syncEnd,setSyncEnd]=useState(()=>new Date(Date.now()+22*86400000).toISOString().slice(0,10));
 async function request(action?:string){const response=await fetch('/api/integrations/rotor'+(action?'/'+action:''),action?{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}:{});const data=await response.json();if(!response.ok)throw new Error(data.error||'Connexion indisponible.');return data;}
 async function refresh(){setState(await request())}
 async function loadMirror(){
  const r=await fetch('/api/integrations/rotor/mirror');
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Miroir Rotor indisponible.');
  setMirror(data);
 }
 async function syncRotor(apply:boolean){
  setBusy(true);setError('');setMessage('');
  try{
   if(!syncStart||!syncEnd||syncStart>=syncEnd)throw new Error('Sélectionne une date de début antérieure à la fin.');
   const body={page:syncPage,start:new Date(syncStart+'T00:00:00').toISOString(),end:new Date(syncEnd+'T00:00:00').toISOString(),...(apply?{approved:true}:{})};
   const r=await fetch('/api/integrations/rotor/sync/'+(apply?'apply':'preview'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const data=await r.json();if(!r.ok)throw new Error(data.error||'Synchronisation Rotor impossible.');
   if(apply){setSyncPreview(null);await loadMirror();setMessage(data.imported+' enregistrement(s) Rotor sauvegardé(s) ou actualisé(s) en lecture seule pour cette page.');}
   else setSyncPreview(data);
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 }

 useEffect(()=>{refresh().then(()=>loadMirror()).catch(e=>setError(e.message))},[]);
 async function perform(action:string){setBusy(true);setError('');setMessage('');try{const result=await request(action);if(action==='connect')window.location.assign(result.url);else if(action==='tools'){setTools(result);await refresh()}else {setTools(null);setRevoking(false);await refresh();setMessage(action==='revoke'?'Rotor a confirmé la révocation de cette autorisation.':action==='renew'?'Accès renouvelé auprès de Rotor.':'Accès local supprimé. L’autorisation distante reste à révoquer chez Rotor.')}}catch(e:any){setError(e.message);try{await refresh()}catch{}}finally{setBusy(false)}}
 return <section className="panel" aria-busy={busy}><h2>Rotor × Proclair × OMEGA</h2><p>Rotor est une source facultative. Le CRM Proclair et son planificateur OMEGA fonctionnent sans cette connexion.</p>{error&&<p role="alert" className="notice">{error}</p>}{message&&<p role="status" className="notice success">{message}</p>}{!state?<p>Chargement de la connexion…</p>:<><p>État : <strong>{state.reauthRequired?'Reconnexion requise':state.connected?'Autorisation enregistrée':'Non connecté'}</strong></p><p>Cette connexion demande uniquement la lecture des clients, prestations, visites et factures, ainsi que le renouvellement de l’accès. OMEGA n’exécute aucune action dans Rotor.</p>{state.callbackUrl?<p>Adresse de retour OAuth : <code>{state.callbackUrl}</code></p>:<p>Configurez <code>PROCLAIR_PUBLIC_ORIGIN</code> avec l’adresse publique HTTPS du CRM, puis redémarrez le serveur pour activer la connexion.</p>}<button className="primary" disabled={busy||!state.configured} onClick={()=>perform('connect')}>{state.hasAuthorization?'Reconnecter Rotor':'Connecter le compte Rotor Proclair'}</button>{state.hasAuthorization&&<><p>{state.renewable?'L’accès peut être renouvelé automatiquement lors de la découverte des outils.':'Rotor n’a pas fourni de renouvellement utilisable. Reconnectez le compte après expiration.'}{state.expiresAt&&<> Échéance du jeton courant : {new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',dateStyle:'medium',timeStyle:'short'}).format(new Date(state.expiresAt))} (Toronto).</>}</p><button disabled={busy||!state.connected} onClick={()=>perform('tools')}>Découvrir les outils disponibles</button><button disabled={busy||!state.renewable} onClick={()=>perform('renew')}>Renouveler l’accès</button><button disabled={busy} onClick={()=>{setRevoking(true);setError('')}}>Révoquer chez Rotor</button><button disabled={busy} onClick={()=>perform('disconnect')}>Déconnecter localement</button><p>La déconnexion locale supprime l’accès enregistré ici. La révocation demande aussi à Rotor d’invalider les jetons de cette connexion.</p></>}{revoking&&<div className="preview"><h3>Révoquer l’autorisation Proclair ?</h3><p>Le CRM perdra son accès à Rotor. Les données Rotor restent conservées. Une nouvelle connexion sera nécessaire pour rétablir l’accès.</p><button disabled={busy} onClick={()=>setRevoking(false)}>Retour</button><button disabled={busy} onClick={()=>perform('revoke')}>Confirmer la révocation chez Rotor</button></div>}{tools&&<><h3>Outils annoncés par Rotor</h3><p>{tools.tools.length} outil(s) découvert(s).{tools.hasMore?' Limite de découverte atteinte : la liste est partielle.':' Toutes les pages reçues ont été parcourues.'} Aucun outil métier exécuté, aucune donnée importée.</p><ul>{tools.tools.map((tool:any)=><li key={tool.name}><strong>{tool.name}</strong> — {tool.description}<details><summary>Paramètres annoncés</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(tool.inputSchema,null,2)}</pre></details></li>)}</ul></>}
 {state.connected&&<div className="panel" style={{marginTop:24}}>
  <h3>Synchroniser les données Rotor (lecture seule)</h3>
  <p>Import contrôlé par page : clients, prestations et visites Rotor. Ne modifie rien dans Rotor et ne crée aucun contrat ni visite fictive dans COO Proclair. Les données restent dans un miroir distinct.</p>
  <div className="toolbar" style={{flexWrap:'wrap'}}>
   <label>Début des visites <input type="date" value={syncStart} onChange={e=>{setSyncStart(e.target.value);setSyncPreview(null)}}/></label>
   <label>Fin exclusive <input type="date" value={syncEnd} onChange={e=>{setSyncEnd(e.target.value);setSyncPreview(null)}}/></label>
   <label>Page Rotor <input aria-label="Page Rotor" type="number" min={1} max={2000} value={syncPage} onChange={e=>{setSyncPage(Number(e.target.value));setSyncPreview(null)}}/></label>
   <button disabled={busy||!syncStart||!syncEnd} onClick={()=>syncRotor(false)}>Prévisualiser la page</button>
  </div>
  <p><small>Chaque page lit au plus 25 clients, 25 prestations et 25 visites dans la période. Les pages doivent être importées séparément pour éviter les opérations trop longues.</small></p>
  {syncPreview&&<div className="preview">
   <h3>Aperçu Rotor — page {syncPreview.page}</h3>
   <p>{syncPreview.counts.customers} client(s), {syncPreview.counts.jobs} prestation(s), {syncPreview.counts.visits} visite(s). Aucune modification effectuée.</p>
   <ul>{syncPreview.samples.map((item:any)=><li key={item.kind+':'+item.externalId}>{item.kind} · {item.name} · {item.status||'Sans statut'}</li>)}</ul>
   <button disabled={busy} onClick={()=>syncRotor(true)}>Confirmer et importer cette page en lecture seule</button>
   <button disabled={busy} onClick={()=>setSyncPreview(null)}>Annuler</button>
   {(syncPreview.hasMore.customers||syncPreview.hasMore.jobs||syncPreview.hasMore.visits)&&<button disabled={busy||syncPage>=2000} onClick={()=>{setSyncPage(p=>p+1);setSyncPreview(null)}}>Page suivante →</button>}
  </div>}
  <h3>Enregistrements Rotor synchronisés</h3>
  <button disabled={busy} onClick={()=>loadMirror().catch(e=>setError(e.message))}>Actualiser le miroir</button>
  {mirror&&<><p>{mirror.counts.CUSTOMER||0} client(s), {mirror.counts.JOB||0} prestation(s), {mirror.counts.VISIT||0} visite(s) dans le miroir. Affichage des 50 derniers enregistrements.</p>
  <table><thead><tr><th>Type</th><th>Référence Rotor</th><th>Nom</th><th>Statut</th><th>Date de visite</th></tr></thead><tbody>{mirror.records.map((r:any)=><tr key={r.kind+':'+r.externalId}><td>{r.kind}</td><td>{r.externalId}</td><td>{r.name}</td><td>{r.status||'—'}</td><td>{r.startsAt?new Date(r.startsAt).toLocaleString('fr-CA',{timeZone:'America/Toronto'}):'—'}</td></tr>)}</tbody></table></>}
 </div>}
 </>}</section>;
}

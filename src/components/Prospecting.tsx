'use client';
import {useEffect,useState} from 'react';
import GoogleProspecting from './GoogleProspecting';
import LegacyProspecting from './LegacyProspecting';
export default function Prospecting(props:{initialId?:string;createLead?:(pin:any)=>void}){
 const [configuration,setConfiguration]=useState<{configured:boolean;browserKey:string|null}|null>(null),[failure,setFailure]=useState('');
 useEffect(()=>{
  const abort=new AbortController();let active=true;
  const timeout=setTimeout(()=>abort.abort(),8000);
  fetch('/api/prospecting/map-config',{signal:abort.signal,cache:'no-store'}).then(async response=>{
   const data=await response.json();if(!response.ok)throw Error('Configuration indisponible.');
   if(active)setConfiguration(data);
  }).catch(error=>{
   if(active){setFailure(error.name==='AbortError'?'Le serveur de carte ne répond pas. La carte de secours reste utilisable.':'La configuration de Google Maps est indisponible. La carte de secours reste utilisable.');setConfiguration({configured:false,browserKey:null})}
  }).finally(()=>clearTimeout(timeout));
  return()=>{active=false;clearTimeout(timeout);abort.abort()};
 },[]);
 if(!configuration)return <section className="panel" role="status">Préparation de votre carte Proclair…</section>;
 if(configuration.configured&&configuration.browserKey&&!failure)return <GoogleProspecting {...props} googleApiKey={configuration.browserKey} onMapFailure={setFailure}/>;
 return <><div className="notice map-connection-status" role="status"><strong>{failure?'Google Maps indisponible — carte de secours active':'Google Maps attend sa configuration'}</strong><p>{failure||'Ajoutez la clé navigateur Google Maps dans la configuration du serveur. La carte de secours et vos portes enregistrées restent disponibles.'}</p><button type="button" onClick={()=>window.location.reload()}>Réessayer la connexion Google Maps</button><details><summary>Diagnostic de connexion</summary><p>La configuration est lue au démarrage de la carte. Utilisez GOOGLE_MAPS_BROWSER_API_KEY ou NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, activez Maps JavaScript API et la facturation Google, puis autorisez le domaine HTTPS de cette version. Une modification des variables Vercel doit être appliquée au déploiement.</p></details></div><LegacyProspecting {...props}/></>;
}

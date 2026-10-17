'use client';
import {useRef,useState} from 'react';
export default function PinVisit({pin,canWrite,onRecorded}:{pin:any;canWrite:boolean;onRecorded:(p:any)=>void}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),operation=useRef<string|null>(null);
 async function record(){setBusy(true);setError('');operation.current??=crypto.randomUUID();try{const r=await fetch('/api/prospecting/'+pin.id+'/visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operationId:operation.current,expectedVersion:pin.version})});const p=await r.json();if(!r.ok)throw Error(p.error);operation.current=null;onRecorded(p)}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 return <section><h4>Passages de prospection déclarés</h4><p>{pin.visitCount||0} passage(s) · {pin.lastVisitedAt?new Date(pin.lastVisitedAt).toLocaleString('fr-CA',{timeZone:'America/Toronto'}):'Aucun passage enregistré'}</p><small>Déclaration volontaire du vendeur, sans preuve GPS ni surveillance permanente.</small>{canWrite&&<button type="button" disabled={busy||pin.status==='DO_NOT_CONTACT'||pin.type?.restricted} onClick={record}>Enregistrer mon passage à cette porte</button>}{error&&<p role="alert">{error}</p>}</section>
}

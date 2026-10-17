'use client';
import {useState} from 'react';
/** Explicit device draft, never background upload. Actor-bound and expires in 24h. */
export default function MapSessionTools({actorId,form,onRestore}:{actorId:string;form:any;onRestore:(v:any)=>void}){
 const [message,setMessage]=useState('');const key='proclair-map-draft:'+actorId;
 function save(){try{if(!actorId)throw Error();localStorage.setItem(key,JSON.stringify({actorId,expires:Date.now()+86400000,form}));setMessage('Brouillon conservé sur cet appareil pour 24 h. Restaurez puis enregistrez explicitement à la reconnexion.')}catch{setMessage('Stockage local indisponible.')}}
 function restore(){try{const raw=localStorage.getItem(key);if(!raw){setMessage('Aucun brouillon sur cet appareil.');return}const v=JSON.parse(raw);if(v.actorId!==actorId||v.expires<Date.now()){localStorage.removeItem(key);setMessage('Brouillon expiré et effacé.');return}onRestore(v.form);setMessage('Brouillon restauré. Vérifiez la fiche avant de l’enregistrer ; les conflits ne sont pas écrasés.')}catch{setMessage('Brouillon illisible.')}}
 return <section><h4>Brouillon hors ligne</h4><p>Option volontaire : contient les notes et l’adresse sur cet appareil. À utiliser sur votre appareil privé uniquement. Aucun envoi automatique.</p><button type="button" onClick={save}>Conserver ce brouillon sur cet appareil</button><button type="button" onClick={restore}>Restaurer mon brouillon</button><button type="button" onClick={()=>{localStorage.removeItem(key);setMessage('Brouillon effacé.')}}>Effacer mon brouillon</button><p role="status">{message}</p></section>
}

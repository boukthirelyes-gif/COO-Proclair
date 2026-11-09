'use client';
import {useEffect,useRef,useState} from 'react';
export default function AcceptInvitation(){
 const initialized=useRef(false);
 const [token,setToken]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[username,setUsername]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(initialized.current)return;initialized.current=true;setToken(new URLSearchParams(location.hash.slice(1)).get('token')||'');history.replaceState({},'',location.pathname)},[]);
 return <main className="panel account-security-page"><h1>Activer mon compte Proclair</h1>{error&&<p role="alert">{error}</p>}{username?<><p role="status">Compte activé. Connectez-vous avec votre identifiant : {username}.</p><a href="/">Se connecter</a></>:<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/invitations/accept',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})}),v=await r.json();if(!r.ok)throw Error(v.error||'Invitation indisponible.');setPassword('');setToken('');setUsername(v.username)}catch(e:any){setError(e.message)}finally{setBusy(false)}}}><p>Choisissez votre propre mot de passe. Le lien est personnel et utilisable une seule fois.</p><label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={12} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={busy||!token}>Activer mon compte</button></form>}</main>;
}

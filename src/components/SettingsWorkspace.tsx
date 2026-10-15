'use client';
import type {ReactNode} from 'react';
const entries=[['settings','Entreprise'],['team','Équipe et planning'],['users','Utilisateurs et rôles'],['stripe','Stripe'],['integrations','Intégrations'],['sms','Communications'],['data','Import et export'],['invoices','Facturation clients']] as const;
export default function SettingsWorkspace({active,allowed,onNavigate,onClose,children}:{active:string;allowed:(view:string)=>boolean;onNavigate:(view:string)=>void;onClose?:()=>void;children:ReactNode}){
 return <div className="settings-workspace"><div className="settings-workspace-menu"><span className="eyebrow">PARAMÈTRES PROCLAIR</span><nav aria-label="Paramètres Proclair">{entries.filter(([key])=>allowed(key)).map(([key,label])=><a key={key} href={'/?view='+key} aria-current={active===key?'page':undefined} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();onNavigate(key)}}>{label}</a>)}</nav>{onClose&&<button type="button" onClick={onClose}>← Retour au CRM</button>}</div><div className="settings-workspace-content">{children}</div></div>;
}

'use client';
import {useEffect,useState} from 'react';
export type ViewportBounds={south:number;north:number;west:number;east:number;zoom:number};
export function useProspectViewport(query:string,revision:number){
 const [bounds,setBounds]=useState<ViewportBounds|null>(null),[data,setData]=useState<any>(null),[error,setError]=useState('');
 useEffect(()=>{if(!bounds)return;const abort=new AbortController();setData(null);setError('');const timer=setTimeout(()=>{const p=new URLSearchParams(query);for(const [k,v]of Object.entries(bounds))p.set(k,String(v));fetch('/api/prospecting/viewport?'+p,{signal:abort.signal,cache:'no-store'}).then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.error||'Zone indisponible.');if(!abort.signal.aborted)setData(v)}).catch(e=>{if(e.name!=='AbortError')setError(e.message)})},180);return()=>{clearTimeout(timer);abort.abort()}},[query,bounds?.south,bounds?.north,bounds?.west,bounds?.east,bounds?.zoom,revision]);
 return {bounds,setBounds,data,error};
}

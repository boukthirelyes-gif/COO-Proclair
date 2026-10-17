'use client';
import {useEffect,useRef,useState} from 'react';
export type ViewportBounds={south:number;north:number;west:number;east:number;zoom:number};
export function useProspectViewport(query:string,revision:number){
 const [bounds,setBounds]=useState<ViewportBounds|null>(null),[data,setData]=useState<any>(null),[error,setError]=useState(''),[tick,setTick]=useState(0);
 const cache=useRef(new Map<string,{at:number;value:any}>()),previous=useRef(query+'|'+revision);
 useEffect(()=>{const refresh=()=>{if(!document.hidden&&navigator.onLine){cache.current.clear();setTick(n=>n+1)}};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh)}},[]);
 useEffect(()=>{if(!bounds)return;const abort=new AbortController();const signature=query+'|'+revision;if(previous.current!==signature){cache.current.clear();setData(null);previous.current=signature}setError('');const p=new URLSearchParams(query);for(const [k,v]of Object.entries(bounds))p.set(k,String(Math.round(v*100000)/100000));const key=p.toString(),hit=cache.current.get(key);if(hit&&Date.now()-hit.at<15000){setData(hit.value);return}
 const timer=setTimeout(()=>{fetch('/api/prospecting/viewport?'+p,{signal:abort.signal,cache:'no-store'}).then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.error||'Zone indisponible.');if(!abort.signal.aborted){if(cache.current.size>=8)cache.current.delete(cache.current.keys().next().value!);cache.current.set(key,{at:Date.now(),value:v});setData(v)}}).catch(e=>{if(e.name!=='AbortError'){setData(null);setError(e.message)}})},180);return()=>{clearTimeout(timer);abort.abort()}},[query,bounds?.south,bounds?.north,bounds?.west,bounds?.east,bounds?.zoom,revision,tick]);
 return {bounds,setBounds,data,error};
}

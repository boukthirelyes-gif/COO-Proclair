'use client';
import {useState} from 'react';

type Pin = {status?:string};
type Props = {
  pins:Pin[]; total:number; status:string; onStatus:(status:string)=>void;
  ready:boolean; onSector:(latitude:number,longitude:number,zoom:number)=>void;
  provider:'google'|'osm';
};
const sectors = [
  {name:'Vaudreuil-Dorion',latitude:45.398,longitude:-74.027,zoom:13},
  {name:'Valleyfield',latitude:45.258,longitude:-74.133,zoom:13},
  {name:'Saint-Lazare',latitude:45.405,longitude:-74.144,zoom:13},
  {name:'Saint-Zotique',latitude:45.249,longitude:-74.258,zoom:13},
  {name:'Coteau-du-Lac',latitude:45.302,longitude:-74.174,zoom:13},
  {name:'Rigaud',latitude:45.480,longitude:-74.301,zoom:13},
] as const;
const quickFilters=[
  {key:'',label:'Toutes',color:'#dddde3'},
  {key:'NOT_KNOCKED',label:'Non visitées',color:'#9aa4b2'},
  {key:'NO_HOME',label:'Absents',color:'#f5bf58'},
  {key:'CALLBACK',label:'Rappels',color:'#bf9aff'},
  {key:'SOLD',label:'Vendues',color:'#6fd3a0'},
  {key:'NOT_INTERESTED',label:'Refus',color:'#ff7b7b'},
] as const;
export default function MapCommandBar({pins,total,status,onStatus,ready,onSector,provider}:Props) {
  const [selected,setSelected]=useState<number>(0);
  const sector=sectors[selected];
  const googleLink='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(sector.latitude+','+sector.longitude);
  return <section className="map-command-bar" aria-label="Raccourcis de la carte">
    <div className="map-command-heading"><div>
      <span className="eyebrow">PROCLAIR / TERRITOIRES</span>
      <h3>Prospection terrain Proclair</h3>
      <p>Retrouvez vos portes et votre équipe, suivez les résultats terrain et gérez vos secteurs en temps réel.</p>
    </div><div className="map-source">
      <span className="map-source-dot" aria-hidden="true"/>
      {provider==='google'?'Google Maps':'OpenStreetMap · fond provisoire'}
      <small>{pins.length} chargée(s) / {total} autorisée(s)</small>
    </div></div>
    <div className="map-fast-filters" aria-label="Filtres rapides des portes">{quickFilters.map(item=><button key={item.key} type="button"
      aria-label={'Filtre rapide : '+item.label} aria-pressed={status===item.key}
      onClick={()=>onStatus(item.key)}><i aria-hidden="true" style={{background:item.color}}/><span>{item.label}</span>
      <b>{item.key?pins.filter(pin=>pin.status===item.key).length:total}</b></button>)}</div>
    <div className="map-sector-controls"><label htmlFor="proclair-map-sector">Aller dans un secteur</label>
      <select id="proclair-map-sector" aria-label="Choisir une zone de prospection" value={selected} onChange={event=>setSelected(Number(event.target.value))}>{sectors.map((place,i)=><option value={i} key={place.name}>{place.name}</option>)}</select>
      <button type="button" disabled={!ready} onClick={()=>onSector(sector.latitude,sector.longitude,sector.zoom)}>Afficher ce secteur</button>
      <a href={googleLink} target="_blank" rel="noopener noreferrer">Ouvrir ce secteur dans Google Maps ↗</a>
    </div>
  </section>;
}

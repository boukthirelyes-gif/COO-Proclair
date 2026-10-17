'use client';
import {useState} from 'react';
import {importLibrary} from '@googlemaps/js-api-loader';
export default function GoogleAddressSearch({onSelect}:{onSelect:(p:{address:string;latitude:number;longitude:number})=>void}){
 const [query,setQuery]=useState(''),[rows,setRows]=useState<any[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function search(kind:'places'|'geocoding'){if(!query.trim())return;setBusy(true);setError('');setRows([]);try{
  if(kind==='places'){const {Place}=await importLibrary('places') as google.maps.PlacesLibrary;const {places}=await Place.searchByText({textQuery:query,fields:['formattedAddress','location'],maxResultCount:5,language:'fr',region:'ca'});setRows(places.filter(p=>p.location).map(p=>({address:p.formattedAddress||query,latitude:p.location!.lat(),longitude:p.location!.lng()})))}
  else{const {Geocoder}=await importLibrary('geocoding') as google.maps.GeocodingLibrary;const result=await new Geocoder().geocode({address:query,region:'ca'});setRows(result.results.slice(0,5).map(r=>({address:r.formatted_address,latitude:r.geometry.location.lat(),longitude:r.geometry.location.lng()})))}
 }catch{setError('Service Google indisponible ou non autorisé : vérifiez Places API (New) ou Geocoding API et les restrictions de la clé. Aucune porte créée.')}finally{setBusy(false)}}
 return <section className="map-address-search" aria-label="Recherche Google d’adresse"><h3>Trouver une adresse</h3><p>Recherche envoyée à Google uniquement sur votre demande. Vérifiez le résultat avant de créer une porte.</p><label>Adresse à rechercher<input maxLength={250} value={query} onChange={e=>setQuery(e.target.value)}/></label><button disabled={busy||!query.trim()} onClick={()=>search('places')}>Rechercher avec Google Places</button><button disabled={busy||!query.trim()} onClick={()=>search('geocoding')}>Géocoder cette adresse</button>{error&&<p role="alert">{error}</p>}<ul>{rows.map((p,i)=><li key={i}><button onClick={()=>{onSelect(p);setRows([])}}>{p.address}</button></li>)}</ul></section>
}

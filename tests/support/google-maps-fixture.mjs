/** Deterministic SDK simulation. This never certifies a real Google connection. */
export async function installGoogleMapsFixture(page,mode='success'){
 await page.route('**/api/prospecting/map-config',route=>route.fulfill({json:{configured:true,browserKey:'synthetic_browser_maps_key_12345',provider:'GOOGLE_MAPS'}}));
 await page.addInitScript(({mode})=>{
  window.__googleFixture={libraries:[],maps:0};
  class LatLng{constructor(lat,lng){this.a=lat;this.b=lng}lat(){return this.a}lng(){return this.b}}
  class Bounds{constructor(sw=new LatLng(45.48,-73.59),ne=new LatLng(45.52,-73.54)){this.sw=sw;this.ne=ne;this.points=[]}extend(p){this.points.push(p);this.sw=new LatLng(Math.min(...this.points.map(p=>p.lat))-.005,Math.min(...this.points.map(p=>p.lng))-.005);this.ne=new LatLng(Math.max(...this.points.map(p=>p.lat))+.005,Math.max(...this.points.map(p=>p.lng))+.005);return this}getSouthWest(){return this.sw}getNorthEast(){return this.ne}contains(p){return p.lat>=this.sw.lat()&&p.lat<=this.ne.lat()&&p.lng>=this.sw.lng()&&p.lng<=this.ne.lng()}}
  class FakeMap{
   constructor(host,options){this.host=host;this.zoom=options.zoom;this.bounds=new Bounds();this.listeners={};host.dataset.googleFixture='true';window.__googleFixture.maps++;const place=document.createElement('button');place.textContent='Placer une porte Google de test';place.type='button';place.onclick=()=>this.emit('click',{latLng:new LatLng(47,-70)});host.appendChild(place);if(mode==='auth')setTimeout(()=>window.gm_authFailure?.(),10)}
   addListener(name,fn){(this.listeners[name]??=[]).push(fn);if(name==='idle')setTimeout(()=>fn(),0);return {remove:()=>this.listeners[name]=this.listeners[name].filter(f=>f!==fn)}}
   emit(name,value){for(const fn of this.listeners[name]||[])fn(value)}
   getBounds(){return this.bounds}getZoom(){return this.zoom}getProjection(){return null}
   setCenter(p){this.bounds=new Bounds(new LatLng(p.lat-.01,p.lng-.01),new LatLng(p.lat+.01,p.lng+.01));setTimeout(()=>this.emit('idle'),0)}
   setZoom(value){this.zoom=value;setTimeout(()=>this.emit('idle'),0)}
   fitBounds(value){this.bounds=value;this.zoom=16;setTimeout(()=>this.emit('idle'),0)}
  }
  class Marker{constructor(options){this.map=options.map;this.listeners={};this.node=document.createElement('button');this.node.type='button';this.node.dataset.googleMarker='true';this.node.title=options.title;this.node.textContent=options.label?.text||options.title;this.node.onclick=()=>{for(const fn of this.listeners.click||[])fn()};this.map.host.appendChild(this.node)}addListener(name,fn){(this.listeners[name]??=[]).push(fn);return {remove(){}}}setMap(map){if(!map)this.node.remove()}}
  class Shape{setMap(){}}
  class InfoWindow{close(){}setContent(){}open(){}}
  window.google={maps:{Map:FakeMap,Marker,LatLngBounds:Bounds,Polygon:Shape,Polyline:Shape,InfoWindow,SymbolPath:{CIRCLE:0},event:{clearInstanceListeners(){},addListenerOnce(map,name,fn){let listener=map.addListener(name,()=>{listener.remove();fn()});return listener}},importLibrary:async name=>{window.__googleFixture.libraries.push(name);if(mode==='network')throw Error('Simulated blocked SDK');if(mode==='timeout')return new Promise(()=>{});if(name==='places')return {Place:{searchByText:async({textQuery})=>({places:[{formattedAddress:'Synthetic Google '+textQuery,location:new LatLng(45.5019,-73.5674)}]})}};if(name==='geocoding')return {Geocoder:class{async geocode({address}){return {results:[{formatted_address:'Synthetic Geocoded '+address,geometry:{location:new LatLng(45.5019,-73.5674)}}]}}}};return name==='maps'?{Map:FakeMap}:{Marker}}}};
 },{mode});
}

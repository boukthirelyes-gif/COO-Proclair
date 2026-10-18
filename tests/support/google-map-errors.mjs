import assert from 'node:assert/strict';
import {build} from 'esbuild';

// Bundle the real map component; replace only Google's transport, never contact Google.
export async function checkGoogleMapErrors(browser,base){
 const origin=new URL(base).origin;if(!['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname))throw Error('Synthetic map checks require a local origin.');
 const stub=`export function setOptions(o){window.__mapsOptions=o;if(window.__case==='sync')throw Error('synthetic loader error');}export function importLibrary(){if(window.__case==='network')return Promise.reject(Error('synthetic network error'));if(window.__case==='timeout')return new Promise(()=>{});if(window.__case==='early')window.gm_authFailure();return Promise.resolve({});}`;
 const harness=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import Map from './src/components/GoogleProspectingMap';window.__case=new URL(location.href).searchParams.get('case');window.__created=0;window.__listeners=0;window.__prior=()=>{};window.gm_authFailure=window.__prior;window.google={maps:{Map:class{constructor(){window.__created++;if(window.__case==='constructor')window.gm_authFailure()}addListener(){window.__listeners++;return{remove(){}}}getProjection(){return null}getZoom(){return 12}getBounds(){return null}},InfoWindow:class{close(){}},event:{clearInstanceListeners(){}}}};function App(){const [ready,setReady]=useState(false),[shown,setShown]=useState(true);return <><label>Notes de la porte<input defaultValue="Notes conservées"/></label><output id="state">{ready?'ready':'unavailable'}</output><button onClick={()=>setShown(false)}>Fermer la carte test</button>{shown&&<Map pins={[]} rotorPins={[]} territories={[]} points={[]} groupPins={true} onOpen={()=>{}} onCoordinate={()=>{}} onReady={v=>setReady(!!v)}/>}</>}createRoot(document.getElementById('root')).render(<App/>);`;
 const result=await build({stdin:{contents:harness,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY':JSON.stringify('  synthetic-browser-key-not-a-real-key  ')},plugins:[{name:'synthetic-google-transport',setup(b){b.onResolve({filter:/^@googlemaps\/js-api-loader$/},()=>({path:'google-stub',namespace:'synthetic'}));b.onLoad({filter:/.*/,namespace:'synthetic'},()=>({contents:stub,loader:'js'}));}}]});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const fixture=origin+'/__synthetic-google-map';await page.route(fixture+'**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="root"></div><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script></body></html>'}));
 try{
  for(const mode of ['early','constructor','late','network','sync','timeout']){
   await page.goto(fixture+'?case='+mode+'&private-query=must-not-be-displayed');await page.getByLabel('Notes de la porte',{exact:true}).fill('Saisie en cours conservée');
   if(mode==='late'){await page.locator('#state').getByText('ready',{exact:true}).waitFor();await page.evaluate(()=>window.gm_authFailure());}
   if(mode==='timeout'){await page.clock.install();await page.clock.fastForward(21000);}
   await page.getByRole('alert').waitFor();assert.equal(await page.locator('#state').textContent(),'unavailable');assert.equal(await page.getByLabel('Notes de la porte',{exact:true}).inputValue(),'Saisie en cours conservée');assert.equal(await page.locator('[aria-label="Fond Google Maps"]').isVisible(),false);
   await page.getByText('Vérifier la configuration Google Maps',{exact:true}).click();assert.equal(await page.locator('code').textContent(),origin+'/*');assert.ok(!(await page.locator('body').innerText()).includes('must-not-be-displayed'));assert.ok(!(await page.locator('body').innerText()).includes('synthetic-browser-key'));
   assert.equal(await page.evaluate(()=>window.__mapsOptions.key),'synthetic-browser-key-not-a-real-key');if(mode==='early')assert.equal(await page.evaluate(()=>window.__created),0);if(mode==='early'||mode==='constructor')assert.equal(await page.evaluate(()=>window.__listeners),0);
   await page.getByRole('button',{name:'Fermer la carte test',exact:true}).click();assert.equal(await page.evaluate(()=>window.gm_authFailure===window.__prior),true);
  }
  assert.deepEqual(errors,[]);return 6;
 }finally{await context.close();}
}

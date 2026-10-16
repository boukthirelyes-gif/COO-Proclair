import {chromium} from './support/browser.mjs';
import assert from 'node:assert/strict';
if(!process.env.E2E_DATABASE_URL?.includes('/proclair_browser_test'))throw Error('Base navigateur séparée obligatoire.');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(process.env.E2E_BASE_URL||'http://127.0.0.1:3105');
 await page.getByLabel('Mot de passe',{exact:true}).fill(process.env.PROCLAIR_ADMIN_PASSWORD);
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await page.getByText('Une vue claire sur les opérations.').waitFor();
 const metadata=await page.evaluate(async()=>{const response=await fetch('/api/leads');if(!response.ok)throw Error('Accès prospects refusé');return response.json()});
 const stage=metadata.pipelines[0].stages[0];
 const leads=Array.from({length:26},(_,index)=>({id:'synthetic-table-'+index,name:'Table Prospect '+String(index+1).padStart(2,'0'),email:'table-'+(index+1)+'@example.test',phone:'+1555000'+String(index).padStart(4,'0'),address:'Synthetic address '+index,notes:'',tags:[],status:index===25?'DO_NOT_CONTACT':'ACTIVE',contactRestricted:index===25,source:'MANUAL',stageId:stage.id,pipelineId:metadata.pipelines[0].id,stage,ownerId:null,owner:null,valueCents:(26-index)*100,probability:0,followUpAt:index===0?'2027-01-15T15:30:00.000Z':null,version:1}));
 // Intercept only this browser's read transport: no synthetic prospects persisted.
 await page.route('**/api/leads',async route=>{assert.equal(route.request().method(),'GET');await route.fulfill({json:{...metadata,leads,canWrite:false,canConvert:false}})});
 await page.route('**/api/leads/synthetic-table-*/history',route=>route.fulfill({json:[]}));
 await page.locator('nav').getByRole('button',{name:'Prospects',exact:true}).click();
 await page.getByRole('button',{name:'Voir la liste',exact:true}).click();
 const list=page.getByRole('region',{name:'Liste des prospects'}),rows=list.locator('tbody tr');
 await list.getByRole('status').filter({hasText:'1–10 sur 26 prospect(s)'}).waitFor();
 assert.equal(await rows.count(),10);assert.match(await rows.first().innerText(),/Table Prospect 01/);assert.match(await rows.first().innerText(),/table-1@example.test/);assert.match(await rows.first().innerText(),/2027-01-15 10:30/);checks++;await page.screenshot({path:'.local/leads-table-desktop.png',fullPage:true});
 await list.getByRole('button',{name:'Page suivante des prospects'}).click();assert.match(await rows.first().innerText(),/Table Prospect 11/);
 await list.getByRole('button',{name:'Page suivante des prospects'}).click();assert.equal(await rows.count(),6);assert.equal(await list.getByRole('button',{name:'Page suivante des prospects'}).isDisabled(),true);checks++;
 await list.getByRole('button',{name:'Trier les prospects par Potentiel'}).click();assert.match(await rows.first().innerText(),/Table Prospect 26/);assert.equal(await list.locator('th[aria-sort="ascending"]').innerText(),'Potentiel ↑');
 await list.getByRole('button',{name:'Trier les prospects par Potentiel'}).click();assert.match(await rows.first().innerText(),/Table Prospect 01/);checks++;
 await list.getByLabel('Prospects par page').selectOption('25');assert.equal(await rows.count(),25);await list.getByRole('button',{name:'Page suivante des prospects'}).click();assert.equal(await rows.count(),1);
 await page.getByLabel('Rechercher un prospect').fill('Table Prospect 03');await list.getByRole('status').filter({hasText:'1–1 sur 1 prospect(s)'}).waitFor();assert.match(await rows.first().innerText(),/Table Prospect 03/);checks++;
 await page.getByLabel('Rechercher un prospect').fill('Table Prospect 26');await rows.first().getByText('Ne pas contacter',{exact:true}).waitFor();await rows.first().getByRole('button',{name:'Ouvrir le prospect Table Prospect 26'}).click();await page.getByRole('heading',{name:'Fiche du prospect'}).waitFor();assert.equal(await page.getByLabel('Nom du prospect').inputValue(),'Table Prospect 26');assert.equal(await page.getByLabel('Nom du prospect').isDisabled(),true);checks++;
 await page.getByRole('button',{name:'Fermer le prospect'}).click();await page.getByLabel('Rechercher un prospect').fill('Absent synthetic');await list.getByRole('status').filter({hasText:'Aucun prospect'}).waitFor();assert.equal(await rows.count(),0);checks++;
 await page.getByLabel('Rechercher un prospect').fill('');await page.setViewportSize({width:390,height:844});await list.getByRole('status').filter({hasText:'1–25 sur 26 prospect(s)'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await list.locator('tbody td').first().evaluate(cell=>{const box=cell.getBoundingClientRect(),frame=cell.closest('.table-wrap').getBoundingClientRect();return box.left>=frame.left&&box.right<=frame.right}),true);await page.screenshot({path:'.local/leads-table-mobile.png',fullPage:true});await page.getByRole('button',{name:'Voir le Kanban'}).click();await page.locator('.sales-board').waitFor();assert.equal(await page.locator('.sales-card').count(),26);checks++;
 assert.deepEqual(errors,[]);console.log(JSON.stringify({leadTableChecks:checks,pageErrors:errors,transport:'synthetic-read-only'}));
}finally{await browser.close()}

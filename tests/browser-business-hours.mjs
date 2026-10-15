import {chromium} from 'playwright';
import assert from 'node:assert/strict';
if(!process.env.E2E_DATABASE_URL?.endsWith('/proclair_browser_test'))throw Error('Base navigateur isolée obligatoire.');
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:3115';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?view=settings');await page.getByLabel('Mot de passe',{exact:true}).fill(process.env.PROCLAIR_ADMIN_PASSWORD);await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.getByRole('heading',{name:'Identité de votre entreprise'}).waitFor();
 await page.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Enregistrer l’identité entreprise');return b&&!b.disabled});
 if(await page.getByRole('button',{name:'Configurer les horaires',exact:true}).count())await page.getByRole('button',{name:'Configurer les horaires',exact:true}).click();
 await page.getByLabel('Nom légal de l’entreprise',{exact:true}).fill('Entreprise synthétique horaires');
 await page.getByLabel('Fermé le lundi',{exact:true}).uncheck();await page.getByLabel('Ouverture — Lundi',{exact:true}).fill('08:30');await page.getByLabel('Fermeture — Lundi',{exact:true}).fill('18:00');
 await page.getByRole('button',{name:'Enregistrer l’identité entreprise',exact:true}).click();await page.getByRole('status').filter({hasText:'Informations entreprise enregistrées.'}).waitFor();await page.reload();await page.getByLabel('Ouverture — Lundi',{exact:true}).waitFor();assert.equal(await page.getByLabel('Ouverture — Lundi',{exact:true}).inputValue(),'08:30');assert.equal(await page.getByLabel('Fermeture — Lundi',{exact:true}).inputValue(),'18:00');
 await page.getByLabel('Fermeture — Lundi',{exact:true}).fill('08:00');await page.getByRole('button',{name:'Enregistrer l’identité entreprise',exact:true}).click();await page.getByRole('alert').filter({hasText:'La fermeture doit suivre'}).waitFor();const response=await page.request.get(base+'/api/settings/business'),stored=await response.json();assert.equal(stored.businessHours[0].closes,'18:00');
 const stale=await page.request.post(base+'/api/settings/business',{headers:{Origin:base},data:{expectedVersion:stored.version-1,legalName:stored.legalName,businessHours:stored.businessHours}});assert.equal(stale.status(),409);
 await page.getByLabel('Fermé le lundi',{exact:true}).check();await page.getByRole('button',{name:'Enregistrer l’identité entreprise',exact:true}).click();await page.getByRole('status').waitFor();await page.reload();await page.getByLabel('Fermé le lundi',{exact:true}).waitFor();assert.equal(await page.getByLabel('Fermé le lundi',{exact:true}).isChecked(),true);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log(JSON.stringify({businessHoursChecks:5,pageErrors:errors}));
}finally{await browser.close()}

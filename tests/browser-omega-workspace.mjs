import {chromium} from 'playwright';
import assert from 'node:assert/strict';
if(!process.env.E2E_DATABASE_URL?.endsWith('/proclair_browser_test'))throw Error('Base navigateur séparée obligatoire.');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto((process.env.E2E_BASE_URL||'http://127.0.0.1:3107')+'/?view=omega');await page.getByLabel('Mot de passe',{exact:true}).fill(process.env.PROCLAIR_ADMIN_PASSWORD);await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await page.getByRole('heading',{name:'Centre de contrôle OMEGA',exact:true}).waitFor();await page.locator('.omega-mission-metrics button').first().waitFor();
 assert.equal(await page.getByRole('tabpanel').count(),1);assert.equal(await page.getByRole('tab',{name:'Missions',exact:true}).getAttribute('aria-selected'),'true');checks++;
 const readable=await page.locator('.omega-mission-metrics button').first().evaluate(button=>{const label=button.querySelector('span');const rgb=value=>value.match(/\d+/g).slice(0,3).map(Number);const luminance=values=>values.map(value=>{const channel=value/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4}).reduce((total,value,index)=>total+value*[.2126,.7152,.0722][index],0);const background=luminance(rgb(getComputedStyle(button).backgroundColor)),foreground=luminance(rgb(getComputedStyle(label).color));return (Math.max(background,foreground)+.05)/(Math.min(background,foreground)+.05)});assert.ok(readable>=4.5);checks++;
 await page.screenshot({path:'.local/omega-workspace-desktop.png',fullPage:true});
 const missions=page.getByRole('tab',{name:'Missions',exact:true});await missions.focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Opérations',exact:true}).getAttribute('aria-selected'),'true');await page.getByRole('heading',{name:'Priorités OMEGA',exact:true}).waitFor();checks++;
 await page.getByRole('tab',{name:'Planning',exact:true}).click();await page.getByLabel('Journée à planifier',{exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Superviseur OMEGA',exact:true}).isVisible(),false);checks++;
 await page.getByRole('tab',{name:'Assistant',exact:true}).click();await page.getByRole('heading',{name:'Votre copilote opérationnel',exact:true}).waitFor();
 await page.getByRole('button',{name:'Remplis les routes de demain.',exact:true}).click();await page.getByRole('button',{name:'Choisir la journée à planifier',exact:true}).click();await page.getByLabel('Journée à planifier',{exact:true}).waitFor();assert.equal(await page.getByLabel('Journée à planifier',{exact:true}).evaluate(element=>element===document.activeElement),true);checks++;
 await page.setViewportSize({width:390,height:844});await page.getByRole('tab',{name:'Missions',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'.local/omega-workspace-mobile.png',fullPage:true});checks++;
 assert.deepEqual(errors,[]);console.log(JSON.stringify({omegaWorkspaceChecks:checks,labelContrast:readable,pageErrors:errors}));
}finally{await browser.close()}

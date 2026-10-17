import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {issueSession} from '../../src/lib/auth.ts';

// Called only by the isolated browser suite: no production URL or credentials.
export async function checkPreviewLogin(browser,base){
 mkdirSync('.local/preview-delivery',{recursive:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Toronto'}),page=await context.newPage();
 try{
  await page.goto(base);await page.getByRole('heading',{name:'Connexion à Proclair',exact:true}).waitFor();
  assert.equal(await page.locator('input[autocomplete="one-time-code"]').count(),0);
  await page.locator('img[alt="Proclair"]').evaluate(el=>el.decode());
  assert.equal(await page.locator('button.primary').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(37, 99, 235)');
  const health=await context.request.get(base+'/api/health');assert.equal(health.status(),200);
  const revision=await (await context.request.get(base+'/api/deployment')).json();assert.equal(revision.revision,process.env.VERCEL_GIT_COMMIT_SHA||process.env.GITHUB_SHA);
  await page.getByLabel('Identifiant',{exact:true}).fill('admin');await page.getByLabel('Mot de passe',{exact:true}).fill('synthetic-intentionally-wrong-password');await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.getByText('Identifiants invalides.',{exact:true}).waitFor();assert.equal((await context.request.get(base+'/api/session')).status(),401);
  const login=async()=>{await page.getByLabel('Identifiant',{exact:true}).fill('admin');await page.getByLabel('Mot de passe',{exact:true}).fill(process.env.PROCLAIR_ADMIN_PASSWORD);await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.getByText('Une vue claire sur les opérations.',{exact:true}).waitFor();};
  await login();const session=await context.request.get(base+'/api/session');assert.equal(session.status(),200);const actor=(await session.json()).actor;assert.equal(actor.id,'admin');
  const cookie=(await context.cookies()).find(c=>c.name==='proclair_session');assert.ok(cookie?.httpOnly);assert.equal(cookie.sameSite,'Strict');
  await page.reload();await page.getByText('Une vue claire sur les opérations.',{exact:true}).waitFor();
  const other=await browser.newContext();try{await other.addCookies([cookie]);assert.equal((await other.request.get(base+'/api/session')).status(),200);
   await page.getByRole('button',{name:'Se déconnecter',exact:true}).click();await page.getByRole('heading',{name:'Connexion à Proclair',exact:true}).waitFor();assert.equal((await other.request.get(base+'/api/session')).status(),401);
  }finally{await other.close();}
  await login();const renewed=(await (await context.request.get(base+'/api/session')).json()).actor;
  const expired=issueSession({id:renewed.id,role:renewed.accountRole,sessionVersion:renewed.sessionVersion},-1000);
  await context.addCookies([{...cookie,value:expired,expires:Math.floor(Date.now()/1000)+60}]);assert.equal((await context.request.get(base+'/api/session')).status(),401);await page.reload();await page.getByRole('heading',{name:'Connexion à Proclair',exact:true}).waitFor();
  await page.screenshot({path:'.local/preview-delivery/login-desktop.png'});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'.local/preview-delivery/login-mobile.png'});
  return 12;
 }finally{await context.close();}
}

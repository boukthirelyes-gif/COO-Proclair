import {chromium} from './support/browser.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage(),base=process.env.E2E_BASE_URL||'http://127.0.0.1:3001',errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByLabel('Mot de passe').fill(process.env.PROCLAIR_ADMIN_PASSWORD);await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.locator('nav').getByRole('button',{name:'Intégrations',exact:true}).click();await page.getByRole('heading',{name:'Rotor × Proclair × OMEGA'}).waitFor();
 const connection=page.locator('.rotor-connection');await connection.getByText('Non connecté',{exact:true}).waitFor();assert.equal(await connection.getByRole('button',{name:'Connecter le compte Rotor Proclair'}).isDisabled(),true);
 const response=await page.evaluate(()=>fetch('/api/integrations/rotor/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(async r=>({status:r.status,body:await r.json()})));assert.equal(response.status,409);assert.equal(response.body.code,'CONFIG_REQUIRED');
 const original=await page.evaluate(()=>fetch('/api/integrations/rotor').then(r=>r.json()));assert.equal(original.configured,false);
 let mockState={...original,configured:true,connected:true,hasAuthorization:true,renewable:true,reauthRequired:false,callbackUrl:'https://crm.example.test/api/integrations/rotor/callback',expiresAt:'2099-01-11T16:00:00Z'},revocations=0,failRevoke=true,renewals=0;
 // Intercept only the OAuth lifecycle. Other native endpoints keep their real schemas.
 await page.route(/\/api\/integrations\/rotor(?:\/(?:renew|revoke|tools))?$/,async route=>{
  const path=new URL(route.request().url()).pathname;let status=200,body=mockState;
  if(path.endsWith('/renew')){assert.equal(route.request().method(),'POST');renewals++}
  if(path.endsWith('/tools'))body={tools:[{name:'customers_list',description:'Lecture clients',inputSchema:{type:'object',properties:{limit:{type:'integer'}}}}],hasMore:false};
  if(path.endsWith('/revoke')){assert.equal(route.request().method(),'POST');revocations++;if(failRevoke){status=502;body={error:'Rotor indisponible pendant la révocation.'}}else{mockState={...mockState,connected:false,hasAuthorization:false,renewable:false};body={disconnected:true,remoteRevoked:true}}}
  await route.fulfill({status,json:body});
 });
 await page.reload();await connection.getByText('Autorisation enregistrée',{exact:true}).waitFor();await connection.getByRole('button',{name:'Renouveler l’accès',exact:true}).click();await connection.getByRole('status').filter({hasText:'Accès renouvelé auprès de Rotor.'}).waitFor();assert.equal(renewals,1);await connection.getByText('(Toronto).',{exact:false}).waitFor();
 await connection.getByRole('button',{name:'Découvrir les outils disponibles'}).click();await connection.getByText('customers_list',{exact:true}).waitFor();await connection.getByText('Paramètres annoncés',{exact:true}).click();await connection.getByText('"integer"',{exact:false}).waitFor();
 await connection.getByRole('button',{name:'Révoquer chez Rotor',exact:true}).click();await connection.getByRole('button',{name:'Retour',exact:true}).click();assert.equal(revocations,0);
 await connection.getByRole('button',{name:'Révoquer chez Rotor',exact:true}).click();await connection.getByRole('button',{name:'Confirmer la révocation chez Rotor'}).click();await connection.getByRole('alert').filter({hasText:'Rotor indisponible'}).waitFor();assert.equal(mockState.connected,true);await connection.getByText('Autorisation enregistrée',{exact:true}).waitFor();failRevoke=false;
 await connection.getByRole('button',{name:'Confirmer la révocation chez Rotor'}).click();await connection.getByRole('status').filter({hasText:'Rotor a confirmé la révocation'}).waitFor();await connection.getByText('Non connecté',{exact:true}).waitFor();assert.equal(revocations,2);
 // Simulation must never persist or revoke a real authorization.
 await page.unroute(/\/api\/integrations\/rotor(?:\/(?:renew|revoke|tools))?$/);const actual=await page.evaluate(()=>fetch('/api/integrations/rotor').then(r=>r.json()));assert.equal(actual.hasAuthorization,false);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({integrationChecks:10,mockedLifecycleChecks:5,pageErrors:errors,externalOAuthCalls:0}));
}finally{await browser.close()}

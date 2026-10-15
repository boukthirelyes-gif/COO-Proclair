import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
if(!process.env.E2E_DATABASE_URL?.endsWith('/proclair_browser_test'))throw Error('Base navigateur isolée obligatoire.');
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:3118',browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
let admin,userId;
try{
 admin=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];admin.on('pageerror',e=>errors.push(e.message));await admin.goto(base+'/?view=users');await admin.getByLabel('Mot de passe',{exact:true}).fill(process.env.PROCLAIR_ADMIN_PASSWORD);await admin.getByRole('button',{name:'Se connecter',exact:true}).click();await admin.getByRole('heading',{name:'Utilisateurs et accès',exact:true}).waitFor();
 const username='reset.'+randomUUID().slice(0,8),oldPassword='Initial-test-'+randomUUID(),newPassword='Replacement-test-'+randomUUID();
 const created=await admin.request.post(base+'/api/users',{headers:{Origin:base},data:{username,name:username,role:'VIEWER',permissions:[],active:true,password:oldPassword}});assert.equal(created.status(),201);const user=await created.json();userId=user.id;
 const context=await browser.newContext(),session=context.request;assert.equal((await session.post(base+'/api/session',{headers:{Origin:base},data:{username,password:oldPassword}})).status(),200);
 await admin.getByRole('button',{name:'Actualiser les utilisateurs',exact:true}).click();await admin.getByLabel('Rechercher un utilisateur').fill(username);const row=admin.getByRole('row').filter({hasText:username});await row.getByRole('button',{name:'Réinitialiser le mot de passe',exact:true}).click();const panel=admin.getByRole('region',{name:'Réinitialisation du mot de passe',exact:true});
 await panel.getByLabel('Nouveau mot de passe',{exact:true}).fill(newPassword);await panel.getByLabel('Confirmer le nouveau mot de passe',{exact:true}).fill(oldPassword);await panel.getByRole('button',{name:'Confirmer la réinitialisation',exact:true}).click();await panel.getByRole('alert').filter({hasText:'Les deux mots de passe'}).waitFor();assert.equal((await session.get(base+'/api/state')).status(),200);
 await panel.getByLabel('Confirmer le nouveau mot de passe',{exact:true}).fill(newPassword);await panel.getByRole('button',{name:'Confirmer la réinitialisation',exact:true}).click();await admin.getByRole('status').filter({hasText:'Mot de passe réinitialisé.'}).waitFor();assert.equal(await panel.count(),0);assert.equal((await session.get(base+'/api/state')).status(),401);
 const fresh=await browser.newContext();assert.equal((await fresh.request.post(base+'/api/session',{headers:{Origin:base},data:{username,password:oldPassword}})).status(),401);assert.equal((await fresh.request.post(base+'/api/session',{headers:{Origin:base},data:{username,password:newPassword}})).status(),200);
 const after=(await(await admin.request.get(base+'/api/users')).json()).find(u=>u.id===userId);assert.equal(after.role,user.role);assert.equal(after.active,true);assert.deepEqual(after.permissions,user.permissions);assert.equal(after.version,user.version+1);assert.equal('passwordHash'in after,false);assert.equal('password'in after,false);
 await row.getByRole('button',{name:'Réinitialiser le mot de passe',exact:true}).click();await panel.getByRole('button',{name:'Annuler la réinitialisation'}).click();assert.equal(await panel.count(),0);assert.equal((await fresh.request.get(base+'/api/state')).status(),200);assert.deepEqual(errors,[]);console.log(JSON.stringify({passwordResetChecks:5,pageErrors:errors}));await context.close();await fresh.close();
}finally{
 if(admin&&userId){const row=(await(await admin.request.get(base+'/api/users')).json()).find(u=>u.id===userId);if(row){const {id,version,createdAt,...fields}=row;await admin.request.patch(base+'/api/users/'+id,{headers:{Origin:base},data:{...fields,expectedVersion:version,active:false}})}}
 await browser.close();
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function rejected(args:string[],override:Record<string,string>,message:RegExp){
 const directory=mkdtempSync(join(tmpdir(),'proclair-runner-guard-')),report=join(directory,'reports');
 try{const result=spawnSync(process.execPath,['scripts/run-browser-suites.mjs',...args],{encoding:'utf8',env:{...process.env,E2E_DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:1/proclair_browser_test',E2E_BASE_URL:'http://127.0.0.1:1',E2E_REPORT_DIR:report,...override}});assert.equal(result.status,1);assert.match(result.stderr,message);assert.equal(result.stdout,'');assert.equal(existsSync(report),false)}finally{rmSync(directory,{recursive:true,force:true})}
}
test('browser runner rejects unknown or duplicate suites before executing any test',()=>{
 rejected(['test:absent:e2e'],{},/Suite inconnue ou dupliquée/);
 rejected(['test:e2e','test:e2e'],{},/Suite inconnue ou dupliquée/);
});
test('browser runner rejects nonlocal application and database targets before any test',()=>{
 rejected([],{E2E_BASE_URL:'https://crm.example.test'},/Serveur local de test obligatoire/);
 rejected([],{E2E_DATABASE_URL:'postgresql://fixture:fixture@db.example.test/proclair_browser_test'},/Base navigateur locale dédiée obligatoire/);
 rejected([],{E2E_DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:1/production'},/Base navigateur locale dédiée obligatoire/);
});

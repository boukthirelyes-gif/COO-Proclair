import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const url=new URL(process.env.E2E_DATABASE_URL||'invalid:');
if(url.pathname!=='/proclair_browser_test'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Base navigateur locale dédiée obligatoire.');
const base=new URL(process.env.E2E_BASE_URL||'invalid:');if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Serveur local de test obligatoire.');
const suites=JSON.parse(readFileSync('tests/browser-suites.json','utf8')),scripts=JSON.parse(readFileSync('package.json','utf8')).scripts;
const declared=Object.keys(scripts).filter(key=>key==='test:e2e'||key.endsWith(':e2e'));
if(declared.length!==suites.length||suites.length!==32||new Set(suites).size!==32||declared.some(key=>!suites.includes(key)))throw Error('Catalogue navigateur incomplet ou dupliqué.');
const selected=process.argv.slice(2);if(new Set(selected).size!==selected.length||selected.some(key=>!suites.includes(key)))throw Error('Suite inconnue ou dupliquée.');
const commands=selected.length?selected:suites,root=resolve(process.env.E2E_REPORT_DIR||'.local/browser-audit');mkdirSync(root,{recursive:true});
const files=['package.json','package-lock.json','scripts/run-browser-suites.mjs','tests/browser-suites.json','tests/support/browser.mjs','tests/support/completed-sale.mjs','tests/support/enterprise-security.mjs','tests/support/saas-foundations.mjs','tests/support/preview-login.mjs',...suites.map(key=>scripts[key].match(/tests\/[^ ]+\.mjs/)[0])];const sourceHashes=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]));
const results=[],startedAt=new Date().toISOString();
const xml=value=>String(value).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
function report(){writeFileSync(join(root,'results.json'),JSON.stringify({revision:process.env.GITHUB_SHA||null,sourceHashes,startedAt,finishedAt:new Date().toISOString(),fullRun:commands.length===32,expectedSuites:commands.length,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,results},null,2));writeFileSync(join(root,'junit.xml'),`<testsuite name="Proclair browser" tests="${results.length}" failures="${results.filter(r=>r.status==='failed').length}">${results.map(r=>`<testcase name="${xml(r.suite)}" time="${r.durationMs/1000}">${r.status==='failed'?`<failure message="Exit ${r.exitCode}">${xml(r.failure||'See suite.log')}</failure>`:''}</testcase>`).join('')}</testsuite>`)}
for(const suite of commands){
 const directory=join(root,suite.replaceAll(':','-'));mkdirSync(directory,{recursive:true});const started=Date.now();
 const env={...process.env,E2E_ARTIFACT_DIR:directory};
 const reset=spawnSync(process.execPath,['tests/reset-browser-login-attempts.mjs'],{env,encoding:'utf8'});
 const result=reset.status===0?spawnSync('npm',['run',suite],{env,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024}):reset;
 const eventsFile=join(directory,'browser-events.json');const javascriptErrors=existsSync(eventsFile)?JSON.parse(readFileSync(eventsFile,'utf8')).filter(event=>event.kind==='javascript'):[];if(javascriptErrors.length){result.status=1;result.stderr=(result.stderr||'')+'\nUnexpected browser JavaScript errors: '+JSON.stringify(javascriptErrors)}
 const output=(result.stdout||'')+(result.stderr||'')+(result.error?'\n'+result.error.message:'');writeFileSync(join(directory,'suite.log'),output);
 const record={suite,status:result.status===0?'passed':'failed',exitCode:result.status,durationMs:Date.now()-started,log:join(directory,'suite.log'),...(result.status===0?{}:{failure:output.slice(-6000)})};results.push(record);report();console.log(`${record.status.toUpperCase()} ${suite} (${record.durationMs} ms)`);if(result.status!==0)console.error(output.slice(-6000));
}
report();console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,report:join(root,'results.json')}));
if(results.some(r=>r.status==='failed')||results.length!==commands.length)process.exitCode=1;

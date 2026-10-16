import {chromium as engine} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export {request} from 'playwright';
export const chromium={async launch(options){
 const browser=await engine.launch(options),directory=process.env.E2E_ARTIFACT_DIR;
 if(!directory)return browser;
 await mkdir(directory,{recursive:true});
 const contexts=new WeakSet(),records=[],pages=new WeakSet();let index=0;
 const pathOnly=value=>{try{const url=new URL(value);return url.origin+url.pathname}catch{return 'invalid-url'}};
 async function observe(context){
  if(contexts.has(context))return;contexts.add(context);
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname)){records.push({kind:'external-blocked',url:pathOnly(url.href)});return route.abort('blockedbyclient')}return route.continue()});
  const id=++index;await context.tracing.start({screenshots:true,snapshots:true,sources:false});
  const observePage=page=>{if(pages.has(page))return;pages.add(page);page.on('pageerror',error=>records.push({kind:'javascript',message:error.message}));page.on('requestfailed',request=>records.push({kind:'network',url:pathOnly(request.url()),error:request.failure()?.errorText}));page.on('response',response=>{if(response.status()>=400)records.push({kind:'http',url:pathOnly(response.url()),status:response.status()})})};
  context.on('page',observePage);context.pages().forEach(observePage);
  const close=context.close.bind(context);let saved=false;
  async function save(){if(saved)return;saved=true;let number=0;for(const page of context.pages()){if(!page.isClosed()){try{await page.screenshot({path:join(directory,`context-${id}-page-${++number}.png`),fullPage:true})}catch(error){records.push({kind:'capture',message:error.message})}}}await context.tracing.stop({path:join(directory,`context-${id}-trace.zip`)});await writeFile(join(directory,'browser-events.json'),JSON.stringify(records,null,2))}
  context.close=async(...args)=>{await save();return close(...args)};
  context.__saveDiagnostics=save;
 }
 const newContext=browser.newContext.bind(browser),newPage=browser.newPage.bind(browser),close=browser.close.bind(browser);
 browser.newContext=async(...args)=>{const context=await newContext(...args);await observe(context);return context};
 browser.newPage=async(...args)=>{const page=await newPage(...args);await observe(page.context());return page};
 browser.close=async(...args)=>{for(const context of browser.contexts())await context.__saveDiagnostics?.();return close(...args)};
 return browser;
}};

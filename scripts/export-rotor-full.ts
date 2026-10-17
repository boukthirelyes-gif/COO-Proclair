/**
 * Read-only, resumable private archive of Rotor data into local NDJSON files.
 * Requires the Proclair CRM database and its own Rotor OAuth connection.
 * Never commit generated exports: they contain private customer information.
 *
 * Execute from project root (Node 24):
 *   node --env-file-if-exists=.env --import tsx scripts/export-rotor-full.ts
 *   node --env-file-if-exists=.env --import tsx scripts/export-rotor-full.ts --resume
 */
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {privateExportRoot,safeArchiveError} from '../src/lib/private-export';
import {randomUUID,createHash} from 'node:crypto';
import {rotorArchiveRead,type RotorArchiveTool} from '../src/lib/rotor';
type Spec={name:RotorArchiveTool;key:string;ranged?:boolean;unpaged?:boolean};
const specs:Spec[]=[
 {name:'list_company_members',key:'members'},
 {name:'list_customers',key:'customers'},
 {name:'list_leads',key:'leads'},
 {name:'list_service_plans',key:'service_plans'},
 {name:'list_jobs',key:'jobs'},
 {name:'list_quotes',key:'quotes'},
 {name:'list_invoices',key:'invoices'},
 {name:'list_payments',key:'payments'},
 {name:'list_tasks',key:'tasks'},
 {name:'list_message_templates',key:'message_templates'},
 {name:'list_campaigns',key:'campaigns'},
 {name:'list_pipelines',key:'pipelines',unpaged:true},
 {name:'list_pipeline_stages',key:'pipeline_stages',unpaged:true},
 {name:'list_map_pin_types',key:'map_pin_types',unpaged:true},
 {name:'search_map_pins',key:'map_pins'},
 {name:'list_messages',key:'messages'},
 {name:'list_visits',key:'visits',ranged:true},
 {name:'list_timesheets',key:'timesheets',ranged:true},
 {name:'list_visit_timers',key:'visit_timers',ranged:true},
 {name:'list_payroll',key:'payroll',ranged:true},
];
const limit=100;
const dateNow=new Date();
const pad=(n:number)=>String(n).padStart(2,'0');
const year=dateNow.getUTCFullYear(), month=dateNow.getUTCMonth();
const end=new Date(Date.UTC(year,month+1,1));
const firstYear=Number(process.env.ROTOR_EXPORT_FIRST_YEAR||'2024');
if(!Number.isInteger(firstYear)||firstYear<1900||firstYear>year)throw Error('ROTOR_EXPORT_FIRST_YEAR must be between 1900 and the current year.');
const windows:{start:string;end:string}[]=[];
for(let y=firstYear;y<=year;y++)for(let m=0;m<12;m++){
 const start=new Date(Date.UTC(y,m,1)),stop=new Date(Date.UTC(y,m+1,1));
 if(start>=end)break;
 windows.push({start:start.toISOString(),end:stop.toISOString()});
}
const resume=process.argv.includes('--resume');
const root=privateExportRoot(process.env.ROTOR_EXPORT_BATCH||'rotor-full-'+year+pad(month+1)+pad(dateNow.getUTCDate()),fileURLToPath(new URL('../private-exports',import.meta.url)));
const manifestPath=path.join(root,'manifest.json');
type Progress={key:string;window:string;page:number;count:number;total:number|null;complete:boolean;error?:string};
type Manifest={format:string;batch:string;createdAt:string;updatedAt:string;source:string;complete:boolean;datasets:Record<string,Progress>};
let manifest:Manifest;
await mkdir(root,{recursive:true,mode:0o700});
if(resume){
 try{manifest=JSON.parse(await readFile(manifestPath,'utf8'))}catch{throw new Error('Cannot resume: manifest missing. Run without --resume first.');}
}else{
 try{await readFile(manifestPath,'utf8');throw new Error('Export already exists; use --resume or ROTOR_EXPORT_BATCH for a new batch.')}catch(e:any){if(e.code!=='ENOENT')throw e;}
 manifest={format:'PROCLAIR_ROTOR_NDJSON_V1',batch:randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),source:'Rotor OAuth read-only',complete:false,datasets:{}};
 await writeFile(manifestPath,JSON.stringify(manifest,null,2),{mode:0o600});
}
const save=async()=>{manifest.updatedAt=new Date().toISOString();const pending=manifestPath+'.pending';await writeFile(pending,JSON.stringify(manifest,null,2),{mode:0o600});await rename(pending,manifestPath);};
const problems:string[]=[];
for(const spec of specs){
 const ranges=spec.ranged?windows:[null];
 for(const range of ranges){
  const windowKey=range?range.start.slice(0,7):'all';
  const key=spec.key+':'+windowKey;
  const outputDir=path.join(root,spec.key+(range?'-'+windowKey:''));
  await mkdir(outputDir,{recursive:true,mode:0o700});
  let state=manifest.datasets[key]||{key:spec.key,window:windowKey,page:1,count:0,total:null,complete:false};
  if(state.complete)continue;
  if(!manifest.datasets[key]){
   manifest.datasets[key]=state;await save();
  }
  try{
   for(;;){
    if(!Number.isSafeInteger(state.page)||state.page>=Number.MAX_SAFE_INTEGER)throw Error('Unsafe page counter');
    const args=spec.unpaged?{}:range?{page:state.page,limit,start:range.start,end:range.end}:{page:state.page,limit};
    const result=await rotorArchiveRead(spec.name,args);
    if(result.pagination&&result.pagination.total!==null){
     if(state.total!==null&&state.total!==result.pagination.total)throw Object.assign(Error('Changed source total'),{code:'ROTOR_TOTAL_CHANGED'});
     state.total=result.pagination.total;
    }
    const nextCount=state.count+result.data.length;
    if(!Number.isSafeInteger(nextCount)||(state.total!==null&&(nextCount>state.total||(!result.pagination?.has_more&&nextCount!==state.total))))throw Object.assign(Error('Count mismatch'),{code:'ROTOR_COUNT_MISMATCH'});
    if(result.data.length){
     // Stable source IDs are preserved to support importer deduplication.
     const lines=result.data.map(row=>JSON.stringify(row)).join('\n')+'\n';
     // Every page has a stable filename: retry overwrites only that page.
     // A crash between page write and manifest commit cannot duplicate rows.
     await writeFile(path.join(outputDir,'page-'+String(state.page).padStart(5,'0')+'.ndjson'),lines,{encoding:'utf8',mode:0o600});
    }
    state.count+=result.data.length;
    if(!result.pagination?.has_more){state.complete=true;state.error=undefined;await save();break;}
    state.page++;await save();
   }
   console.log(spec.key,windowKey,state.count,'complete');
  }catch(error){
   const message=safeArchiveError(error);
   state.error=message;problems.push(key+': '+message);await save();
   console.error('BLOCKED',key,message);
   // Skip blocked categories and continue exporting everything else.
  }
 }
}
manifest.complete=Object.values(manifest.datasets).every(v=>v.complete)&&!problems.length;
await save();
console.log('Export location:',root);
console.log('Selected archive scopes complete:',manifest.complete);
console.log('Global migration certified: false. Ranged records start in',firstYear,'; absent categories and source totals require separate verification.');
if(!manifest.complete){console.log('Resume after repairing connection: --resume');process.exitCode=2;}

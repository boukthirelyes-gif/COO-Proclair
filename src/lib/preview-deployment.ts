import {resolveDatabaseUrl} from './database-url';

/** Validate configuration before touching the isolated Preview schema. */
export function previewDeploymentConfiguration(env:NodeJS.ProcessEnv){
 if(env.VERCEL_ENV!=='preview')throw new Error('Preview migration requires VERCEL_ENV=preview.');
 const runtime=resolveDatabaseUrl(env);
 for(const [key,min] of [['PROCLAIR_ADMIN_PASSWORD',12],['PROCLAIR_SESSION_SECRET',32]] as const){
  if(!env[key]||env[key]!.length<min)throw new Error(`Preview authentication requires ${key} (${min} characters minimum).`);
 }
 if(env.PROCLAIR_PUBLIC_ORIGIN){
  let origin:URL;try{origin=new URL(env.PROCLAIR_PUBLIC_ORIGIN);}catch{throw new Error('Preview PROCLAIR_PUBLIC_ORIGIN must be a valid HTTPS origin.');}
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Preview PROCLAIR_PUBLIC_ORIGIN must be a valid HTTPS origin.');
 }
 const direct=env.PROCLAIR_PREVIEW_DIRECT_DATABASE_URL||runtime;
 // PostgreSQL session advisory locks must not use Neon's transaction pooler.
 resolveDatabaseUrl({...env,PROCLAIR_PREVIEW_DATABASE_URL:direct});
 const directUrl=new URL(direct);
 if(/-pooler\./i.test(directUrl.hostname)||directUrl.searchParams.get('pgbouncer')==='true')throw new Error('Preview migrations require PROCLAIR_PREVIEW_DIRECT_DATABASE_URL without a transaction pooler.');
 // The production comparison above also covers the migration connection.
 const identity=(url:string)=>{const p=new URL(url);return [p.hostname.toLowerCase().replace(/-pooler(?=\.)/g,''),p.port||'5432',decodeURIComponent(p.pathname)].join('|');};
 if(identity(direct)!==identity(runtime))throw new Error('Preview runtime and direct migration connections must target the same isolated database.');
 return {runtimeUrl:runtime,migrationUrl:direct};
}

/** Public metadata only; never return environment values other than a valid source SHA. */
export function deployedRevision(env:NodeJS.ProcessEnv){
 const sha=env.VERCEL_GIT_COMMIT_SHA||env.GITHUB_SHA;
 return sha&&/^[a-f0-9]{40}$/i.test(sha)?sha.toLowerCase():null;
}
export function authenticationConfigured(env:NodeJS.ProcessEnv){return !!env.PROCLAIR_ADMIN_PASSWORD&&env.PROCLAIR_ADMIN_PASSWORD.length>=12&&!!env.PROCLAIR_SESSION_SECRET&&env.PROCLAIR_SESSION_SECRET.length>=32;}

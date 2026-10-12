import {spawnSync} from 'node:child_process';
const production=process.env.VERCEL_ENV==='production';
if(production){
 for(const name of ['DATABASE_URL','DIRECT_DATABASE_URL','PROCLAIR_ADMIN_PASSWORD','PROCLAIR_SESSION_SECRET','PROCLAIR_PUBLIC_ORIGIN','CRON_SECRET'])if(!process.env[name])throw new Error(`Variable obligatoire manquante : ${name}`);
 if(process.env.PROCLAIR_ADMIN_PASSWORD.length<12)throw new Error('PROCLAIR_ADMIN_PASSWORD doit contenir au moins 12 caractères.');
 for(const name of ['PROCLAIR_SESSION_SECRET','CRON_SECRET'])if(process.env[name].length<32)throw new Error(`${name} doit contenir au moins 32 caractères.`);
 const origin=new URL(process.env.PROCLAIR_PUBLIC_ORIGIN);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('PROCLAIR_PUBLIC_ORIGIN doit être une origine HTTPS sans chemin.');
}
function run(command,args,env=process.env){const result=spawnSync(command,args,{stdio:'inherit',env});if(result.error)throw new Error('Impossible de lancer '+command);if(result.status!==0)process.exit(result.status??1)}
run('node',['scripts/generate-client.cjs']);
// Only production deploys touch the production schema; previews must have a separate database.
if(production){
 run('node',['scripts/migrate.cjs'],{...process.env,DATABASE_URL:process.env.DIRECT_DATABASE_URL});
 run('node',['--import','tsx','scripts/seed.ts'],{...process.env,DATABASE_URL:process.env.DIRECT_DATABASE_URL});
}
run('node',['node_modules/next/dist/bin/next','build','--webpack']);

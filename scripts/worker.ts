import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {OmegaWorker} from '../src/omega/worker';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const worker=new OmegaWorker(db);
let stopped=false;
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{stopped=true;});
async function main(){try{do{try{const result=await worker.tick();console.log(JSON.stringify({time:new Date().toISOString(),...result}));}catch{console.error('OMEGA worker cycle failed; retrying next interval.');}if(process.argv.includes('--once')||stopped)break;await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);process.off('SIGINT',done);process.off('SIGTERM',done);resolve();};const timer=setTimeout(done,30000);process.once('SIGINT',done);process.once('SIGTERM',done);});}while(!stopped);}finally{await db.$disconnect();}}
main().catch(()=>{process.exitCode=1;});

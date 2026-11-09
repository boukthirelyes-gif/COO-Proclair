import type {PrismaClient} from '@prisma/client';
import {DomainError} from '@/domain/rules';
// Keep financial transactions on one JS-driver client in order. PostgreSQL still
// enforces cross-process serialization, uniqueness and idempotency independently.
const queues=new WeakMap<PrismaClient,{tail:Promise<void>;pending:number}>();
export async function financialTransaction<T>(db:PrismaClient,run:()=>Promise<T>):Promise<T>{
 const state=queues.get(db)??{tail:Promise.resolve(),pending:0};
 if(state.pending>=32)throw new DomainError('FINANCE_BUSY','File financière occupée. Réessayez avec la même clé.',503);
 queues.set(db,state);const previous=state.tail;let release!:()=>void;state.tail=new Promise<void>(r=>{release=r});state.pending++;
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([previous,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DomainError('FINANCE_BUSY','Attente financière dépassée ; aucune transaction commencée.',503)),2000)})]);}
 catch(error){state.pending--;void previous.then(release,release);throw error;}
 finally{if(timer)clearTimeout(timer);}
 try{return await run();}finally{state.pending--;release();}
}

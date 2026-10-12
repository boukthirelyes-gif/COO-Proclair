import {AsyncLocalStorage} from 'node:async_hooks';
import {Prisma,PrismaClient} from '@prisma/client';
import {prisma} from './db';
export interface RotorStorage {
 read(name:string):Promise<string|null>;
 write(name:string,value:string):Promise<void>;
 remove(name:string):Promise<void>;
 consume(hash:string,expiresAt:Date):Promise<boolean>;
 exclusive<T>(action:()=>Promise<T>):Promise<T>;
}
const context=new AsyncLocalStorage<RotorStorage>();
export function withRotorStorage<T>(storage:RotorStorage,action:()=>T):T{return context.run(storage,action)}
function transactionalStorage(tx:Prisma.TransactionClient):RotorStorage {
 return {
  async read(name){return (await tx.integrationSecret.findUnique({where:{key:'rotor:'+name}}))?.encryptedValue??null},
  async write(name,encryptedValue){await tx.integrationSecret.upsert({where:{key:'rotor:'+name},create:{key:'rotor:'+name,encryptedValue},update:{encryptedValue}})},
  async remove(name){await tx.integrationSecret.deleteMany({where:{key:'rotor:'+name}})},
  async consume(stateHash,expiresAt){await tx.oAuthReceipt.deleteMany({where:{expiresAt:{lt:new Date()}}});return (await tx.oAuthReceipt.createMany({data:{stateHash,expiresAt},skipDuplicates:true})).count===1},
  async exclusive(action){return action()}
 };
}
export function databaseRotorStorage(db:PrismaClient):RotorStorage {
 const store=transactionalStorage(db);
 return {...store,async exclusive<T>(action:()=>Promise<T>):Promise<T>{
  // Commit receipts and invalid_grant state even when an OAuth request is rejected.
  const outcome=await db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(714928353)`;
   return withRotorStorage(transactionalStorage(tx),async()=>{try{return {ok:true as const,value:await action()}}catch(error){return {ok:false as const,error}}});
  },{timeout:60000,maxWait:15000});
  if(!outcome.ok)throw outcome.error;return outcome.value;
 }};
}
const productionStorage=databaseRotorStorage(prisma);
export function rotorStorage(){return context.getStore()??productionStorage}

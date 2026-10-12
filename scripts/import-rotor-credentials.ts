// One-time move of the previous encrypted local store; never displays credentials.
import {readFile,readdir} from 'node:fs/promises';
import {prisma} from '../src/lib/db';
import {databaseRotorStorage} from '../src/lib/rotor-store';
import {unseal} from '../src/lib/rotor';
const store=databaseRotorStorage(prisma);
try{
 let files:string[];try{files=await readdir('.local/rotor')}catch(e:any){if(e.code==='ENOENT'){console.log('Aucun accès Rotor local à migrer.');process.exitCode=0;files=[]}else throw e}
 await store.exclusive(async()=>{
  // Use the transaction-bound store, so check and insert share the distributed lock.
  const {rotorStorage}=await import('../src/lib/rotor-store');const tx=rotorStorage();
  const pending:{name:string;encrypted:string}[]=[];
  for(const name of ['client','connection'])if(files.includes(name)){
   const encrypted=await readFile('.local/rotor/'+name,'utf8');unseal(encrypted);
   if(await tx.read(name)!==null)throw new Error('Un accès PostgreSQL existe déjà : import refusé pour le préserver.');
   pending.push({name,encrypted});
  }
  for(const {name,encrypted} of pending)await tx.write(name,encrypted);
  for(const name of files)if(/^used-[a-f0-9]{64}$/.test(name))await tx.consume(name.slice(5),new Date(Date.now()+600000));
 });
 if(files.length)console.log('Accès Rotor chiffrés copiés vers PostgreSQL ; fichiers source conservés.');
}finally{await prisma.$disconnect()}

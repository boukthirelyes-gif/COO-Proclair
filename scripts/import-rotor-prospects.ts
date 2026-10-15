import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {z} from 'zod';
import {LeadService} from '../src/sales/leads';
import {bootstrapActor} from '../src/lib/access';

// Uploaded business records belong in private-exports, never in source control.
const rowSchema=z.object({rotor_id:z.string().trim().min(1).max(150),name:z.string().trim().max(200),email:z.string().trim().max(320),phone:z.string().trim().max(80),stage:z.literal('New'),source:z.string().max(500),service_type:z.string().max(500),data_completeness:z.string().max(500)}).strict();
async function main(){
 const file=process.argv[2];
 if(!file)throw new Error('FILE_REQUIRED');
 const root=resolve('private-exports'),path=resolve(file),rel=relative(root,path);
 if(rel.startsWith('..')||resolve(root,rel)!==path||!rel)throw new Error('PRIVATE_FILE_REQUIRED');
 const actual=relative(await realpath(root),await realpath(path));if(actual.startsWith('..'))throw new Error('PRIVATE_FILE_REQUIRED');
 const bytes=await readFile(path);if(bytes.length>2_000_000)throw new Error('FILE_TOO_LARGE');
 const rows=z.array(rowSchema).min(1).max(1000).parse(JSON.parse(bytes.toString('utf8')));
 if(new Set(rows.map(r=>r.rotor_id)).size!==rows.length)throw new Error('DUPLICATE_SOURCE_ID');
 const inputs=rows.filter(r=>r.name).map(r=>({name:r.name,email:r.email||null,phone:r.phone||null,source:'OTHER' as const,tags:['Rotor import'],notes:JSON.stringify({rotorId:r.rotor_id,sourceStage:r.stage,source:r.source,serviceType:r.service_type,completeness:r.data_completeness,consent:'NOT_IMPORTED'}),idempotencyKey:'rotor-upload-lead:'+r.rotor_id}));
 // Validate every contact before the first write, using the same domain limits.
 for(const v of inputs)if(v.email)z.string().email().parse(v.email);
 console.log(JSON.stringify({rows:rows.length,eligible:inputs.length,missingName:rows.length-inputs.length,mode:process.argv.includes('--apply')?'APPLY':'VALIDATE',customersCreated:0,accountsCreated:0,providerCalls:0}));
 if(!process.argv.includes('--apply'))return;
 const {prisma}=await import('../src/lib/db');
 try{
  const service=new LeadService(prisma);let created=0,replayed=0;
  for(const input of inputs){
   const prior=await prisma.lead.findUnique({where:{idempotencyKey:input.idempotencyKey},select:{id:true}});
   await service.create(input,bootstrapActor);if(prior)replayed++;else created++;
  }
  console.log(JSON.stringify({created,replayed,complete:inputs.length===rows.length,missingName:rows.length-inputs.length}));
 }finally{await prisma.$disconnect()}
}
main().catch(()=>{console.error('Import interrompu : vérifier le format, la base et les conflits. Aucun contenu privé affiché. La reprise avec le même fichier ne duplique pas les prospects.');process.exitCode=1});

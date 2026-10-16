// Generate using Prisma's npm-distributed WASM compiler. No downloaded Rust engines.
const path = require('node:path');
const fs = require('node:fs');
const {getGenerators} = require('@prisma/internals');
let completed = false;
process.once('beforeExit', () => {
 if (!completed) {
  console.error('Prisma generation stopped before a usable client was generated.');
  process.exitCode = 1;
 }
});
(async () => {
 // Prisma's executable compares argv[1] to __filename. Resolve linked modules
 // before spawning it, otherwise it can exit 0 without serving the RPC request.
 const generatorPath=fs.realpathSync(require.resolve('@prisma/client/generator-build/index.js'));
 const generators=await getGenerators({schemaPath:path.resolve('prisma/schema.prisma'),skipDownload:true,registry:{'prisma-client-js':{type:'rpc',generatorPath,isNode:true}}});
 try { if(!generators.length)throw new Error('No Prisma client generator configured.');for(const generator of generators) {
  await generator.generate();
  const output=generator.options?.generator?.output?.value;
  if(!output)throw new Error('Prisma client output was not resolved.');
  const client=require(output),actual=new Set(client.Prisma?.dmmf?.datamodel?.models?.map(model=>model.name));
  const expected=generator.options?.dmmf?.datamodel?.models||[];
  if(!expected.length||expected.some(model=>!actual.has(model.name)))throw new Error('Generated Prisma client is incomplete.');
 } completed=true;console.log('Prisma client generated and model metadata verified (JavaScript driver adapter).'); }
 finally { for(const generator of generators) generator.stop(); }
})().catch(error=>{completed=true;console.error(error);process.exitCode=1;});

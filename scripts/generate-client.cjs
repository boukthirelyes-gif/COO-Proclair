// Generate using Prisma's npm-distributed WASM compiler. No downloaded Rust engines.
const path = require('node:path');
const {getGenerators} = require('@prisma/internals');
(async () => {
 const generators=await getGenerators({schemaPath:path.resolve('prisma/schema.prisma'),skipDownload:true,registry:{'prisma-client-js':{type:'rpc',generatorPath:path.resolve('node_modules/@prisma/client/generator-build/index.js'),isNode:true}}});
 try { for(const generator of generators) await generator.generate(); console.log('Prisma client generated (JavaScript driver adapter).'); }
 finally { for(const generator of generators) generator.stop(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

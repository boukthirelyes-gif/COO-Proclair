// Use Prisma's supported CLI generator on Prisma 7: the legacy generator-build
// path used by Prisma 6 internals no longer exists in @prisma/client 7.
// This retains engineType="client" from schema.prisma (driver adapter).
const {execFileSync}=require('node:child_process');
const path=require('node:path');
execFileSync(process.execPath,[path.resolve('node_modules/prisma/build/index.js'),'generate','--schema','prisma/schema.prisma'],{stdio:'inherit'});

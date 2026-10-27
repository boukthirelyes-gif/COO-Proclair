import {prisma} from '../src/lib/db';
import {resolveDatabaseUrl} from '../src/lib/database-url';
import {provisionOrganization} from '../src/saas/provision';
const id=process.argv[2];
try{if(id){console.log(await provisionOrganization(prisma,resolveDatabaseUrl(process.env),id));}else{const pending=await prisma.saasOrganization.findMany({where:{status:'PENDING'},select:{id:true},take:5,orderBy:{createdAt:'asc'}});for(const org of pending)console.log(await provisionOrganization(prisma,resolveDatabaseUrl(process.env),org.id));}}
finally{await prisma.$disconnect();}

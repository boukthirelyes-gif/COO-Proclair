import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
const url=process.env.E2E_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('/proclair_browser_test')||process.env.DATABASE_URL&&new URL(url).pathname===new URL(process.env.DATABASE_URL).pathname)throw Error('Remise à zéro réservée à la base navigateur distincte.');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url})});
try{await db.loginBucket.deleteMany();console.log('Compteurs de connexion synthétiques réinitialisés entre suites navigateur.')}finally{await db.$disconnect()}

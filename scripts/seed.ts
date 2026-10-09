import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { CRMService } from '../src/domain/service';
const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try { await new CRMService(db).bootstrapTechnicians({id:'setup',role:'ADMIN'}); }
finally { await db.$disconnect(); }

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const globalDB = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalDB.prisma ?? new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000})});
globalDB.prisma = prisma;

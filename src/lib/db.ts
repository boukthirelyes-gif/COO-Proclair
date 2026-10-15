import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveDatabaseUrl } from './database-url';

const isProductionDeployment = process.env.VERCEL_ENV === 'production';
const connectionString = resolveDatabaseUrl(process.env);
const globalDB = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalDB.prisma ?? new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
    max: isProductionDeployment ? 1 : 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  }),
});
globalDB.prisma = prisma;

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Temporary production workaround: use the same direct Neon connection that
// successfully applies the schema migrations during Vercel's production build.
// The pooled DATABASE_URL is failing at runtime with ENOENT in this deployment.
// Limit to one connection per serverless instance; restore pooling after the
// production DATABASE_URL has been independently repaired and verified.
const isProductionDeployment = process.env.VERCEL_ENV === 'production';
const connectionString = isProductionDeployment
  ? process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL
  : process.env.DATABASE_URL;
if (!connectionString) throw new Error('Connexion PostgreSQL absente pour cet environnement.');

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

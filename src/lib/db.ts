import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveDatabaseUrl } from './database-url';

// Next.js imports API route modules while collecting build metadata.
// Database credentials are required when a query is executed, not during import.
const globalDB = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (!globalDB.prisma) {
    const connectionString = resolveDatabaseUrl(process.env);
    globalDB.prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString,
        max: process.env.VERCEL_ENV === 'production' ? 1 : 3,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
      }),
    });
  }
  return globalDB.prisma;
}

// Lazy initialization also preserves Prisma's method receiver for $transaction,
// $disconnect, and other instance APIs.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

import {defineConfig} from 'prisma/config';

// Keep the Prisma CLI scoped to the active deployment environment.
// Browser and preview checks must never fall back to production credentials.
const url = process.env.VERCEL_ENV === 'preview'
  ? process.env.PROCLAIR_PREVIEW_DATABASE_URL || ''
  : process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {path: 'prisma/migrations'},
  datasource: {url},
});

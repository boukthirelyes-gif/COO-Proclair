import {spawnSync} from 'node:child_process';

// Validate before touching the existing production database. Never print values.
for (const name of ['DATABASE_URL', 'DIRECT_DATABASE_URL', 'PROCLAIR_ADMIN_PASSWORD', 'PROCLAIR_SESSION_SECRET', 'PROCLAIR_PUBLIC_ORIGIN', 'CRON_SECRET']) {
  if (!process.env[name]) throw new Error(`Variable obligatoire manquante : ${name}`);
}
if (process.env.PROCLAIR_ADMIN_PASSWORD.length < 12) throw new Error('Mot de passe administrateur trop court.');
for (const name of ['PROCLAIR_SESSION_SECRET', 'CRON_SECRET']) {
  if (process.env[name].length < 32) throw new Error(`${name} doit contenir au moins 32 caractères.`);
}
const origin = new URL(process.env.PROCLAIR_PUBLIC_ORIGIN);
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('PROCLAIR_PUBLIC_ORIGIN doit être une origine HTTPS sans chemin.');
}
for (const args of [['scripts/migrate.cjs'], ['--import', 'tsx', 'scripts/seed.ts']]) {
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: {...process.env, DATABASE_URL: process.env.DIRECT_DATABASE_URL},
  });
  if (result.error) throw new Error('Impossible de lancer la préparation PostgreSQL.');
  if (result.status !== 0) process.exit(result.status ?? 1);
}

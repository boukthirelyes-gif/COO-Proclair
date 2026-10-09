import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('.env')) {
  writeFileSync('.env', [
    'DATABASE_URL="postgresql://proclair:proclair_local_dev@127.0.0.1:5433/proclair?schema=public"',
    'PROCLAIR_SESSION_SECRET="' + randomBytes(48).toString('hex') + '"',
    'PROCLAIR_ADMIN_PASSWORD="' + randomBytes(24).toString('base64url') + '"',
    ''
  ].join('\n'), {mode:0o600,flag:'wx'});
  console.log('Configuration locale créée dans .env (ignorée par Git). Aucun secret affiché.');
} else console.log('Configuration .env existante conservée.');

import {spawnSync} from 'node:child_process';
import {resolveDatabaseUrl} from '../src/lib/database-url';

// The same fail-closed resolver used by runtime must run before any migration.
// Never substitute DATABASE_URL / DIRECT_DATABASE_URL for a missing preview URL.
if(process.env.VERCEL_ENV!=='preview')throw new Error('Preview migration requires VERCEL_ENV=preview.');
const connectionString=resolveDatabaseUrl(process.env);
const result=spawnSync(process.execPath,['scripts/migrate.cjs'],{stdio:'inherit',env:{...process.env,DATABASE_URL:connectionString}});
if(result.error)throw result.error;
process.exitCode=result.status??1;

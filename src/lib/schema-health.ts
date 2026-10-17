/**
 * A connection-only ping (SELECT 1) does not prove that Prisma's application
 * tables have been migrated. Keep this intentionally cheap and read-only.
 * It checks the login path plus representative CRM data dependencies.
 */
export type SchemaProbe = {
  loginBucket: string | null;
  appUser: string | null;
  customer: string | null;
  migrations: string | null;
  accountMfa: string | null;
  securityEpoch: string | null;
  invitations: string | null;
};

export function schemaProbeReady(rows: readonly SchemaProbe[] | null | undefined): boolean {
  if (!Array.isArray(rows) || rows.length !== 1) return false;
  const row = rows[0];
  return !!row && [row.loginBucket, row.appUser, row.customer, row.migrations, row.accountMfa, row.securityEpoch, row.invitations]
    .every(name => typeof name === 'string' && name.length > 0);
}

export function securityMigrationReady(rows:readonly {ready:boolean}[]|null|undefined){return Array.isArray(rows)&&rows.length===1&&rows[0]?.ready===true;}

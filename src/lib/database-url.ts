/** Fail closed on Vercel previews: never fall back to production credentials. */
export function resolveDatabaseUrl(env: NodeJS.ProcessEnv): string {
  if (env.VERCEL_ENV === 'preview') {
    const preview = env.PROCLAIR_PREVIEW_DATABASE_URL;
    if (!preview) throw new Error('Preview PostgreSQL isolé requis : PROCLAIR_PREVIEW_DATABASE_URL.');
    const parsed = parsePostgres(preview);
    for (const candidate of [env.DATABASE_URL, env.DIRECT_DATABASE_URL]) {
      if (candidate && sameDatabase(parsed, parsePostgres(candidate))) {
        throw new Error('Preview PostgreSQL non isolé : connexion équivalente à une URL réservée à la production.');
      }
    }
    return preview;
  }
  const url = env.VERCEL_ENV === 'production'
    ? env.DIRECT_DATABASE_URL || env.DATABASE_URL
    : env.DATABASE_URL;
  if (!url) throw new Error('Connexion PostgreSQL absente pour cet environnement.');
  return url;
}
function parsePostgres(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('URL PostgreSQL invalide.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname || url.pathname === '/') {
    throw new Error('URL PostgreSQL invalide.');
  }
  return url;
}
function sameDatabase(a: URL, b: URL): boolean {
  const host = (url: URL) => url.hostname.toLowerCase().replace(/-pooler(?=\.)/g, '');
  const port = (url: URL) => url.port || '5432';
  return host(a) === host(b) && port(a) === port(b)
    && decodeURIComponent(a.pathname) === decodeURIComponent(b.pathname);
}

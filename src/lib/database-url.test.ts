import { describe, expect, it } from 'vitest';
import { resolveDatabaseUrl } from './database-url';

const production = 'postgresql://user:secret@ep-sample.us-east-1.aws.neon.tech/proclair';
const pooled = 'postgresql://user:secret@ep-sample-pooler.us-east-1.aws.neon.tech/proclair';
const preview = 'postgresql://user:secret@ep-preview.us-east-1.aws.neon.tech/proclair_preview';

describe('preview database isolation', () => {
  it('rejects missing preview URL', () => {
    expect(() => resolveDatabaseUrl({ VERCEL_ENV: 'preview', DATABASE_URL: production })).toThrow(/isolé requis/);
  });
  it('rejects direct and pooled aliases', () => {
    expect(() => resolveDatabaseUrl({ VERCEL_ENV: 'preview', DATABASE_URL: production, PROCLAIR_PREVIEW_DATABASE_URL: pooled })).toThrow(/non isolé/);
  });
  it('accepts a separate preview database', () => {
    expect(resolveDatabaseUrl({ VERCEL_ENV: 'preview', DATABASE_URL: production, PROCLAIR_PREVIEW_DATABASE_URL: preview })).toBe(preview);
  });
  it('rejects invalid URLs without leaking credentials', () => {
    expect(() => resolveDatabaseUrl({ VERCEL_ENV: 'preview', PROCLAIR_PREVIEW_DATABASE_URL: 'secret-bad-url' })).toThrow('URL PostgreSQL invalide.');
  });
  it('preserves production connection selection', () => {
    expect(resolveDatabaseUrl({ VERCEL_ENV: 'production', DATABASE_URL: pooled, DIRECT_DATABASE_URL: production })).toBe(production);
  });
});

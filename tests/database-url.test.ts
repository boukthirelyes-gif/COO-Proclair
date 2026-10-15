import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import { resolveDatabaseUrl } from '../src/lib/database-url';

const production = 'postgresql://user:secret@ep-sample.us-east-1.aws.neon.tech/proclair';
const pooled = 'postgresql://user:secret@ep-sample-pooler.us-east-1.aws.neon.tech/proclair';
const preview = 'postgresql://user:secret@ep-preview.us-east-1.aws.neon.tech/proclair_preview';

describe('preview database isolation', () => {
  it('rejects missing preview URL', () => {
    assert.throws(() => resolveDatabaseUrl({ NODE_ENV: 'production', VERCEL_ENV: 'preview', DATABASE_URL: production }),/isolé requis/);
  });
  it('rejects direct and pooled aliases', () => {
    assert.throws(() => resolveDatabaseUrl({ NODE_ENV: 'production', VERCEL_ENV: 'preview', DATABASE_URL: production, PROCLAIR_PREVIEW_DATABASE_URL: pooled }),/non isolé/);
  });
  it('accepts a separate preview database', () => {
    assert.equal(resolveDatabaseUrl({ NODE_ENV: 'production', VERCEL_ENV: 'preview', DATABASE_URL: production, PROCLAIR_PREVIEW_DATABASE_URL: preview }),preview);
  });
  it('rejects invalid URLs without leaking credentials', () => {
    assert.throws(() => resolveDatabaseUrl({ NODE_ENV: 'production', VERCEL_ENV: 'preview', PROCLAIR_PREVIEW_DATABASE_URL: 'secret-bad-url' }),/URL PostgreSQL invalide/);
  });
  it('selects the preview-only credential when Vercel system variables are hidden', () => {
    assert.equal(resolveDatabaseUrl({ NODE_ENV: 'test', PROCLAIR_PREVIEW_DATABASE_URL: preview }),preview);
  });
  it('fails closed when neither preview nor production credentials are present', () => {
    assert.throws(() => resolveDatabaseUrl({ NODE_ENV: 'test' }),/Connexion PostgreSQL absente/);
  });
  it('preserves production connection selection', () => {
    assert.equal(resolveDatabaseUrl({ NODE_ENV: 'production', VERCEL_ENV: 'production', DATABASE_URL: pooled, DIRECT_DATABASE_URL: production }),production);
  });
});

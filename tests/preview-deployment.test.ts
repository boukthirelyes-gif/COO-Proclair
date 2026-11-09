import test from 'node:test';
import assert from 'node:assert/strict';
import {previewDeploymentConfiguration,deployedRevision,authenticationConfigured} from '../src/lib/preview-deployment';
const base:NodeJS.ProcessEnv={NODE_ENV:'test',VERCEL_ENV:'preview',DATABASE_URL:'postgresql://user:fake@production.invalid/live',PROCLAIR_PREVIEW_DATABASE_URL:'postgresql://user:fake@ep-test-pooler.neon.tech/preview',PROCLAIR_PREVIEW_DIRECT_DATABASE_URL:'postgresql://user:fake@ep-test.neon.tech/preview',PROCLAIR_ADMIN_PASSWORD:'synthetic-preview-password',PROCLAIR_SESSION_SECRET:'synthetic-preview-session-secret-only-123456'};
test('Preview config requires valid authentication before deployment',()=>{
 for(const key of ['PROCLAIR_ADMIN_PASSWORD','PROCLAIR_SESSION_SECRET'])for(const value of [undefined,'short'])assert.throws(()=>previewDeploymentConfiguration({...base,[key]:value}),new RegExp(key));
 assert.equal(authenticationConfigured(base),true);assert.equal(authenticationConfigured({...base,PROCLAIR_ADMIN_PASSWORD:undefined}),false);
});
test('Preview migration connection is direct, isolated and points at the runtime database',()=>{
 assert.equal(previewDeploymentConfiguration(base).migrationUrl,base.PROCLAIR_PREVIEW_DIRECT_DATABASE_URL);
 assert.throws(()=>previewDeploymentConfiguration({...base,PROCLAIR_PREVIEW_DIRECT_DATABASE_URL:undefined}),/transaction pooler/);
 assert.throws(()=>previewDeploymentConfiguration({...base,PROCLAIR_PREVIEW_DIRECT_DATABASE_URL:'postgresql://user:fake@another.neon.tech/preview'}),/same isolated database/);
 assert.throws(()=>previewDeploymentConfiguration({...base,PROCLAIR_PREVIEW_DIRECT_DATABASE_URL:base.DATABASE_URL}),/non isolé/);
 assert.throws(()=>previewDeploymentConfiguration({...base,PROCLAIR_PREVIEW_DIRECT_DATABASE_URL:'secret-not-a-url'}),/URL PostgreSQL invalide/);
});
test('Preview config refuses invalid public origins and preserves a direct isolated connection',()=>{
 for(const origin of ['http://crm.invalid','https://u:p@crm.invalid','https://crm.invalid/path','secret-not-an-origin'])assert.throws(()=>previewDeploymentConfiguration({...base,PROCLAIR_PUBLIC_ORIGIN:origin}),/HTTPS origin/);
 const direct=base.PROCLAIR_PREVIEW_DIRECT_DATABASE_URL;assert.equal(previewDeploymentConfiguration({...base,PROCLAIR_PREVIEW_DATABASE_URL:direct,PROCLAIR_PREVIEW_DIRECT_DATABASE_URL:undefined,PROCLAIR_PUBLIC_ORIGIN:'https://crm.vercel.app/'}).migrationUrl,direct);
});
test('Public revision is a valid SHA or unknown; it never guesses or returns arbitrary environment values',()=>{
 const sha='a'.repeat(40);assert.equal(deployedRevision({...base,VERCEL_GIT_COMMIT_SHA:sha}),sha);assert.equal(deployedRevision({...base,GITHUB_SHA:sha}),sha);assert.equal(deployedRevision({...base,VERCEL_GIT_COMMIT_SHA:'secret-not-a-revision'}),null);assert.equal(deployedRevision(base),null);
});

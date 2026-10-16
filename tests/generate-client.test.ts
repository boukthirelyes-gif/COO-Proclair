import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,symlink,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
test('Prisma generation creates a real client through linked dependencies and rejects invalid schemas',{timeout:60000},async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'proclair-generator-'));
 try{
  await mkdir(path.join(root,'scripts'));await mkdir(path.join(root,'prisma'));
  await copyFile('scripts/generate-client.cjs',path.join(root,'scripts/generate-client.cjs'));
  await symlink(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
  await writeFile(path.join(root,'package.json'),JSON.stringify({name:'synthetic-generator-fixture',version:'1.0.0'}));
  const schema=`generator client {\n provider = "prisma-client-js"\n engineType = "client"\n output = "../generated"\n}\ndatasource db {\n provider = "postgresql"\n url = env("DATABASE_URL")\n}\nmodel SyntheticDoor {\n id String @id\n address String\n}\n`;
  await writeFile(path.join(root,'prisma/schema.prisma'),schema);
  const options={cwd:root,encoding:'utf8' as const,timeout:25000,env:{PATH:process.env.PATH,DATABASE_URL:'postgresql://synthetic:fixture@localhost:5435/synthetic'}};
  const result=spawnSync(process.execPath,['scripts/generate-client.cjs'],options);
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/model metadata verified/);
  assert.match(await readFile(path.join(root,'generated/index.d.ts'),'utf8'),/SyntheticDoor/);
  await writeFile(path.join(root,'prisma/schema.prisma'),schema.replace('id String @id','id UnknownType @id'));
  const invalid=spawnSync(process.execPath,['scripts/generate-client.cjs'],options);
  assert.notEqual(invalid.status,0);assert.doesNotMatch(invalid.stdout,/model metadata verified/);
 }finally{await rm(root,{recursive:true,force:true})}
});

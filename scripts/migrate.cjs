// Transactional, forward-only PostgreSQL migrations; never resets data.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {Client}=require('pg');
(async()=>{
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
 const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
 try{
 await client.query('SELECT pg_advisory_lock(714928351)');
 await client.query('CREATE TABLE IF NOT EXISTS "_proclair_migrations" (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
 const root=path.resolve('prisma/migrations');const directories=(await fs.readdir(root,{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name).sort();
 for(const name of directories){const sql=await fs.readFile(path.join(root,name,'migration.sql'),'utf8');const checksum=crypto.createHash('sha256').update(sql).digest('hex');const existing=await client.query('SELECT checksum FROM "_proclair_migrations" WHERE name=$1',[name]);if(existing.rowCount){if(existing.rows[0].checksum!==checksum)throw new Error(`Applied migration ${name} was modified; restore its exact contents.`);continue;}
 await client.query('BEGIN');try{await client.query(sql);await client.query('INSERT INTO "_proclair_migrations" (name,checksum) VALUES ($1,$2)',[name,checksum]);await client.query('COMMIT');console.log(`Applied ${name}`);}catch(error){await client.query('ROLLBACK');throw error;}}
 }finally{await client.query('SELECT pg_advisory_unlock(714928351)').catch(()=>{});await client.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});

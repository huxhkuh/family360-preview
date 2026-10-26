import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir,writeFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
grant usage on schema auth,public,storage to anon,authenticated,service_role;
grant execute on all functions in schema auth to anon,authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb,owner uuid);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated;
alter default privileges in schema public grant all on tables to authenticated,service_role;
alter default privileges in schema public grant all on sequences to authenticated,service_role;`);
for(const file of (await readdir(new URL('legacy/postgres/',root))).filter(n=>/^\d.*sql$/.test(n)).sort()){
 try{await db.exec((await readFile(new URL('legacy/postgres/'+file,root),'utf8')).replace(/create extension if not exists "pgcrypto";/i,''));}catch(e){throw new Error(file+': '+e.message);}
}
const columns=(await db.query(`select table_schema,table_name,column_name,data_type,is_nullable,column_default,ordinal_position from information_schema.columns where table_schema in ('public','f360') order by table_schema,table_name,ordinal_position`)).rows;
const constraints=(await db.query(`select n.nspname as schema,t.relname as table_name,c.conname,c.contype,pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname in ('public','f360') order by n.nspname,t.relname,c.conname`)).rows;
const indexes=(await db.query(`select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','f360')`)).rows;
await writeFile(new URL('docs/migration/postgres-schema.json',root),JSON.stringify({columns,constraints,indexes},null,2)+'\n');
console.log(JSON.stringify({tables:new Set(columns.map(c=>c.table_schema+'.'+c.table_name)).size,columns:columns.length,constraints:constraints.length,indexes:indexes.length}));
console.log(constraints.filter(c=>c.contype==='c').map(c=>c.table_name+': '+c.definition).join('\n'));
await db.close();

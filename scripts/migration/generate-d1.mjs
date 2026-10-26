import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const schema=JSON.parse(await readFile(new URL('docs/migration/postgres-schema.json',root),'utf8'));
const tables=[...new Set(schema.columns.filter(c=>c.table_name!=='professionals_public').map(c=>c.table_name))];
function sql(text){return text.replace(/\b(public|f360)\./g,'').replace(/::(?:text|jsonb|numeric|integer|uuid)(?:\[\])?/g,'').replace(/= ANY \(ARRAY\[([^\]]+)\]\)/g,'IN ($1)').replace(/TRIM\(BOTH FROM (\w+)\)/g,'trim($1)').replace(/ USING btree /g,' ').replace(/\(key ~ '\^\[a-z\]\[a-z0-9_\]\*\$'\)/g,"(length(key)>0 AND substr(key,1,1) GLOB '[a-z]' AND key NOT GLOB '*[^a-z0-9_]*')");}
function def(c){let d=c.column_default;if(d==null)return '';if(d==='gen_random_uuid()')return " DEFAULT (lower(hex(randomblob(16))))";if(d==='now()')return " DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))";if(d.includes('interval'))return '';return ' DEFAULT '+sql(d).replace(/^true$/,'1').replace(/^false$/,'0');}
const metadata={};const parts=['-- Generated from the complete local PostgreSQL migrations by generate-d1.mjs.','-- Auth identities are external; auth_user_id is unique but has no cross-service FK.','PRAGMA foreign_keys = ON;'];
for(const table of tables){const cols=schema.columns.filter(c=>c.table_name===table);metadata[table]={json:cols.filter(c=>['jsonb','ARRAY'].includes(c.data_type)).map(c=>c.column_name),boolean:cols.filter(c=>c.data_type==='boolean').map(c=>c.column_name),columns:cols.map(c=>c.column_name)};
 const lines=cols.map(c=>{const type=['integer','bigint','boolean'].includes(c.data_type)?'INTEGER':c.data_type==='numeric'?'NUMERIC':'TEXT';return `  "${c.column_name}" ${type}${c.is_nullable==='NO'?' NOT NULL':''}${def(c)}${c.data_type==='boolean'?` CHECK ("${c.column_name}" IN (0,1))`:['jsonb','ARRAY'].includes(c.data_type)?` CHECK (json_valid("${c.column_name}"))`:''}`;});
 for(const con of schema.constraints.filter(c=>c.table_name===table&&['p','u','f','c'].includes(c.contype))){if(con.definition.includes('auth.users'))continue;let definition=sql(con.definition);if(table==='profiles'&&con.contype==='c')definition=definition.replace("'client'","'client', 'marketer'");if(/::|\bANY\b|\bARRAY\b| ~ /.test(definition))throw Error('Untranslated constraint '+con.conname);lines.push('  '+definition);}
 parts.push(`CREATE TABLE "${table}" (\n${lines.join(',\n')}\n);`);
}
for(const index of schema.indexes){if(index.indexname.endsWith('_pkey')||schema.constraints.some(c=>c.conname===index.indexname&&['p','u'].includes(c.contype)))continue;parts.push(sql(index.indexdef)+';');}
parts.push("INSERT INTO counters(key,value) VALUES ('analysis_task',0),('execution_task',0);");
await writeFile(new URL('server/migrations/0001_legacy_schema.sql',root),parts.join('\n\n')+'\n');
await writeFile(new URL('server/src/schema-metadata.json',root),JSON.stringify(metadata,null,2)+'\n');
console.log(`Generated ${tables.length} tables; preserved all local primary, unique, foreign-key (except external Auth) and check constraints.`);

import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';

// Entirely local workerd, D1 and R2. This never connects to a deployed database.
const origin='https://mesudarim360-staging.pages.dev';
const runtime=new Miniflare(convertV4MiniflareOptions({workers:[{
  name:'runtime',
  modules:true,
  scriptPath:fileURLToPath(new URL('../server/artifacts/runtime/index.js',import.meta.url)),
  compatibilityDate:'2026-10-26',
  bindings:{ENVIRONMENT:'test',AUTH_ENABLED:'true',SUPABASE_URL:'https://auth.example.invalid',SUPABASE_PUBLISHABLE_KEY:'synthetic-test-key',ALLOWED_ORIGINS:origin},
  d1Databases:['DB'],r2Buckets:['DOCUMENTS'],
  outboundService:()=>new Response('External requests disabled in runtime tests',{status:503}),
},{
  name:'pages-proxy',modules:true,compatibilityDate:'2026-10-26',
  routes:['https://pages-runtime.invalid/*'],
  scriptPath:fileURLToPath(new URL('../server/pages-proxy.js',import.meta.url)),
  serviceBindings:{STAGING_API:'runtime',ASSETS:()=>new Response('synthetic asset')},
}]}));
try {
  const db=await runtime.getD1Database('DB');
  const directory=new URL('../server/migrations/',import.meta.url);
  for(const name of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort()){
    const sql=await readFile(new URL(name,directory),'utf8');
    await db.exec(sql.replace(/^\s*--.*$/gm,'').replace(/\r?\n/g,' '));
  }
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM profiles').first()).count,0);
  const call=(path,init={})=>runtime.dispatchFetch('https://runtime.invalid'+path,init);
  const health=await call('/health');
  assert.equal(health.status,200);
  assert.deepEqual(await health.json(),{status:'ok',environment:'test',authConfigured:true});
  for(const path of ['/api/rpc/rpc_workspace','/api/documents/another-person-document']){
    const denied=await call(path,{method:path.includes('/rpc/')?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'}});
    assert.equal(denied.status,401);
    assert.equal((await denied.json()).error.code,'UNAUTHENTICATED');
    assert.equal(denied.headers.get('cache-control'),'no-store');
  }
  const preflight=await call('/api/rpc/rpc_workspace',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
  const foreign=await call('/health',{headers:{Origin:'https://untrusted.example.invalid'}});
  assert.equal(foreign.status,403);
  assert.equal(foreign.headers.get('access-control-allow-origin'),null);
  const pagesFetch=(path,init={})=>runtime.dispatchFetch('https://pages-runtime.invalid'+path,init);
  const proxied=await pagesFetch('/api/rpc/rpc_workspace',{method:'POST',headers:{Origin:origin}});
  assert.equal(proxied.status,401,await proxied.clone().text());
  assert.equal((await proxied.json()).error.code,'UNAUTHENTICATED');
  assert.equal((await pagesFetch('/health',{headers:{Origin:'https://untrusted.example.invalid'}})).status,403);
  assert.equal(await (await pagesFetch('/')).text(),'synthetic asset');
  await assert.rejects(db.batch([
    db.prepare('INSERT INTO transaction_assertions(id,valid) VALUES (?,1)').bind('runtime-rollback'),
    db.prepare('INSERT INTO transaction_assertions(id,valid) VALUES (?,0)').bind('runtime-invalid'),
  ]));
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM transaction_assertions').first()).count,0);
  const bucket=await runtime.getR2Bucket('DOCUMENTS');
  await bucket.put('synthetic/runtime.pdf','%PDF-1.7 synthetic');
  assert.equal(await (await bucket.get('synthetic/runtime.pdf')).text(),'%PDF-1.7 synthetic');
  console.log('PASS: actual local workerd HTTP, all D1 migrations, empty users, foreign keys, atomic rollback, CORS, unauthenticated RPC/document denial and R2 binding. No deployed Auth/email flows tested.');
}finally{await runtime.dispose();}

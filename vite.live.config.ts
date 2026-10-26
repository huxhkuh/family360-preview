import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd(),'VITE_');const api=env.VITE_API_URL?new URL(env.VITE_API_URL).origin:'';const auth=env.VITE_SUPABASE_URL?new URL(env.VITE_SUPABASE_URL).origin:'';return {
 base:'/',plugins:[react(),{name:'live-entry',transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/main.tsx','/src/live-main.tsx').replace('מסודרים 360 · דמו להתנסות','מסודרים 360 · סביבת בדיקה').replace('/family360-preview/brand/','/brand/').replace("connect-src 'self'",`connect-src 'self' ${api} ${auth}`).replace("form-action 'none'","form-action 'self'");}},closeBundle(){writeFileSync('dist-live/_headers',`/*\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' ${api} ${auth}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'\n`);}}],
 resolve:{alias:[{find:/^(?:\.\.\/|\.\/)+lib\/backend$/,replacement:fileURLToPath(new URL('./src/lib/live-backend.ts',import.meta.url))}]},
 define:{'import.meta.env.VITE_LIVE_MODE':'true'},server:{host:'127.0.0.1',port:5174,strictPort:true},build:{outDir:'dist-live',sourcemap:false}
};});

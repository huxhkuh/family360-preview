import {spawnSync} from 'node:child_process';
// Explicit local check using invented notes only; reuse the approved key in memory.
const options=process.env.NODE_OPTIONS||'';
const result=spawnSync(process.execPath,['./node_modules/vitest/vitest.mjs','run','server/tests/ai-summary-live.test.ts','--exclude=artifacts/**'],{stdio:'inherit',env:{...process.env,RUN_LIVE_AI:'1',NODE_OPTIONS:options.includes('--use-system-ca')?options:options+' --use-system-ca'}});
if(result.error){console.error('Unable to start the local summary wording test.');process.exit(1);}process.exit(result.status??1);

import {build} from 'esbuild';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {existingAiKey} from './ai-key.mjs';

const output='artifacts/ai-live';mkdirSync(output,{recursive:true});
await build({entryPoints:['server/src/ai-provider.ts'],bundle:true,platform:'node',format:'esm',outfile:output+'/provider.mjs',target:'node24'});
const {readDocument,createBrief}=await import(pathToFileURL(path.resolve(output+'/provider.mjs')));
const env={OPENAI_API_KEY:existingAiKey(),AI_MODEL:process.env.AI_MODEL||'gpt-6.1-sol'};
// A single-page synthetic PDF; there is no customer data in this test.
const stream='BT /F1 18 Tf 45 740 Td (SYNTHETIC PAYSLIP - TEST DATA ONLY) Tj 0 -35 Td (Employee: Synthetic Test) Tj 0 -30 Td (Period: September 2026) Tj 0 -30 Td (Gross salary: 12000 ILS) Tj 0 -30 Td (Net salary: 9250 ILS) Tj ET';
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
let pdf='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const start=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
writeFileSync(output+'/synthetic-payslip.pdf',pdf);
const document=await readDocument(env,{bytes:new TextEncoder().encode(pdf),mime:'application/pdf'});
const gross=document.result.fields.find(f=>f.key==='gross_salary');assert(gross,'Gross salary missing');assert.equal(gross.value.replaceAll(',',''),'12000');assert.equal(gross.page,1);
const input={sources:[{id:'q:housing',label:'מגורים',value:'שכירות',kind:'reported'},{id:'d:test:gross',label:'ברוטו',value:'12000 ILS',kind:'document'}],topics:[{key:'housing',title:'מגורים',question:'האם חוזה השכירות עדכני?',explain:'מבררים את הוצאות המגורים ואת החומר הדרוש לבדיקה.',needs:['חוזה שכירות']}],coverage:[{key:'housing',title:'מגורים',shown:true,source_ids:['q:housing']}]};
const brief=await createBrief(env,input);assert.equal(brief.result.topics[0].key,'housing');assert(brief.result.summary.every(s=>s.sources.every(id=>input.sources.some(source=>source.id===id))));
const result={passed:true,model:env.AI_MODEL,syntheticOnly:true,documentFields:document.result.fields.length,sourcePage:gross.page,documentTokens:document.tokens,briefTokens:brief.tokens,briefTopicCount:brief.result.topics.length};
writeFileSync(output+'/result.json',JSON.stringify(result,null,2));writeFileSync(output+'/synthetic-extraction.json',JSON.stringify(document.result,null,2));console.log(JSON.stringify(result,null,2));

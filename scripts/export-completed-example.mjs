import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='test-results/completed-family-example';mkdirSync(out,{recursive:true});
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
let browser;
try{
 const backend=await server.ssrLoadModule('/src/lib/backend.ts'),render=await server.ssrLoadModule('/src/reports/ReportDocument.tsx'),example=await server.ssrLoadModule('/src/reports/completed-example.ts');
 const meetingId=backend.loadCompletedFamilyExample(),w=await backend.loadWorkspace(),report=w.finalReports.find(r=>r.meeting_id===meetingId);
 expect(report.status).toBe('approved');expect(report.snapshot.questionnaire).toHaveLength(10);const markup=renderToStaticMarkup(React.createElement(render.ReportDocument,{snapshot:report.snapshot,approved:true}));
 const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const coverageSource='<p>נוסף מיפוי של כל עשרת פרקי השאלון. כל תשובה מסומנת כדיווח לקוח; מסקנות הבירור מוזנות בנפרד בידי הנציג. פרקים ללא בדיקה מצוינים כך במפורש. צילום המצב נשמר בעת אישור הדוח.</p>';
 const table=coverageSource+`<table><thead><tr><th>פרט בדוח</th><th>ערך בדוגמה</th><th>מקור ואחריות להזנה</th></tr></thead><tbody>${example.exampleSourceMap.map(row=>'<tr>'+row.map(cell=>`<td>${esc(cell)}</td>`).join('')+'</tr>').join('')}</tbody></table>`;
 const notes='<section class="source-audit"><h1>דוח לדוגמה ומפת המקורות שלו</h1><p><strong>משפחה מדומה בלבד.</strong> התרחיש נטען מראש עם שלבי עבודה שהסתיימו. לא בוצעו בדיקה מול בנק, העלאת מסמכים, חיוב או משלוח מייל.</p><p>לפני השיחה הוצעה חלופה של 25 ₪ לעומת עלות 85 ₪: פוטנציאל 60 ₪ לחודש. בפועל הדוגמה הסתיימה במסלול 30 ₪: החיסכון שהושג הוא 55 ₪ לחודש, 660 ₪ בשווי שנתי, וזיכוי נפרד של 120 ₪. אין ערבוב בין הצעה לתוצאה.</p>'+table+'<p><strong>פער במימוש הנוכחי:</strong> הנציג מזין את הנתונים הסופיים שוב. שדה המקור הוא טקסט חופשי, ולא קישור מאומת למסמך. אין קריאה אוטומטית של מסמכים או העברה אוטומטית מהניתוח לדוח.</p></section>';
 const screenCSS='body{background:#f6f4ef}button{display:none}.source-audit{max-width:1000px;margin:24px auto;padding:28px;background:white;border:1px solid #ddd8cf}table{width:100%;border-collapse:collapse}td,th{padding:14px;text-align:right;border:1px solid #ddd8cf;vertical-align:top}th{background:#f2eee6}@media screen{.report-page{min-height:0;max-width:900px;margin:28px auto;padding:28px;background:white;border:1px solid #ddd8cf}}';
 const html=`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>משפחה מדומה — דוח מלא ומקורות</title><style>${render.reportPrintCSS}${screenCSS}</style><body>${notes}${markup}</body></html>`;
 writeFileSync(`${out}/report-and-sources.html`,html);writeFileSync(`${out}/snapshot-and-source-map.json`,JSON.stringify({fictional:true,meetingId,snapshot:report.snapshot,sourceMap:example.exampleSourceMap},null,2));
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1000,height:1000}});await page.setContent(html);await page.screenshot({path:`${out}/sources.png`,fullPage:true});
 await page.setContent(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><style>${render.reportPrintCSS}</style><body>${markup}</body></html>`);await page.locator('.report-preview>button').evaluate(el=>el.remove());
 const pdf=await page.pdf({path:`${out}/completed-family-report.pdf`,preferCSSPageSize:true,printBackground:true});const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;expect(pages).toBeGreaterThanOrEqual(4);
 // Read-only probes in a separate in-memory demo establish present workflow gaps.
 backend.resetDemo();backend.selectRole('representative');const gaps={};
 for(const [name,args] of [['rpc_send_to_analysis',{p_family_service_id:'fs2',p_professional_id:'pro1',p_note:'בדיקה מדומה'}],['rpc_share_document',{p_document_id:'d1',p_task_id:'e1',p_kind:'execution',p_revoke:false}],['rpc_approve_analysis',{p_family_service_id:'fs3'}],['rpc_schedule_meeting',{p_family_id:'f3',p_scheduled_at:new Date().toISOString(),p_type:'phone'}]])try{await backend.rpc(name,args);gaps[name]='implemented';}catch(e){gaps[name]=e.message;}
 writeFileSync(`${out}/verification.json`,JSON.stringify({fictional:true,pdfPages:pages,gaps},null,2));console.log(JSON.stringify({out,pdfPages:pages,gaps},null,2));
}finally{await browser?.close();await server.close();}

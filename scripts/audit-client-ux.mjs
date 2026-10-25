import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/';
const phase=process.env.AUDIT_PHASE||'before';const folder=`test-results/client-ux-${phase}`;mkdirSync(folder,{recursive:true});
const browser=await chromium.launch();const results=[];
try{for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base+'#workspace');await page.getByRole('button',{name:'התנסות כלקוח חדש',exact:true}).click();
 await page.getByRole('button',{name:'התחלת השאלון',exact:true}).click();await page.locator('[data-answer-key=city]').waitFor();await page.evaluate(()=>scrollTo(0,0));
 const before=await page.locator('[data-answer-key=city]').evaluate(el=>Math.round(el.getBoundingClientRect().top+scrollY));
 await page.screenshot({path:`${folder}/${device}-questionnaire.png`,fullPage:true});
 await page.getByRole('navigation',{name:'פרקי השאלון'}).getByRole('button',{name:'בנקים ואשראי',exact:true}).click();
 const chapter=await page.locator('.chapter-heading').evaluate(el=>({top:Math.round(el.getBoundingClientRect().top),focus:el.contains(document.activeElement)}));
 await page.getByRole('button',{name:'בדיקת שדות חסרים',exact:true}).click();await page.locator('.validation-summary').waitFor();
 const missing=await page.locator('.validation-summary li').count();
 await page.goto(base+'#/families/f1/documents');await page.getByRole('region',{name:'מה צריך לצרף'}).waitFor();await page.screenshot({path:`${folder}/${device}-empty-documents.png`,fullPage:true});
 await page.getByRole('navigation',{name:'ניווט ראשי'}).getByRole('button',{name:'התראות',exact:true}).click();await page.screenshot({path:`${folder}/${device}-notifications.png`,fullPage:true});
 await page.goto(base+'#workspace');await page.getByRole('button',{name:/^02 לקוח/}).click();await page.getByRole('navigation',{name:'ניווט ראשי'}).waitFor();await page.screenshot({path:`${folder}/${device}-returning.png`,fullPage:true});
 results.push({device,firstEditableFieldDocumentY:before,chapterAfterExplicitSelection:chapter,missingRequiredFields:missing,errors});await page.close();
}}finally{await browser.close();}
writeFileSync(`${folder}/evidence.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

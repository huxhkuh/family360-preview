import {attachRequiredSamples} from './task-navigation.mjs';
import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/';
const out='test-results/new-client-2026-10-21';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const width of [1440,390,320]){
 const page=await browser.newPage({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
 const errors=[],requests=[],chapters=[];page.on('dialog',d=>d.accept());page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)requests.push(r.url()+':'+r.status())});
 const field=k=>page.locator(`[data-answer-key="${k}"]`);
 const next=async()=>{chapters.push(await page.locator('.chapter-heading h3').innerText());expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.getByRole('button',{name:/^שמירה והמשך/}).click();};
 await page.goto(base+'#workspace');await page.getByRole('button',{name:'התנסות כלקוח חדש',exact:true}).click();
 await page.screenshot({path:`${out}/${width}-home.png`});await page.getByRole('button',{name:'התחלת השאלון',exact:true}).click();
 await field('city').fill('ירושלים');await field('marital').selectOption('single');await field('h_first').fill('ישראל');await field('h_last').fill('בדיקת דמו');await field('h_id').fill('000000018');await field('h_email').fill('demo@example.invalid');
 // Use the visible calendar, including a real month/year selection, rather than just programmatic date filling.
 await page.getByRole('button',{name:'פתיחת לוח שנה: תאריך לידה',exact:true}).click();
 const calendar=page.getByRole('dialog',{name:'בחירת תאריך: תאריך לידה',exact:true});await calendar.getByRole('combobox',{name:'שנה',exact:true}).selectOption('1990');await calendar.getByRole('combobox',{name:'חודש',exact:true}).selectOption('0');await calendar.getByRole('button',{name:'1 בינואר 1990',exact:true}).click();await expect(field('h_dob')).toHaveValue('1990-01-01');
 await next();await field('h_emp').getByLabel('שכיר',{exact:true}).check();await field('h_gross').fill('12000');
 const inline=page.getByRole('region',{name:'מסמכים לפרק הנוכחי'});await expect(inline).toContainText('אפשר לשלוח את השאלון לפני הצירוף');await expect(inline.getByRole('button',{name:'אולי בהמשך',exact:true})).toBeVisible();
 expect(await page.locator('.chapter-actions').evaluate(el=>!!(el.compareDocumentPosition(document.querySelector('.document-companion'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);await page.locator('.chapter-actions').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${width}-optional-inline.png`});
 await next();await field('housing').selectOption('rent');await field('owns_property').selectOption('no');await field('rent_amount').fill('3500');await next();
 await field('has_car').selectOption('no');chapters.push(await page.locator('.chapter-heading h3').innerText());
 await page.getByRole('button',{name:'בדיקה לפני שליחה',exact:true}).click();await expect(page.locator('.validation-summary')).toContainText('לא נמצאו שדות חובה חסרים');
 await page.getByRole('button',{name:'שליחת השאלון לבדיקה',exact:true}).click();await expect(page.locator('[role=alert]')).toHaveCount(0);await expect(page.locator('.questionnaire-paper')).toHaveCount(0);await expect(page.locator('.client-completion')).toHaveCount(0);await expect(page.locator('article.document[data-document-required=true]')).toHaveCount(1);await attachRequiredSamples(page);await expect(page.locator('.client-completion')).toBeVisible();
 await expect(page.locator('.client-completion')).toContainText('המסמכים ממתינים לבדיקה');
 const home=page.getByRole('button',{name:'חזרה לבית שלי',exact:true});await expect(home).toBeVisible();await page.evaluate(()=>{window.scrollTo(0,0);return document.fonts.ready;});const pos=await home.boundingBox();await page.screenshot({path:`${out}/${width}-complete-before-scroll.png`});if(width<500){expect((await page.locator('.client-folder-tabs').boundingBox()).height).toBeLessThanOrEqual(90);expect(pos.y+pos.height).toBeLessThan(844);}
 await page.screenshot({path:`${out}/${width}-complete-no-documents.png`});await home.click();await expect(page).toHaveURL(/#\/overview$/);await expect(page.getByRole('button',{name:'התחלת השאלון',exact:true})).toHaveCount(0);
 await page.locator('.focus-more>summary').click();await page.getByRole('button',{name:'כל המסמכים',exact:true}).click();const prep=page.locator('.document-preparation-more');await expect(prep).not.toHaveAttribute('open');await prep.locator(':scope > summary').click();
 // A deliberately deferred signature must stay optional and must not become an orange "missing" obligation.
 await prep.locator('[data-preparation-key=clearinghouse_auth_h]').getByRole('button',{name:'הוספת הרשאה להשלמה עם הנציג',exact:true}).click();
 await expect(page.locator('article.document[data-document-type=signature]').locator('.badge')).toHaveText('חתימה לפני פנייה למסלקה');await expect(page.locator('.client-completion')).toBeVisible();await expect(page.locator('article.document[data-document-type=signature]')).toHaveCount(1);
 await home.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${width}-optional-authorization.png`});
 await prep.locator('[data-preparation-key=rental_contract]').getByRole('button',{name:'צירוף דוגמה',exact:true}).click();await expect(page.locator('article.document')).toHaveCount(3);await expect(page.locator('.client-completion')).toBeVisible();
 await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption('representative');await page.evaluate(()=>{location.hash='/families/f1/documents'});
 const rentalDoc=page.locator('article.document').filter({hasText:'חוזה שכירות'});await rentalDoc.getByLabel('סיבת הדחייה').fill('דוגמה לבדיקה: חסר עמוד');await rentalDoc.getByRole('button',{name:'דחיית מסמך',exact:true}).click();
 await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption('client');await page.evaluate(()=>{location.hash='/families/f1/documents'});await expect(rentalDoc.locator('.badge')).toHaveText('התקבלה הערה · רשות');await expect(page.locator('.client-completion')).toBeVisible();await expect(home).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);expect(requests).toEqual([]);
 results.push({width,mobileEmulation:width<500,chapters,confirmedRequiredDocumentsAfterSubmission:true,optionalSignatureNonblocking:true,sampleUpload:true,optionalRejectionNonblocking:true,homeButtonBottom:Math.round(pos.y+pos.height),pageErrors:errors,httpErrors:requests});await page.close();
}}finally{await browser.close();}
writeFileSync(`${out}/qa.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

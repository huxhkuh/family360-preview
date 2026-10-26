import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/';
const out='test-results/client-workspace';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{for(const [device,width,height] of [['desktop',1440,1000],['tablet',820,900],['mobile',390,844],['narrow',320,800]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.setDefaultTimeout(10000);const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto(base+'#workspace');await page.locator('.demo-roles button').filter({has:page.locator('strong', {hasText:'לקוח'})}).click();
 await expect(page.getByRole('region',{name:'הפעולה הבאה שלי'}).getByRole('heading',{name:'להעלות דוח חיסכון עדכני',exact:true})).toBeVisible();
 await page.locator('.focus-more>summary').click();
 const mine=page.locator('.focus-task'),care=page.locator('.client-care');
 await expect(mine).toContainText('להעלות דוח חיסכון עדכני');await expect(mine).not.toContainText('לתאם שיחת מעקב');await expect(care).toContainText('לתאם שיחת מעקב');
 await expect(page.locator('.client-process-reference')).not.toHaveAttribute('open','');
 await page.screenshot({path:`${out}/${device}-home.png`,fullPage:true});
 await mine.getByRole('button',{name:'לצירוף המסמך',exact:true}).click();
 const doc=page.locator('[data-record-id="d1"]');await expect(doc).toBeFocused();await expect(doc).toBeInViewport();await expect(doc).toContainText('להכין את בירור החסכונות');
 await doc.getByRole('button',{name:'צירוף קובץ דוגמה בלבד',exact:true}).click();await expect(doc).toContainText('ממתין לבדיקה');
 await page.goto(base+'#/families/f1/followups');const followup=page.locator('[data-record-id="fu1"]');
 await expect(followup.getByRole('link',{name:/פתיחת המסמך/})).toBeVisible();await followup.getByRole('button',{name:'סימון כהושלמה',exact:true}).click();
 await page.getByRole('navigation',{name:'סינון משימות המשך'}).getByRole('button',{name:'הכול',exact:true}).click();
 await followup.getByRole('button',{name:'סימנתי בטעות — בקשת תיקון מהנציג',exact:true}).click();await expect(followup).toContainText('בקשת התיקון נרשמה');await expect(followup.locator('.badge')).toHaveText('הושלמה');
 await page.goto(base+'#/overview');await page.locator('.focus-more>summary').click();await page.locator('.client-help summary').click();await page.getByLabel('במה נוכל לעזור?').fill('נרצה הסבר לפני המשך הטיפול');
 await page.getByRole('button',{name:'רישום בקשת עזרה בדמו',exact:true}).click();await expect(page.locator('.client-help')).toContainText('בקשת העזרה רשומה במעקב');await expect(care).toContainText('נרצה הסבר לפני המשך הטיפול');await expect(care).toContainText('בקשה לתיקון:');
 await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption('representative');await page.goto(base+'#/notifications');await page.locator('section.card').filter({has:page.getByRole('heading',{name:'בקשת עזרה מהמשפחה',exact:true})}).getByRole('button',{name:'פתיחת הבקשה בתיק',exact:true}).click();await expect(page.locator('.family-activity')).toContainText('נרצה הסבר לפני המשך הטיפול');
 // Editing a linked follow-up must preserve the document relationship.
 await page.getByRole('navigation',{name:'סינון משימות המשך'}).getByRole('button',{name:'הכול',exact:true}).click();await followup.getByRole('button',{name:'פתיחה מחדש',exact:true}).click();await followup.getByRole('button',{name:/עדכון אחראי או מועד/}).click();await followup.getByRole('button',{name:'שמירת אחראי ומועד',exact:true}).click();await expect(followup.getByRole('link',{name:/פתיחת המסמך/})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 // Start a fresh synthetic intake in a new page: validate drafts and nested errors.
 const fresh=await browser.newPage({viewport:{width,height}});fresh.on('pageerror',e=>errors.push(e.message));await fresh.goto(base+'#workspace');await fresh.getByRole('button',{name:'התנסות כלקוח חדש',exact:true}).click();await fresh.getByRole('button',{name:'התחלת השאלון',exact:true}).click();
 const chapters=fresh.getByRole('navigation',{name:'פרקי השאלון'});
 await fresh.locator('[data-answer-key=marital]').selectOption('single');
 for(const [key,value] of Object.entries({city:'עיר לדוגמה',address:'רחוב הדוגמה 1',h_first:'ישראל',h_last:'לדוגמה',h_id:'abc',h_dob:'1990-01-01',h_phone:'0500000000',h_email:'not-an-email'}))await fresh.locator(`[data-answer-key=${key}]`).fill(value);
 await fresh.getByRole('button',{name:'שמירת טיוטה',exact:true}).click();await expect(fresh.getByText('הטיוטה נשמרה. אפשר להמשיך בין המסכים; רענון הדמו מאפס את הנתונים.')).toBeVisible();
 await fresh.getByRole('button',{name:'שליחת השאלון לבדיקה',exact:true}).click();await expect(fresh.locator('[data-answer-key=h_id]')).toBeFocused();await expect(fresh.locator('[data-answer-key=h_id]')).toHaveAttribute('aria-invalid','true');await expect(fresh.locator('[data-answer-key=h_email]')).toHaveValue('not-an-email');await expect(chapters.getByRole('button',{name:'פרטי משפחה',exact:true})).toContainText('2 שדות לתיקון');await expect(fresh.locator('.validation-summary')).toContainText('דוא״ל תקינה');
 await fresh.screenshot({path:`${out}/${device}-validation.png`,fullPage:true});
 await fresh.locator('[data-answer-key=h_id]').fill('000000018');await fresh.locator('[data-answer-key=h_email]').fill('demo@example.invalid');await expect(fresh.locator('[data-answer-key=h_email]')).not.toHaveAttribute('aria-invalid','true');
 await fresh.getByRole('button',{name:'הוספת ילד',exact:true}).click();await fresh.locator('[data-answer-key="children.0.dob"]').fill('2099-01-01');await fresh.getByRole('button',{name:'בדיקה לפני שליחה',exact:true}).click();await fresh.locator('.validation-summary').getByRole('button',{name:/ילד 1.*תאריך לידה/}).click();await expect(fresh.locator('[data-answer-key="children.0.dob"]')).toBeFocused();await fresh.locator('[data-answer-key="children.0.dob"]').fill('2018-01-01');
 await chapters.getByRole('button',{name:'עבודה והכנסות',exact:true}).click();await fresh.getByRole('checkbox',{name:'לא עובד',exact:true}).check();await chapters.getByRole('button',{name:'מגורים',exact:true}).click();await fresh.locator('[data-answer-key=housing]').selectOption('family');await chapters.getByRole('button',{name:'ביטוחים',exact:true}).click();await fresh.locator('[data-answer-key=has_car]').selectOption('no');await chapters.getByRole('button',{name:'בנקים ואשראי',exact:true}).click();await fresh.locator('[data-answer-key=bank_count]').fill('1');
 await fresh.locator('.questionnaire-review>summary').click();const review=fresh.locator('.answer-review details').filter({has:fresh.locator('summary',{hasText:'פרטי משפחה'})});await review.locator('summary').click();await expect(review).toContainText('demo@example.invalid');await expect(review).not.toContainText('not-an-email');await fresh.getByRole('button',{name:'שליחת השאלון לבדיקה',exact:true}).click();await expect(fresh.getByRole('region',{name:'מה צריך לצרף'})).toBeVisible();expect(await fresh.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 expect(errors).toEqual([]);expect(external).toEqual([]);results.push({device,passed:true,checks:['unified client work','separate representative work','direct document focus','attach before task completion','correction does not undo','help visible to representative','linked task survives edit','invalid draft retained','invalid submission blocked','nested field focus','valid corrected submission','review of visible answers','notification destination','no overflow or JS errors']});await page.close();await fresh.close();
}}finally{await browser.close();}
writeFileSync(`${out}/qa.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

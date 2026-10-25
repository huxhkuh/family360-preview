import {chromium,expect} from '@playwright/test';
const base=process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base+'#workspace');await page.locator('.demo-roles button').filter({has:page.locator('strong',{hasText:'נציג'})}).click();await page.goto(base+'#/families/f1/documents');
 const request=page.locator('section.card').filter({has:page.getByRole('heading',{name:'בקשת מסמך',exact:true})});
 await request.getByLabel('סוג מסמך',{exact:true}).selectOption('dt1');
 for(const [label,value] of [['למה המסמך נדרש?','לבדיקת הנתונים בשיחה הבאה'],['עבור מי?','בעל החיסכון לדוגמה'],['לאיזו תקופה?','השנה האחרונה'],['איפה אפשר למצוא אותו?','באזור האישי של הגוף המנהל']])await request.getByLabel(label,{exact:true}).fill(value);
 await request.getByRole('button',{name:'הוספת דרישת מסמך',exact:true}).click();const doc=page.locator('article.document').filter({hasText:'לבדיקת הנתונים בשיחה הבאה'});await expect(doc).toBeVisible();const documentId=await doc.getAttribute('data-record-id');
 await page.goto(base+'#/families/f1/followups');const task=page.locator('[data-record-id="ft1"]');await task.getByRole('button',{name:'עריכת הפעולה',exact:true}).click();await page.getByLabel('בקשת מסמך קשורה',{exact:true}).selectOption(documentId);await page.getByRole('button',{name:'שמירת הפעולה',exact:true}).click();await expect(task.getByRole('link',{name:/פתיחת המסמך/})).toBeVisible();
 await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption('client');await page.goto(base+'#/families/f1/followups');await expect(task.getByRole('button',{name:'השלמת הפעולה',exact:true})).toBeDisabled();await task.getByRole('link',{name:/פתיחת המסמך/}).click();await expect(doc).toBeFocused();await expect(doc).toContainText('בעל החיסכון לדוגמה');await expect(doc).toContainText('השנה האחרונה');await expect(doc).toContainText('באזור האישי של הגוף המנהל');
 await doc.getByRole('button',{name:'צירוף קובץ דוגמה בלבד',exact:true}).click();await page.goto(base+'#/families/f1/followups');await task.getByRole('button',{name:'השלמת הפעולה',exact:true}).click();await page.getByRole('navigation',{name:'סינון פעולות בתיק'}).getByRole('button',{name:'הכול',exact:true}).click();await expect(task.locator('.badge')).toHaveText('הושלמה');expect(errors).toEqual([]);
 console.log('PASS: representative document instructions → linked family task → client instructions → attachment guard → completed task; zero JS errors');
}finally{await browser.close();}

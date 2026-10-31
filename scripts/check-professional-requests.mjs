import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='http://127.0.0.1:5267/family360-preview/',folder='test-results/pro-requests';mkdirSync(folder,{recursive:true});const browser=await chromium.launch(),results=[];
try{for(const width of [1440,390,320]){
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>await d.accept());
 const go=path=>page.goto(base+'#/'+path),switchRole=async role=>{await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption(role);await expect(page).toHaveURL(/#\/overview$/);};
 await page.goto(base+'#workspace');await page.getByRole('button',{name:/^03 בעל מקצוע/}).click();await go('tasks/analysis/a4');
 await expect(page.locator('.analysis-evidence')).not.toHaveAttribute('open','');await page.getByLabel('פירוט המצב כיום',{exact:true}).fill('טיוטת ניתוח שנשמרת במהלך בקשה');
 const request=page.locator('.information-request');await request.locator('summary').click();
 await request.getByLabel('מה חסר להמשך העבודה?',{exact:true}).selectOption('document');await request.getByLabel('מה צריך להשלים ולשם מה?',{exact:true}).fill('נדרש מסמך לדוגמה כדי להשלים את הבדיקה.');
 await go('overview');await go('tasks/analysis/a4');await request.locator('summary').click();await expect(request.getByLabel('מה צריך להשלים ולשם מה?',{exact:true})).toHaveValue('נדרש מסמך לדוגמה כדי להשלים את הבדיקה.');
 await request.getByRole('button',{name:'שליחת בקשת השלמה לנציג',exact:true}).click();await expect(request.getByText('בקשת ההשלמה נשמרה במעקב של הנציג.',{exact:true})).toBeVisible();await expect(request.locator('.info-request-record')).toHaveCount(1);
 await expect(page.getByLabel('פירוט המצב כיום',{exact:true})).toHaveValue('טיוטת ניתוח שנשמרת במהלך בקשה');await expect(request.getByLabel('מה צריך להשלים ולשם מה?',{exact:true})).toHaveValue('');
 await page.screenshot({path:`${folder}/request-${width}.png`,fullPage:true});
 // Save the unrelated analysis draft before switching roles.
 await page.getByRole('button',{name:'שמירת טיוטת ניתוח',exact:true}).click();await expect(page.getByText('טיוטת הניתוח נשמרה. היא עדיין לא הוגשה לאישור.',{exact:true})).toBeVisible();
 await switchRole('representative');await go('families/f4/followups');const row=page.locator('.followup-row').filter({hasText:'נדרש מסמך לדוגמה כדי להשלים את הבדיקה.'});await expect(row).toContainText('פנימי לצוות');await row.getByRole('link',{name:'פתיחת המשימה ומענה לבעל המקצוע'}).click();
 await page.locator('.information-request summary').click();await page.getByLabel('המענה לבעל המקצוע',{exact:true}).fill('המסמך נבדק ומוכן לעיונך במסמכים המשותפים.');await page.getByRole('button',{name:'שמירת מענה וסימון הבקשה כטופלה',exact:true}).click();await expect(page.locator('.info-request-record')).toContainText('מענה הנציג:');
 await switchRole('professional');await go('tasks/analysis/a4');await request.locator('summary').click();await expect(request.locator('.info-request-record')).toContainText('המסמך נבדק ומוכן לעיונך');await expect(request.locator('.info-request-record')).toContainText('הושלם');await page.screenshot({path:`${folder}/answered-${width}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);expect(errors).toEqual([]);results.push({width,passed:true});await page.close();
}writeFileSync(`${folder}/qa.json`,JSON.stringify(results,null,2));console.log(results);}finally{await browser.close();}

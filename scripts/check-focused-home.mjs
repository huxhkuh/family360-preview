import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5264/family360-preview/';
const out='test-results/focused-home';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const width of [1440,390,320])for(const [index,role] of ['representative','client','professional','admin','marketer'].entries()){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'#workspace');await page.locator('.demo-roles>button').nth(index).click();
  const home=page.locator('.focused-home'),task=page.getByRole('region',{name:'הפעולה הבאה שלי'});
  await expect(home).toHaveAttribute('data-focus-role',role);await expect(task).toBeVisible();
  const primary=task.getByRole('button');expect(await primary.count()).toBeLessThanOrEqual(1);
  if(await primary.count())await expect(primary).toBeInViewport();
  await expect(home.locator('.focus-more')).not.toHaveAttribute('open','');
  await expect(page.getByRole('heading',{name:'מה דורש טיפול עכשיו',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:`${out}/${role}-${width}.png`,fullPage:true});
  if(role==='client'){
   await expect(task).toHaveAttribute('data-action-id','client-task:fu1');await expect(task).not.toContainText('לתאם שיחת מעקב');
   await primary.click();const doc=page.locator('[data-record-id=d1]');await expect(doc).toBeFocused();await doc.getByRole('button',{name:'צירוף קובץ דוגמה בלבד',exact:true}).click();
   await page.getByRole('button',{name:'לצעד הבא שלי',exact:true}).click();await expect(task).toHaveAttribute('data-action-id','client-task:fu1');await expect(task.getByRole('button')).toHaveText('לפרטי הפעולה ולעדכון');await task.getByRole('button').click();
   await page.locator('[data-record-id=fu1]').getByRole('button',{name:'סימון כהושלמה',exact:true}).click();
   await page.getByRole('button',{name:'לצעד הבא שלי',exact:true}).click();await expect(task).toHaveAttribute('data-action-id','client-task:ft1');await expect(task).toContainText('להכין רשימת הוצאות חודשית');await task.getByRole('button').click();
   await page.locator('[data-record-id=ft1]').getByRole('button',{name:'השלמת הפעולה',exact:true}).click();await page.getByRole('button',{name:'לצעד הבא שלי',exact:true}).click();
   await expect(task.getByRole('button')).toHaveCount(0);await expect(task).toContainText('כרגע אין פעולה שנדרשת מכם');await expect(task).toContainText('נציג לדוגמה');
   await expect(home.locator('.focus-more')).not.toHaveAttribute('open','');await home.locator('.focus-more>summary').click();await expect(home.locator('.client-care')).toContainText('לתאם שיחת מעקב');
   await page.screenshot({path:`${out}/client-waiting-${width}.png`,fullPage:true});
  }
  if(role==='marketer'){await primary.click();await expect(home.getByRole('status')).toHaveText('הקישור הועתק. אפשר להדביק ולשתף אותו.');expect(await page.evaluate(()=>navigator.clipboard.readText())).toContain('?ref=mesudarim-demo-a');await expect(home.getByText('REF-101',{exact:true})).not.toBeVisible();await home.locator('.focus-more>summary').click();await expect(home.getByText('REF-101',{exact:true})).toBeVisible();await expect(home.getByText('REF-201',{exact:true})).toHaveCount(0);}
  expect(errors).toEqual([]);results.push({role,width,passed:true});await context.close();
 }
}finally{await browser.close();}
writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

import {chromium,expect} from '@playwright/test';import {mkdirSync} from 'node:fs';
const base='http://127.0.0.1:5267/family360-preview/';mkdirSync('test-results/pro-simple',{recursive:true});const browser=await chromium.launch();
try{for(const width of [1440,390,320]){
 const page=await browser.newPage({viewport:{width,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#workspace');await page.getByRole('button',{name:/^03 בעל מקצוע/}).click();await page.goto(base+'#/tasks/analysis');
 const tabs=page.getByRole('navigation',{name:'מצב העבודה שלי'});await expect(tabs.getByRole('button',{name:/ממתין לי/})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.task-card').filter({hasText:'A-004'})).toBeVisible();
 await page.getByLabel('חיפוש במשימות',{exact:true}).fill('not-present');await expect(page.getByRole('button',{name:'ניקוי החיפוש והסינון'})).toBeVisible();await page.getByRole('button',{name:'ניקוי החיפוש והסינון'}).click();
 await tabs.getByRole('button',{name:/נשלחו והיסטוריה/}).click();await expect(page.locator('.task-card').filter({hasText:'A-004'})).toHaveCount(0);await tabs.getByRole('button',{name:/ממתין לי/}).click();
 await page.screenshot({path:`test-results/pro-simple/after-list-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'פתיחת משימה A-004',exact:true}).click();await expect(page.getByRole('region',{name:'עריכת ניתוח'})).toBeVisible();
 await page.screenshot({path:`test-results/pro-simple/after-task-${width}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);expect(errors).toEqual([]);await page.close();
}console.log('PASS inbox/history/search/details at 1440, 390, 320');}finally{await browser.close();}

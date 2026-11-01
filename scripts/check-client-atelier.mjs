import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {openClientNavigation} from './client-navigation.mjs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5291/family360-preview/';
const out='test-results/client-atelier';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const nav=page.getByRole('navigation',{name:'ניווט ראשי'});
  await page.goto(base+'#workspace');await page.locator('.demo-roles>button').nth(1).click();
  await expect(page.locator('.client-atelier-home')).toBeVisible();await expect(page.locator('.dossier-front h3')).toHaveText('משפחת לוי');
  await expect(page.getByRole('region',{name:'הפעולה הבאה שלי'})).toHaveAttribute('data-action-id','client-task:fu1');
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/home-${width}.png`,fullPage:true});
  await page.locator('.dossier-open').click();await expect(page).toHaveURL(/families\/f1\/documents$/);
  await expect(page.locator('.client-folder-tabs button')).toHaveCount(7);await expect(page.locator('.client-document-row')).toHaveCount(1);
  await page.screenshot({path:`${out}/case-${width}.png`,fullPage:true});
  await page.locator('.client-document-row').getByRole('button',{name:/השלמה/}).click();
  await expect(page.locator('[data-record-id=d1]')).toBeFocused();await page.locator('[data-record-id=d1]').getByRole('button',{name:'צירוף קובץ דוגמה בלבד',exact:true}).click();
  await openClientNavigation(page);await nav.getByRole('button',{name:'התיק שלנו',exact:true}).click();
  await expect(page.locator('.client-document-row .badge')).toHaveText('ממתין לבדיקה');
  const tabs=page.getByRole('navigation',{name:'תוכן תיק המשפחה'});
  for(const label of ['פעולות','בטיפול','שיחות','דוחות','פרטי התיק','מסמכים']){
   await tabs.getByRole('button',{name:label,exact:true}).click();await expect(tabs.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-current','page');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await nav.getByRole('button',{name:/הקשר עם/}).click();await page.getByLabel('במה נוכל לעזור?').fill('בקשה לבדיקה דרך האזור האישי המחובר');await page.getByRole('button',{name:'רישום בקשת עזרה',exact:true}).click();
  await expect(page.locator('.client-help')).toContainText('בקשת העזרה רשומה במעקב');
  await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption('representative');await page.goto(base+'#/families/f1/followups');await expect(page.locator('.family-activity')).toContainText('בקשה לבדיקה דרך האזור האישי המחובר');
  await page.goto(base+'#workspace');await page.reload();await page.locator('.demo-roles>button').nth(5).click();
  await expect(page.locator('.client-atelier-home')).toBeVisible();await expect(page).toHaveURL(/#\/overview$/);await expect(page.locator('.dossier-front h3')).toHaveText('משפחת לוי');
  expect(errors).toEqual([]);results.push({width,passed:true,checks:'both client entries, real action, folder document detail and upload, seven sections, request reaches representative, no overflow or JS errors'});await page.close();
 }
}finally{await browser.close();}
writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

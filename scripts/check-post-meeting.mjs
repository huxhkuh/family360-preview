import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5267/family360-preview/';
mkdirSync('test-results/post-meeting',{recursive:true});
const browser=await chromium.launch();const results=[];
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await expect(page.locator('.public-hero .service-focus')).toContainText('פנסיה, ביטוחים, משכנתא והחזרי מס');
  await expect(page.locator('.public-hero .hero-gaze')).toHaveAttribute('data-rig-status','ready');
  await page.screenshot({path:`test-results/post-meeting/home-${width}.png`});
  await page.locator('.public-hero .brand-primary').click();
  await expect(page.locator('.customer-payment .hero-gaze')).toHaveCount(1);
  await page.screenshot({path:`test-results/post-meeting/signup-${width}.png`,fullPage:true});
  await page.goto(base+'#workspace');await page.reload();await page.getByRole('button',{name:'התנסות כלקוח חדש',exact:true}).click();await page.getByRole('button',{name:'התחלת השאלון',exact:true}).click();
  await page.locator('[data-answer-key=h_phone]').fill('');
  await expect(page.locator('[data-answer-key=marital]')).not.toHaveAttribute('aria-invalid','true');
  await page.locator('[data-answer-key=h_email]').fill('');
  await page.getByRole('button',{name:/^שמירה והמשך/}).click();
  await expect(page.locator('.chapter-process [aria-current=step]')).not.toHaveText('פרטי משפחה');
  await page.getByRole('navigation',{name:'פרקי השאלון'}).getByRole('button',{name:'פרטי משפחה',exact:true}).click();
  await expect(page.locator('[data-answer-key=h_phone]')).toHaveValue('');
  await page.locator('[data-answer-key=h_phone]').fill('123');await page.getByRole('button',{name:/^שמירה והמשך/}).click();
  await expect(page.locator('[data-answer-key=h_phone]')).toBeFocused();
  await page.locator('[data-answer-key=h_phone]').fill('');
  await expect(page.locator('[data-answer-key=marital]')).not.toHaveAttribute('aria-invalid','true');
  expect(await page.locator('.questionnaire-paper>.card').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
  await page.screenshot({path:`test-results/post-meeting/questionnaire-${width}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
  expect(errors).toEqual([]);results.push({width,partialProgress:true,invalidContactBlocked:true,whiteSurface:true});await page.close();
 }
}finally{await browser.close();}
writeFileSync('test-results/post-meeting/qa.json',JSON.stringify(results,null,2));console.log(results);

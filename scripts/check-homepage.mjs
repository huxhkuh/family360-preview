import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5254/family360-preview/';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#welcome');
  await page.getByRole('heading',{name:'את הצעד הראשון כבר עשיתם.',exact:true}).waitFor();
  for(const image of await page.locator('.welcome-page img').all())await image.evaluate(img=>img.decode());
  assert.equal(await page.locator('.welcome-page .landing-brand-image').count(),2);
  assert.equal(await page.locator('.welcome-art img').count(),3);
  assert.equal(await page.locator('.welcome-intro').evaluate(el=>getComputedStyle(el).fontSize),'40px');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`test-results/homepage-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'נשמע מתאים? בואו נמשיך'}).click();
  await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByRole('button',{name:'דמו המערכת',exact:true}).click();
  await page.getByRole('heading',{name:'התנסות במסודרים 360°',exact:true}).waitFor();
  await page.getByRole('button',{name:/^01 נציג /}).click();
  const nav=page.getByRole('navigation',{name:'ניווט ראשי'});
  await nav.waitFor();
  await nav.getByRole('button',{name:'משפחות',exact:true}).click();
  await page.getByLabel('חיפוש משפחה',{exact:true}).fill('פרידמן');
  await page.waitForURL(/q=/);
  const route=new URL(page.url()).hash;
  const before=await nav.evaluate(el=>({color:getComputedStyle(el).color,font:getComputedStyle(el).fontSize}));
  await page.getByRole('button',{name:'דף הבית',exact:true}).click();
  await page.getByRole('heading',{name:'את הצעד הראשון כבר עשיתם.',exact:true}).waitFor();
  await page.getByRole('link',{name:'בואו נראה איך זה עובד'}).click();
  assert.equal(new URL(page.url()).hash,'#welcome');
  await page.getByRole('button',{name:'דמו המערכת',exact:true}).click();
  await nav.waitFor();
  assert.equal(new URL(page.url()).hash,route);
  assert.equal(await page.getByLabel('חיפוש משפחה',{exact:true}).inputValue(),'פרידמן');
  assert.deepEqual(await nav.evaluate(el=>({color:getComputedStyle(el).color,font:getComputedStyle(el).fontSize})),before);
  await page.screenshot({path:`test-results/system-preserved-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: homepage, logo, 2x type, images, dialog, desktop/mobile; current app route, search and styling preserved on return.');
}finally{await browser.close();}

import {chromium} from '@playwright/test';
import {openClientNavigation} from './client-navigation.mjs';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('test-results',{recursive:true});
const base=process.env.DEMO_URL||'http://127.0.0.1:5248/family360-preview/';
const browser=await chromium.launch({headless:true});
const results=[];
for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('dialog',d=>d.accept());
 await page.goto(base);await page.getByRole('heading',{name:'התנסות במסודרים 360°',exact:true}).waitFor();
 await page.screenshot({path:`test-results/${device}-welcome.png`,fullPage:true});
 for(const [role,label] of [['representative','נציג'],['client','לקוח'],['professional','בעל מקצוע'],['admin','מנהל'],['marketer','משווק']]){
  await page.goto(base);await page.getByRole('button',{name:new RegExp('^0[1-5] '+label+' ')}).click();
  if(role==='client')await openClientNavigation(page);
  await page.getByRole('navigation',{name:'ניווט ראשי'}).waitFor();await page.getByRole('button',{name:'רענון נתונים',exact:true}).click();
  const nav=page.getByRole('navigation',{name:'ניווט ראשי'});const names=await nav.getByRole('button').allTextContents();
  for(const name of names){if(role==='client')await openClientNavigation(page);await nav.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(350);assert.equal(await page.getByText('אירעה תקלה בתצוגה',{exact:true}).count(),0);assert.equal(await page.locator('[role=alert]').count(),0,`${role}/${name} alert: ${await page.locator('[role=alert]').allTextContents()}`);}
  if(role==='representative'){
   await nav.getByRole('button',{name:'משפחות',exact:true}).click();await page.getByLabel('חיפוש משפחה',{exact:true}).fill('פרידמן');
   await page.getByRole('button',{name:'פתיחת התיק של משפחת פרידמן'}).click();await page.getByRole('heading',{name:'משפחת פרידמן',exact:true}).waitFor();
   await page.getByRole('button',{name:'תיעוד קשר',exact:true}).click();await page.getByLabel('תיעוד פנימי של הקשר').fill('תיעוד בדיקה סינתטי לדמו');await page.getByRole('button',{name:'שמירת תיעוד הקשר',exact:true}).click();await page.getByText('תיעוד הקשר נשמר.',{exact:true}).waitFor();
   await page.getByRole('navigation',{name:'תוכן תיק המשפחה'}).getByRole('button',{name:'מעקב',exact:true}).click();await page.getByRole('button',{name:'הוספת פעולה בתיק'}).click();await page.getByLabel('הפעולה הבאה',{exact:true}).fill('פעולת בדיקה לדמו');await page.getByLabel('תאריך יעד לפעולה').fill('2026-11-01');await page.getByRole('button',{name:'שמירת הפעולה',exact:true}).click();await page.getByRole('heading',{name:'פעולת בדיקה לדמו',exact:true}).waitFor();
   await page.getByRole('button',{name:'השלמת הפעולה',exact:true}).click();await page.getByText('מצב הפעולה עודכן.',{exact:true}).waitFor();
  }
  if(role==='professional'){await nav.getByRole('button',{name:'משימות',exact:true}).click();await page.getByRole('button',{name:'קבלת המשימה',exact:true}).click();await page.getByText('המשימה התקבלה. היא מופיעה כעת ברשימת המשימות שלך.',{exact:true}).waitFor();}
  await page.screenshot({path:`test-results/${device}-${role}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,role+' horizontal overflow');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(requests.filter(url=>!url.startsWith(base)&&!url.startsWith('data:')),[]);
 results.push({device,roles:5,consoleErrors:errors.length,externalRequests:0,checks:'navigation, search, contact, task save/complete, professional offer, marketer portal, no horizontal overflow'});await page.close();
}
await browser.close();writeFileSync('test-results/qa.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

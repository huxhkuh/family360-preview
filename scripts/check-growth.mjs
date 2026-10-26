import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=(process.env.DEMO_URL||'http://127.0.0.1:5262/family360-preview/').replace(/\/?$/,'/');
const out='test-results/growth';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.setDefaultTimeout(10000);const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const nav=()=>page.getByRole('navigation',{name:'ניווט ראשי'});
 const role=async value=>{await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption(value);if(value==='marketer')await page.locator('.focus-more>summary').click();};
 const noOverflow=async()=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);if(width<600)expect(await page.locator('.growth-page .table-wrap').evaluateAll(elements=>elements.every(el=>el.scrollWidth<=el.clientWidth+1))).toBe(true);};
 await page.goto(base+'#workspace');await expect(page.getByText(/מחיר השירות:.*490/)).toBeVisible();
 await page.getByRole('button',{name:/^05 משווק /}).click();await expect(page.getByRole('heading',{name:'ההפניות שלי',exact:true})).toBeVisible();
 await page.locator('.focus-more>summary').click();await expect(nav().getByRole('button')).toHaveCount(1);await expect(page.getByText('REF-101',{exact:true})).toBeVisible();await expect(page.getByText('REF-201',{exact:true})).toHaveCount(0);await expect(page.getByText('משפחת פרידמן',{exact:true})).toHaveCount(0);
 const link=await page.getByLabel('הקישור השיווקי שלי').inputValue();expect(link).toContain('?ref=mesudarim-demo-a');await noOverflow();
 await page.goto(base+'#/families/f3');await expect(page.getByText('הרשומה אינה זמינה',{exact:true})).toBeVisible();
 await role('admin');await nav().getByRole('button',{name:'משווקים ועמלות',exact:true}).click();
 await page.getByLabel('שיוך להפניה (אם רלוונטי)').selectOption('REF-101');await page.getByLabel('סכום בשקלים',{exact:true}).fill('49.90');await page.getByLabel('פירוט או אסמכתה שיוצגו למשווק').fill('עמלה ידנית שאושרה לבדיקה');await page.getByRole('button',{name:'שמירת התנועה',exact:true}).click();await expect(page.getByText('הפעולה נשמרה בהצלחה',{exact:true})).toBeVisible();await expect(page.getByLabel('סכום בשקלים',{exact:true})).toHaveValue('');
 await page.getByLabel('סוג התנועה').selectOption('payout');await page.getByLabel('סכום בשקלים',{exact:true}).fill('50');await page.getByLabel('פירוט או אסמכתה שיוצגו למשווק').fill('תשלום גבוה מהיתרה');await page.getByRole('button',{name:'שמירת התנועה',exact:true}).click();await expect(page.getByRole('alert')).toContainText('גבוה מיתרת');
 await page.getByLabel('סכום בשקלים',{exact:true}).fill('19.90');await page.getByLabel('פירוט או אסמכתה שיוצגו למשווק').fill('אסמכתה לתשלום שבוצע');await page.getByRole('button',{name:'שמירת התנועה',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByLabel('סכום בשקלים',{exact:true})).toHaveValue('');
 await role('marketer');await expect(page.locator('tbody strong').first()).toContainText('REF-101');await expect(page.locator('.growth-kpis article').nth(3)).toContainText('30');await expect(page.getByText('אסמכתה לתשלום שבוצע',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'שמירת התנועה',exact:true})).toHaveCount(0);await noOverflow();await page.screenshot({path:`${out}/${device}-marketer.png`,fullPage:true});
 // Register via the actual marketing link, then inspect attribution without reloading the demo store.
 await page.goto(link+'#workspace');await page.getByRole('button',{name:'התנסות כלקוח חדש',exact:true}).click();await role('marketer');await expect(page.locator('.growth-kpis article').first()).toContainText('3');await noOverflow();
 expect(errors).toEqual([]);results.push({device,checks:'price, scoped referral portal, private-route denial, exact commission credit/payout, insufficient balance, link attribution',errors});await page.close();
}}finally{await browser.close();}
writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

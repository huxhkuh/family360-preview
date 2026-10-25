import {fillRequiredContactAnswers} from './client-navigation.mjs';
import {openClientNavigation} from './client-navigation.mjs';
import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/';
mkdirSync('test-results/client-folio',{recursive:true});const results=[];const browser=await chromium.launch();
try{for(const [device,width,height] of [['desktop',1440,1000],['tablet',820,900],['mobile',390,844],['narrow',320,740]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base);await page.getByRole('button',{name:'התנסות כלקוח חדש',exact:true}).click();await page.evaluate(()=>document.fonts.ready);
 const nav=page.getByRole('navigation',{name:'ניווט ראשי'});const entry=nav.getByRole('button',{name:'שאלון',exact:true});await expect(entry).toBeVisible();
 const startTop=await page.getByRole('button',{name:'התחלת השאלון',exact:true}).evaluate(el=>el.getBoundingClientRect().top+scrollY);
 if(device==='mobile')expect(startTop).toBeLessThan(height);
 await page.screenshot({path:`test-results/client-folio/${device}-home.png`,fullPage:false});
 await entry.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/#\/families\/f1\/questionnaire$/);await openClientNavigation(page);await expect(entry).toHaveAttribute('aria-current','page');await expect(nav.locator('[aria-current=page]')).toHaveCount(1);
 const closeMenu=page.getByRole('button',{name:'סגירת התפריט',exact:true});if(await closeMenu.isVisible())await closeMenu.click();
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
 const firstFieldTop=await page.locator('[data-answer-key]').first().evaluate(el=>el.getBoundingClientRect().top+scrollY);
 console.log(device, {startTop,firstFieldTop});
 await page.screenshot({path:`test-results/client-folio/${device}-questionnaire.png`,fullPage:false});expect(firstFieldTop).toBeLessThan(width<=390?1050:850);
 // Guidance and reusing existing data remain available without covering the form on arrival.
 await page.locator('.questionnaire-introduction>summary').click();await page.locator('.contact-reuse>summary').click();await page.getByLabel('למי שייכים פרטי הקשר?').selectOption('h');await page.getByRole('button',{name:'העתקת פרטי הקשר',exact:true}).click();await expect(page.locator('[data-answer-key=h_phone]')).not.toHaveValue('');
 await page.locator('.questionnaire-introduction>summary').click();await page.locator('[data-answer-key=city]').fill('עיר בדיקת טיוטה');await fillRequiredContactAnswers(page);await page.getByRole('navigation',{name:'פרקי השאלון'}).getByRole('button',{name:'עבודה והכנסות',exact:true}).click();
 await openClientNavigation(page);await nav.getByRole('button',{name:/^(סקירה|הבית שלי|פרטי התיק)$/}).click();await entry.click();await expect(page.getByRole('navigation',{name:'פרקי השאלון'}).getByRole('button',{name:'עבודה והכנסות',exact:true})).toHaveAttribute('aria-current','step');
 await page.getByRole('navigation',{name:'פרקי השאלון'}).getByRole('button',{name:'פרטי משפחה',exact:true}).click();await expect(page.locator('[data-answer-key=city]')).toHaveValue('עיר בדיקת טיוטה');
 // A direct chooser link still works and never lists a family outside this client's workspace.
 await page.evaluate(()=>{location.hash='#/questionnaire';});await expect(page.getByRole('heading',{name:'באיזה תיק נמשיך?'})).toBeVisible();await expect(page.locator('.questionnaire-picker button')).toHaveCount(1);await page.locator('.questionnaire-picker button').click();await expect(page.locator('[data-answer-key=city]')).toHaveValue('עיר בדיקת טיוטה');
 await openClientNavigation(page);await nav.getByRole('button',{name:'התראות',exact:true}).click();await expect(page.getByRole('heading',{name:'התראות',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption('professional');await expect(entry).toHaveCount(0);await page.evaluate(()=>{location.hash='#/questionnaire';});await expect(page.getByRole('heading',{name:'הרשומה אינה זמינה'})).toBeVisible();
 expect(errors).toEqual([]);results.push({device,startTop:Math.round(startTop),firstFieldTop:Math.round(firstFieldTop),passed:true,checks:['keyboard sidebar entry','one active navigation item','contextual help and contact reuse','draft and chapter retained','scoped family chooser','horizontal mobile navigation','professional restricted','no overflow or JS errors']});await page.close();
}}finally{await browser.close();}
writeFileSync('test-results/client-folio/qa.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/';
mkdirSync('test-results/chapter-process',{recursive:true});const browser=await chromium.launch();const results=[];
try{for(const [device,width,height] of [['desktop',1440,1000],['tablet',820,900],['mobile',390,844],['narrow',320,740]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base);await page.getByRole('button',{name:'התחלת דמו של לקוח חדש',exact:true}).click();await page.getByRole('button',{name:'המשך לשאלון',exact:true}).click();
 const nav=page.getByRole('navigation',{name:'פרקי השאלון'});const heading=page.locator('.chapter-heading');const select=async name=>{await nav.getByRole('button',{name,exact:true}).click();await expect(heading).toBeFocused();};
 await expect(nav.locator('button')).toHaveCount(8);await expect(page.locator('.questionnaire-context')).not.toHaveAttribute('open','');
 expect(await nav.locator('li').first().evaluate(el=>getComputedStyle(el,'::before').height)).toBe('2px');
 await page.locator('[data-answer-key=city]').fill('עיר לדוגמה');await select('מגורים');await page.locator('[data-answer-key=housing]').selectOption('own');await expect(nav.locator('button')).toHaveCount(9);
 await select('משכנתא');await page.locator('[data-answer-key=has_mortgage]').selectOption('yes');await page.locator('[data-answer-key=mort_balance]').fill('123000');
 await page.getByRole('button',{name:/^שמירה והמשך/}).click();await expect(nav.getByRole('button',{name:'חסכונות והשקעות',exact:true})).toHaveAttribute('aria-current','step');await expect(heading).toBeFocused();expect(await heading.evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(50);
 await page.getByRole('button',{name:'לפרק הקודם',exact:true}).click();await expect(page.locator('[data-answer-key=mort_balance]')).toHaveValue('123000');
 await select('מגורים');await page.locator('[data-answer-key=housing]').selectOption('family');await expect(nav.getByRole('button',{name:'משכנתא',exact:true})).toHaveCount(0);await page.locator('[data-answer-key=housing]').selectOption('own');await select('משכנתא');await expect(page.locator('[data-answer-key=mort_balance]')).toHaveValue('123000');
 await nav.getByRole('button',{name:'בנקים ואשראי',exact:true}).focus();await page.keyboard.press('Enter');await expect(heading).toBeFocused();await expect(nav.locator('[aria-current=step]')).toHaveCount(1);
 await page.getByRole('button',{name:'בדיקת שדות חסרים ותקינות',exact:true}).click();await page.locator('.validation-summary').getByRole('button',{name:/^שם פרטי ·/}).click();await expect(page.locator('[data-answer-key=h_first]')).toBeFocused();await expect(nav.getByRole('button',{name:'פרטי משפחה',exact:true})).toHaveAttribute('aria-current','step');await expect(page.locator('[data-answer-key=city]')).toHaveValue('עיר לדוגמה');
 // A failed save must never advance the process or discard current inputs.
 await page.locator('[data-answer-key=h_first]').fill('שם בטיוטה');await page.getByRole('navigation',{name:'תוכן תיק המשפחה'}).getByRole('button',{name:'סקירה',exact:true}).click();await page.getByRole('button',{name:'עריכת איש קשר',exact:true}).click();await page.getByLabel('איש קשר',{exact:true}).fill('עדכון שיוצר גרסה חדשה');await page.getByRole('button',{name:'שמירת איש קשר',exact:true}).click();await expect(page.getByText('פרטי הקשר נשמרו בתיק. לא נשלחה הודעה.')).toBeVisible();
 await page.getByRole('navigation',{name:'תוכן תיק המשפחה'}).getByRole('button',{name:'שאלון',exact:true}).click();await page.getByRole('button',{name:/^שמירה והמשך/}).click();await expect(page.getByRole('alert')).toContainText('הנתונים עודכנו');await expect(nav.getByRole('button',{name:'פרטי משפחה',exact:true})).toHaveAttribute('aria-current','step');await expect(page.locator('[data-answer-key=h_first]')).toHaveValue('שם בטיוטה');
 await page.locator('.chapter-process').screenshot({path:`test-results/chapter-process/${device}-process.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);expect(errors).toEqual([]);
 results.push({device,passed:true,checks:['connected RTL process','conditional chapters and retained answers','save and next','focus at chapter start','keyboard activation','missing-field focus','failed save keeps chapter and input','no page overflow','reduced motion']});await page.close();
}}finally{await browser.close();}writeFileSync('test-results/chapter-process/qa.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

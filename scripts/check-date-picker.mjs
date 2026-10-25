import {chromium,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
mkdirSync('test-results/date-picker',{recursive:true});
const browser=await chromium.launch();
try{for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844],['narrow',320,740]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/')+'#workspace');
 await page.getByRole('button',{name:'התנסות כלקוח חדש',exact:true}).click();
 await page.getByRole('button',{name:'התחלת השאלון',exact:true}).click();
 const input=page.locator('[data-answer-key=h_dob]'),field=page.locator('.field').filter({has:input}),trigger=field.getByRole('button',{name:'פתיחת לוח שנה: תאריך לידה',exact:true});
 await input.fill('1990-06-15');
 await trigger.click();const dialog=page.getByRole('dialog',{name:'בחירת תאריך: תאריך לידה',exact:true});
 await expect(dialog).toBeVisible();await expect(dialog.locator('[data-calendar-date="1990-06-15"]')).toBeFocused();
 await dialog.getByRole('combobox',{name:'שנה',exact:true}).selectOption('1992');
 await dialog.getByRole('combobox',{name:'חודש',exact:true}).selectOption('1');
 await dialog.locator('[data-calendar-date="1992-02-29"]').click();
 await expect(input).toHaveValue('1992-02-29');await expect(input).toBeFocused();await expect(dialog).toHaveCount(0);
 // Keyboard follows RTL directions and survives month boundaries.
 await input.press('Alt+ArrowDown');await expect(dialog).toBeVisible();
 await page.keyboard.press('ArrowLeft');await expect(dialog.locator('[data-calendar-date="1992-03-01"]')).toBeFocused();
 await page.keyboard.press('Enter');await expect(input).toHaveValue('1992-03-01');
 await trigger.click();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(dialog).toHaveCount(0);
 await trigger.click();await dialog.getByRole('button',{name:'ניקוי',exact:true}).focus();await page.keyboard.press('Tab');await expect(trigger).toBeFocused();await expect(dialog).toHaveCount(0);
 await trigger.click();await dialog.getByRole('button',{name:'ניקוי',exact:true}).click();await expect(input).toHaveValue('');
 await trigger.click();const today=await input.getAttribute('max');
 await expect(dialog.getByRole('button',{name:'החודש הבא',exact:true})).toBeDisabled();
 const next=await page.evaluate(value=>{const d=new Date(value+'T12:00:00');d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;},today);
 const nextDay=dialog.locator(`[data-calendar-date="${next}"]`);if(await nextDay.count())await expect(nextDay).toBeDisabled();
 await dialog.getByRole('button',{name:'היום',exact:true}).click();await expect(input).toHaveValue(today);
 await trigger.click();const bounds=await dialog.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);expect(bounds.y+bounds.height).toBeLessThanOrEqual(height+1);
 await page.screenshot({path:`test-results/date-picker/${device}.png`});
 await page.locator('.chapter-heading h3').click();await expect(dialog).toHaveCount(0);
 await page.getByRole('button',{name:'שמירת טיוטה',exact:true}).click();
 await page.getByRole('navigation',{name:'פרקי השאלון'}).getByRole('button',{name:'עבודה והכנסות',exact:true}).click();
 await page.getByRole('navigation',{name:'פרקי השאלון'}).getByRole('button',{name:'פרטי משפחה',exact:true}).click();
 await expect(input).toHaveValue(today);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);
 console.log(`${device}: selection, leap year, RTL keyboard, escape, clear, date bounds, draft and viewport passed`);await page.close();
}}finally{await browser.close();}

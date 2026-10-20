import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/';
const output='test-results/branding';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch();const results=[];
try{
 for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844],['narrow',320,740]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url());});
  page.on('dialog',d=>d.accept());
  await page.goto(base+'?brandlab=1');
  await expect(page.getByRole('heading',{name:'אותו בית. חמש חתימות.'})).toBeVisible();
  await expect(page.locator('.brand-concept')).toHaveCount(5);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`${output}/${device}-gallery.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  for(let variant=1;variant<=5;variant++){
   const card=page.locator('.brand-concept').nth(variant-1);
   await card.getByRole('button',{name:'במסך הבית ←',exact:true}).click();
   await expect(page).toHaveURL(/#\/overview$/);
   await expect(page.locator('.sidebar .mesudarim-logo')).toHaveAttribute('src',new RegExp(`concept-${variant}-dark.svg$`));
   await expect(page.getByRole('heading',{name:'ממלאים ושולחים את השאלון',exact:true})).toBeVisible();
   await expect(page.locator('.sidebar .mesudarim-logo')).toBeVisible();
   await expect.poll(()=>page.locator('.sidebar .mesudarim-logo').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:`${output}/${device}-${variant}-home.png`,fullPage:false});
   await page.getByRole('button',{name:'חמש חלופות למיתוג',exact:true}).click();
   await card.getByRole('button',{name:'בשאלון ←',exact:true}).click();
   await expect(page).toHaveURL(/#\/families\/f1\/questionnaire$/);
   await expect(page.locator('.questionnaire-signature')).toHaveAttribute('src',new RegExp(`concept-${variant}-light.svg$`));
   await expect(page.locator(width<=360?'.questionnaire-stamp':'.questionnaire-signature')).toBeVisible();
   const city=page.locator('[data-answer-key=city]');
   await expect(city).toBeVisible();
   if(variant===1)await city.fill('טיוטה שנשמרת בהחלפת מיתוג');
   else await expect(city).toHaveValue('טיוטה שנשמרת בהחלפת מיתוג');
   // Switching in-place must not remount the form or discard a working draft.
   await page.getByLabel('חלופת לוגו',{exact:true}).selectOption(String(variant===5?1:variant+1));
   await expect(city).toHaveValue('טיוטה שנשמרת בהחלפת מיתוג');
   await page.getByLabel('חלופת לוגו',{exact:true}).selectOption(String(variant));
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:`${output}/${device}-${variant}-questionnaire.png`,fullPage:false});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await page.getByRole('button',{name:'חמש חלופות למיתוג',exact:true}).click();
   await expect(page.locator('.brand-concept [aria-pressed=true]')).toHaveCount(1);
   await expect(card.getByRole('button',{name:'הלוגו הנבחר ✓',exact:true})).toHaveAttribute('aria-pressed','true');
  }
  // Keyboard close restores the mounted screen and focus, with its draft intact.
  const close=page.getByRole('button',{name:'חזרה לדמו',exact:true});
  await close.focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-answer-key=city]')).toHaveValue('טיוטה שנשמרת בהחלפת מיתוג');
  await expect(page.getByRole('button',{name:'חמש חלופות למיתוג',exact:true})).toBeFocused();
  await page.goto(base);await expect(page.getByLabel('חלופת לוגו',{exact:true})).toHaveValue('5');
  expect(errors).toEqual([]);expect(external).toEqual([]);
  results.push({device,variants:5,passed:true,checks:['both live screens per logo','SVG images loaded','draft across gallery and screen navigation','in-place selection preserves draft','keyboard focus return','brand preference survives reload','no horizontal overflow','no JS errors or external requests']});
  await page.close();
 }
 const blocked=await browser.newPage();
 await blocked.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw new Error('Storage unavailable');}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw new Error('Storage unavailable');}});});
 await blocked.goto(base+'?brand=999&brandlab=1');
 await expect(blocked.getByLabel('חלופת לוגו',{exact:true})).toHaveValue('1');
 await blocked.getByLabel('חלופת לוגו',{exact:true}).selectOption('4');
 await expect(blocked.locator('.brand-concept').nth(3).getByRole('button',{name:'הלוגו הנבחר ✓',exact:true})).toBeVisible();
 await blocked.close();
 results.push({storageBlocked:true,invalidVariantFallback:true,passed:true});
}finally{await browser.close();}
writeFileSync(`${output}/qa.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));

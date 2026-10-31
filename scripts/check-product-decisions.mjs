import {chromium,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const out='test-results/product-decisions';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();
try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:950}});
 await page.goto('http://127.0.0.1:5267/family360-preview/');
 await expect(page.locator('.public-hero')).toContainText('רק אחרי השיחה');
 await page.screenshot({path:`${out}/home-${width}.png`,fullPage:true});
 await page.goto('http://127.0.0.1:5267/family360-preview/#workspace');await page.reload();
 await page.getByRole('button',{name:'התנסות כלקוח חדש',exact:true}).click();await page.getByRole('button',{name:'התחלת השאלון',exact:true}).click();
 const address=page.locator('fieldset.address-question');await expect(address.locator('legend')).toHaveText('כתובת');
 await expect(address.locator('[data-answer-key=city]')).toHaveCount(1);await expect(address.locator('[data-answer-key=address]')).toHaveCount(1);
 await address.screenshot({path:`${out}/address-${width}.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);await page.close();
}console.log('PASS home and grouped address desktop/mobile');}finally{await browser.close();}

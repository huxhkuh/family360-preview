import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5263/family360-preview/';
const out='test-results/workspace-brand';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const width of [1440,390])for(const [index,role] of ['representative','client','professional','admin','marketer'].entries()){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'#workspace');await page.locator('.demo-roles>button').nth(index).click();
  const workspace=page.locator('.brand-workspace');await expect(workspace).toHaveAttribute('data-role',role);
  await expect(workspace.getByRole('navigation',{name:'ניווט ראשי'})).toBeVisible();
  expect(await workspace.locator('.sidebar').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(244, 240, 232)');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
  await page.screenshot({path:`${out}/${role}-${width}.png`,fullPage:true});
  expect(errors).toEqual([]);results.push({role,width,passed:true});await page.close();
 }
}finally{await browser.close();}
writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

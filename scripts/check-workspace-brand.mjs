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
  expect(await workspace.locator('.sidebar').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(8, 46, 40)');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
  await page.screenshot({path:`${out}/${role}-${width}.png`,fullPage:true});
  await expect(workspace.locator('.sidebar .mesudarim-logo')).toHaveAttribute('src',/concept-5-dark.svg$/);
  const links=workspace.locator('.sidebar nav button'),screens=[];
  for(let n=0;n<await links.count();n++){
   const link=links.nth(n),label=await link.innerText();
   await expect(link.locator('svg.brand-icon')).toHaveAttribute('viewBox','0 0 32 32');
   if(!await link.isVisible())await workspace.locator('.mobile-task-menu').click();
   await link.click();await expect(link).toHaveAttribute('aria-current','page');
   await expect(workspace.locator('#main-content')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await page.screenshot({path:`${out}/${role}-${width}-section-${n}.png`,fullPage:true});
   screens.push(label);
  }
  expect(errors).toEqual([]);results.push({role,width,screens,passed:true});await page.close();
 }
}finally{await browser.close();}
writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

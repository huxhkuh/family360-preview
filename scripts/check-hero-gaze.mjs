import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5263/family360-preview/',out='test-results/hero-gaze';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().includes('/companion/gaze/'))requests.push(request.url());});
 await page.goto(base);const hero=page.locator('.hero-gaze');await expect(hero).toHaveAttribute('data-ready','true');await expect(hero).toHaveAttribute('data-enabled','true');
 await page.locator('.public-hero .brand-companion-person').evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
 const box=await hero.boundingBox(),face={x:box.x+box.width*.475,y:box.y+box.height*.16};
 const radius=Math.min(210,face.x-12,face.y-12,1428-face.x,988-face.y);
 const bodyBox=await hero.locator('.gaze-body').boundingBox();
 for(const [direction,x,y] of [['right',1,0],['down-right',1,1],['down',0,1],['down-left',-1,1],['left',-1,0],['up-left',-1,-1],['up',0,-1],['up-right',1,-1]]){
  await page.mouse.move(face.x+radius*x,face.y+radius*y,{steps:14});await expect(hero).toHaveAttribute('data-direction',direction);
  const active=hero.locator(`[data-pose="${direction}"]`);await expect.poll(()=>active.evaluate(el=>Number(getComputedStyle(el).opacity))).toBe(1);
  await expect.poll(()=>hero.locator('.gaze-head:not([data-current=true])').evaluateAll(elements=>elements.reduce((sum,el)=>sum+Number(getComputedStyle(el).opacity),0))).toBe(0);
  expect(await hero.locator('.gaze-body').boundingBox()).toEqual(bodyBox);await hero.screenshot({path:`${out}/${direction}.png`});
 }
 await page.mouse.move(face.x,face.y);await expect(hero).toHaveAttribute('data-direction','neutral');
 await page.mouse.move(1400,800);await page.locator('html').dispatchEvent('pointerleave');await expect(hero).toHaveAttribute('data-direction','neutral');
 await page.getByRole('link',{name:'בואו נראה איך זה עובד',exact:true}).click();await expect(hero).toHaveAttribute('data-enabled','false');
 await page.getByRole('button',{name:/בחזרה לדף הבית/}).click();await expect(hero).toHaveAttribute('data-enabled','true');expect(new Set(requests).size).toBe(8);expect(requests.length).toBe(8);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(hero).toHaveAttribute('data-enabled','false');await expect(hero).toHaveAttribute('data-direction','neutral');expect(await hero.locator('.gaze-body').evaluate(el=>getComputedStyle(el).maskImage)).toBe('none');expect(errors).toEqual([]);await page.close();
 results.push({desktop:true,checks:'eight directions, settled crossfades, stable body geometry, resting region, pointer leave, hidden page pause, cached preload, live reduced-motion change'});
 for(const options of [{viewport:{width:390,height:844},isMobile:true,hasTouch:true},{viewport:{width:1440,height:1000},reducedMotion:'reduce'}]){
  const page=await browser.newPage(options),loads=[];page.on('request',request=>{if(request.url().includes('/companion/gaze/'))loads.push(request.url());});await page.goto(base);await page.locator('.hero-gaze').scrollIntoViewIfNeeded();await expect(page.locator('.gaze-body')).toBeVisible();await expect(page.locator('.hero-gaze')).toHaveAttribute('data-enabled','false');expect(loads).toEqual([]);await page.close();
 }
 const fallback=await browser.newPage({viewport:{width:1440,height:1000}});await fallback.route('**/companion/gaze/down.webp',route=>route.abort());
 const failed=fallback.waitForEvent('requestfailed',{predicate:request=>request.url().endsWith('/gaze/down.webp')});await fallback.goto(base);await failed;await expect(fallback.locator('.gaze-body')).toBeVisible();await expect(fallback.locator('.hero-gaze')).toHaveAttribute('data-ready','false');expect(await fallback.locator('.gaze-body').evaluate(el=>getComputedStyle(el).maskImage)).toBe('none');await fallback.close();
 results.push({fallbacks:true,checks:'touch and reduced motion keep static illustration without directional downloads; failed asset preserves the complete original'});
}finally{await browser.close();}
writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

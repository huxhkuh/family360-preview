import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base=process.env.DEMO_URL||'http://127.0.0.1:5263/family360-preview/';
const out=process.env.MASCOT_EVIDENCE_DIR||join(tmpdir(),'family360-mascot-rig-qa');mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
try{
 for(const options of [{viewport:{width:1440,height:1000}},{viewport:{width:390,height:1100},isMobile:true,hasTouch:true},{viewport:{width:1440,height:1000},reducedMotion:'reduce'}]){
  const page=await browser.newPage(options),errors=[],directions=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/companion/gaze/'))directions.push(r.url());});
  await page.goto(base+'#welcome');const hero=page.locator('.hero-gaze');
  await expect(hero).toHaveAttribute('data-rig-status','ready');await expect(hero.locator('[data-rig-head]')).toHaveCount(1);
  await expect(hero.locator('[data-rig-pupil]')).toHaveCount(2);await expect(hero.locator('img')).toHaveCount(0);
  const box=await hero.boundingBox();expect(box).not.toBeNull();
  // Clothing/hands/legs below the neck must remain pixel-identical.
  const clip={x:box.x,y:box.y+box.height*.34,width:box.width,height:Math.min(box.height*.66,options.viewport.height-box.y-box.height*.34)};
  expect(clip.height).toBeGreaterThan(20);const body=hash(await page.screenshot({clip}));
  const pose=()=>hero.locator('[data-rig-head]').getAttribute('transform');
  const first=await pose();
  for(const steps of [1,30]){await page.mouse.move(1,1,{steps});await page.mouse.move(options.viewport.width-1,options.viewport.height-1,{steps});}
  for(let i=0;i<32;i++)await page.mouse.move(options.viewport.width/2+Math.cos(i/16*Math.PI)*options.viewport.width*.4,options.viewport.height/2+Math.sin(i/16*Math.PI)*options.viewport.height*.4);
  await page.waitForTimeout(300);expect(hash(await page.screenshot({clip}))).toBe(body);
  if(!options.reducedMotion)expect(await pose()).not.toBe(first);
  if(options.isMobile)await expect(hero).toHaveAttribute('data-mode','idle');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(hero).toHaveAttribute('data-mode','reduced');
  const still=hash(await hero.screenshot());await page.mouse.move(50,50);await page.waitForTimeout(350);expect(hash(await hero.screenshot())).toBe(still);
  expect(await hero.locator('[data-rig-head]').getAttribute('transform')).toBe('translate(0 0) rotate(0 587 301)');
  expect(await hero.evaluate(e=>getComputedStyle(e.parentElement).transform)).toBe('none');
  expect(directions).toEqual([]);expect(errors).toEqual([]);
  const label=options.isMobile?'mobile':options.reducedMotion?'reduced':'desktop';await page.screenshot({path:join(out,label+'.png')});results.push({label,bodyPixelsStable:true,reducedPixelsStable:true,errors});await page.close();
 }
 const failure=await browser.newPage();await failure.route('**/companion/rig/head.png',route=>route.abort());await failure.goto(base);
 await expect(failure.locator('.hero-gaze')).toHaveAttribute('data-rig-status','asset-error');await expect(failure.locator('.hero-gaze img')).toBeVisible();await expect(failure.locator('.gaze-rig')).toHaveCount(0);await failure.close();
}finally{await browser.close();}
writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

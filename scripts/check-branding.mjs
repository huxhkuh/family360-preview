import {fillRequiredContactAnswers} from './client-navigation.mjs';
import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/';
const output='test-results/branding';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch();const results=[];
try{
 const approved=readFileSync('public/brand/approved-logo-board.png');
 expect(createHash('sha256').update(approved).digest('hex')).toBe('66b8d92983e426c3953cf98f02686264099b1a690b9126b85f10566df9241be1');
 const assetPage=await browser.newPage();
 for(const mode of ['on-light','on-dark','mono-forest','mono-white'])for(const suffix of ['','-symbol']){
  const svg=readFileSync(`public/brand/mesudarim-360/mesudarim-360-${mode}${suffix}.svg`,'utf8');
  expect(svg).not.toMatch(/<(?:image|foreignObject|script|text|filter)\b|data:image|@font-face|\bhref=/);
  expect(svg).toContain('<path');
  if(!mode.startsWith('mono')){expect(svg).toContain('<linearGradient');expect(svg).toContain('<pattern id="grain"');}
  else expect(svg).not.toMatch(/linearGradient|pattern/);
  if(suffix){
   const pixels=await assetPage.evaluate(async source=>{
    const render=async raw=>{
     const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(raw);await img.decode();
     const canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;
     const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,600,600);return ctx.getImageData(0,0,600,600).data;
    };
    const data=await render(source),sample=(x,y)=>Array.from(data.slice((y*600+x)*4,(y*600+x)*4+4));
    const xml=new DOMParser().parseFromString(source,'image/svg+xml');
    xml.querySelectorAll('path[fill="url(#grain)"]').forEach(p=>p.remove());
    const smooth=await render(new XMLSerializer().serializeToString(xml));
    let grainPixels=0;for(let i=0;i<data.length;i+=4)if(data[i+3]===255&&Math.abs(data[i]-smooth[i])+Math.abs(data[i+1]-smooth[i+1])+Math.abs(data[i+2]-smooth[i+2])>2)grainPixels++;
    return {corner:sample(0,0),centre:sample(290,310),primary:sample(50,150),copperA:sample(325,60),copperB:sample(500,175),grainPixels};
   },svg);
   expect(pixels.corner[3]).toBe(0);expect(pixels.centre[3]).toBe(0);expect(pixels.primary[3]).toBe(255);
   if(!mode.startsWith('mono')){
    expect(pixels.copperA[3]).toBe(255);expect(pixels.copperB[3]).toBe(255);
    expect(pixels.copperA.slice(0,3)).not.toEqual(pixels.copperB.slice(0,3));expect(pixels.grainPixels).toBeGreaterThan(100);
   } else expect(pixels.grainPixels).toBe(0);
  }
 }
 await assetPage.close();
 for(const [app,exportMode] of [['light','on-light'],['dark','on-dark'],['mono','mono-forest']])for(const mark of [false,true]){
  expect(readFileSync(`public/brand/concept-5-${app}${mark?'-mark':''}.svg`,'utf8')).toBe(readFileSync(`public/brand/mesudarim-360/mesudarim-360-${exportMode}${mark?'-symbol':''}.svg`,'utf8'));
 }
 results.push({passed:true,checks:['approved reference unchanged','8 self-contained vector exports; no bitmap/font dependency','transparent canvas and circular opening','rendered gradients and visible vector grain','app assets match export kit']});
 for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844],['narrow',320,740]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url());});
  await page.addInitScript(()=>localStorage.setItem('mesudarim360:brand:stacked','4'));
  await page.goto(base+'?brandlab=1&brand=1#workspace');
  await expect(page.locator('#brand-lab,.brand-controls')).toHaveCount(0);
  await expect(page.getByLabel('חלופת לוגו',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'חמש חלופות למיתוג',exact:true})).toHaveCount(0);
  await expect(page.locator('.welcome-logo')).toHaveAttribute('src',/concept-5-light.svg$/);
  await expect(page.locator('link[rel=icon]')).toHaveAttribute('href',/concept-5-light-mark.svg$/);
  await page.getByRole('button',{name:'התנסות כלקוח חדש',exact:true}).click();
  await expect(page.locator('.sidebar .mesudarim-logo')).toHaveAttribute('src',/concept-5-dark.svg$/);
  await expect.poll(()=>page.locator('.sidebar .mesudarim-logo').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  await page.screenshot({path:`${output}/${device}-fixed-home.png`});
  await page.getByRole('button',{name:'התחלת השאלון',exact:true}).click();
  await expect(page.locator('.questionnaire-signature')).toHaveAttribute('src',/concept-5-light.svg$/);
  await expect(page.locator('.questionnaire-signature')).toHaveAttribute('alt','מסודרים 360° — עושים לך סדר בכסף.');
  if(width<=800){
   // The focused mobile questionnaire uses the compact sidebar logo once.
   await expect(page.locator('.client-shell.client-focus-mode')).toBeVisible();
   const compactBrand=page.locator('.sidebar .mesudarim-logo');
   await expect(compactBrand).toBeVisible();
   await expect(compactBrand).toHaveAttribute('src',/concept-5-dark.svg$/);
   await expect(compactBrand).toHaveAttribute('alt','מסודרים 360° — עושים לך סדר בכסף.');
   await expect(compactBrand).toHaveCSS('width','76px');
   await expect.poll(()=>compactBrand.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   await expect(page.locator('.questionnaire-signature')).toBeHidden();
   await expect(page.locator('.questionnaire-stamp')).toBeHidden();
  }else await expect(page.locator('.questionnaire-signature')).toBeVisible();
  const city=page.locator('[data-answer-key=city]');await city.fill('טיוטה עם הלוגו הקבוע');
  const nav=page.getByRole('navigation',{name:'פרקי השאלון'});
  await fillRequiredContactAnswers(page);await nav.getByRole('button',{name:'עבודה והכנסות',exact:true}).click();
  await nav.getByRole('button',{name:'פרטי משפחה',exact:true}).click();await expect(city).toHaveValue('טיוטה עם הלוגו הקבוע');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${output}/${device}-fixed-questionnaire.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.reload();await expect(page.locator('.welcome-logo')).toHaveAttribute('src',/concept-5-light.svg$/);
  expect(errors).toEqual([]);expect(external).toEqual([]);
  results.push({device,passed:true,checks:['only approved brand on welcome, home and questionnaire','legacy URL and stored variant ignored','brand controls and gallery removed','draft retained','favicon fixed','no overflow or errors']});await page.close();
 }
 const blocked=await browser.newPage();
 await blocked.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw new Error('Storage unavailable');}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw new Error('Storage unavailable');}});});
 await blocked.goto(base+'?brand=999&brandlab=1#workspace');
 await expect(blocked.locator('.welcome-logo')).toHaveAttribute('src',/concept-5-light.svg$/);
 await expect(blocked.locator('#brand-lab,.brand-controls')).toHaveCount(0);await blocked.close();
 results.push({storageBlocked:true,approvedBrandFixed:true,passed:true});
}finally{await browser.close();}
writeFileSync(`${output}/qa.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));

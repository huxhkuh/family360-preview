import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {openTopic} from './guided-test-helpers.mjs';
const base=process.env.DEMO_URL||'http://127.0.0.1:5296/family360-preview/';
const out=process.env.AI_TOPIC_QA_OUT||'test-results/ai-topic';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const width of [1440,390,320]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[],providerRequests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.on('request',r=>{if(r.url().includes('api.openai.com'))providerRequests.push(r.url())});
 await page.goto(base+'#workspace');await page.locator('.demo-roles>button').first().click();await page.goto(base+'#/meetings/m3?stage=discussion');await page.getByRole('button',{name:'התחלת פגישה',exact:true}).click();await openTopic(page,'רב־קו');
 const notes=page.getByLabel('הערות מהשיחה — לצוות בלבד'),choice=page.getByRole('radio',{name:'רוצים לחשוב',exact:true}),assistant=page.locator('.ai-topic-assistant');
 const original='הערה מקורית: המשפחה ביקשה לבדוק תנאים; טרם החליטה.';await notes.fill(original);await choice.check();await assistant.locator(':scope>summary').click();
 await expect(assistant.getByRole('group',{name:'סוג העזרה בנושא'}).getByRole('button')).toHaveCount(4);
 await assistant.locator('.ai-topic-generate').click();const scroll=await page.evaluate(()=>scrollY);const edit=assistant.getByLabel('נוסח לבדיקה ועריכה');await expect(edit).toBeVisible();expect(Math.abs(await page.evaluate(()=>scrollY)-scroll)).toBeLessThan(100);await expect(notes).toHaveValue(original);await expect(choice).toBeChecked();
 await edit.fill('נוסח אישי שהנציג ערך לשיחה.');await expect(assistant.locator('.ai-topic-generate')).toBeDisabled();await assistant.getByRole('button',{name:'שאלת המשך',exact:true}).click();await assistant.getByRole('button',{name:'הסבר פשוט',exact:true}).click();await expect(edit).toHaveValue('נוסח אישי שהנציג ערך לשיחה.');
 await assistant.getByRole('button',{name:'הוספה לטיוטת ההערות',exact:true}).click();await expect(notes).toHaveValue(original+'\n\nהסבר פשוט:\nנוסח אישי שהנציג ערך לשיחה.');await expect(choice).toBeChecked();
 await openTopic(page,'הלוואות');await openTopic(page,'רב־קו');await expect(edit).toHaveValue('נוסח אישי שהנציג ערך לשיחה.');
 for(const action of ['שאלת המשך','מה חסר להמשך?']){await assistant.getByRole('button',{name:action,exact:true}).click();await assistant.locator('.ai-topic-generate').click();await expect(edit).toBeVisible();await expect(edit).not.toHaveValue('');await assistant.locator('.ai-evidence>summary').click();await expect(assistant).toContainText('מדריך השיחה');}
 await assistant.getByRole('button',{name:'סיכום ההערות',exact:true}).click();await assistant.locator('.ai-topic-generate').click();const changed=original+'\nעדכון שנכתב בזמן ההכנה.';await notes.fill(changed);await expect(assistant.getByRole('status').filter({hasText:/המידע השתנה|ההערות או נתוני הנושא השתנו/})).toBeVisible();await expect(notes).toHaveValue(changed);await expect(choice).toBeChecked();
 await assistant.locator('.ai-topic-generate').click();await expect(edit).toHaveValue(new RegExp('עדכון שנכתב בזמן ההכנה'));await edit.fill('נדרש בירור נוסף; המשפחה טרם החליטה.');await expect(notes).toHaveValue(changed);await assistant.getByRole('button',{name:'הוספה לטיוטת ההערות',exact:true}).click();await expect(notes).toHaveValue(changed+'\n\nסיכום לנושא:\nנדרש בירור נוסף; המשפחה טרם החליטה.');await expect(assistant.getByRole('button',{name:'נוסף לטיוטה',exact:true})).toBeDisabled();await expect(choice).toBeChecked();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await assistant.screenshot({path:`${out}/assistant-${width}.png`});
 await page.getByRole('button',{name:'שמירה',exact:true}).click();await expect(page.getByText('ההחלטה נשמרה',{exact:true})).toBeVisible();await expect(notes).toHaveValue(changed+'\n\nסיכום לנושא:\nנדרש בירור נוסף; המשפחה טרם החליטה.');
 await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption('client');await expect(page.locator('.ai-topic-assistant')).toHaveCount(0);expect(errors).toEqual([]);expect(providerRequests).toEqual([]);
 results.push({width,passed:true,checks:'four actions; fixed output position; manual notes and choice retained; editable suggestion retained across action/topic navigation; stale in-flight result; explicit append; duplicate-append prevention; normal save; client privacy; no paid request from demo; no overflow or JS errors'});await page.close();
}}finally{await browser.close();}
writeFileSync(out+'/results.json',JSON.stringify({url:base,results},null,2));console.log(JSON.stringify(results,null,2));

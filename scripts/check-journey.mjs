import {completeTopics} from './guided-test-helpers.mjs';
import {chromium,expect} from '@playwright/test';
const base=(process.env.DEMO_URL||'http://127.0.0.1:5248/family360-preview/').replace(/\/?$/, '/');
const browser=await chromium.launch();const page=await browser.newPage();page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'#workspace');await page.getByRole('button',{name:/^01 נציג/}).click();await page.goto(base+'#/meetings/m3');await page.getByRole('button',{name:'התחלת פגישה',exact:true}).click();
await completeTopics(page);await page.getByRole('button',{name:'סיום הפגישה ושמירת הסיכום',exact:true}).click();await expect(page.locator('.guided-summary')).toBeVisible();await expect(page.getByRole('button',{name:'סיום הפגישה ושמירת הסיכום',exact:true})).toHaveCount(0);
await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption('client');await page.goto(base+'#/families/f1/questionnaire');await page.getByRole('button',{name:'שמירת טיוטה',exact:true}).click();await expect(page.getByText('הטיוטה נשמרה. אפשר להמשיך בין המסכים; רענון הדמו מאפס את הנתונים.')).toBeVisible();expect(errors).toEqual([]);console.log('PASS: meeting decisions, completion, role switch, questionnaire draft; zero JS errors');await browser.close();

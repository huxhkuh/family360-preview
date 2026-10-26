import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
let raw=readFileSync('docs/landing/nissan-original.txt','utf8');
// Explicitly requested edits; keep the original source file intact.
const approvedEdits={"שאלון חכם מלווה ב-AI": "שאלון דיגיטלי", "אתם ממלאים שאלון חכם (בלי להסתבך)": "אתם ממלאים שאלון דיגיטלי (בלי להסתבך)", " כדי שלא תלכו לאיבוד, עוזר ה-AI שלנו ילווה אתכם ויראה לכם בדיוק איזה טופס צריך ומאיפה מורידים אותו בשתי לחיצות.": "", " בדיוק בגלל זה בנינו תומך AI שמראה לכם איפה ללחוץ ואיך להוריד כל מסמך בלי לחפש שעות.": "", " – מערכת ה-AI שלנו שם כדי להדריך אתכם בכל שלב.": ".", "מעבר להכוונה המדויקת של ה-AI בשאלון, הצוות האנושי שלנו": "הצוות האנושי שלנו"};
for(const [before,after] of Object.entries(approvedEdits))raw=raw.replaceAll(before,after);
const module=readFileSync('src/landing/nissanCopy.ts','utf8');
const copy=JSON.parse(module.slice(module.indexOf('= ')+2).replace(/ as const;\s*$/,''));
const normalize=s=>s.replace(/\s+/g,' ').trim();
const strings=v=>typeof v==='string'?[v]:Object.values(v).flatMap(strings);
for(const text of strings(copy))assert.ok(normalize(raw).includes(normalize(text)),`Not in Nissan source: ${text}`);
assert.ok(!/\bAI\b|בינה מלאכותית/.test(JSON.stringify(copy)));
assert.equal(copy.faq.length,7);assert.equal(copy.objections.length,3);
const browser=await chromium.launch();
try{for(const width of [1440,390]){
const page=await browser.newPage({viewport:{width,height:900}});await page.goto((process.env.DEMO_URL||'http://127.0.0.1:5268/family360-preview/')+'#welcome');await page.evaluate(()=>document.fonts.ready);
const displayed=normalize(await page.locator('.editorial-home main').textContent());
for(const text of strings(copy))assert.ok(displayed.includes(normalize(text)),`Missing from page: ${text}`);
assert.equal(await page.locator('#welcome-faq details').count(),7);
for(const detail of await page.locator('#welcome-faq details').all()){
 await detail.evaluate(e=>e.scrollIntoView({block:'center'}));await detail.locator('summary').click();assert.ok(await detail.evaluate(e=>e.open));
}
for(const id of ['welcome-how','welcome-faq','welcome-price']){
 await page.locator('#'+id).evaluate(e=>e.scrollIntoView());await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`C:/Users/yosi/OneDrive/מסמכים/ChatGPT/אתר ניסן/artifacts/nissan-${id}-${width}.png`});
}
console.log(`PASS ${width}: every source-copy entry rendered, seven original FAQs open, no horizontal overflow`);await page.close();
}}finally{await browser.close();}

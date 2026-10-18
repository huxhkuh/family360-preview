import {chromium,expect} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
const base=(process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/').replace(/\/?$/,'/');
const browser=await chromium.launch();const results=[];
try{for(const [device,width,height] of [['desktop',1440,900],['tablet',820,900],['mobile',390,844]]){
 console.log('Checking '+device);const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const go=async path=>page.goto(base+'#/'+path);const nav=page.getByRole('navigation',{name:'ניווט ראשי'});
 await page.goto(base);await page.getByRole('button',{name:/^01 נציג/}).click();
 // Consecutive creates must use distinct IDs, and edits must retain task status.
 await go('families/f1/followups');const tasks=page.getByRole('region',{name:'פעולות בתיק המשפחה',exact:true});
 for(const title of ['פעולה חדשה ראשונה','פעולה חדשה שנייה']){
  await tasks.getByRole('button',{name:'הוספת פעולה בתיק',exact:true}).click();await tasks.getByLabel('הפעולה הבאה',{exact:true}).fill(title);await tasks.getByLabel('תאריך יעד לפעולה').fill('2026-12-20');
  await tasks.getByRole('button',{name:'שמירת הפעולה',exact:true}).click();await expect(tasks.getByRole('heading',{name:title,exact:true})).toBeVisible();
 }
 await expect(tasks.getByRole('heading',{name:'פעולה חדשה ראשונה',exact:true})).toBeVisible();
 const task=tasks.locator('article').filter({has:page.getByRole('heading',{name:'פעולה חדשה ראשונה',exact:true})});
 await task.getByRole('button',{name:'עריכת הפעולה',exact:true}).click();await tasks.getByLabel('פרטי המשימה').fill('פרטים שנשמרו');await tasks.getByRole('button',{name:'שמירת הפעולה',exact:true}).click();
 await task.getByRole('button',{name:'התחלת פעולה',exact:true}).click();await task.getByRole('button',{name:'עריכת הפעולה',exact:true}).click();await tasks.getByLabel('פרטי המשימה').fill('טיוטה שנשארת לאחר ניווט');await nav.getByRole('button',{name:'פגישות',exact:true}).click();await go('families/f1/followups');await expect(tasks.getByLabel('פרטי המשימה')).toHaveValue('טיוטה שנשארת לאחר ניווט');await tasks.getByRole('button',{name:'שמירת הפעולה',exact:true}).click();await expect(task.locator('.badge')).toHaveText('בטיפול');
 // Repeated contact records remain separate; adding a next action stays optional.
 await go('families/f1/overview');const contacts=page.getByRole('region',{name:'קשר עם המשפחה',exact:true});
 for(const summary of ['תיעוד קשר ראשון לבדיקה','תיעוד קשר שני לבדיקה']){
  await contacts.getByRole('button',{name:'תיעוד קשר',exact:true}).click();await contacts.getByLabel('תיעוד פנימי של הקשר').fill(summary);await contacts.getByRole('button',{name:'שמירת תיעוד הקשר',exact:true}).click();await expect(page.getByText(summary,{exact:true})).toBeVisible();
 }
 await expect(page.getByText('תיעוד קשר ראשון לבדיקה',{exact:true})).toBeVisible();
 // A checklist draft survives a topic switch; saving leaves the editor in place.
 await go('meetings/m3');await page.getByRole('button',{name:'התחלת פגישה',exact:true}).click();await page.getByRole('button',{name:/^רשימת בדיקה ·/}).click();
 const topicButtons=page.locator('.checklist-topic');await topicButtons.first().click();const editor=page.getByRole('region',{name:'בדיקת נושא',exact:true});
 await editor.getByLabel('תיעוד הבדיקה — פנימי לצוות').fill('תיעוד שנשאר בנושא');await topicButtons.nth(1).click();await topicButtons.first().click();await expect(editor.getByLabel('תיעוד הבדיקה — פנימי לצוות')).toHaveValue('תיעוד שנשאר בנושא');await editor.getByLabel('תוצאת הבדיקה').selectOption('no_action');await editor.getByRole('button',{name:'שמירת בדיקת הנושא',exact:true}).click();await expect(editor.getByText('הפעולה נשמרה בהצלחה',{exact:true})).toBeVisible();await expect(editor).toBeVisible();
 await editor.getByLabel('תיעוד הבדיקה — פנימי לצוות').fill('שמירה נוספת של אותו נושא');await editor.getByRole('button',{name:'שמירת בדיקת הנושא',exact:true}).click();await expect(editor.getByText('הפעולה נשמרה בהצלחה',{exact:true})).toBeVisible();
 // Two follow-ups, then an inline update followed by the full editor use fresh revisions.
 await page.getByRole('button',{name:'לסיכום ומשימות המשך',exact:true}).click();const followups=page.getByRole('region',{name:'משימות המשך ומועדים',exact:true});
 for(const title of ['משימת המשך ראשונה','משימת המשך שנייה']){
  await followups.getByRole('button',{name:'הוספת משימת המשך',exact:true}).click();await followups.getByLabel('מה צריך לעשות?').fill(title);await followups.getByLabel('עד מתי?').fill('2026-12-20');await followups.getByRole('button',{name:'שמירת משימת המשך',exact:true}).click();await expect(followups.getByRole('heading',{name:title,exact:true})).toBeVisible();
 }
 const followup=followups.locator('.followup-row').filter({has:page.getByRole('heading',{name:'משימת המשך ראשונה',exact:true})});await expect(followup).toBeVisible();
 await followup.getByRole('button',{name:'עריכת פרטים ומועד',exact:true}).click();await followups.getByLabel('פירוט הפעולה').fill('הערה ראשונה');await followups.getByRole('button',{name:'שמירת משימת המשך',exact:true}).click();
 await followup.getByRole('button',{name:/עדכון אחראי או מועד/}).click();await followup.getByLabel('מועד למשימת ההמשך').fill('2026-12-25');await followup.getByRole('button',{name:'שמירת אחראי ומועד',exact:true}).click();await expect(followup.getByText('האחראי והמועד עודכנו. לא נשלחה הודעה.')).toBeVisible();
 await followup.getByRole('button',{name:'עריכת פרטים ומועד',exact:true}).click();await expect(followups.getByLabel('עד מתי?')).toHaveValue('2026-12-25');await followups.getByLabel('פירוט הפעולה').fill('הערה מעודכנת');await followups.getByRole('button',{name:'שמירת משימת המשך',exact:true}).click();await expect(followup.getByText('הערה מעודכנת',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 // Sidebar navigation restores the exact page's scroll after its content mounts.
 await go('families/f1/overview');await page.getByRole('heading',{name:'פרטי קשר',exact:true}).waitFor();await page.mouse.move(width/2,height/2);await page.mouse.wheel(0,500);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100);const y=await page.evaluate(()=>scrollY);
 await nav.getByRole('button',{name:'פגישות',exact:true}).dispatchEvent('click');await page.goBack();await expect.poll(async()=>Math.abs(await page.evaluate(()=>scrollY)-y)).toBeLessThan(5);
 expect(errors).toEqual([]);results.push({device,passed:true,checks:['distinct task/contact/followup creation','task draft retained','task status retained','checklist draft and repeated save','fresh revision after inline update','scroll restoration','no overflow'],consoleErrors:0});await page.close();
}}finally{await browser.close();}
mkdirSync('test-results/mint-after',{recursive:true});writeFileSync('test-results/mint-after/workflow-qa.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

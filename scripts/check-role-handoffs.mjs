import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {revealTaskContent} from './task-navigation.mjs';

const base=(process.env.DEMO_URL||'http://127.0.0.1:5266/family360-preview/').replace(/\/?$/,'/');
const out='test-results/role-handoffs';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
 const go=path=>page.goto(base+'#/'+path);
 const role=async value=>{await page.getByLabel('צפייה בתפקיד',{exact:true}).selectOption(value);await expect(page).toHaveURL(/#\/overview$/);};
 const button=name=>page.getByRole('button',{name,exact:true});
 const capture=async name=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true,animations:'disabled'});};
 const service=()=>page.locator('[data-record-id="fs2"]');
 const continuation=()=>page.getByRole('region',{name:'ממשיכים מכאן',exact:true});
 const openNewTask=async kind=>{
  await page.getByRole('navigation',{name:'ניווט ראשי'}).getByRole('button',{name:'משימות',exact:true}).click();
  if(kind==='execution')await button('משימות ביצוע').click();
  const card=page.locator('.task-card').filter({hasText:kind==='analysis'?/AN-\d+/:/EX-\d+/});
  await expect(card).toHaveCount(1);await card.getByRole('button',{name:/^פתיחת משימה /}).click();await expect(page.locator('.task-detail')).toBeVisible();
 };
 try{
  console.log(`Role handoff journey ${width}: assignment and document sharing`);
  await page.goto(base+'#workspace');await page.locator('.demo-roles>button').first().click();
  await go('families/f2/documents?focus=d2');await button('אישור מסמך').click();
  await expect(continuation()).toBeVisible();
  await go('families/f2/services?focus=fs2');await service().getByLabel('בעל מקצוע',{exact:true}).selectOption('pro1');await service().getByLabel('הנחיות',{exact:true}).fill('לבדוק עלויות ולתעד חלופה מבוססת');await button('שליחה לניתוח').click();
  await expect(service().locator('.badge').first()).toHaveText('בניתוח');await expect(continuation()).toBeVisible();
  await service().locator('summary').filter({hasText:'שיתוף מסמכים עם בעל המקצוע'}).click();await service().getByLabel('מסמך',{exact:true}).selectOption('d2');await button('עדכון שיתוף').click();
  await role('professional');await openNewTask('analysis');
  await revealTaskContent(page,'article.document');await expect(page.locator('article.document')).toHaveCount(1);await expect(page.locator('article.document')).toContainText('דוח פנסיה שנתי');
  await page.getByLabel('חומרה',{exact:true}).selectOption('yellow');await page.getByLabel('פירוט המצב כיום',{exact:true}).fill('עלות של מאה שקלים לחודש לפי הדוח');await page.getByLabel('פירוט החלופה המוצעת',{exact:true}).fill('חלופה בעלות שמונים שקלים לחודש בכפוף לתנאים');await page.getByLabel('סיכום ללקוח',{exact:true}).fill('נמצאה חלופה לבדיקה עם המשפחה');await button('הגשת הניתוח לאישור').click();
  await expect(continuation()).toContainText('העבודה נשלחה לנציג לבדיקה');await capture('analysis-submitted');
  console.log(`Role handoff journey ${width}: return, correction and approval`);
  await role('representative');await go('families/f2/services?focus=fs2');await revealTaskContent(page,'input[name="reason"]');await page.getByLabel('סיבת ההחזרה',{exact:true}).fill('להוסיף מקור להשוואת העלויות');await button('החזרה לתיקון').click();await expect(service().locator('.badge').first()).toHaveText('בניתוח');
  await role('professional');await openNewTask('analysis');await expect(page.locator('.task-detail')).toContainText('להוסיף מקור להשוואת העלויות');await page.getByLabel('מקור המידע הקיים',{exact:true}).fill('דוח פנסיה שנתי שהועבר לבדיקה');await page.getByLabel('מקור החלופה / ההצעה',{exact:true}).fill('הצעה כתובה שנבדקה עם הגוף המנהל');await button('הגשת הניתוח לאישור').click();await expect(continuation()).toBeVisible();
  await role('representative');await go('families/f2/services?focus=fs2');await button('אישור ניתוח').click();await expect(service().locator('.badge').first()).toHaveText('ניתוח אושר');await expect(continuation()).toBeVisible();await capture('analysis-approved');
  console.log(`Role handoff journey ${width}: schedule, discuss and finish meeting`);
  await go('meetings?family=f2');await page.getByLabel('משפחה',{exact:true}).selectOption('f2');await page.getByLabel('תאריך ושעה',{exact:true}).fill('2030-01-01T10:00');await page.getByLabel('סוג פגישה',{exact:true}).selectOption('phone');await button('קביעת פגישה').click();
  const meeting=page.locator('.meeting-list>article').filter({hasText:'משפחת כהן'});await expect(meeting).toHaveCount(1);await meeting.getByRole('button',{name:'פתיחת סביבת השיחה',exact:true}).click();await button('התחלת פגישה').click();
  await page.getByLabel('מה הלקוח החליט?',{exact:true}).selectOption('progress');
  const executionNotes=page.locator('details.call-execution-notes');await executionNotes.locator('summary').click();await page.getByLabel('הוראות לביצוע',{exact:true}).fill('לתאם את הפעולה שאושרה ולבדוק את החיוב המעודכן');await page.getByLabel('תיעוד ההחלטה לצוות',{exact:true}).fill('המשפחה אישרה לאחר קבלת הסבר');
  await page.getByRole('button',{name:/^שמירה והמשך ל/}).click();
  if(await button('לבדיקת הסיכום והמשך הטיפול').count())await button('לבדיקת הסיכום והמשך הטיפול').click();
  else if(!await button('סיום הפגישה ושמירת הסיכום').count()){
   await revealTaskContent(page,'.meeting-steps');await page.getByRole('navigation',{name:'שלבי השיחה'}).getByRole('button',{name:/סיכום/}).click();
  }
  await button('סיום הפגישה ושמירת הסיכום').click();await expect(button('לשיוך בתחומי הטיפול')).toBeVisible();await capture('meeting-finished');await button('לשיוך בתחומי הטיפול').click();
  await service().getByLabel('בעל מקצוע',{exact:true}).selectOption('pro1');await service().getByLabel('הנחיות',{exact:true}).fill('להתקדם לפי ההחלטה המתועדת');await service().getByRole('button',{name:'שליחה לביצוע',exact:true}).click();await expect(service().locator('.badge').first()).toHaveText('נשלח לביצוע');
  console.log(`Role handoff journey ${width}: execute, report and approve completion`);
  await role('professional');await openNewTask('execution');await expect(page.locator('.work-guidance')).toContainText('לתאם את הפעולה שאושרה');await button('התחלת טיפול').click();await page.getByLabel('תוכן',{exact:true}).fill('תואמה הפעולה ונבדק החיוב');await button('שמירת עדכון בטיפול').click();await expect(page.getByLabel('תוכן',{exact:true})).toHaveValue('');
  await button('דיווח סיום לנציג').click();await page.getByLabel('תוצאה',{exact:true}).fill('הפעולה הושלמה');await page.getByLabel('סיכום',{exact:true}).fill('בוצעה הפעולה שאושרה ונבדקה התוצאה מול האסמכתה');await page.getByLabel('שווי כספי (אם נמדד)',{exact:true}).fill('0');await button('שליחת דיווח סיום לנציג').click();await expect(continuation()).toContainText('העבודה נשלחה לנציג לבדיקה');await capture('execution-reported');
  await role('representative');await openNewTask('execution');await button('אישור השלמה').click();await expect(page.getByText('הביצוע אושר והושלם',{exact:true})).toBeVisible();await expect(continuation()).toBeVisible();await capture('execution-approved');
  expect(errors).toEqual([]);results.push({width,passed:true,checks:['new analysis assignment','explicit document sharing','submit, return with visible reason, resubmit and approve','new meeting with real findings','client approval before execution','new execution, progress, report and approval','visible continuation','no overflow or page errors']});
 }catch(error){await page.screenshot({path:`${out}/failure-${width}.png`,fullPage:true}).catch(()=>{});writeFileSync(`${out}/failure-${width}.txt`,await page.locator('body').innerText().catch(()=>''));throw error;}finally{await page.close();}
}}finally{await browser.close();}
writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

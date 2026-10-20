import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';

const base=(process.env.DEMO_URL||'http://127.0.0.1:5250/family360-preview/').replace(/\/?$/,'/');
const browser=await chromium.launch();
const results=[];
mkdirSync('test-results/guided-call',{recursive:true});
try{for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 page.setDefaultTimeout(10000);
 const errors=[],dialogs=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
 const noOverflow=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.goto(base);
 await page.getByRole('button',{name:/^01 נציג/}).click();
 await page.goto(base+'#/meetings/m3?family=f3');
 const steps=page.getByRole('navigation',{name:'שלבי השיחה'});
 await expect(steps.getByRole('button')).toHaveCount(4);
 await expect(page.getByRole('region',{name:'הקשר המשפחה בזמן השיחה'})).toBeVisible();
 await page.getByRole('button',{name:'התחלת פגישה',exact:true}).click();
 await expect(page.getByRole('heading',{name:'מיפוי החסכונות הקיימים',exact:true})).toBeVisible();
 await expect(page.getByText('0 מתוך 2 החלטות נשמרו',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'שמירה והמשך לנושא הבא',exact:true})).toBeDisabled();
 await noOverflow();
 await page.screenshot({path:`test-results/guided-call/${device}-discussion.png`,fullPage:true});

 // Saving advances only after the visible decision is persisted.
 await page.getByLabel('מה הלקוח החליט?').selectOption('no_action');
 await page.getByLabel('תיעוד ההחלטה לצוות').fill('החלטה ראשונה שנשמרה בהמשך המונחה');
 await page.getByRole('button',{name:'שמירה והמשך לנושא הבא',exact:true}).click();
 await expect(page.getByRole('heading',{name:'בדיקת עמלות בחשבון הבנק',exact:true})).toBeVisible();
 await expect(page.getByText('1 מתוך 2 החלטות נשמרו',{exact:true})).toBeVisible();
 await expect(page.getByLabel('תיעוד ההחלטה לצוות')).toHaveValue('');
 await page.getByLabel('מה הלקוח החליט?').selectOption('no_action');
 await page.getByRole('button',{name:'שמירה והמשך לרשימת הבדיקה',exact:true}).click();
 const checklist=page.getByRole('region',{name:'רשימת בדיקה לשיחה',exact:true});
 await expect(checklist).toBeVisible();
 await expect(steps.getByRole('button',{name:/^רשימת בדיקה ·/})).toHaveAttribute('aria-current','step');
 await expect(page.getByText('2 מתוך 2 החלטות נשמרו',{exact:true})).toBeVisible();

 // Checklist save-and-next changes the topic; ordinary save keeps its editor.
 await checklist.getByRole('button',{name:'המשך לנושא הבא לבדיקה',exact:true}).click();
 const editor=page.getByRole('region',{name:'בדיקת נושא',exact:true});
 const directory=checklist.locator('details.checklist-directory');
 await expect(editor.getByRole('heading',{name:'ביטוח חיים למשכנתא',exact:true})).toBeVisible();
 await expect(directory).not.toHaveAttribute('open');
 await expect(editor.getByRole('button',{name:'שמירה והמשך לבדיקה הבאה',exact:true})).toBeDisabled();
 await editor.getByLabel('תוצאת הבדיקה').selectOption('no_action');
 await editor.getByLabel('תיעוד הבדיקה — פנימי לצוות').fill('בדיקה ראשונה נשמרה לפני המעבר');
 await editor.getByRole('button',{name:'שמירה והמשך לבדיקה הבאה',exact:true}).click();
 await expect(editor.getByRole('heading',{name:'ביטוח מבנה',exact:true})).toBeVisible();
 await expect(checklist.getByRole('progressbar',{name:'התקדמות בדיקת הנושאים'})).toHaveAttribute('value','1');
 await editor.getByLabel('תוצאת הבדיקה').selectOption('not_relevant');
 await editor.getByLabel('תיעוד הבדיקה — פנימי לצוות').fill('שמירה רגילה משאירה את הנושא פתוח');
 await editor.getByRole('button',{name:'שמירת בדיקת הנושא',exact:true}).click();
 await expect(editor.getByText('הפעולה נשמרה בהצלחה',{exact:true})).toBeVisible();
 await expect(editor.getByRole('heading',{name:'ביטוח מבנה',exact:true})).toBeVisible();
 await expect(checklist.getByRole('progressbar',{name:'התקדמות בדיקת הנושאים'})).toHaveAttribute('value','2');
 await expect(editor.getByLabel('תיעוד הבדיקה — פנימי לצוות')).toHaveValue('שמירה רגילה משאירה את הנושא פתוח');
 await directory.locator('summary').click();
 await directory.getByRole('button',{name:/^ביטוח חיים למשכנתא/}).click();
 await expect(editor.getByLabel('תיעוד הבדיקה — פנימי לצוות')).toHaveValue('בדיקה ראשונה נשמרה לפני המעבר');
 await expect(editor.getByLabel('תוצאת הבדיקה')).toHaveValue('no_action');
 await noOverflow();
 await page.screenshot({path:`test-results/guided-call/${device}-checklist.png`,fullPage:true});

 // Optional checklist topics do not block completion once decisions are saved.
 await steps.getByRole('button',{name:/סיכום והמשך/}).click();
 const summary=page.getByRole('region',{name:'סיכום גלוי ללקוח',exact:true});
 await expect(summary.getByRole('heading',{name:'מיפוי החסכונות הקיימים',exact:true})).toBeVisible();
 await expect(summary.getByRole('heading',{name:'בדיקת עמלות בחשבון הבנק',exact:true})).toBeVisible();
 await expect(summary.getByText('תיאום פנימי לצוות',{exact:true})).toHaveCount(0);
 const finish=page.getByRole('button',{name:'סיום הפגישה ושמירת הסיכום',exact:true});
 await expect(finish).toBeEnabled();
 await finish.click();
 await expect(page.getByRole('heading',{name:'המשך הטיפול באחריות הנציג',exact:true})).toBeVisible();
 await noOverflow();
 await page.screenshot({path:`test-results/guided-call/${device}-summary.png`,fullPage:true});
 expect(errors).toEqual([]);
 expect(dialogs).toEqual([]);
 results.push({device,passed:true,checks:['four stages','call context retained','saved decisions advance','internal topic skipped','checklist save-and-next','ordinary save stays','saved checklist values retained','completion with optional checks','no overflow'],consoleErrors:0});
 await page.close();
}}finally{await browser.close();}
writeFileSync('test-results/guided-call/qa.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));

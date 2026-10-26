import {readFile,writeFile} from 'node:fs/promises';
const directory=new URL('../docs/email/',import.meta.url);
const backups=JSON.parse(await readFile(new URL('original-templates.json',directory),'utf8'));
const email=(label,token)=>`<p style="margin:12px 0;font-size:15px;line-height:1.8;color:#354a43;">${label}: <span dir="ltr" style="display:inline-block;word-break:break-all;">{{ .${token} }}</span></p>`;
const rows=[
 ['confirm-sign-up','אימות כתובת הדוא״ל','כדי להשלים את ההרשמה למסודרים 360,<br>יש לאמת את כתובת הדוא״ל שלך.','אימות הדוא״ל','אם לא ביקשת להירשם למסודרים 360, אפשר להתעלם מההודעה.'],
 ['reset-password','שחזור הסיסמה','התקבלה בקשה לשחזור הסיסמה לחשבון שלך במסודרים 360.<br>לבחירת סיסמה חדשה, יש ללחוץ על הכפתור.','בחירת סיסמה חדשה','אם לא ביקשת לשחזר את הסיסמה, אפשר להתעלם מההודעה. הסיסמה הקיימת לא תשתנה.'],
 ['invite-user','הזמנה למסודרים 360','הוזמנת לפתוח חשבון במסודרים 360.<br>להשלמת פתיחת החשבון, יש לאשר את ההזמנה.','אישור ההזמנה','אם ההזמנה אינה מוכרת לך, אפשר להתעלם מההודעה.'],
 ['magic-link-or-otp','כניסה לחשבון','התקבלה בקשה לכניסה לחשבון שלך במסודרים 360.<br>הקישור הבא מאפשר להיכנס לחשבון.','כניסה לחשבון','אם לא ביקשת להיכנס, אין ללחוץ על הקישור ואפשר להתעלם מההודעה.'],
 ['change-email-address','אישור כתובת דוא״ל חדשה','התקבלה בקשה לשינוי כתובת הדוא״ל של החשבון שלך במסודרים 360.','אישור כתובת הדוא״ל','אם לא ביקשת לשנות את הכתובת, אין לאשר את השינוי. יש לפנות למנהל המערכת.',email('הכתובת החדשה','NewEmail')],
 ['reauthentication','קוד לאימות הזהות','כדי להמשיך בפעולה בחשבון שלך במסודרים 360,<br>יש להזין במסך האימות את הקוד הבא.',null,'אם לא ביקשת לבצע פעולה זו, אין להשתמש בקוד ויש לפנות למנהל המערכת.','<p dir="ltr" style="margin:24px 0;padding:20px;background-color:#f6f4ef;border:1px solid #e4e3db;border-radius:7px;text-align:center;font-family:Consolas,monospace;font-size:30px;letter-spacing:4px;color:#173c35;">{{ .Token }}</p>'],
 ['password-changed','הסיסמה שלך שונתה','הסיסמה לחשבון שלך במסודרים 360 שונתה.',null],
 ['email-address-changed','כתובת הדוא״ל שונתה','כתובת הדוא״ל של החשבון שלך במסודרים 360 עודכנה.',null,null,email('הכתובת הקודמת','OldEmail')+email('הכתובת החדשה','Email')],
 ['phone-number-changed','מספר הטלפון שונה','מספר הטלפון של החשבון שלך במסודרים 360 עודכן.',null,null,email('המספר הקודם','OldPhone')+email('המספר החדש','Phone')],
 ['sign-in-method-linked','נוספה דרך כניסה לחשבון','דרך כניסה נוספת קושרה לחשבון שלך במסודרים 360.',null,null,email('שירות הכניסה','Provider')+email('כתובת החשבון','Email')],
 ['sign-in-method-removed','הוסרה דרך כניסה לחשבון','דרך כניסה הוסרה מהחשבון שלך במסודרים 360.',null,null,email('שירות הכניסה','Provider')+email('כתובת החשבון','Email')],
 ['mfa-method-added','נוסף אמצעי אימות דו־שלבי','אמצעי אימות דו־שלבי נוסף לחשבון שלך במסודרים 360.',null,null,email('סוג אמצעי האימות','FactorType')],
 ['mfa-method-removed','הוסר אמצעי אימות דו־שלבי','אמצעי אימות דו־שלבי הוסר מהחשבון שלך במסודרים 360.',null,null,email('סוג אמצעי האימות','FactorType')],
];
const manifest=[];
for(const [slug,title,message,button,notice,detail='']of rows){
 const footer=notice||'אם השינוי לא בוצע על ידך, יש לפנות בהקדם למנהל המערכת לבדיקת הגישה לחשבון.';
 const action=button?`<table role="presentation" cellspacing="0" cellpadding="0" border="0" dir="rtl"><tr><td bgcolor="#173c35" align="center" style="border-radius:7px;mso-padding-alt:15px 30px;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:15px 30px;border:1px solid #173c35;border-radius:7px;font-size:17px;line-height:1.4;font-weight:bold;text-decoration:none;color:#ffffff;background-color:#173c35;">${button}</a></td></tr></table><p style="margin:24px 0 0;font-size:14px;line-height:1.8;color:#626e66;">אם הכפתור לא נפתח, <a href="{{ .ConfirmationURL }}" style="color:#173c35;text-decoration:underline;">אפשר לפתוח את הקישור כאן</a>.</p>`:'';
 const content=`<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | מסודרים 360</title></head>
<body dir="rtl" style="margin:0;padding:0;background-color:#f6f4ef;color:#173c35;font-family:Arial,Helvetica,sans-serif;text-align:right;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${title} · הודעה ממסודרים 360.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f6f4ef" dir="rtl"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" dir="rtl" style="max-width:560px;border:1px solid #e4e3db;border-radius:12px;">
<tr><td style="padding:28px;border-bottom:1px solid #eeede7;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" dir="rtl"><tr>
<td width="64" valign="middle" style="padding-left:16px;"><img src="https://family360.pages.dev/brand/email-mark.png" width="64" height="64" alt="סמל מסודרים 360" style="display:block;border:0;width:64px;height:64px;"></td>
<td valign="middle"><p style="margin:0;color:#173c35;font-size:27px;line-height:1.3;font-weight:bold;">מסודרים <span dir="ltr" style="display:inline-block;">360°</span></p><p style="margin:6px 0 0;color:#976b3c;font-size:14px;line-height:1.5;">עושים לך סדר בכסף.</p></td>
</tr></table></td></tr>
<tr><td style="padding:32px 28px 36px;"><h1 style="margin:0 0 18px;font-size:26px;line-height:1.4;font-weight:bold;color:#173c35;">${title}</h1><p style="margin:0 0 26px;font-size:17px;line-height:1.8;color:#354a43;">${message}</p>${detail}${action}</td></tr>
<tr><td style="padding:21px 28px;border-top:1px solid #eeede7;"><p style="margin:0;font-size:13px;line-height:1.8;color:#626e66;">${button?'הקישור אישי וחד־פעמי. אין להעביר אותו לאחרים.<br>':slug==='reauthentication'?'הקוד אישי. אין להעביר אותו לאחרים.<br>':''}${footer}</p></td></tr>
</table><p style="margin:20px 0 0;color:#626e66;font-size:12px;line-height:1.6;">מסודרים 360 · הודעת חשבון</p></td></tr></table></body></html>
`;
 const variables=new Set(content.match(/\{\{[^}]+\}\}/g)||[]);
 for(const token of backups[slug].body.match(/\{\{[^}]+\}\}/g)||[])if(!variables.has(token))throw Error(`Lost template variable ${slug}: ${token}`);
 const file=slug==='confirm-sign-up'?'confirm-signup.html':slug+'.html';
 await writeFile(new URL(file,directory),content);
 manifest.push({slug,file,subject:title+' | מסודרים 360',subjectId:backups[slug].subjectId,variables:[...variables]});
}
await writeFile(new URL('templates.json',directory),JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated ${manifest.length} Hebrew RTL templates; preserved every original dynamic variable.`);

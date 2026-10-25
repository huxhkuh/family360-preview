# בדיקת כשל הפרסום מ־20.10.2026

נבדק מחדש ב־24.10.2026 מול הקוד המקומי ב־`1ba18c0`.

## הכשל

ריצה: https://github.com/huxhkuh/family360-preview/actions/runs/39388848734

ה־commit שנכשל: `b8751ffaf9756664dc6e480df305d4a9e62e1955`.
המשימה `build` נכשלה, אך `npm test` ו־`npm run build` עברו.
הכשל היה בשלב `Check built demo on desktop and mobile`, בתוך
`scripts/check-branding.mjs:53`, אחרי הפעלת כפתור החזרה במקלדת:

```text
ExpectError: expect(locator).toBeFocused() failed
Locator: getByRole('button', { name: 'חמש חלופות למיתוג', exact: true })
Timeout: 5000ms
Error: element(s) not found
```

צילום הנגישות בלוג הראה שהגלריה עדיין פתוחה והכפתור נקרא „חזרה לדמו”.
בגרסה ההיא, `toggleLab` ב־`src/Demo.tsx` תזמן העברת מיקוד דרך
`requestAnimationFrame` בנפרד מהשלמת עדכון React. כך התחרה עדכון
המיקוד בפעולת הסגירה באמצעות המקלדת. העלאת התוצר והפרסום דולגו.

## מצב התיקון

התיקון כבר כלול בהיסטוריה המקומית: commit `16c0700` מעביר את ניהול
המיקוד ל־`useLayoutEffect`, אחרי עדכון התצוגה. הריצה שלו הצליחה:
https://github.com/huxhkuh/family360-preview/actions/runs/39389821126

בהמשך, `a21aa4c` הסיר את גלריית החלופות וקיבע את הלוגו המאושר.
בדיקת המיתוג הנוכחית מאמתת שכתובות והעדפות מיתוג ישנות אינן מחזירות
את הגלריה, שהלוגו נטען ושמעבר בין פרקי השאלון שומר טיוטה.
אין צורך להחזיר את הגלריה או להוסיף תיקון קוד עבור הכשל ההיסטורי.

הריצה של ה־commit המקומי הנוכחי הצליחה, כולל `build` ו־`deploy`:
https://github.com/huxhkuh/family360-preview/actions/runs/39507951815

## אימות מקומי חדש

- `npm run build` עבר: בדיקת TypeScript ובניית Vite.
- `npm test` עבר: 186 בדיקות ב־24 קבצים.
- `DEMO_URL=http://127.0.0.1:5248/family360-preview/ node scripts/check-branding.mjs`
  עבר מול תוצר הבנייה: מחשב, נייד, רוחב 320px ואחסון דפדפן חסום.
- `node scripts/check-demo.mjs` מול אותה כתובת עבר: ארבעת התפקידים
  במחשב ובנייד, ניווט, חיפוש, תיעוד קשר, שמירה והשלמת פעולה וקבלת הצעה.
  לא נמצאו שגיאות JavaScript, בקשות חיצוניות או גלילה אופקית.
- `node scripts/check-journey.mjs` ו־`node scripts/check-guided-call.mjs`
  עברו מול אותה כתובת. ההרצה המקומית המורחבת של יתר בדיקות הפרסום
  הופסקה לאחר הבדיקות הרלוונטיות; הצלחתן המרוחקת אומתה בריצה לעיל.

לא הופעלו push, ריצה חוזרת או פרסום במסגרת הבדיקה. הצלחת הפרסום
המרוחק לעיל נבדקה בנתוני GitHub Actions של הריצה הקיימת.

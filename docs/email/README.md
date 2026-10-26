# הודעת אימות הרשמה

תבנית: `confirm-signup.html`.

נושא: `אימות כתובת הדוא״ל שלך | מסודרים 360`.

מיועדת ל־Supabase Auth → Emails → Confirm sign up. מבוססת טבלאות ו־CSS בתוך האלמנטים, עם עברית ו־RTL, ואינה תלויה בתמונות או בגופנים חיצוניים. יש לשמר את `{{ .ConfirmationURL }}` בשני הקישורים; אין להחליפו בכתובת האתר או בקישור אימות של משתמש אמיתי.

התבנית המקורית לצורך חזרה לאחור:

נושא: `Confirm your email address`.

```html
<h2>Confirm your email address</h2>
<p>Follow the link below to confirm this email address and finish signing up.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
```

השינוי חל על הודעות אימות הרשמה חדשות בלבד. הוא אינו משנה הודעות שכבר נשלחו, את מנגנון האימות, את דרישת MFA או את הגדרות SMTP.

התבנית והנושא נשמרו ב־Supabase ב־26.10.2026 ואומתו לאחר יציאה מהעורך ופתיחה מחדש. בוצעה בדיקה חזותית בדפדפן ברוחב רגיל ובתצוגה ברוחב 360px, וכן בתצוגה המקדימה של Supabase. לא נשלחה הודעת בדיקה ולא בוצעה בדיקה בתוך Gmail/Outlook. צילום התצוגה המקומית עם קישור דמה: `artifacts/live/email-confirmation-hebrew.png`.

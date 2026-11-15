"""Generate the three synthetic Hebrew PDFs used only by the mortgage demo."""
from pathlib import Path
import math
import json

from bidi.algorithm import get_display
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "demo-mortgage"
OUT.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont("DemoHebrew", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("DemoHebrewBold", r"C:\Windows\Fonts\arialbd.ttf"))

WIDTH, HEIGHT = A4
FOREST = HexColor("#153F33")
INK = HexColor("#193F34")
MUTED = HexColor("#5B6C60")
COPPER = HexColor("#B77C59")
PAPER = HexColor("#FAF8F0")
RULE = HexColor("#D9E0D5")
PALE = HexColor("#ECF0E7")
WHITE = HexColor("#FFFFFF")
LEFT, RIGHT = 43, WIDTH - 43
FAMILY = "משפחת הדגמה - תיק משכנתא"
DATE = "15.11.2026"
DISCLAIMER = "מסמך סינתטי להדגמה בלבד - אינו מסמך בנק / אינו הצעה או ייעוץ"

PRINCIPAL, MONTHS, COST = 650000, 240, 6500
def payment(rate):
    r = rate / 1200
    return PRINCIPAL * r / (1 - (1 + r) ** -MONTHS)

CURRENT, PROPOSED = payment(5.4), payment(4.7)
DELTA = CURRENT - PROPOSED
GROSS = DELTA * MONTHS
NET = GROSS - COST
money = lambda n: f"{n:,.2f} ₪"

def rtl(text):
    return get_display(str(text), base_dir="R")

def text(c, x, y, value, size=11, color=INK, bold=False, align="right"):
    c.setFillColor(color)
    c.setFont("DemoHebrewBold" if bold else "DemoHebrew", size)
    if align == "center":
        c.drawCentredString(x, y, rtl(value))
    elif align == "left":
        c.drawString(x, y, rtl(value))
    else:
        c.drawRightString(x, y, rtl(value))

def wrap(value, width, size=11, bold=False):
    font = "DemoHebrewBold" if bold else "DemoHebrew"
    lines, current = [], ""
    for word in value.split():
        candidate = (current + " " + word).strip()
        if current and pdfmetrics.stringWidth(rtl(candidate), font, size) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines

def paragraph(c, value, y, size=11, color=MUTED, width=RIGHT-LEFT, leading=17, bold=False):
    for line in wrap(value, width, size, bold):
        text(c, RIGHT, y, line, size, color, bold)
        y -= leading
    return y

def base(filename, title, subtitle, number):
    c = canvas.Canvas(str(OUT / filename), pagesize=A4)
    c.setTitle(f"מסודרים 360 - {title} - הדגמה בלבד")
    c.setAuthor("מסודרים 360 - נתונים סינתטיים")
    c.setSubject("מסמך סינתטי בלבד. אין בו נתוני לקוחות או הצעת בנק.")
    c.setFillColor(PAPER)
    c.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    c.setFillColor(FOREST)
    c.rect(0, HEIGHT - 128, WIDTH, 128, fill=1, stroke=0)
    text(c, RIGHT, HEIGHT - 34, "מסודרים 360°  /  סביבת הדגמה", 12, HexColor("#E5C1A5"), True)
    text(c, RIGHT, HEIGHT - 75, title, 26, WHITE, True)
    text(c, RIGHT, HEIGHT - 102, subtitle, 12, HexColor("#D9E3D7"))
    c.setFillColor(HexColor("#F0E3D6"))
    c.roundRect(LEFT, HEIGHT - 170, RIGHT - LEFT, 26, 5, fill=1, stroke=0)
    text(c, (LEFT + RIGHT) / 2, HEIGHT - 161, DISCLAIMER, 10.2, INK, True, "center")
    text(c, RIGHT, HEIGHT - 199, FAMILY, 14, INK, True)
    text(c, LEFT, HEIGHT - 199, "תאריך דוגמה: " + DATE, 10, MUTED, align="left")
    c.setStrokeColor(COPPER)
    c.setLineWidth(1)
    c.line(LEFT, 58, RIGHT, 58)
    text(c, RIGHT, 40, "תיק M-001 | כל השמות, הסכומים וההנחות נוצרו לצורכי הדגמה בלבד", 9, MUTED)
    text(c, LEFT, 24, f"מסמך {number} מתוך 3 | עמוד 1 מתוך 1", 8, MUTED, align="left")
    return c

def section(c, label, y):
    text(c, RIGHT, y, label, 14, INK, True)
    c.setStrokeColor(RULE)
    c.line(LEFT, y - 10, RIGHT, y - 10)
    return y - 34

def rows(c, values, y, height=33, label_width=196):
    for i, (label, value) in enumerate(values):
        if i % 2 == 0:
            c.setFillColor(WHITE)
            c.roundRect(LEFT, y - height + 9, RIGHT - LEFT, height, 3, fill=1, stroke=0)
        text(c, RIGHT - 10, y - 12, label, 10.8, MUTED)
        # Separate the numeric and Hebrew cells so mixed-direction text stays clear.
        text(c, RIGHT - label_width, y - 12, value, 11.5, INK, True)
        y -= height
    return y

def metric(c, value, label, y):
    c.setFillColor(PALE)
    c.roundRect(LEFT, y - 76, RIGHT - LEFT, 76, 7, fill=1, stroke=0)
    text(c, RIGHT - 18, y - 27, label, 12, MUTED)
    text(c, RIGHT - 18, y - 59, value, 27, INK, True)
    return y - 106

def finish(c):
    c.showPage()
    c.save()

c = base("balance.pdf", "דוח יתרות משכנתא לדוגמה", "נתוני פתיחה לבדיקת יועץ משכנתאות", 1)
y = metric(c, money(PRINCIPAL), "יתרת קרן בתרחיש ההדגמה", HEIGHT - 225)
y = section(c, "פרטי ההלוואה הסינתטית", y)
y = rows(c, [
    ("הגורם המממן", "בנק לדוגמה"),
    ("מסלול יחיד", "ריבית קבועה, ללא הצמדה"),
    ("ריבית שנתית נומינלית", "5.40%"),
    ("יתרת תקופה", "240 חודשים / 20 שנים"),
    ("החזר חודשי מחושב", money(CURRENT)),
    ("סך תשלומים שנותרו במודל", money(CURRENT * MONTHS)),
    ("ריבית מצטברת שנותרה במודל", money(CURRENT * MONTHS - PRINCIPAL)),
], y, 32)
y -= 16
y = section(c, "איך לקרוא את הדוגמה", y)
y = paragraph(c, "החישוב מניח תשלום חודשי שווה לכל התקופה, ריבית קבועה וללא הצמדה. אין ביטוח, פיגורים, עמלות או שינויי ריבית בתוך ההחזר המוצג.", y)
y -= 9
y = paragraph(c, "זה אינו דוח יתרות לסילוק ואינו אישור זכויות. יתרת סילוק, קנסות, בטוחות ותנאי ההלוואה בפועל חייבים להיבדק מול מסמך אמיתי מהבנק.", y)
finish(c)

c = base("income.pdf", "הצהרת משפחה לדוגמה", "תמונת הכנסות, הוצאות ונתוני משק הבית", 2)
y = metric(c, money(21000), "הכנסה חודשית נטו של משק הבית - נתון סינתטי", HEIGHT - 225)
y = section(c, "תזרים חודשי בתרחיש", y)
y = rows(c, [
    ("הכנסה נטו - בן הזוג", money(12500)),
    ("הכנסה נטו - בת הזוג", money(8500)),
    ("סך הכנסות נטו", money(21000)),
    ("הוצאות מחיה, לפני משכנתא", money(11500)),
    ("החזר המשכנתא הקיים במודל", money(CURRENT)),
    ("יתרה אחרי מחיה ומשכנתא", money(21000 - 11500 - CURRENT)),
], y, 30)
y -= 14
y = section(c, "פרטי משק הבית והנכס", y)
y = rows(c, [
    ("הרכב משק הבית", "זוג ושלושה ילדים"),
    ("הלוואות נוספות בתרחיש", "אין"),
    ("מגורים", "דירה בבעלות המשפחה"),
    ("שווי נכס משוער לצורך דוגמה", money(1750000)),
], y, 30)
y -= 14
y = paragraph(c, "מקור הנתונים הוא הצהרת משפחה סינתטית. אין כאן תלוש שכר, אישור מעסיק, תדפיס בנק או שמאות. ההוצאות אינן כוללות את המשכנתא, כדי למנוע ספירה כפולה.", y, size=10.2, leading=15)
finish(c)

c = base("review.pdf", "בדיקת היתכנות לדוגמה", "ממצאים והשוואה היפותטית - יועץ משכנתאות לדוגמה", 3)
y = metric(c, money(DELTA), "פער חודשי מחושב בתרחיש - לפני עלויות חד פעמיות", HEIGHT - 225)
y = section(c, "השוואה על אותה קרן ואותה תקופה", y)
# Explicit column headings, right-to-left reading order.
text(c, RIGHT - 10, y + 2, "נתון", 10.5, MUTED, True)
text(c, RIGHT - 240, y + 2, "מצב קיים", 10.5, MUTED, True)
text(c, LEFT + 94, y + 2, "חלופה להמחשה", 10.5, MUTED, True)
y -= 17
for i, (label, current, proposed) in enumerate([
    ("יתרת קרן", money(PRINCIPAL), money(PRINCIPAL)),
    ("יתרת תקופה", "240 חודשים", "240 חודשים"),
    ("ריבית שנתית נומינלית", "5.40%", "4.70%"),
    ("החזר חודשי", money(CURRENT), money(PROPOSED)),
    ("סך תשלומי ההלוואה", money(CURRENT * MONTHS), money(PROPOSED * MONTHS)),
]):
    if i % 2 == 0:
        c.setFillColor(WHITE)
        c.roundRect(LEFT, y - 22, RIGHT - LEFT, 31, 3, fill=1, stroke=0)
    text(c, RIGHT - 10, y - 12, label, 10.2, MUTED)
    text(c, RIGHT - 240, y - 12, current, 10.5, INK, True)
    text(c, LEFT + 94, y - 12, proposed, 10.5, INK, True)
    y -= 31
y -= 9
y = rows(c, [
    ("עלות מחזור משוערת בדוגמה", money(COST)),
    ("פער מצטבר לפני עלות מחזור", money(GROSS)),
    ("פער מצטבר נטו, לאחר העלות", money(NET)),
    ("איזון עלות מול פער חודשי", f"כ-{math.ceil(COST / DELTA)} חודשים"),
], y, 29, label_width=265)
y -= 13
y = paragraph(c, "הממצא להדגמה: כדאי לבדוק הצעה אמיתית באותה תקופה, ללא הארכת חיי ההלוואה. הריבית החלופית הומצאה לצורך התרגיל ואינה הצעה של בנק או הבטחת חיסכון.", y, size=10.2, leading=15)
y -= 7
y = paragraph(c, "לפני המלצה: נדרשים דוח סילוק עדכני, אימות עמלת הפירעון וההוצאות, הצעת בנק כתובה ובדיקת תנאי אשראי ובטוחות. כל הסכומים חושבו לפני עיגול לאגורות; הפרשי עיגול קטנים צפויים.", y, size=10.2, leading=15)
finish(c)

print(json.dumps({
    "files": [str(OUT / name) for name in ("balance.pdf", "income.pdf", "review.pdf")],
    "currentMonthly": round(CURRENT, 2), "proposedMonthly": round(PROPOSED, 2),
    "monthlyDifference": round(DELTA, 2), "grossDifference": round(GROSS, 2),
    "netDifference": round(NET, 2), "breakEvenMonths": math.ceil(COST / DELTA),
    "currentTotal": round(CURRENT * MONTHS, 2),
    "alternativeIncludingCosts": round(PROPOSED * MONTHS + COST, 2),
}, ensure_ascii=False, indent=2))

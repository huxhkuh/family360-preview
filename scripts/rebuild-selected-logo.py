"""Rebuild the selected transparent logo from SVG geometry and traced outlines.

Standard library only. No raster embedding, external fonts, filters, or remote
resources. Grain consists of small vector circles, clipped by the tile paths.
"""
from pathlib import Path
import json
import random
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "public/brand"
OUT = BRAND / "mesudarim-360"
OUT.mkdir(parents=True, exist_ok=True)
LETTERING = json.loads((ROOT / "scripts/brand/lettering.json").read_text(encoding="utf-8"))

# Recovered from the large lockup in the supplied board. Circular inner edges
# share centre (52,56), radius 33.5. The four tiles keep the reference's offsets.
TILES = [
    ("primary", "M0 57V28Q0 14 14 14H45V23.24A33.5 33.5 0 0 0 18.515 57Z"),
    ("copper", "M51 0H87Q101 0 101 14V46H83.973A33.5 33.5 0 0 0 51 22.515Z"),
    ("copper", "M7 64H19.469A33.5 33.5 0 0 0 51 89.485V108H21Q7 108 7 94Z"),
    ("primary", "M108 51V85Q108 100 94 100H58V88.958A33.5 33.5 0 0 0 85.125 51Z"),
]
MODES = {
    "on-light": ("#092F27", "#05251E", "#011711"),
    "on-dark": ("#FFF4E1", "#F5E8D3", "#DFCEB6"),
    "mono-forest": ("#062B22",) * 3,
    "mono-white": ("#FFFFFF",) * 3,
}

def definitions(mode):
    if mode.startswith("mono"):
        return ""
    first, mid, last = MODES[mode]
    rng = random.Random(360)
    dots = []
    for i in range(900):
        x, y, r = rng.uniform(0.3, 23.7), rng.uniform(0.3, 23.7), rng.uniform(0.055, 0.21)
        fill = "#FFF4DF" if i % 3 else "#5B2A12"
        opacity = rng.uniform(0.10, 0.27) if i % 3 else rng.uniform(0.07, 0.17)
        dots.append(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="{r:.3f}" fill="{fill}" opacity="{opacity:.3f}"/>')
    return (
        '<defs>'
        f'<linearGradient id="primary" x1="0" y1="0" x2="1" y2="1">'
        f'<stop stop-color="{first}"/><stop offset=".52" stop-color="{mid}"/><stop offset="1" stop-color="{last}"/></linearGradient>'
        '<linearGradient id="copper" x1="0" y1="0" x2="1" y2="1">'
        '<stop stop-color="#F0B77D"/><stop offset=".32" stop-color="#DC965F"/>'
        '<stop offset=".69" stop-color="#BC713F"/><stop offset="1" stop-color="#9D502A"/></linearGradient>'
        '<linearGradient id="tagline" x1="0" y1="0" x2="1" y2=".2">'
        '<stop stop-color="#B67143"/><stop offset=".52" stop-color="#E6A16B"/><stop offset="1" stop-color="#C9814B"/></linearGradient>'
        '<pattern id="grain" width="24" height="24" patternUnits="userSpaceOnUse">'
        + "".join(dots) + '</pattern></defs>'
    )

def symbol(mode):
    mono = mode.startswith("mono")
    shapes = []
    for material, d in TILES:
        fill = MODES[mode][0] if mono else f"url(#{material})"
        shapes.append(f'<path d="{d}" fill="{fill}"/>')
        if not mono:
            # Filling the same silhouette guarantees no grain leaks into the
            # circular opening or the transparent canvas.
            opacity = "1" if material == "copper" else ".34"
            shapes.append(f'<path d="{d}" fill="url(#grain)" opacity="{opacity}"/>')
    return '<g id="symbol">' + "".join(shapes) + '</g>'

def lettering(name, fill):
    data = LETTERING[name]
    paths = "".join(
        f'<path d="{p["d"]}" transform="{p["transform"]}"/>'
        for p in data["paths"]
    )
    return (
        f'<g id="{name}" fill="{fill}" transform="translate({data["x"]-76} {data["y"]-100})">'
        f'<g transform="scale({1/data["scale"]})">{paths}</g></g>'
    )

def svg(mode, mark=False):
    mono = mode.startswith("mono")
    title = "מסודרים 360" if mark else "מסודרים 360 — עושים לך סדר בכסף."
    desc = "שחזור וקטורי מהתמונה שאושרה. רקע שקוף; הכיתוב בקווי מתאר."
    if not mono:
        desc += " גרדיאנטים ומרקם גרעיני מצורות וקטוריות."
    if mark:
        viewbox = "0 0 120 120"
        body = f'<g transform="translate(6 6)">{symbol(mode)}</g>'
    else:
        viewbox = "0 0 320 242"
        primary = MODES[mode][0] if mono else "url(#primary)"
        accent = MODES[mode][0] if mono else "url(#tagline)"
        # All elements keep the source composition; no cropping of the source.
        body = (
            '<g transform="translate(26.25 10) scale(1.25)">'
            f'<g transform="translate(51 0)">{symbol(mode)}</g>'
            f'{lettering("name", primary)}{lettering("tagline", accent)}</g>'
        )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" aria-labelledby="title description">'
        f'<title id="title">{title}</title><desc id="description">{desc}</desc>'
        f'{definitions(mode)}{body}</svg>\n'
    )

for mode in MODES:
    for mark in [False, True]:
        suffix = "-symbol" if mark else ""
        (OUT / f"mesudarim-360-{mode}{suffix}.svg").write_text(svg(mode, mark), encoding="utf-8")

# Keep existing application URLs and variant selection stable.
for app_mode, export_mode in {"light": "on-light", "dark": "on-dark", "mono": "mono-forest"}.items():
    for mark in [False, True]:
        source = OUT / f'mesudarim-360-{export_mode}{"-symbol" if mark else ""}.svg'
        shutil.copyfile(source, BRAND / f'concept-5-{app_mode}{"-mark" if mark else ""}.svg')

readme = """# מסודרים 360 — קובצי לוגו

כל קובצי ה־SVG שקופים ועצמאיים. אין בהם תמונת רסטר מוטמעת,
פונט חיצוני או תלות ברשת. הכיתוב הומר לקווי מתאר.

- on-light: לרקע לבן, שמנת ורקע בהיר; ירוק עמוק ונחושת.
- on-dark: לרקע ירוק כהה, שחור ורקע כהה; שמנת ונחושת.
- mono-forest: גרסה בצבע ירוק אחד לרקע בהיר, ללא מרקם.
- mono-white: גרסה לבנה בצבע אחד לרקע כהה, ללא מרקם.
- קבצים ששמם מסתיים ב־symbol מכילים רק את הסמל.

הגרסאות הצבעוניות כוללות גרדיאנטים ומרקם עדין המורכב מעיגולים
וקטוריים קטנים, ללא פילטרי רסטר. ניתן לשנות את המילויים בתוכנת וקטור.
לסמל זעיר (כגון אייקון) או להפקה בצבע אחד, השתמשו בגרסה החד־צבעית.
בלוגו המלא מומלץ רוחב 220 פיקסלים ומעלה כדי שהסלוגן יהיה קריא.
לאישור דפוס מקצועי יש לבצע בדיקת צבע והגהה אצל בית הדפוס.

זהו שחזור מהתמונה שסופקה, ולא קובץ המקור של המעצב.
צורת הסמל והכיתוב שוחזרו; הגרדיאנט והמרקם נבנו מחדש.
הפרטים הזעירים מוגבלים ברמת הדיוק של התמונה המקורית (512×384).
"""
(OUT / "README.md").write_text(readme, encoding="utf-8")
with zipfile.ZipFile(BRAND / "mesudarim-360-svg-kit.zip", "w", zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(OUT.glob("*")):
        if file.suffix in [".svg", ".md"]:
            archive.write(file, f"mesudarim-360/{file.name}")
print(f"Exported 8 transparent vector assets + ZIP to {OUT}")

"""Build original Mesudarim 360 SVG concepts with self-contained outlined type.

Run from repository root with Python + fontTools. Runtime uses only generated SVGs.
Assistant is distributed under the SIL Open Font License (copied beside exports).
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from xml.sax.saxutils import escape
import shutil
from functools import lru_cache

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/brand"
OUT.mkdir(parents=True, exist_ok=True)
FONT = ROOT / "node_modules/@fontsource-variable/assistant"

@lru_cache
def load_font(subset, weight):
    return instantiateVariableFont(TTFont(FONT / f"files/assistant-{subset}-wght-normal.woff2"), {"wght": weight}, inplace=True)

def word(text, subset, x, y, width, height, fill, weight=800):
    font = load_font(subset, weight)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    result, advance = [], 0
    for char in text:
        char_font = font if ord(char) in cmap else load_font("latin", weight)
        char_glyphs = char_font.getGlyphSet()
        name = char_font.getBestCmap()[ord(char)]
        pen = SVGPathPen(char_glyphs)
        char_glyphs[name].draw(pen)
        result.append(f'<path transform="translate({advance} 0)" d="{pen.getCommands()}"/>')
        advance += char_glyphs[name].width
    scale = width / advance
    return f'<g fill="{fill}" transform="translate({x} {y+height}) scale({scale} {-scale})">{"".join(result)}</g>'

# Each mark has a deliberately different silhouette and a shared 64 × 64 grid.
# p = primary ink, a = accent ink.
MARKS = [
    # Six ordered tiles: a family resemblance to Mesudarim, with a new enclosing corner.
    '<path d="M6 21V6h52v15" fill="none" stroke="{a}" stroke-width="4"/>'
    '<path d="M7 44h14v14H7zm18 0h14v14H25zm18 0h14v14H43zM25 26h14v14H25zm18 0h14v14H43zm0-18h14v14H43z" fill="{p}"/>',
    # A picture formed by four asymmetric corners; a copper centre completes it.
    '<path d="M5 27V5h22v8H13v14zm32-22h22v22h-8V13H37zM59 37v22H37v-8h14V37zM27 59H5V37h8v14h14z" fill="{p}"/>'
    '<path d="M22 22h20v20H22z" fill="{a}"/>',
    # Continuous architectural ribbon: three ordered levels, no disconnected tiles.
    '<path d="M8 56V36h16V20h16V4h16v52H8" fill="none" stroke="{p}" stroke-width="7" stroke-linejoin="miter"/>'
    '<path d="M24 56V36h16V20h16" fill="none" stroke="{a}" stroke-width="7"/>',
    # Two interlocked open arches: a human partnership, shelter and continuity.
    '<path d="M7 51V25a17 17 0 0 1 34 0v14H29V25a5 5 0 0 0-10 0v26z" fill="{p}"/>'
    '<path d="M57 13v26a17 17 0 0 1-34 0V25h12v14a5 5 0 0 0 10 0V13z" fill="{a}"/>',
    # Chosen direction: open ring and three stepped tiles, refined from the
    # supplied reference. Separate rounded copper segment at the upper right.
    '<path d="M23.4495 8.5077 A25 25 0 1 0 55.4923 40.5505" fill="none" stroke="{p}" stroke-width="10" stroke-linecap="round"/>'
    '<path d="M40.5505 8.5077 A25 25 0 0 1 55.4923 23.4495" fill="none" stroke="{a}" stroke-width="10" stroke-linecap="round"/>'
    # Group bounds [20,44] × [20.5,43.5] share the ring centre (32,32).
    '<g fill="{p}"><rect x="34" y="20.5" width="10" height="10" rx="1.8"/>'
    '<rect x="34" y="33.5" width="10" height="10" rx="1.8"/>'
    '<rect x="20" y="33.5" width="10" height="10" rx="1.8"/></g>',
]
NAMES = ["מדרגות לתמונה מלאה", "התמונה השלמה", "דרך של ביטחון", "חיבור משפחתי", "מבט 360"]
for i, (mark, name) in enumerate(zip(MARKS, NAMES), 1):
    for mode, primary, accent in [
        ("light", "#031E1A", "#A7653B"),
        ("dark", "#F9ECE0", "#D8A16E"),
        ("mono", "#031E1A", "#031E1A"),
    ]:
        symbol = mark.format(p=primary, a=accent)
        title = escape(f"מסודרים 360 — {name}")
        (OUT / f"concept-{i}-{mode}-mark.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img"><title>{title}</title>{symbol}</svg>', encoding="utf-8")
        name_paths = word("מסודרים"[::-1], "hebrew", 78, 12, 157, 40, primary)
        number_paths = word("360", "latin", 0, 12, 65, 40, primary)
        if i == 5:
            name_paths = word("מסודרים"[::-1], "hebrew", 104, 140, 200, 45, primary)
            number_paths = word("360", "latin", 16, 140, 75, 45, primary)
            tagline = word("עושים לך סדר בכסף."[::-1], "hebrew", 54, 200, 212, 22, accent, 600)
            (OUT / f"concept-{i}-{mode}.svg").write_text(
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 242" role="img"><title>{title} — עושים לך סדר בכסף.</title>'
                f'<g transform="translate(96 4) scale(2)">{symbol}</g>{name_paths}{number_paths}{tagline}</svg>', encoding="utf-8")
            continue
        (OUT / f"concept-{i}-{mode}.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 76" role="img"><title>{title}</title>'
            f'{name_paths}{number_paths}<path d="M78 65h157" stroke="{accent}" stroke-width="2"/>'
            f'<g transform="translate(252 6)">{symbol}</g></svg>', encoding="utf-8")
for license_file in [FONT / "LICENSE", FONT / "OFL.txt"]:
    if license_file.exists():
        shutil.copyfile(license_file, OUT / "Assistant-OFL.txt")
        break
print(f"Exported five concepts, three colour modes, logo + mark to {OUT}")

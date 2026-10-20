"""Build four vector concepts and wrappers preserving the approved logo artwork.

Run from repository root with Python + fontTools. Runtime uses only generated SVGs.
Assistant is distributed under the SIL Open Font License (copied beside exports).
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from xml.sax.saxutils import escape
import shutil
import base64
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
    # Final user reference: four offset corner tiles around a circular opening.
    # The hole is transparent, so it takes on the actual page background.
    '<defs><mask id="centre" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">'
    '<rect width="64" height="64" fill="white"/><circle cx="32" cy="32" r="18" fill="black"/></mask></defs>'
    '<g mask="url(#centre)">'
    '<path d="M3 34V18Q3 11 10 11H28V34Z M61 30V46Q61 53 54 53H36V30Z" fill="{p}"/>'
    '<path d="M31 3H50Q57 3 57 10V28H31Z M33 61H14Q7 61 7 54V36H33Z" fill="{a}"/>'
    '</g>',
]
NAMES = ["מדרגות לתמונה מלאה", "התמונה השלמה", "דרך של ביטחון", "חיבור משפחתי", "מבט 360"]
for i, (mark, name) in enumerate(zip(MARKS, NAMES), 1):
    for mode, primary, accent in [
        ("light", "#031E1A", "#A7653B"),
        ("dark", "#F9ECE0", "#D8A16E"),
        ("mono", "#031E1A", "#031E1A"),
    ]:
        if i == 5:
            # Preserve the approved artwork byte-for-byte. SVG only selects the
            # relevant region of the supplied presentation; it does not redraw,
            # retouch, remove texture, recolour, or regenerate its typography.
            source = base64.b64encode((OUT / "approved-logo-board.png").read_bytes()).decode("ascii")
            crops = {
                "dark": ("55 92 250 190", "125 98 112 112"),
                "light": ("343 44 166 126.16", "394 54 66 66"),
                "mono": ("343 235 166 126.16", "397 246 62 62"),
            }
            for mark_only in [False, True]:
                viewbox = crops[mode][int(mark_only)]
                suffix = "-mark" if mark_only else ""
                title = "מסודרים 360 — עושים לך סדר בכסף."
                (OUT / f"concept-5-{mode}{suffix}.svg").write_text(
                    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img">'
                    f'<title>{title}</title><image width="512" height="384" href="data:image/png;base64,{source}"/></svg>',
                    encoding="utf-8")
            continue
        symbol = mark.format(p=primary, a=accent)
        title = escape(f"מסודרים 360 — {name}")
        (OUT / f"concept-{i}-{mode}-mark.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img"><title>{title}</title>{symbol}</svg>', encoding="utf-8")
        name_paths = word("מסודרים"[::-1], "hebrew", 78, 12, 157, 40, primary)
        number_paths = word("360", "latin", 0, 12, 65, 40, primary)
        (OUT / f"concept-{i}-{mode}.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 76" role="img"><title>{title}</title>'
            f'{name_paths}{number_paths}<path d="M78 65h157" stroke="{accent}" stroke-width="2"/>'
            f'<g transform="translate(252 6)">{symbol}</g></svg>', encoding="utf-8")
for license_file in [FONT / "LICENSE", FONT / "OFL.txt"]:
    if license_file.exists():
        shutil.copyfile(license_file, OUT / "Assistant-OFL.txt")
        break
print(f"Exported five concepts, three colour modes, logo + mark to {OUT}")

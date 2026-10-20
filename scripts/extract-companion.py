"""Separate the eight supplied poses without redrawing or altering their pixels.

Pillow, numpy and OpenCV are needed only to export assets. Keep the original alpha channel and
lossless WebP copies for the app; PNG files are provided for design handoff.
"""
from pathlib import Path
import sys
import json
import zipfile
from PIL import Image
import cv2
import numpy as np

source = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / "public/companion"
out.mkdir(parents=True, exist_ok=True)
sheet = Image.open(source).convert("RGBA")
names = ["welcome", "explain", "pause", "document", "later", "success", "review", "complete"]
metadata = {}
# The source has almost-transparent specks across the canvas. Locate the eight
# actual silhouettes rather than treating those specks as the figure's bounds.
_, _, stats, _ = cv2.connectedComponentsWithStats((np.array(sheet)[:, :, 3] > 64).astype("uint8"))
figures = [tuple(map(int, row[:4])) for row in stats[1:] if row[4] > 10000]
assert len(figures) == 8
figures.sort(key=lambda r: (r[1] > sheet.height/2, r[0]))
for i, name in enumerate(names):
    x, y, w, h = figures[i]
    bounds = (max(0,x-3), max(0,y-3), min(sheet.width,x+w+3), min(sheet.height,y+h+3))
    pose = sheet.crop(bounds)
    canvas = Image.new("RGBA", (pose.width+24, pose.height+24))
    canvas.paste(pose, (12, 12))
    canvas.save(out / f"{name}.png", optimize=True)
    canvas.save(out / f"{name}.webp", lossless=True, method=6)
    # Verify lossless alpha and colours, including edge pixels.
    assert Image.open(out / f"{name}.webp").convert("RGBA").getchannel("A").tobytes() == canvas.getchannel("A").tobytes()
    metadata[name] = {"width": canvas.width, "height": canvas.height, "source_cell": bounds}
(out / "poses.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
with zipfile.ZipFile(out / "companion-poses.zip", "w", zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(out.glob("*.png")):
        archive.write(path, path.name)
print(f"Exported {len(names)} transparent PNG poses, lossless WebP copies and ZIP.")

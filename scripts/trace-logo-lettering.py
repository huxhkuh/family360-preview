"""One-time outline recovery from the user's small reference, not a font swap.

Requires OpenCV, numpy and vtracer only when retracing. The reviewed SVG paths
are committed separately; rebuilding the delivered logos needs none of these.
"""
from pathlib import Path
import hashlib
import json
import cv2
import numpy as np
import vtracer
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
source = ROOT / "public/brand/approved-logo-board.png"
image = cv2.imdecode(np.frombuffer(source.read_bytes(), np.uint8), cv2.IMREAD_COLOR)
outlines = {}
for name, (x, y, w, h) in {
    "name": (76, 218, 214, 37),
    "tagline": (101, 260, 172, 20),
}.items():
    crop = image[y:y+h, x:x+w].astype(np.float32)
    # Separate cream lettering / copper lettering from the dark green board.
    # Interpolating coverage before thresholding avoids tracing pixel staircases.
    coverage = crop[:, :, 2] if name == "name" else crop[:, :, 2] - crop[:, :, 0]
    coverage = cv2.resize(coverage, None, fx=8, fy=8, interpolation=cv2.INTER_CUBIC)
    threshold = 135 if name == "name" else 72
    mask = np.where(coverage > threshold, 0, 255).astype(np.uint8)
    ok, encoded = cv2.imencode(".png", mask)
    assert ok
    traced = vtracer.convert_raw_image_to_svg(
        encoded.tobytes(), img_format="png", colormode="binary", mode="spline",
        filter_speckle=12, corner_threshold=70, length_threshold=3.5,
        max_iterations=10, splice_threshold=45, path_precision=3,
    )
    tree = ET.fromstring(traced)
    paths = [{"d": p.attrib["d"], "transform": p.attrib.get("transform", "")}
             for p in tree.iter("{http://www.w3.org/2000/svg}path")]
    outlines[name] = {"x": x, "y": y, "scale": 8, "paths": paths}
outlines["source_sha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
outlines["note"] = "Recovered outlines, manually reviewed. Fine details are approximate at this source resolution."
target = ROOT / "scripts/brand/lettering.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(outlines, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Recovered {sum(len(outlines[n]['paths']) for n in ['name','tagline'])} outlines to {target}")

#!/usr/bin/env python3
"""Verify dimensions and optimize a captured GCP Console screenshot PNG."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
from PIL import Image


def process_image(path: Path, max_width: int) -> int:
    if not path.exists():
        print(f"ERROR: File not found: {path}", file=sys.stderr)
        return 1

    before_bytes = path.stat().st_size
    with Image.open(path) as img:
        orig_w, orig_h = img.size
        ratio = orig_w / orig_h if orig_h else 0

        # Downscale oversized Retina captures (e.g., 2560x1600 -> 1280x800) for fast GitHub Pages loading
        if orig_w > max_width:
            new_h = round(orig_h * (max_width / orig_w))
            img = img.resize((max_width, new_h), Image.Resampling.LANCZOS)

        # Strip metadata (EXIF / tEXt chunks) and save optimized PNG
        clean = Image.new("RGBA" if img.mode == "RGBA" else "RGB", img.size)
        clean.paste(img)
        clean.save(path, format="PNG", optimize=True)
        final_w, final_h = clean.size

    after_bytes = path.stat().st_size
    print(
        f"OK: {path} | {orig_w}x{orig_h} -> {final_w}x{final_h} "
        f"(aspect {ratio:.2f}) | {before_bytes/1024:.1f} KB -> {after_bytes/1024:.1f} KB"
    )

    if final_w < 900 or final_h < 500:
        print("WARN: Image looks unexpectedly small for a 1280x800 Console capture.", file=sys.stderr)
    if ratio < 1.3 or ratio > 1.9:
        print("WARN: Aspect ratio deviates from 16:10 (1.60). Check viewport size.", file=sys.stderr)

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify & optimize GCP Console screenshots")
    parser.add_argument("files", nargs="+", type=Path, help="PNG screenshot file(s)")
    parser.add_argument("--max-width", type=int, default=1440, help="Max width in px (default: 1440)")
    args = parser.parse_args()

    rc = 0
    for f in args.files:
        rc |= process_image(f, args.max_width)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

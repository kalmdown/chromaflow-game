#!/usr/bin/env python3
"""Regenerate the PWA icon PNGs from the favicon geometry.

The rest of the game ships zero image assets — everything is CSS and inline
SVG — but installable PWAs need real PNGs: iOS ignores SVG apple-touch-icons,
and Android's maskable icon needs its own padded variant. Rather than pull in
a native image dependency for four small files, this rasterises the same
rounded-rect design as public/favicon.svg using nothing but the standard
library, and is run by hand when the icon changes.

    python3 scripts/generate-icons.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "public"

# Supersampling factor per axis; 4 means 16 samples per output pixel.
SS = 4

# The design, in the 64-unit coordinate space of public/favicon.svg.
VIEWBOX = 64.0
BG = (0x08, 0x0D, 0x1C)
CORNER_RADIUS = 14.0
TILES = (
    # x, y, w, h, r, colour
    (8.0, 8.0, 22.0, 22.0, 6.0, (0x4F, 0xE0, 0xCF)),
    (34.0, 8.0, 22.0, 22.0, 6.0, (0x7C, 0x8C, 0xFF)),
    (8.0, 34.0, 22.0, 22.0, 6.0, (0xF2, 0x50, 0x6E)),
    (34.0, 34.0, 22.0, 22.0, 6.0, (0xFF, 0xB0, 0x2E)),
)
# The origin marker: the background at 50% over the first tile's colour.
DOT_CENTRE = (19.0, 19.0)
DOT_RADIUS = 5.0
DOT_COLOUR = tuple(round(0.5 * BG[i] + 0.5 * TILES[0][5][i]) for i in range(3))


def in_rounded_rect(px: float, py: float, x: float, y: float, w: float, h: float, r: float) -> bool:
    """True when (px, py) falls inside the rounded rectangle."""
    if px < x or px > x + w or py < y or py > y + h:
        return False
    # Nearest point of the inner (un-rounded) rect; zero offset unless we are
    # in one of the four corner regions.
    cx = min(max(px, x + r), x + w - r)
    cy = min(max(py, y + r), y + h - r)
    dx, dy = px - cx, py - cy
    return dx * dx + dy * dy <= r * r


def sample(px: float, py: float, content_scale: float, round_outer: bool) -> tuple[int, int, int] | None:
    """Colour at a point in viewbox space, or None for transparent/outside."""
    if round_outer and not in_rounded_rect(px, py, 0.0, 0.0, VIEWBOX, VIEWBOX, CORNER_RADIUS):
        return None

    # Scale the artwork about the centre without moving the background, so the
    # maskable variant keeps its content inside Android's safe zone.
    half = VIEWBOX / 2.0
    ax = (px - half) / content_scale + half
    ay = (py - half) / content_scale + half

    dx, dy = ax - DOT_CENTRE[0], ay - DOT_CENTRE[1]
    if dx * dx + dy * dy <= DOT_RADIUS * DOT_RADIUS:
        return DOT_COLOUR

    for x, y, w, h, r, colour in TILES:
        if in_rounded_rect(ax, ay, x, y, w, h, r):
            return colour

    return BG


def render(size: int, content_scale: float = 1.0, round_outer: bool = True) -> bytes:
    """Render to RGBA bytes, supersampled SS x SS per output pixel."""
    unit = VIEWBOX / (size * SS)
    offset = unit / 2.0
    rows = bytearray()
    samples = SS * SS

    for oy in range(size):
        row = bytearray()
        for ox in range(size):
            r = g = b = a = 0
            for sy in range(SS):
                py = (oy * SS + sy) * unit + offset
                for sx in range(SS):
                    px = (ox * SS + sx) * unit + offset
                    hit = sample(px, py, content_scale, round_outer)
                    if hit is not None:
                        r += hit[0]
                        g += hit[1]
                        b += hit[2]
                        a += 255
            if a == 0:
                row += b"\x00\x00\x00\x00"
            else:
                # Un-premultiply: average colour over the covered samples only,
                # so edge pixels blend toward the shape rather than toward black.
                covered = a // 255
                row += bytes((r // covered, g // covered, b // covered, a // samples))
        rows += b"\x00" + row
    return bytes(rows)


def write_png(path: Path, size: int, rgba: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(rgba, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def main() -> None:
    # Rounded corners for the manifest's "any" icons, which are drawn as-is.
    # Full-bleed squares for the platform-masked ones: iOS clips the
    # apple-touch-icon itself, and Android clips the maskable icon to whatever
    # shape the launcher uses, so a second rounding would show as a dark rim.
    targets = [
        ("icon-192.png", 192, 1.0, True),
        ("icon-512.png", 512, 1.0, True),
        ("icon-maskable-512.png", 512, 0.68, False),
        ("apple-touch-icon.png", 180, 0.88, False),
    ]
    for name, size, scale, round_outer in targets:
        path = OUT_DIR / name
        write_png(path, size, render(size, scale, round_outer))
        print(f"{name}: {size}x{size}, {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()

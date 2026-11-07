#!/usr/bin/env python3
"""Paints every illustration and texture in public/images/book.

The artwork is generated, not drawn from any book: each shape is laid down as
dozens of translucent, randomly deformed polygons (the way a wet wash spreads),
then pigment pools at the edges and settles into the paper grain. Runs are
seeded, so the output is repeatable.

  python scripts/paint-watercolors.py        # needs numpy, pillow, scipy
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, label, binary_erosion

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/images/book"
OUT.mkdir(parents=True, exist_ok=True)

SKY = (122, 169, 205)
SKY_DEEP = (74, 124, 170)
SKY_PALE = (176, 208, 228)
CREAM = (232, 214, 170)
OCHRE = (205, 170, 96)
GOLD = (178, 138, 62)
NAVY = (31, 42, 68)
INDIGO = (52, 72, 116)


def densify(points, step):
    """Subdivides long edges so the deformation stays a wobble, not a tear."""
    out = []
    pts = list(points)
    for a, b in zip(pts, pts[1:] + pts[:1]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / step))
        out += [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n)]
    return out


def deform(points, rng, depth, spread):
    pts = np.asarray(points, float)
    for _ in range(depth):
        nxt = np.roll(pts, -1, axis=0)
        edge = nxt - pts
        length = np.hypot(edge[:, 0], edge[:, 1])
        normal = np.stack([edge[:, 1], -edge[:, 0]], axis=1)
        mid = (pts + nxt) / 2 + edge * rng.normal(0, 0.12, (len(pts), 1))
        mid += normal * rng.normal(0, spread, (len(pts), 1))
        mid += rng.normal(0, 1, mid.shape) * length[:, None] * 0.03
        out = np.empty((len(pts) * 2, 2))
        out[0::2], out[1::2] = pts, mid
        pts = out
    return pts


def noise(shape, rng, sigma):
    n = gaussian_filter(rng.random(shape), sigma, mode="wrap")
    return (n - n.min()) / (np.ptp(n) + 1e-9)


def wash(size, polys, seed, layers=46, spread=0.34, edge=1.0, grain=0.2, step=None):
    """Returns pigment density in 0..1 for one or more base polygons."""
    w, h = size
    rng = np.random.default_rng(seed)
    total = np.zeros((h, w), float)
    step = step or min(w, h) / 12
    for poly in polys:
        base = deform(densify(poly, step), rng, 2, spread)
        acc = np.zeros((h, w), float)
        for _ in range(layers):
            layer = Image.new("L", size, 0)
            shape = deform(base, rng, 2, spread)
            ImageDraw.Draw(layer).polygon([tuple(p) for p in shape], fill=255)
            acc += np.asarray(layer, float) / 255
        acc /= layers
        total = np.maximum(total, acc) + 0.25 * np.minimum(total, acc)
    density = np.clip(gaussian_filter(total, min(w, h) / 220), 0, 1) ** 1.25
    # Pools of pigment and pale blooms where the water sat.
    density *= 0.62 + 0.62 * noise((h, w), rng, min(w, h) / 9)
    # Hard, dark drying line at the edge of the wet area.
    soft = gaussian_filter(density, max(2.0, min(w, h) / 90))
    density = density + edge * np.clip(density - soft, 0, 1) * 1.5
    # Granulation: pigment settling into the tooth of the paper.
    tooth = gaussian_filter(rng.random((h, w)), 0.8)
    tooth = (tooth - tooth.mean()) / (tooth.std() + 1e-9)
    density *= 1 + tooth * grain * 0.35
    return np.clip(gaussian_filter(density, 0.6), 0, 1)


def tint(density, pigments, seed, alpha=1.0):
    h, w = density.shape
    rng = np.random.default_rng(seed + 991)
    mix = noise((h, w), rng, min(w, h) / 6)[..., None]
    a, b = (np.array(p, float) for p in pigments)
    rgb = a * (1 - mix) + b * mix
    return np.dstack([rgb, np.clip(density * alpha, 0, 1) * 255]).astype(np.uint8)


def over(base, top):
    ta, ba = top[..., 3:] / 255.0, base[..., 3:] / 255.0
    oa = ta + ba * (1 - ta)
    rgb = (top[..., :3] * ta + base[..., :3] * ba * (1 - ta)) / np.maximum(oa, 1e-6)
    return np.dstack([rgb, oa * 255]).astype(np.uint8)


def save(rgba, name, quality=72):
    Image.fromarray(rgba).save(OUT / f"{name}.webp", quality=quality, alpha_quality=70, method=6)


def blob(cx, cy, rx, ry, n=12, seed=0, wobble=0.14):
    rng = np.random.default_rng(seed)
    return [
        (cx + rx * math.cos(t) * (1 + rng.normal(0, wobble)), cy + ry * math.sin(t) * (1 + rng.normal(0, wobble)))
        for t in np.linspace(0, 2 * math.pi, n, endpoint=False)
    ]


def paint_washes():
    for i, (name, pig) in enumerate(
        [("wash-a", (SKY, SKY_PALE)), ("wash-b", (SKY_PALE, SKY_DEEP)), ("wash-c", (SKY, CREAM)), ("wash-d", (CREAM, OCHRE))]
    ):
        size = (760, 760)
        polys = [blob(380, 380, 250, 225, seed=i + 3)] + [blob(380 + 120 * math.cos(i * 2 + j * 2), 380 + 110 * math.sin(j * 2.4), 130, 110, seed=j + 20 + i) for j in range(2)]
        save(tint(wash(size, polys, 100 + i, spread=0.62, step=30), pig, 100 + i, 0.8), name, 62)

    size = (1000, 420)
    band = [(40, 210), (200, 90), (520, 70), (830, 100), (970, 220), (800, 340), (500, 360), (190, 330)]
    save(tint(wash(size, [band], 140, spread=0.55, step=30), (SKY_PALE, SKY), 140, 0.7), "wash-band", 60)


def paint_sky_page(name, size, seed, strength=1.0):
    w, h = size
    rng = np.random.default_rng(seed)
    margin = -60
    top = [(margin, margin), (w * 0.5, margin), (w - margin, margin), (w - margin, h * 0.5), (w * 0.7, h * 0.6), (w * 0.35, h * 0.56), (margin, h * 0.66)]
    sky = wash(size, [top], seed, layers=40, spread=0.28, edge=0.5)
    # White of the paper left showing where the clouds are.
    holes = np.zeros((h, w), float)
    for _ in range(6):
        cx, cy = rng.uniform(0, w), rng.uniform(0.08 * h, 0.5 * h)
        polys = [blob(cx + dx, cy + rng.uniform(-14, 14), rng.uniform(70, 150), rng.uniform(32, 62), seed=int(rng.integers(1e6))) for dx in (-90, 0, 90)]
        holes = np.maximum(holes, gaussian_filter(wash(size, polys, int(rng.integers(1e6)), layers=18, spread=0.5, edge=0, grain=0, step=26), 9))
    sky = np.clip(sky * (1 - np.clip(holes * 1.5, 0, 0.92)), 0, 1)
    low = [(margin, h * 0.74), (w * 0.3, h * 0.66), (w * 0.7, h * 0.72), (w - margin, h * 0.64), (w - margin, h - margin), (margin, h - margin)]
    warm = wash(size, [low], seed + 1, layers=30, spread=0.24, edge=0.5)
    paper = np.zeros((h, w, 4), np.uint8)
    paper[..., :3] = (249, 244, 233)
    paper[..., 3] = 255
    return_img = over(over(paper, tint(warm, (CREAM, OCHRE), seed + 1, 0.5 * strength)), tint(sky, (SKY, SKY_DEEP), seed, 0.86 * strength))
    Image.fromarray(return_img[..., :3]).save(OUT / f"{name}.webp", quality=68, method=6)


def crown_points():
    return [(36, 190), (20, 76), (84, 136), (130, 44), (178, 134), (244, 70), (226, 190)]


def paint_motifs():
    size = (264, 232)
    base = tint(wash(size, [crown_points()], 200, layers=30, spread=0.16, grain=0.2, step=14), (OCHRE, GOLD), 200, 0.92)
    band = tint(wash(size, [[(38, 178), (226, 174), (224, 204), (40, 208)]], 201, layers=24, spread=0.16, step=14), (SKY_DEEP, SKY), 201, 0.8)
    save(over(base, band), "crown", 78)

    size = (320, 560)
    body = blob(160, 170, 118, 145, n=14, seed=5, wobble=0.03)
    balloon = tint(wash(size, [body], 210, layers=36, spread=0.3, grain=0.2, step=20), (SKY, SKY_DEEP), 210, 0.92)
    glow = gaussian_filter(wash(size, [blob(120, 118, 42, 58, seed=8)], 211, layers=16, spread=0.3, edge=0, grain=0), 12)
    balloon[..., 3] = (balloon[..., 3] * (1 - np.clip(glow * 1.15, 0, 0.8))).astype(np.uint8)
    knot = tint(wash(size, [[(146, 312), (174, 312), (182, 332), (140, 332)]], 212, layers=18, spread=0.1, step=8), (SKY_DEEP, INDIGO), 212, 0.9)
    img = Image.fromarray(over(balloon, knot))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(213)
    xs = 160 + np.cumsum(rng.normal(0, 1.1, 220)) + 15 * np.sin(np.linspace(0, 8, 220))
    d.line([(float(x), 332 + i) for i, x in enumerate(xs)], fill=(*GOLD, 210), width=2)
    save(np.asarray(img), "balloon", 78)

    for i, (size, xs) in enumerate([((520, 280), [(150, 170, 110, 70), (270, 130, 130, 92), (390, 176, 100, 62)]), ((420, 220), [(130, 130, 100, 58), (260, 110, 110, 70), (320, 150, 72, 42)])]):
        polys = [blob(cx, cy, rx, ry, n=10, seed=30 + i + j) for j, (cx, cy, rx, ry) in enumerate(xs)]
        save(tint(wash(size, polys, 220 + i, layers=30, spread=0.42, edge=0.7, step=18), (SKY_PALE, SKY), 220 + i, 0.72), f"cloud-{i + 1}", 66)

    size = (340, 340)
    outer = blob(170, 170, 128, 128, n=18, seed=2, wobble=0.012)
    moon = wash(size, [outer], 230, layers=26, spread=0.22, grain=0.2, step=16)
    bite = wash(size, [blob(226, 138, 112, 116, n=18, seed=9, wobble=0.012)], 231, layers=10, spread=0.14, edge=0, grain=0, step=16)
    save(tint(np.clip(moon * (1 - np.clip(bite * 1.5, 0, 1)), 0, 1), (CREAM, OCHRE), 230, 0.95), "moon", 74)

    size = (120, 120)
    star = [(60 + (46 if k % 2 == 0 else 15) * math.sin(k * math.pi / 4), 60 - (46 if k % 2 == 0 else 15) * math.cos(k * math.pi / 4)) for k in range(8)]
    save(tint(wash(size, [star], 240, layers=16, spread=0.14, grain=0.2, step=7), (OCHRE, GOLD), 240, 0.95), "star", 74)

    size = (220, 220)
    ring = tint(wash(size, [blob(110, 110, 88, 86, n=14, seed=4, wobble=0.04)], 250, layers=30, spread=0.26, grain=0.12, step=14), (NAVY, INDIGO), 250, 0.9)
    img = Image.fromarray(ring)
    tri = Image.new("L", size, 0)
    ImageDraw.Draw(tri).polygon([(88, 70), (88, 150), (156, 110)], fill=255)
    tri = gaussian_filter(np.asarray(tri, float), 1.4) / 255
    arr = np.asarray(img).copy()
    arr[..., :3] = (arr[..., :3] * (1 - tri[..., None]) + np.array((249, 244, 233)) * tri[..., None]).astype(np.uint8)
    arr[..., 3] = np.maximum(arr[..., 3], (tri * 255).astype(np.uint8))
    save(arr, "play", 80)


def paint_placeholders():
    """Soft stand-ins for photo slots. Swap them in src/config/book.ts."""
    motifs = [
        ("placeholder-1", (600, 720), (SKY_PALE, SKY), "moon"),
        ("placeholder-2", (600, 600), (CREAM, SKY_PALE), "cloud-1"),
        ("placeholder-3", (720, 540), (SKY, SKY_PALE), "balloon"),
        ("placeholder-4", (600, 720), (SKY_PALE, CREAM), "star"),
        ("placeholder-5", (720, 540), (CREAM, OCHRE), "crown"),
        ("placeholder-6", (960, 540), (SKY, SKY_DEEP), "cloud-2"),
    ]
    for i, (name, size, pig, motif) in enumerate(motifs):
        w, h = size
        field = [(-40, -40), (w + 40, -40), (w + 40, h + 40), (-40, h + 40)]
        paper = np.zeros((h, w, 4), np.uint8)
        paper[..., :3] = (244, 238, 224)
        paper[..., 3] = 255
        img = Image.fromarray(over(paper, tint(wash(size, [field], 300 + i, layers=20, spread=0.16, edge=0.2), pig, 300 + i, 0.5)))
        art = Image.open(OUT / f"{motif}.webp").convert("RGBA")
        scale = 0.5 * min(w, h) / max(art.size)
        art = art.resize((int(art.width * scale), int(art.height * scale)), Image.LANCZOS)
        img.alpha_composite(art, ((w - art.width) // 2, (h - art.height) // 2))
        img.convert("RGB").save(OUT / f"{name}.webp", quality=62, method=6)


def paint_paper():
    rng = np.random.default_rng(400)
    s = 512
    fine = gaussian_filter(rng.random((s, s)), 0.7, mode="wrap")
    broad = gaussian_filter(rng.random((s, s)), 14, mode="wrap")
    fibre = gaussian_filter(rng.random((s, s)), (0.5, 7), mode="wrap")
    n = sum((a - a.mean()) / a.std() * k for a, k in ((fine, 1.5), (broad, 0.35), (fibre, 1.0)))
    rgb = np.clip(np.array((249, 244, 233), float)[None, None] + n[..., None] * np.array((1.0, 1.0, 1.15)), 0, 255)
    Image.fromarray(rgb.astype(np.uint8)).save(OUT / "paper.webp", quality=70, method=6)

    # Woven book cloth for the spine and the desk behind the book.
    cloth = np.zeros((256, 256), float)
    cloth += np.sin(np.arange(256) * 2 * math.pi / 4)[None, :] * 3
    cloth += np.sin(np.arange(256) * 2 * math.pi / 4)[:, None] * 3
    cloth += (gaussian_filter(rng.random((256, 256)), 1, mode="wrap") - 0.5) * 60
    rgb = np.clip(np.array(NAVY, float)[None, None] + cloth[..., None], 0, 255)
    Image.fromarray(rgb.astype(np.uint8)).save(OUT / "cloth.webp", quality=66, method=6)


def paint_portraits():
    """Cleans the cutout and gives the close-up a painted edge."""
    cut = np.asarray(Image.open(ROOT / "public/images/zade-cutout.png").convert("RGBA")).copy()
    solid = cut[..., 3] > 128
    labels, _ = label(solid)
    largest = np.argmax(np.bincount(labels[solid]))
    keep = binary_erosion(labels == largest, iterations=2)
    keep = gaussian_filter(keep.astype(float), 1.1)
    cut[..., 3] = (keep * 255).astype(np.uint8)
    im = Image.fromarray(cut)
    im = im.crop(im.getbbox())
    im.thumbnail((720, 1080), Image.LANCZOS)
    im.save(OUT / "zade-cutout.webp", quality=84, alpha_quality=88, method=6)

    src = Image.open(ROOT / "public/images/zade-683.jpg").convert("RGB")
    w, h = src.size
    mask = wash((w, h), [blob(w * 0.5, h * 0.56, w * 0.54, h * 0.6, n=16, seed=6, wobble=0.02)], 500, layers=44, spread=0.5, edge=0, grain=0, step=34)
    # A hard painted mask would look cut out; ramp it so the wash takes over at the edge.
    mask = np.clip((gaussian_filter(mask, 14) - 0.12) * 3, 0, 1)
    # Fade right out before the edge of the photo so its crop never shows.
    ramp = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / (w * 0.07), 0, 1)
    top = np.clip(np.arange(h) / (h * 0.03), 0, 1)
    low = np.clip((h - 1 - np.arange(h)) / (h * 0.12), 0, 1)
    mask *= ramp[None, :] * (top * low)[:, None]
    rgba = np.dstack([np.asarray(src), (mask * 255).astype(np.uint8)])
    Image.fromarray(rgba).save(OUT / "zade-portrait.webp", quality=84, alpha_quality=80, method=6)


if __name__ == "__main__":
    paint_paper()
    paint_washes()
    paint_sky_page("cover-sky", (820, 1120), 600)
    paint_sky_page("endpaper", (820, 1120), 610, 0.72)
    paint_motifs()
    paint_placeholders()
    paint_portraits()

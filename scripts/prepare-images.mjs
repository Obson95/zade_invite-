// One-time helper: resizes the original photos, strips EXIF/GPS metadata,
// and writes WebP + JPEG versions into public/images.
// Requires: npm i -D sharp   (not installed by default to keep Netlify builds lean)
// Usage: node scripts/prepare-images.mjs <family> <zade-closeup> <zade-standing>
import sharp from "sharp";
const [family, zade, standing] = process.argv.slice(2);
const out = "public/images";
const jobs = [
  [family, "family", [480, 576]],
  [zade, "zade", [400, 683]],
  [standing, "zade-standing", [480, 683]],
];
for (const [src, name, widths] of jobs) {
  for (const w of widths) {
    const base = sharp(src).flatten({ background: "#ffffff" }).resize({ width: w, withoutEnlargement: true });
    await base.clone().webp({ quality: 82 }).toFile(`${out}/${name}-${w}.webp`);
    await base.clone().jpeg({ quality: 84, mozjpeg: true }).toFile(`${out}/${name}-${w}.jpg`);
  }
  const meta = await sharp(src).metadata();
  console.log(name, meta.width, "x", meta.height);
}

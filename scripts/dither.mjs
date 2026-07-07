// Build-time Floyd–Steinberg dithering for the e-ink look.
// Reads src/assets/covers/* (+ the profile photo), writes 1-bit black-on-transparent
// PNGs to public/covers/<name>.png. Dark mode inverts them via CSS.
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COVERS_SRC = path.join(root, "src/assets/covers");
const PHOTO_SRC = path.join(root, "src/assets/prof_pic.jpg");
const OUT = path.join(root, "public/covers");
const WIDTH = 240;

async function dither(input, outFile) {
  const { data, info } = await sharp(input)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;

  // grayscale intensity buffer
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = data[i * ch];

  const out = Buffer.alloc(w * h * 4); // RGBA
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = g[i];
      const nw = old < 128 ? 0 : 255;
      const err = old - nw;
      // distribute quantization error (Floyd–Steinberg)
      if (x + 1 < w) g[i + 1] += (err * 7) / 16;
      if (x - 1 >= 0 && y + 1 < h) g[i - 1 + w] += (err * 3) / 16;
      if (y + 1 < h) g[i + w] += (err * 5) / 16;
      if (x + 1 < w && y + 1 < h) g[i + 1 + w] += (err * 1) / 16;

      const o = i * 4;
      if (nw === 0) {
        out[o] = 0;
        out[o + 1] = 0;
        out[o + 2] = 0;
        out[o + 3] = 255; // ink
      } else {
        out[o + 3] = 0; // paper (transparent)
      }
    }
  }

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outFile);
  return path.basename(outFile);
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const jobs = [];

  if (existsSync(COVERS_SRC)) {
    const files = (await readdir(COVERS_SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    for (const f of files) {
      const name = f.replace(/\.[^.]+$/, "") + ".png";
      jobs.push(dither(path.join(COVERS_SRC, f), path.join(OUT, name)));
    }
  }
  if (existsSync(PHOTO_SRC)) {
    jobs.push(dither(PHOTO_SRC, path.join(OUT, "prof_pic.png")));
  }

  const done = await Promise.all(jobs);
  console.log(`[dither] wrote ${done.length} images → public/covers/`);
}

run().catch((e) => {
  console.error("[dither] failed:", e);
  process.exit(1);
});

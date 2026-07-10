// Build-time Floyd–Steinberg dithering for the e-ink look.
// Reads:
//   src/assets/covers/*  -> public/covers/<name>.png   (book covers, small)
//   src/assets/photos/*  -> public/photos/<name>.png   (photos, larger)
//   src/assets/prof_pic  -> public/covers/prof_pic.png
// Output is 1-bit black-on-transparent PNG; dark mode inverts it via CSS.
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COVERS_SRC = path.join(root, "src/assets/covers");
const PHOTOS_SRC = path.join(root, "src/assets/photos");
const PROF_PIC = path.join(root, "src/assets/prof_pic.jpg");
const COVERS_OUT = path.join(root, "public/covers");
const PHOTOS_OUT = path.join(root, "public/photos");

const COVER_WIDTH = 240;
const PHOTO_WIDTH = 1000; // photos are displayed larger, so dither at higher res

const IMAGE_RE = /\.(jpe?g|png|webp|tiff?)$/i;

async function dither(input, outFile, width, opaque = false) {
  const { data, info } = await sharp(input)
    .rotate() // respect EXIF orientation (phone photos)
    .resize({ width, withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;

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
        out[o + 3] = 255; // ink (black, opaque)
      } else if (opaque) {
        // baked paper background — photos stay a positive image so dark mode
        // never inverts them into a negative
        out[o] = 233;
        out[o + 1] = 230;
        out[o + 2] = 221;
        out[o + 3] = 255;
      } else {
        out[o + 3] = 0; // paper (transparent)
      }
    }
  }

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outFile);
}

async function ditherDir(srcDir, outDir, width, opaque = false) {
  if (!existsSync(srcDir)) return 0;
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(srcDir)).filter((f) => IMAGE_RE.test(f));
  await Promise.all(
    files.map((f) =>
      dither(path.join(srcDir, f), path.join(outDir, f.replace(/\.[^.]+$/, "") + ".png"), width, opaque),
    ),
  );
  return files.length;
}

async function run() {
  await mkdir(COVERS_OUT, { recursive: true });

  const covers = await ditherDir(COVERS_SRC, COVERS_OUT, COVER_WIDTH);
  const photos = await ditherDir(PHOTOS_SRC, PHOTOS_OUT, PHOTO_WIDTH, true);

  let profile = 0;
  if (existsSync(PROF_PIC)) {
    await dither(PROF_PIC, path.join(COVERS_OUT, "prof_pic.png"), COVER_WIDTH);
    profile = 1;
  }

  console.log(
    `[dither] ${covers} cover(s), ${photos} photo(s), ${profile} profile image -> public/`,
  );
}

run().catch((e) => {
  console.error("[dither] failed:", e);
  process.exit(1);
});

import { readFile } from "node:fs/promises";
import path from "node:path";

// satori accepts woff (v1) directly. Use the static 400 weight (no variable fvar).
let font: Buffer | null = null;

export async function getSerifFont(): Promise<Buffer> {
  if (font) return font;
  const fontPath = path.resolve(
    "node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff",
  );
  font = await readFile(fontPath);
  return font;
}

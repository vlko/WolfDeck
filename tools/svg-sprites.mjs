// Drawn reference sprites: objects no reference sheet has get their
// "predloha" as a hand-written SVG in tools/sprites-src/<pack>/<name>.svg.
// This renders each one to src/sprites/<name>.webp (trimmed, transparent)
// and merges it into src/sprites/manifest.json, next to the sheet cut-outs.
//
//   node tools/svg-sprites.mjs            every SVG      (npm run svg-sprites)
//   node tools/svg-sprites.mjs mouse tv   just these
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'tools/sprites-src');
const outDir = path.join(root, 'src/sprites');
const MAX_H = 560; // same ceiling as the sheet cut-outs
const only = new Set(process.argv.slice(2));

const files = [];
for (const pack of fs.readdirSync(srcDir, { withFileTypes: true })) {
  if (!pack.isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(srcDir, pack.name))) {
    if (f.endsWith('.svg')) files.push([f.slice(0, -4), path.join(srcDir, pack.name, f)]);
  }
}

const manifestPath = path.join(outDir, 'manifest.json');
// several authors may run this at once — the manifest is read-modify-write
const lock = path.join(root, 'tools/out/.svg-sprites.lock');
fs.mkdirSync(path.dirname(lock), { recursive: true });
for (let i = 0; ; i += 1) {
  try { fs.mkdirSync(lock); break; } catch {
    if (i > 150) { fs.rmSync(lock, { recursive: true, force: true }); continue; }
    await new Promise((r) => { setTimeout(r, 200); });
  }
}
process.on('exit', () => fs.rmSync(lock, { recursive: true, force: true }));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let n = 0;
for (const [name, file] of files) {
  if (only.size && !only.has(name)) continue;
  // render large, trim the transparent margin, then fit the height ceiling
  const trimmed = await sharp(file, { density: 300 }).trim({ threshold: 1 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const k = Math.min(1, MAX_H / meta.height, 900 / meta.width);
  const w = Math.max(1, Math.round(meta.width * k));
  const h = Math.max(1, Math.round(meta.height * k));
  await sharp(trimmed).resize(w, h, { kernel: 'lanczos3' })
    .webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(path.join(outDir, `${name}.webp`));
  manifest[name] = { w, h };
  n += 1;
}
const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
const out = `${JSON.stringify(sorted, null, 1)}\n`;
if (fs.readFileSync(manifestPath, 'utf8') !== out) fs.writeFileSync(manifestPath, out);
console.log(`[svg-sprites] ${n} sprite(s) drawn from tools/sprites-src`);

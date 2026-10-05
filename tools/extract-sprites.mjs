// Cuts the papercraft sprites out of the reference sheets (visual.png,
// city 1.png, city 2.png, office.png, shop.png) into src/sprites/*.webp and
// writes src/sprites/manifest.json ({ name: { w, h } }).
//
//   npm run sprites            # re-extract everything
//   npm run sprites -- --sheet # also write docs/assets/sprites.jpg (contact sheet)
//
// The sheets are white with soft contact shadows. Background is found by two
// flood fills from the image border:
//   strict  — near-white only; never eats into light paper (sheep wool, faces)
//   relaxed — also follows smooth low-saturation gradients, i.e. shadows
// The relaxed result is trusted only in a band at the bottom of each sprite
// (where the shadows are); above it the strict fill decides. Enclosed pure
// white pockets (between well posts, under tables) are punched out too.

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sheets, sheetDefaults, sprites, SHEET_SCALE } from './sprites.config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/sprites');
const wantSheet = process.argv.includes('--sheet');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');

const SHADOW_BAND = 0.2; // bottom fraction of a sprite where shadows live
const DEFAULT_MAX_H = 560;

function flood(img, W, H, accept) {
  const N = W * H;
  const bg = new Uint8Array(N);
  const q = new Int32Array(N);
  let qh = 0;
  let qt = 0;
  const seed = (i) => { if (!bg[i]) { bg[i] = 1; q[qt++] = i; } };
  for (let x = 0; x < W; x += 1) { seed(x); seed((H - 1) * W + x); }
  for (let y = 0; y < H; y += 1) { seed(y * W); seed(y * W + W - 1); }
  while (qh < qt) {
    const i = q[qh++];
    const x = i % W;
    const y = (i / W) | 0;
    if (x > 0 && !bg[i - 1] && accept(i, i - 1)) seed(i - 1);
    if (x < W - 1 && !bg[i + 1] && accept(i, i + 1)) seed(i + 1);
    if (y > 0 && !bg[i - W] && accept(i, i - W)) seed(i - W);
    if (y < H - 1 && !bg[i + W] && accept(i, i + W)) seed(i + W);
  }
  return bg;
}

async function analyseSheet(file) {
  const { data, info } = await sharp(path.join(root, file)).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const N = W * H;
  const lum = new Float32Array(N);
  const sat = new Float32Array(N);
  for (let i = 0; i < N; i += 1) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    lum[i] = (r + g + b) / 3;
    sat[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }
  const diff = (i, j) => Math.abs(data[i * 3] - data[j * 3])
    + Math.abs(data[i * 3 + 1] - data[j * 3 + 1])
    + Math.abs(data[i * 3 + 2] - data[j * 3 + 2]);
  const strict = flood(data, W, H, (i, j) => lum[j] > 244 || (lum[j] > 238 && sat[j] < 10 && diff(i, j) <= 5));
  const relaxed = flood(data, W, H, (i, j) => lum[j] > 247
    || (diff(i, j) <= 7 && sat[j] < 24 && lum[j] > 150));
  // `tight` — pure white only, for sprites whose own paper is nearly white.
  let tight = null;
  const getTight = () => tight ?? (tight = flood(data, W, H, (i, j) => lum[j] > 250 && sat[j] < 6));
  return { data, W, H, lum, sat, strict, relaxed, getTight };
}

// 8-connected components of mask (1 = set) inside a w×h buffer.
function components(mask, w, h) {
  const lab = new Int32Array(w * h);
  const comps = [];
  const q = new Int32Array(w * h);
  let n = 0;
  for (let s = 0; s < w * h; s += 1) {
    if (!mask[s] || lab[s]) continue;
    n += 1;
    let qh = 0;
    let qt = 0;
    q[qt++] = s;
    lab[s] = n;
    let area = 0;
    while (qh < qt) {
      const i = q[qh++];
      area += 1;
      const x = i % w;
      const y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (mask[j] && !lab[j]) { lab[j] = n; q[qt++] = j; }
        }
      }
    }
    comps.push({ id: n, area });
  }
  return { lab, comps };
}

function erode(mask, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      out[i] = mask[i] && mask[i - 1] && mask[i + 1] && mask[i - w] && mask[i + w] ? 1 : 0;
    }
  }
  return out;
}

async function cut(sheet, name, rect, opts = {}) {
  const { data, W, lum, sat, relaxed } = sheet;
  const strict = opts.tight ? sheet.getTight() : sheet.strict;
  const [x0, y0, x1, y1] = rect.map((v) => Math.round(v * SHEET_SCALE));
  const w = x1 - x0;
  const h = y1 - y0;
  const band = h * (1 - SHADOW_BAND);
  const fg = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const gi = (y + y0) * W + (x + x0);
      const isBg = y >= band ? relaxed[gi] : strict[gi];
      fg[y * w + x] = isBg ? 0 : 1;
    }
  }
  // Grainy shadows (city 2) defeat the gradient rule: inside the band, grow
  // the background through any light, unsaturated pixel it touches.
  if (opts.hardShadow) {
    const q = [];
    for (let y = Math.ceil(band); y < h; y += 1) {
      for (let x = 0; x < w; x += 1) if (!fg[y * w + x]) q.push(y * w + x);
    }
    while (q.length) {
      const i = q.pop();
      const x = i % w;
      const y = (i / w) | 0;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        const jx = j % w;
        const jy = (j / w) | 0;
        if (j < 0 || j >= w * h || jy < band || Math.abs(jx - x) > 1 || !fg[j]) continue;
        const gi = (jy + y0) * W + (jx + x0);
        if (lum[gi] > 196 && sat[gi] < 26) { fg[j] = 0; q.push(j); }
      }
    }
  }
  // `exclude`: sheet-space rects whose pixels never belong to this sprite
  // (neighbours that overlap its bounding box)
  for (const ex of opts.exclude ?? []) {
    const [ex0, ey0, ex1, ey1] = ex.map((v) => Math.round(v * SHEET_SCALE));
    for (let y = Math.max(ey0, y0); y < Math.min(ey1, y1); y += 1) {
      for (let x = Math.max(ex0, x0); x < Math.min(ex1, x1); x += 1) fg[(y - y0) * w + (x - x0)] = 0;
    }
  }
  // Punch out enclosed near-white pockets (`keepWhite` keeps them — for
  // pieces with white panes or paper, e.g. windows).
  const white = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const gi = (y + y0) * W + (x + x0);
      if (fg[y * w + x] && lum[gi] > 243 && sat[gi] < 12) white[y * w + x] = 1;
    }
  }
  {
    const { lab, comps } = components(white, w, h);
    const big = new Set(opts.keepWhite ? [] : comps.filter((c) => c.area > 120).map((c) => c.id));
    for (let i = 0; i < w * h; i += 1) if (big.has(lab[i])) fg[i] = 0;
  }
  // Drop specks: keep components that are a real part of the sprite.
  {
    const { lab, comps } = components(fg, w, h);
    const largest = Math.max(...comps.map((c) => c.area));
    // Neighbouring objects poking into the rect are much smaller than the
    // sprite itself; `keepAll` keeps detached details (e.g. mug steam).
    const minShare = opts.keepAll ? 0.012 : 0.15;
    const keep = new Set(comps.filter((c) => c.area >= Math.max(300, largest * minShare)).map((c) => c.id));
    for (let i = 0; i < w * h; i += 1) fg[i] = keep.has(lab[i]) ? 1 : 0;
  }
  // Convex sprites whose light paper got nibbled at the rim: fill the
  // convex hull of what survived.
  if (opts.hull) {
    const pts = [];
    for (let y = 0; y < h; y += 1) {
      let a = -1;
      let b = -1;
      for (let x = 0; x < w; x += 1) if (fg[y * w + x]) { if (a < 0) a = x; b = x; }
      if (a >= 0) { pts.push([a, y], [b, y]); }
    }
    pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
    const half = (list) => {
      const out = [];
      for (const pt of list) {
        while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], pt) <= 0) out.pop();
        out.push(pt);
      }
      out.pop();
      return out;
    };
    const hull = half(pts).concat(half([...pts].reverse()));
    for (let y = 0; y < h; y += 1) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < hull.length; i += 1) {
        const [x1, y1] = hull[i];
        const [x2, y2] = hull[(i + 1) % hull.length];
        if ((y1 <= y && y2 >= y) || (y2 <= y && y1 >= y)) {
          const x = y1 === y2 ? Math.min(x1, x2) : x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);
          const xb = y1 === y2 ? Math.max(x1, x2) : x;
          lo = Math.min(lo, x);
          hi = Math.max(hi, xb);
        }
      }
      for (let x = Math.ceil(lo); x <= Math.floor(hi); x += 1) if (x >= 0 && x < w) fg[y * w + x] = 1;
    }
  }
  // Soft 1-px edge: erode once (kills the white antialias fringe), then
  // average a 3×3 window into alpha.
  const core = erode(fg, w, h);
  const rgba = Buffer.alloc(w * h * 4);
  let bx0 = w;
  let by0 = h;
  let bx1 = 0;
  let by1 = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let a = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) a += core[ny * w + nx];
        }
      }
      a = Math.round((a / 9) * 255);
      const i = y * w + x;
      const gi = ((y + y0) * W + (x + x0)) * 3;
      rgba[i * 4] = data[gi];
      rgba[i * 4 + 1] = data[gi + 1];
      rgba[i * 4 + 2] = data[gi + 2];
      rgba[i * 4 + 3] = a;
      if (a > 0) {
        if (x < bx0) bx0 = x;
        if (y < by0) by0 = y;
        if (x > bx1) bx1 = x;
        if (y > by1) by1 = y;
      }
    }
  }
  const maxH = opts.maxH ?? DEFAULT_MAX_H;
  const cw = bx1 - bx0 + 1;
  const ch = by1 - by0 + 1;
  let img = sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: bx0, top: by0, width: cw, height: ch });
  let outW = cw;
  let outH = ch;
  if (ch > maxH) {
    outH = maxH;
    outW = Math.round((cw * maxH) / ch);
    img = sharp(await img.png().toBuffer()).resize(outW, outH, { kernel: 'lanczos3' });
  }
  const file = path.join(outDir, `${name}.webp`);
  await img.webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(file);
  return { w: outW, h: outH };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const manifestPath = path.join(outDir, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) && only ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  const bySheet = new Map();
  for (const s of sprites) {
    if (only && !only.includes(s[0])) continue;
    if (!bySheet.has(s[1])) bySheet.set(s[1], []);
    bySheet.get(s[1]).push(s);
  }
  for (const [key, list] of bySheet) {
    const sheet = await analyseSheet(sheets[key]);
    for (const [name, , rect, opts] of list) {
      manifest[name] = await cut(sheet, name, rect, { ...sheetDefaults[key], ...opts });
      process.stdout.write(`${name} `);
    }
  }
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 1)}\n`);
  console.log(`\n${Object.keys(sorted).length} sprites → src/sprites/`);

  if (wantSheet) {
    // Contact sheet on meadow green — fringes and holes show up instantly.
    const names = Object.keys(sorted);
    const cell = 220;
    const cols = 12;
    const rows = Math.ceil(names.length / cols);
    const tiles = [];
    for (let i = 0; i < names.length; i += 1) {
      const buf = await sharp(path.join(outDir, `${names[i]}.webp`))
        .resize(cell - 20, cell - 40, { fit: 'inside' }).png().toBuffer();
      const label = Buffer.from(`<svg width="${cell}" height="20"><text x="4" y="15" font-size="14" font-family="sans-serif">${names[i]}</text></svg>`);
      tiles.push({ input: buf, left: (i % cols) * cell + 10, top: Math.floor(i / cols) * cell + 10 });
      tiles.push({ input: label, left: (i % cols) * cell, top: Math.floor(i / cols) * cell + cell - 22 });
    }
    await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#9aa88a' } })
      .composite(tiles).jpeg({ quality: 82 }).toFile(path.join(root, 'docs/assets/sprites.jpg'));
    console.log('contact sheet → docs/assets/sprites.jpg');
  }
}

main();

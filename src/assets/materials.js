import * as THREE from 'three';

// Paper textures and materials for everything drawn in code (ground, sky,
// panels, charts). The sprites already carry the watercolor-paper grain of
// the reference sheets; these textures reproduce that tooth so code-drawn
// surfaces sit in the same world.

function seeded(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Fine paper tooth + faint fibers, white-centered so it multiplies cleanly.
function makeGrain(size = 256, seed = 3) {
  const r = seeded(seed);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 255 - r() * 13 - (r() < 0.05 ? r() * 14 : 0);
    d[i] = v; d[i + 1] = v; d[i + 2] = v - 1; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(110, 100, 80, 0.05)';
  for (let i = 0; i < 46; i += 1) {
    const x = r() * size;
    const y = r() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 30, x + (r() - 0.5) * 60, y + (r() - 0.5) * 60);
    ctx.stroke();
  }
  return canvas;
}

// Soft watercolor mottling — big, low-contrast blotches like the washes on
// the sprite sheets. Tiles seamlessly (blotches wrap around the edges).
function makeWash(size = 512, seed = 9, strength = 1) {
  const r = seeded(seed);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i += 1) {
    const x = r() * size;
    const y = r() * size;
    const rad = size * (0.05 + r() * 0.16);
    const dark = r() < 0.6;
    const a = (0.025 + r() * 0.05) * strength;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        g.addColorStop(0, dark ? `rgba(70,80,60,${a})` : `rgba(255,252,240,${a * 1.1})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
  }
  // grain on top
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(makeGrain(256, seed + 1), 0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

function toTexture(canvas, repeat = true) {
  const tex = new THREE.CanvasTexture(canvas);
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

let grainTexture = null;
const washTextures = new Map();
let grainCanvas = null;

export function getGrainTexture() {
  if (!grainTexture) grainTexture = toTexture(makeGrain());
  return grainTexture;
}

// strength scales the blotches (ground uses a softer wash than the sky).
export function getWashTexture(strength = 1) {
  if (!washTextures.has(strength)) washTextures.set(strength, toTexture(makeWash(512, 9, strength)));
  return washTextures.get(strength);
}

// The raw grain canvas, for compositing paper tooth into canvas-drawn faces.
export function getGrainCanvas() {
  if (!grainCanvas) grainCanvas = makeGrain(256, 17);
  return grainCanvas;
}

const materialCache = new Map();

// Paper material — unlit by default (baked shading via shadedColors), or
// lit Lambert with { lit: true }. vertexColors is on, so geometry without
// a color attribute must go through plainColors()/facetColors() first.
export function paperMaterial(color, opts = {}) {
  const unlit = !opts.lit;
  const key = `${color}|${opts.side || ''}|${opts.transparent || ''}|${unlit}`;
  if (!opts.noCache && materialCache.has(key)) return materialCache.get(key);
  const Mat = unlit ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
  const mat = new Mat({
    color,
    map: getGrainTexture(),
    vertexColors: true,
    side: opts.side ?? THREE.FrontSide,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    ...(unlit ? {} : { flatShading: true }),
  });
  if (!opts.noCache) materialCache.set(key, mat);
  return mat;
}

// Per-triangle lightness jitter — the folded-facet read of the sprites.
export function facetColors(geometry, seed = 0, amount = 0.05) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const rand = seeded(seed + 1);
  for (let tri = 0; tri < count / 3; tri += 1) {
    const v = 1 - amount / 2 + rand() * amount;
    for (let j = 0; j < 3; j += 1) {
      const i = (tri * 3 + j) * 3;
      colors[i] = colors[i + 1] = colors[i + 2] = v;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

// Baked paper light: every triangle gets a fixed shade from its normal —
// light from the upper left, like the folds on the reference sheets — plus a
// small seeded jitter. Used with UNLIT materials, so code-drawn geometry
// (charts, slabs, bubbles) shades exactly like the printed sprites instead
// of going muddy under scene lights.
const LIGHT = { x: -0.45, y: 0.62, z: 0.64 };
export function shadedColors(geometry, seed = 0, jitter = 0.04) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const rand = seeded(seed + 1);
  const a = { x: 0, y: 0, z: 0 };
  for (let tri = 0; tri < count / 3; tri += 1) {
    const i0 = tri * 3;
    const ux = pos.getX(i0 + 1) - pos.getX(i0);
    const uy = pos.getY(i0 + 1) - pos.getY(i0);
    const uz = pos.getZ(i0 + 1) - pos.getZ(i0);
    const vx = pos.getX(i0 + 2) - pos.getX(i0);
    const vy = pos.getY(i0 + 2) - pos.getY(i0);
    const vz = pos.getZ(i0 + 2) - pos.getZ(i0);
    a.x = uy * vz - uz * vy;
    a.y = uz * vx - ux * vz;
    a.z = ux * vy - uy * vx;
    const len = Math.hypot(a.x, a.y, a.z) || 1;
    const d = (a.x * LIGHT.x + a.y * LIGHT.y + a.z * LIGHT.z) / len; // −1 … 1
    // front faces (d≈0.64) stay at 1; tops lift a touch, sides darken
    const v = Math.min(1.06, 0.8 + Math.max(d, -0.4) * 0.32) + (rand() - 0.5) * jitter;
    for (let j = 0; j < 3; j += 1) {
      const i = (i0 + j) * 3;
      colors[i] = colors[i + 1] = colors[i + 2] = v;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

// Uniform white color attribute for geometry that should not be jittered.
export function plainColors(geometry) {
  const count = geometry.attributes.position.count;
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
  return geometry;
}

import * as THREE from 'three';

// One shared paper-grain texture + a cache of flat-shaded Lambert materials.
// grain (map) × material color × per-facet vertex colors compose in one cheap material.

let grainTexture = null;

function makeGrainTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Two passes of low-amplitude speckle — reads as watercolor-paper tooth.
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 255 - Math.random() * 14 - (Math.random() < 0.06 ? Math.random() * 12 : 0);
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);

  // A few faint fiber strokes.
  ctx.strokeStyle = 'rgba(120, 110, 95, 0.045)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30,
      x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60,
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function getGrainTexture() {
  if (!grainTexture) grainTexture = makeGrainTexture();
  return grainTexture;
}

const materialCache = new Map();

// Flat-shaded papercraft material. vertexColors is on, so geometry without a
// color attribute must call plainColors()/facetColors() first.
export function paperMaterial(color, opts = {}) {
  const key = `${color}|${opts.side || ''}|${opts.transparent || ''}`;
  if (!opts.noCache && materialCache.has(key)) return materialCache.get(key);
  const mat = new THREE.MeshLambertMaterial({
    color,
    map: getGrainTexture(),
    flatShading: true,
    vertexColors: true,
    side: opts.side ?? THREE.FrontSide,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
  });
  if (!opts.noCache) materialCache.set(key, mat);
  return mat;
}

// Per-triangle lightness jitter written into a color attribute — this is what
// sells the faceted-paper read. Returns the (possibly de-indexed) geometry.
export function facetColors(geometry, seed = 0, amount = 0.05) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  let s = (seed * 2654435761) >>> 0 || 1;
  const rand = () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
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

// Uniform white color attribute — for geometry that should not be jittered
// (cards, faces) but still uses the shared vertexColors material.
export function plainColors(geometry) {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3).fill(1);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

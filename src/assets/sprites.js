import * as THREE from 'three';
import manifest from '../sprites/manifest.json';
import { palette } from './palette.js';
import { warn } from '../config.js';
import { hasModel, buildModel } from '../models/registry.js';

// Sprite standees — every diorama object is a piece cut straight out of the
// reference sheets (tools/extract-sprites.mjs), mounted like a paper-theatre
// figure: a die-cut card standing upright on the meadow, a hair of cardboard
// edge peeking out behind it, and a soft contact shadow on the ground.
//
// Structure of a standee (all origins at ground-center):
//   group                — the deck positions/scales/yaws this
//     shadow             — flat soft ellipse on the terrain
//     pivot              — animations rock / squash / slide this
//       flip             — scale.x = ±1 mirrors the card (facing)
//         edge, card     — the cardboard edge and the printed face

// Sprite URLs are resolved LAZILY, one sprite at a time, when it is wanted.
// (An eager glob — or `new URL(\`…${name}.webp\`, import.meta.url)`, which
// Vite turns into one — makes the dev server request every .webp as a module
// on startup.)
const urlLoaders = import.meta.glob('../sprites/*.webp', { query: '?url', import: 'default' });
const urlOf = (name) => {
  const load = urlLoaders[`../sprites/${name}.webp`];
  return load ? load() : Promise.reject(new Error('no such sprite'));
};

const loader = new THREE.TextureLoader();
const textures = new Map();

function setup(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function hasSprite(name) {
  return Boolean(manifest[name]);
}

export function spriteNames() {
  return Object.keys(manifest).sort();
}

export function spriteAspect(name) {
  const m = manifest[name];
  return m ? m.w / m.h : 1;
}

// Sprites are fetched on demand: only an object WITHOUT a 3D model shows
// its flat sprite, so a deck downloads the few it really uses. The texture
// is handed out at once and gets its image when it arrives.
const pending = new Set();
export function getTexture(name) {
  if (!textures.has(name)) {
    const tex = setup(new THREE.Texture());
    textures.set(name, tex);
    const p = urlOf(name)
      .then((url) => loader.loadAsync(url))
      .then((loaded) => { tex.image = loaded.image; tex.needsUpdate = true; })
      .catch(() => warn(`sprite "${name}" failed to load`))
      .finally(() => pending.delete(p));
    pending.add(p);
  }
  return textures.get(name);
}

// Resolves once every sprite requested so far has arrived — the deck waits
// for it before its first frame, so nothing pops in.
export function spritesSettled() {
  return Promise.all([...pending]);
}

// Loads EVERY sprite up front — only the model lab wants that (it shows each
// sprite next to its model).
export function preloadSprites() {
  spriteNames().forEach((name) => getTexture(name));
  return spritesSettled();
}

// ── shared bits ─────────────────────────────────────────────────────────

let shadowTex = null;
function shadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.65)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

// Soft contact shadow: a flat ellipse just above the terrain.
export function contactShadow(width, depth, opacity = 0.2) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: shadowTexture(), color: 0x4a4636, transparent: true, opacity, depthWrite: false,
    }),
  );
  mesh.scale.set(width, 1, depth);
  mesh.position.y = 0.03;
  mesh.renderOrder = -1;
  return mesh;
}

// Additive halo (lamp heads, signal lights).
export function makeGlow(size, color = palette.lampGlow, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  s.scale.setScalar(size);
  return s;
}

const cardMaterials = new Map();
function cardMaterial(name, tint) {
  const key = `${name}|${tint}`;
  if (!cardMaterials.has(key)) {
    cardMaterials.set(key, new THREE.MeshBasicMaterial({
      map: getTexture(name),
      color: tint,
      alphaTest: 0.45,
      alphaToCoverage: true,
      side: THREE.DoubleSide,
    }));
  }
  return cardMaterials.get(key);
}

// Builds one standee. opts:
//   height   — world height of the card (width follows the sprite aspect)
//   width    — alternative to height
//   flip     — mirror horizontally
//   sink     — how far the foot sinks into the terrain (hides bumps)
//   shadow   — false to skip the contact shadow; or a number = depth factor
//   tint     — multiply color (default white = exact sheet colors)
export function makeStandee(name, opts = {}) {
  // A hand-built 3D model replaces the flat card wherever one exists.
  if (hasModel(name)) {
    const { group } = buildModel(name, { ...opts, height: opts.height ?? 2 });
    if (opts.shadow !== false) {
      const f = group.userData.footprint3d;
      const sh = contactShadow(f.w * 1.05, Math.max(f.d * 1.25, f.w * 0.3), opts.shadowOpacity ?? 0.22);
      sh.position.z = f.cz;
      group.add(sh);
    }
    return group;
  }
  const group = new THREE.Group();
  if (!hasSprite(name)) {
    warn(`unknown sprite "${name}"`);
    return group;
  }
  const aspect = spriteAspect(name);
  const h = opts.height ?? (opts.width ? opts.width / aspect : 2);
  const w = h * aspect;
  const sink = opts.sink ?? Math.min(0.12, h * 0.03);

  const pivot = new THREE.Group();
  const flip = new THREE.Group();
  if (opts.flip) flip.scale.x = -1;
  pivot.add(flip);
  group.add(pivot);

  const geo = new THREE.PlaneGeometry(w, h).translate(0, h / 2 - sink, 0);

  // Cardboard edge: the same silhouette in a dark kraft tone, nudged
  // behind and sideways so a sliver of "thickness" shows at the rim.
  const edgeThick = Math.min(0.06, 0.012 + h * 0.008);
  const edge = new THREE.Mesh(geo, cardMaterial(name, '#5a4f40'));
  edge.position.set(edgeThick, -edgeThick * 0.4, -0.035);
  flip.add(edge);

  const card = new THREE.Mesh(geo, cardMaterial(name, opts.tint ?? '#ffffff'));
  flip.add(card);

  if (opts.shadow !== false) {
    const depth = Math.min(w * 0.42, 1.8) * (typeof opts.shadow === 'number' ? opts.shadow : 1);
    group.add(contactShadow(w * 0.92, depth, opts.shadowOpacity ?? 0.2));
  }

  group.userData.sprite = { name, w, h, pivot, flip, card };
  return group;
}

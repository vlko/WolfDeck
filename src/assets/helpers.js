import * as THREE from 'three';
import { paperMaterial, shadedColors } from './materials.js';
import { warn } from '../config.js';

// Deterministic PRNG — same seed, same diorama, every load.
export function rng(seed = 0) {
  let a = (seed * 1103515245 + 12345) >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Paper mesh: geometry with baked paper shading + cached unlit material.
export function paperMesh(geometry, color, seed = 0, jitter = 0.05, opts = {}) {
  const geo = shadedColors(geometry, seed, jitter);
  return new THREE.Mesh(geo, paperMaterial(color, opts));
}

// Wire an asset's named animations to the `animation` option.
// animations = { name: (t, dt, ctx) => {} }. The chosen one becomes
// group.userData.update; `always` (if given) runs regardless of selection.
// aliases = { legacyName: realName } — accepted silently.
export function applyAnimation(group, animations, options = {}, defaultName = null, assetName = '?', aliases = {}) {
  group.userData.animations = animations;
  let name = options.animation ?? defaultName;
  if (name && !animations[name] && aliases[name]) name = aliases[name]; // exact name wins over a legacy alias
  if (name && name !== 'none' && !animations[name]) {
    warn(`asset "${assetName}": unknown animation "${name}" (has: ${Object.keys(animations).filter((k) => k !== 'always').join(', ') || 'none'})`);
    name = defaultName;
  }
  const fn = name && name !== 'none' ? animations[name] : null;
  const always = animations.always || null;
  const ctx = { group, phase: (options.seed ?? Math.random() * 100) * 1.7 + Math.random() * 6 };
  if (fn || always) {
    group.userData.update = (t, dt) => {
      if (always) always(t, dt, ctx);
      if (fn) fn(t, dt, ctx);
    };
  }
}

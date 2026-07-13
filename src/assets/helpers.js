import * as THREE from 'three';
import { paperMaterial, facetColors } from './materials.js';
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

// Papercraft mesh: facet-jittered flat-shaded geometry + cached paper material.
export function paperMesh(geometry, color, seed = 0, jitter = 0.05) {
  const geo = facetColors(geometry, seed, jitter);
  return new THREE.Mesh(geo, paperMaterial(color));
}

// Low-segment cone (faceted "paper" cone). Rim vertices optionally jittered.
export function facetedCone(radius, height, segments = 7, rim = 0, seed = 0) {
  const geo = new THREE.ConeGeometry(radius, height, segments, 1);
  if (rim > 0) {
    const r = rng(seed + 31);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      if (Math.abs(pos.getY(i) + height / 2) < 1e-4 && (pos.getX(i) !== 0 || pos.getZ(i) !== 0)) {
        pos.setY(i, pos.getY(i) + (r() - 0.5) * rim);
      }
    }
  }
  return geo;
}

// Triangular prism lying along x — the classic gabled roof. width along x,
// height to the ridge, depth along z.
export function prismGeometry(width, height, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-depth / 2, 0);
  shape.lineTo(depth / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  geo.center();
  geo.translate(0, height / 2, 0);
  return geo;
}

// Soft dark disc under a prop — grounds it without shadow maps.
export function blobShadow(radius, opacity = 0.16) {
  const geo = new THREE.CircleGeometry(radius, 14);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x3a3a30, transparent: true, opacity, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  mesh.renderOrder = -1;
  return mesh;
}

// Wire a builder's named animations to the `animation` option.
// animations = { name: (t, dt, ctx) => {} }. The chosen one becomes
// group.userData.update; `always` (if given) runs regardless of selection.
export function applyAnimation(group, animations, options = {}, defaultName = null, assetName = '?') {
  group.userData.animations = animations;
  let name = options.animation ?? defaultName;
  if (name && name !== 'none' && !animations[name]) {
    warn(`asset "${assetName}": unknown animation "${name}" (has: ${Object.keys(animations).join(', ') || 'none'})`);
    name = defaultName;
  }
  const fn = name && name !== 'none' ? animations[name] : null;
  const always = animations.always || null;
  const ctx = { group, phase: Math.random() * Math.PI * 2 };
  if (fn || always) {
    group.userData.update = (t, dt) => {
      if (always) always(t, dt, ctx);
      if (fn) fn(t, dt, ctx);
    };
  }
}

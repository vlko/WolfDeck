import * as THREE from 'three';
import { warn } from '../config.js';

// Central asset registry. Builders are (options) => THREE.Group with origin at
// ground-center (y = 0 is standing on the terrain), optional
// userData.update(t, dt) and userData.animations.

const builders = new Map();

export function register(name, builderFn) {
  builders.set(name, builderFn);
}

export function has(name) {
  return builders.has(name);
}

export function listAssets() {
  return [...builders.keys()].sort();
}

// Magenta placeholder — the "you have a typo" box that never crashes the deck.
export function placeholderBox(size = 1.4) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial({ color: 0xff00ff }),
  );
  mesh.position.y = size / 2;
  group.add(mesh);
  return group;
}

export function build(name, options = {}) {
  const builder = builders.get(name);
  if (!builder) {
    warn(`unknown asset type "${name}" — magenta placeholder used. Known: ${listAssets().join(', ')}`);
    return placeholderBox();
  }
  try {
    return builder(options);
  } catch (err) {
    warn(`asset "${name}" failed to build:`, err);
    return placeholderBox();
  }
}

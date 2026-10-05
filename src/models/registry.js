import * as THREE from 'three';

// Hand-built 3D models, keyed by the SPRITE name they recreate.
//
// A model module calls defineModel(name, build). build(opts, rig) builds the
// model in sprite-percent units (see kit.js) into rig.body and may add named
// animations to rig.anims — { name: (t, dt, ctx) => {} } — plus rig.anims.always
// for things that run regardless of the chosen animation (blinking, wheels…).
// Movable parts are plain Groups placed at their joint, so animations just
// rotate them: arms swing, heads tilt, eyelids blink, tails wag.

const models = new Map();

// The module currently registering models (the lab groups models by it).
let currentPack = null;
export function setPack(name) { currentPack = name; }

export function defineModel(name, build, info = {}) {
  models.set(name, { build, info: { pack: currentPack, ...info } });
}

export function modelInfo(name) {
  return models.get(name)?.info ?? {};
}

export function hasModel(name) {
  return models.has(name);
}

export function modelNames() {
  return [...models.keys()].sort();
}

// Builds a model scaled to world `height`. Returns the same structure as a
// sprite standee: group → (shadow) + pivot → flip → body, with
// userData.sprite { name, w, h, pivot, flip, body, rig } and the rig's
// animations in userData.modelAnims.
export function buildModel(name, opts = {}) {
  const { build, info } = models.get(name);
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  const flip = new THREE.Group();
  const body = new THREE.Group();
  flip.add(body);
  pivot.add(flip);
  group.add(pivot);

  const rig = { body, anims: {}, parts: {}, seed: opts.seed ?? 0 };
  build(opts, rig);

  const scale = (opts.height ?? 2) / 100;
  body.scale.setScalar(scale);
  if (opts.flip) flip.scale.x = -1;

  // Footprint from the actual geometry (for the contact shadow).
  const bb = new THREE.Box3().setFromObject(body);
  const w = bb.max.x - bb.min.x;
  const d = bb.max.z - bb.min.z;
  group.userData.sprite = {
    name, w, h: opts.height ?? 2, d, pivot, flip, body, rig, model: true,
  };
  group.userData.modelAnims = rig.anims;
  group.userData.footprint3d = { w, d, cx: (bb.max.x + bb.min.x) / 2, cz: (bb.max.z + bb.min.z) / 2 };
  return { group, info };
}

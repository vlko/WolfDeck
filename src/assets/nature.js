import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, facetedCone, blobShadow, applyAnimation,
} from './helpers.js';

// ── pineTree ────────────────────────────────────────────────────────────────
// Stacked faceted cones on a square trunk, per the reference sheet.
// options: seed, tiers (3–8), height, color, animation: "windSway"|"none"
function pineTree(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const tiers = options.tiers ?? 3 + Math.floor(r() * 3);
  const height = options.height ?? 2.6 + tiers * 0.5 + r() * 0.6;
  const baseColor = new THREE.Color(options.color ?? palette.pine);
  // Seeded hue drift so a row of pines reads varied like the reference.
  baseColor.offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.1, (r() - 0.5) * 0.06);

  const group = new THREE.Group();

  const trunkH = height * 0.16;
  const trunk = paperMesh(
    new THREE.BoxGeometry(height * 0.09, trunkH, height * 0.09),
    palette.barkBrown, seed + 1,
  );
  trunk.position.y = trunkH / 2;
  group.add(trunk);

  // Cone tiers, wider at the bottom, slightly overlapping.
  const canopy = new THREE.Group();
  const canopyH = height - trunkH;
  const tint = new THREE.Color();
  for (let i = 0; i < tiers; i += 1) {
    const k = i / (tiers - 1 || 1); // 0 bottom … 1 top
    const radius = (0.42 - k * 0.26) * height * 0.55;
    const tierH = (canopyH / tiers) * 1.75;
    tint.copy(baseColor).offsetHSL(0, 0, k * 0.055 + (r() - 0.5) * 0.02);
    const cone = paperMesh(
      facetedCone(radius, tierH, 6 + Math.floor(r() * 2), 0.12, seed + i),
      `#${tint.getHexString()}`, seed + 10 + i, 0.07,
    );
    cone.position.y = trunkH + (canopyH / tiers) * i + tierH * 0.42;
    cone.rotation.y = r() * Math.PI;
    canopy.add(cone);
  }
  group.add(canopy);
  group.add(blobShadow(height * 0.2));

  applyAnimation(group, {
    windSway: (t, dt, ctx) => {
      canopy.rotation.z = Math.sin(t * 0.9 + ctx.phase) * 0.022;
      canopy.rotation.x = Math.sin(t * 0.7 + ctx.phase * 1.3) * 0.012;
    },
  }, options, 'windSway', 'pineTree');

  return group;
}

// ── fence ───────────────────────────────────────────────────────────────────
// Picket fence running along x: posts with pyramid tips + two rails,
// seeded lean/height jitter. options: seed, length, color
function fence(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const length = options.length ?? 5;
  const color = options.color ?? palette.plankBrown;
  const group = new THREE.Group();

  const gap = 0.75;
  const count = Math.max(2, Math.round(length / gap) + 1);
  const dark = new THREE.Color(color).offsetHSL(0, 0, -0.07);

  for (let i = 0; i < count; i += 1) {
    const x = -length / 2 + (i / (count - 1)) * length;
    const h = 1.05 + (r() - 0.5) * 0.22;
    const post = new THREE.Group();

    const plank = paperMesh(new THREE.BoxGeometry(0.16, h, 0.09), color, seed + i);
    plank.position.y = h / 2;
    post.add(plank);

    const tip = paperMesh(new THREE.ConeGeometry(0.115, 0.22, 4), `#${dark.getHexString()}`, seed + i + 50);
    tip.rotation.y = Math.PI / 4;
    tip.position.y = h + 0.1;
    post.add(tip);

    post.position.x = x;
    post.rotation.z = (r() - 0.5) * 0.07;
    group.add(post);
  }

  for (const railY of [0.38, 0.78]) {
    const rail = paperMesh(new THREE.BoxGeometry(length + 0.3, 0.11, 0.06), color, seed + railY * 100);
    rail.position.set(0, railY, 0.06);
    rail.rotation.z = (r() - 0.5) * 0.02;
    group.add(rail);
  }

  return group;
}

// ── haystack ────────────────────────────────────────────────────────────────
// Dome of stacked squashed cone bands on a mauve dirt plinth, jagged skirt —
// per the reference. options: seed, color
function haystack(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const color = options.color ?? palette.strawGold;
  const group = new THREE.Group();

  // Dirt plinth.
  const plinth = paperMesh(new THREE.CylinderGeometry(1.15, 1.25, 0.5, 9), palette.roseMauve, seed + 3);
  plinth.position.y = 0.25;
  group.add(plinth);

  // Stacked straw bands, narrowing upward.
  const tint = new THREE.Color();
  const bands = 4;
  for (let i = 0; i < bands; i += 1) {
    const k = i / (bands - 1);
    const radius = 1.15 - k * 0.75;
    tint.set(color).offsetHSL(0, 0, k * 0.05 + (r() - 0.5) * 0.02);
    const band = paperMesh(
      new THREE.CylinderGeometry(radius * 0.82, radius, 0.42, 9),
      `#${tint.getHexString()}`, seed + 10 + i, 0.06,
    );
    band.position.y = 0.5 + 0.36 * i + 0.21;
    band.rotation.y = r() * 0.7;
    group.add(band);
  }
  const cap = paperMesh(facetedCone(0.42, 0.5, 8, 0.1, seed), color, seed + 20, 0.06);
  cap.position.y = 0.5 + 0.36 * bands + 0.18;
  group.add(cap);

  // Jagged straw skirt over the plinth edge.
  const skirt = paperMesh(facetedCone(1.3, 0.55, 11, 0.28, seed + 4), color, seed + 30, 0.08);
  skirt.position.y = 0.72;
  group.add(skirt);

  group.add(blobShadow(1.3));
  return group;
}

register('pineTree', pineTree);
register('fence', fence);
register('haystack', haystack);

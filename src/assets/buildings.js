import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, prismGeometry, facetedCone, blobShadow, applyAnimation,
} from './helpers.js';

// Shared bits ----------------------------------------------------------------

function plankDoor(width, height, color, seed) {
  const door = new THREE.Group();
  const planks = 3;
  for (let i = 0; i < planks; i += 1) {
    const w = width / planks;
    const plank = paperMesh(new THREE.BoxGeometry(w * 0.92, height, 0.08), color, seed + i);
    plank.position.set(-width / 2 + w * (i + 0.5), height / 2, 0);
    door.add(plank);
  }
  const lintel = paperMesh(new THREE.BoxGeometry(width * 1.15, 0.12, 0.1), color, seed + 9);
  lintel.position.y = height + 0.05;
  door.add(lintel);
  return door;
}

function roundWindow(radius, seed, frame = palette.deepBrown) {
  const win = new THREE.Group();
  const hole = paperMesh(new THREE.CircleGeometry(radius, 10), palette.charcoal, seed, 0.02);
  win.add(hole);
  const ring = paperMesh(new THREE.RingGeometry(radius, radius * 1.28, 10), frame, seed + 1, 0.03);
  ring.position.z = 0.005;
  win.add(ring);
  return win;
}

// ── cottage ─────────────────────────────────────────────────────────────────
// Gabled village house, front-facing. Variants per the reference sheet:
//   "timber"      cream walls, exposed A-truss timber gable
//   "plain"       duck-egg walls, twin gable peaks
//   "roundWindow" white walls, big circular gable window
// options: seed, variant, wallColor, roofColor, width, height
function cottage(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const variant = options.variant ?? ['timber', 'plain', 'roundWindow'][Math.floor(r() * 3)];
  const width = options.width ?? 3.4;
  const depth = width * 0.62;
  const wallH = options.height ?? 2.1;
  const wallColor = options.wallColor
    ?? { timber: palette.cream, plain: palette.duckEggBlue, roundWindow: palette.paperWhite }[variant]
    ?? palette.cream;
  const roofColor = options.roofColor ?? palette.barkBrown;

  const group = new THREE.Group();

  const body = paperMesh(new THREE.BoxGeometry(width, wallH, depth), wallColor, seed);
  body.position.y = wallH / 2;
  group.add(body);

  // Gabled roof with eaves overhang.
  const roofH = wallH * 0.85;
  const roof = paperMesh(prismGeometry(width * 1.14, roofH, depth * 1.2), roofColor, seed + 2, 0.06);
  roof.position.y = wallH;
  group.add(roof);

  // Chimney.
  if (r() > 0.35) {
    const chim = paperMesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), palette.slateGray, seed + 3);
    chim.position.set(width * (r() > 0.5 ? 0.22 : -0.22), wallH + roofH * 0.75, 0);
    group.add(chim);
  }

  const front = depth / 2 + 0.01;

  // Door.
  const door = plankDoor(0.72, 1.25, palette.plankBrown, seed + 10);
  door.position.set(-width * 0.02, 0, front);
  group.add(door);

  // Variant dressing.
  if (variant === 'timber') {
    // Exposed A-truss on the gable front: two rakes + a tie beam.
    const gable = paperMesh(prismGeometry(width * 1.02, roofH * 0.92, 0.14), wallColor, seed + 4);
    gable.position.set(0, wallH, front - 0.02);
    group.add(gable);
    const beamMat = palette.tanBrown;
    const rakeLen = Math.hypot(width / 2, roofH * 0.92);
    for (const side of [-1, 1]) {
      const rake = paperMesh(new THREE.BoxGeometry(rakeLen * 0.94, 0.14, 0.1), beamMat, seed + 5);
      rake.position.set(side * width * 0.25, wallH + roofH * 0.44, front + 0.06);
      rake.rotation.z = -side * Math.atan2(roofH * 0.92, width / 2);
      group.add(rake);
      const strut = paperMesh(new THREE.BoxGeometry(0.1, roofH * 0.5, 0.1), beamMat, seed + 6);
      strut.position.set(side * width * 0.16, wallH + roofH * 0.28, front + 0.06);
      strut.rotation.z = side * 0.5;
      group.add(strut);
    }
    const tie = paperMesh(new THREE.BoxGeometry(width * 0.8, 0.13, 0.1), beamMat, seed + 7);
    tie.position.set(0, wallH + 0.03, front + 0.06);
    group.add(tie);
    const win = roundWindow(0.28, seed + 8);
    win.position.set(width * 0.28, wallH * 0.55, front + 0.02);
    group.add(win);
  } else if (variant === 'plain') {
    // Twin gable peaks poking above the main roof, per the teal house.
    for (const side of [-1, 1]) {
      const peak = paperMesh(prismGeometry(width * 0.34, roofH * 0.55, depth * 0.5), palette.tanBrown, seed + 4 + side);
      peak.position.set(side * width * 0.24, wallH + roofH * 0.55, depth * 0.1);
      group.add(peak);
    }
    // Small woodpile by the door.
    const pile = paperMesh(new THREE.BoxGeometry(0.5, 0.55, 0.3), palette.plankBrown, seed + 8);
    pile.position.set(width * 0.42, 0.28, front - 0.05);
    group.add(pile);
  } else if (variant === 'roundWindow') {
    const gable = paperMesh(prismGeometry(width * 1.02, roofH * 0.92, 0.14), wallColor, seed + 4);
    gable.position.set(0, wallH, front - 0.02);
    group.add(gable);
    const win = roundWindow(0.34, seed + 5);
    win.position.set(0, wallH + roofH * 0.34, front + 0.06);
    group.add(win);
  }

  group.add(blobShadow(width * 0.62));
  return group;
}

// ── barn ────────────────────────────────────────────────────────────────────
// The bigger mauve-roofed house from the reference: teal walls, big dark
// round window, boxy chimney. options: seed, wallColor, roofColor, width
function barn(options = {}) {
  const seed = options.seed ?? 0;
  const width = options.width ?? 4.6;
  const depth = width * 0.55;
  const wallH = 2.7;
  const wallColor = options.wallColor ?? palette.duckEggBlue;
  const roofColor = options.roofColor ?? palette.roseMauve;

  const group = new THREE.Group();

  const body = paperMesh(new THREE.BoxGeometry(width, wallH, depth), wallColor, seed);
  body.position.y = wallH / 2;
  group.add(body);

  // Hipped-ish shallow roof: wide prism, slightly squashed.
  const roofH = wallH * 0.5;
  const roof = paperMesh(prismGeometry(width * 1.1, roofH, depth * 1.25), roofColor, seed + 2, 0.06);
  roof.position.y = wallH;
  group.add(roof);

  const chim = paperMesh(new THREE.BoxGeometry(0.38, 0.8, 0.38), palette.slateGray, seed + 3);
  chim.position.set(-width * 0.3, wallH + roofH * 0.8, 0);
  group.add(chim);

  const front = depth / 2 + 0.01;
  const door = plankDoor(0.85, 1.45, palette.plankBrown, seed + 10);
  door.position.set(-width * 0.28, 0, front);
  group.add(door);

  const win = roundWindow(0.42, seed + 5);
  win.position.set(width * 0.24, wallH * 0.62, front + 0.02);
  group.add(win);

  group.add(blobShadow(width * 0.6));
  return group;
}

// ── hut ─────────────────────────────────────────────────────────────────────
// Tall conical thatched hut: overlapping faceted straw tiers + stick topknot.
// options: seed, color, height
function hut(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const color = options.color ?? palette.strawGold;
  const height = options.height ?? 3.6;
  const group = new THREE.Group();

  const tiers = 5;
  const tint = new THREE.Color();
  for (let i = 0; i < tiers; i += 1) {
    const k = i / (tiers - 1); // bottom → top
    const radius = 1.7 * (1 - k * 0.72);
    const tierH = (height / tiers) * 1.9;
    tint.set(color).offsetHSL(0, (r() - 0.5) * 0.04, -k * 0.045);
    const cone = paperMesh(
      facetedCone(radius, tierH, 9, 0.2, seed + i),
      `#${tint.getHexString()}`, seed + 10 + i, 0.08,
    );
    cone.position.y = (height / tiers) * i + tierH * 0.38;
    cone.rotation.y = r() * 0.8;
    group.add(cone);
  }

  // Topknot sticks.
  for (let i = 0; i < 3; i += 1) {
    const stick = paperMesh(new THREE.BoxGeometry(0.07, 0.65, 0.07), palette.deepBrown, seed + 30 + i);
    stick.position.set((i - 1) * 0.12, height + 0.18, (r() - 0.5) * 0.1);
    stick.rotation.z = (i - 1) * 0.25 + (r() - 0.5) * 0.1;
    group.add(stick);
  }

  // Dark doorway arch.
  const doorway = paperMesh(new THREE.CircleGeometry(0.42, 8, 0, Math.PI), palette.charcoal, seed + 40, 0.02);
  doorway.position.set(0, 0.02, 1.62);
  doorway.rotation.x = -0.18;
  group.add(doorway);

  group.add(blobShadow(1.75));
  return group;
}

// ── well ────────────────────────────────────────────────────────────────────
// Stone ring + two posts + gabled roof + crank with rope and bucket.
// options: seed, roofColor, animation: "crankTurn"|"none"
function well(options = {}) {
  const seed = options.seed ?? 0;
  const roofColor = options.roofColor ?? palette.plankBrown;
  const group = new THREE.Group();

  // Stone ring — 9-sided faceted cylinder, brick illusion from facet jitter.
  const ring = paperMesh(new THREE.CylinderGeometry(0.95, 1.02, 0.95, 9, 2), palette.stoneGray, seed, 0.1);
  ring.position.y = 0.475;
  group.add(ring);
  const rim = paperMesh(new THREE.CylinderGeometry(1.04, 1.04, 0.14, 9), palette.slateGray, seed + 1, 0.08);
  rim.position.y = 1.0;
  group.add(rim);
  // Dark water disc inside.
  const water = paperMesh(new THREE.CircleGeometry(0.8, 9), palette.charcoal, seed + 2, 0.02);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.9;
  group.add(water);

  // Posts + gable roof.
  for (const side of [-1, 1]) {
    const post = paperMesh(new THREE.BoxGeometry(0.16, 1.5, 0.16), palette.plankBrown, seed + 3 + side);
    post.position.set(side * 0.95, 1.0 + 0.75, 0);
    group.add(post);
  }
  const roof = paperMesh(prismGeometry(2.6, 0.72, 1.5), roofColor, seed + 6, 0.07);
  roof.position.y = 2.5;
  group.add(roof);

  // Crank axle + handle + rope + bucket.
  const crank = new THREE.Group();
  const axle = paperMesh(new THREE.CylinderGeometry(0.11, 0.11, 2.0, 7), palette.tanBrown, seed + 7);
  axle.rotation.z = Math.PI / 2;
  crank.add(axle);
  const handleArm = paperMesh(new THREE.BoxGeometry(0.07, 0.4, 0.07), palette.deepBrown, seed + 8);
  handleArm.position.set(1.1, -0.16, 0);
  crank.add(handleArm);
  const handleGrip = paperMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), palette.deepBrown, seed + 9);
  handleGrip.rotation.z = Math.PI / 2;
  handleGrip.position.set(1.22, -0.36, 0);
  crank.add(handleGrip);
  crank.position.y = 2.02;
  group.add(crank);

  const rope = paperMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 5), palette.tanBrown, seed + 10);
  rope.position.y = 2.02 - 0.425;
  group.add(rope);
  const bucket = paperMesh(new THREE.CylinderGeometry(0.16, 0.13, 0.24, 7), palette.deepBrown, seed + 11);
  bucket.position.y = 2.02 - 0.85;
  group.add(bucket);

  group.add(blobShadow(1.1));

  applyAnimation(group, {
    crankTurn: (t, dt, ctx) => {
      crank.rotation.x = t * 0.9 + ctx.phase;
      const bob = Math.sin(t * 0.9 + ctx.phase) * 0.06;
      rope.position.y = 2.02 - 0.425 + bob / 2;
      rope.scale.y = 1 + bob * 0.1;
      bucket.position.y = 2.02 - 0.85 + bob;
    },
  }, options, 'none', 'well');

  return group;
}

// ── churchTower ─────────────────────────────────────────────────────────────
// White village church with a slender clock tower and a teal spire — the
// Námestovo skyline silhouette. options: seed, wallColor, spireColor, height
function churchTower(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const wallColor = options.wallColor ?? palette.paperWhite;
  const spireColor = options.spireColor ?? palette.waterTeal;
  const towerH = options.height ?? 4.4;
  const group = new THREE.Group();

  // Nave: long white body with a teal gabled roof.
  const naveW = 3.2;
  const naveD = 1.7;
  const naveH = 1.9;
  const nave = paperMesh(new THREE.BoxGeometry(naveW, naveH, naveD), wallColor, seed);
  nave.position.set(0.8, naveH / 2, 0);
  group.add(nave);
  const naveRoof = paperMesh(prismGeometry(naveW * 1.08, 1.0, naveD * 1.18), spireColor, seed + 1, 0.06);
  naveRoof.position.set(0.8, naveH, 0);
  group.add(naveRoof);

  // Arched nave windows (round-top slits).
  for (let i = 0; i < 3; i += 1) {
    const win = paperMesh(new THREE.CapsuleGeometry(0.11, 0.3, 2, 6), palette.charcoal, seed + 2 + i, 0.02);
    win.position.set(0.15 + i * 0.85, naveH * 0.55, naveD / 2 + 0.01);
    group.add(win);
  }

  // Tower: slender white shaft at the left end.
  const towerW = 1.15;
  const tower = paperMesh(new THREE.BoxGeometry(towerW, towerH, towerW), wallColor, seed + 6);
  tower.position.set(-1.35, towerH / 2, 0);
  group.add(tower);

  // Clock face near the top: white disc, teal ring, two hands.
  const face = new THREE.Group();
  const dial = paperMesh(new THREE.CircleGeometry(0.3, 12), palette.cream, seed + 7, 0.02);
  face.add(dial);
  const ring = paperMesh(new THREE.RingGeometry(0.3, 0.37, 12), spireColor, seed + 8, 0.03);
  ring.position.z = 0.004;
  face.add(ring);
  const hourHand = paperMesh(new THREE.BoxGeometry(0.045, 0.18, 0.02), palette.deepBrown, seed + 9);
  hourHand.position.set(0, 0.06, 0.01);
  hourHand.rotation.z = r() * Math.PI * 2;
  face.add(hourHand);
  const minHand = paperMesh(new THREE.BoxGeometry(0.035, 0.26, 0.02), palette.deepBrown, seed + 10);
  minHand.position.set(0, 0.1, 0.012);
  minHand.rotation.z = r() * Math.PI * 2;
  face.add(minHand);
  face.position.set(-1.35, towerH - 0.75, towerW / 2 + 0.01);
  group.add(face);

  // Belfry slit above the clock.
  const slit = paperMesh(new THREE.CapsuleGeometry(0.09, 0.22, 2, 6), palette.charcoal, seed + 11, 0.02);
  slit.position.set(-1.35, towerH - 0.22, towerW / 2 + 0.01);
  group.add(slit);

  // Teal spire: eaves collar + tall faceted cone + tiny orb and cross.
  const collar = paperMesh(new THREE.BoxGeometry(towerW * 1.22, 0.16, towerW * 1.22), spireColor, seed + 12);
  collar.position.set(-1.35, towerH + 0.08, 0);
  group.add(collar);
  const spireH = 1.7;
  const spire = paperMesh(facetedCone(towerW * 0.62, spireH, 8, 0, seed + 13), spireColor, seed + 13, 0.07);
  spire.position.set(-1.35, towerH + 0.16 + spireH / 2, 0);
  group.add(spire);
  const orb = paperMesh(new THREE.OctahedronGeometry(0.09, 0), palette.strawGold, seed + 14, 0.04);
  orb.position.set(-1.35, towerH + 0.16 + spireH + 0.06, 0);
  group.add(orb);
  const crossV = paperMesh(new THREE.BoxGeometry(0.045, 0.34, 0.045), palette.strawGold, seed + 15);
  crossV.position.set(-1.35, towerH + 0.16 + spireH + 0.32, 0);
  group.add(crossV);
  const crossH = paperMesh(new THREE.BoxGeometry(0.2, 0.045, 0.045), palette.strawGold, seed + 16);
  crossH.position.set(-1.35, towerH + 0.16 + spireH + 0.38, 0);
  group.add(crossH);

  // Door at the tower base.
  const door = plankDoor(0.6, 1.05, palette.plankBrown, seed + 17);
  door.position.set(-1.35, 0, towerW / 2 + 0.01);
  group.add(door);

  group.add(blobShadow(2.2));
  return group;
}

register('cottage', cottage);
register('barn', barn);
register('hut', hut);
register('well', well);
register('churchTower', churchTower);

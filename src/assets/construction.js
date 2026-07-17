import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, blobShadow, applyAnimation,
} from './helpers.js';

// The construction pack: a straw-gold lattice tower crane, a duck-egg
// excavator with an articulated digging arm, plank scaffolding, striped
// traffic cones and big-headed animal builders in hard hats and vests.

const darkMaterial = new THREE.MeshBasicMaterial({ color: palette.charcoal });

// ── crane ───────────────────────────────────────────────────────────────────
// Tower crane: slab base, straw-gold lattice mast, slewing top with cab,
// peak, lattice jib + counter-jib with counterweight, and a hook on a cable.
// options: seed, height, animation: "armSwing"|"none"
function crane(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const height = options.height ?? 6.5 + r() * 1.2;
  const gold = palette.strawGold;
  const group = new THREE.Group();

  // Concrete base slab.
  const base = paperMesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), palette.slateGray, seed, 0.06);
  base.position.y = 0.15;
  group.add(base);

  // Lattice mast: four corner posts + a brace ring and diagonals per segment.
  const mastW = 0.56;
  const mastTop = height - 1.3;
  const mastH = mastTop - 0.3;
  const half = mastW / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = paperMesh(new THREE.BoxGeometry(0.08, mastH, 0.08), gold, seed + sx + sz * 2, 0.04);
      post.position.set(sx * half, 0.3 + mastH / 2, sz * half);
      group.add(post);
    }
  }
  const segs = Math.max(3, Math.round(mastH / 0.9));
  const segH = mastH / segs;
  const diagLen = Math.hypot(mastW, segH);
  for (let i = 0; i < segs; i += 1) {
    const y = 0.3 + (i + 1) * segH;
    for (const s of [-1, 1]) {
      const bx = paperMesh(new THREE.BoxGeometry(mastW, 0.05, 0.05), gold, seed + 10 + i + s, 0.04);
      bx.position.set(0, y, s * half);
      group.add(bx);
      const bz = paperMesh(new THREE.BoxGeometry(0.05, 0.05, mastW), gold, seed + 20 + i + s, 0.04);
      bz.position.set(s * half, y, 0);
      group.add(bz);
      // Diagonal, direction alternating per segment.
      const diag = paperMesh(new THREE.BoxGeometry(diagLen * 0.94, 0.045, 0.045), gold, seed + 30 + i + s, 0.04);
      diag.position.set(s > 0 ? 0 : half, y - segH / 2, s > 0 ? half : 0);
      if (s > 0) diag.rotation.z = (i % 2 ? 1 : -1) * Math.atan2(segH, mastW);
      else { diag.rotation.y = Math.PI / 2; diag.rotation.z = (i % 2 ? -1 : 1) * Math.atan2(segH, mastW); }
      group.add(diag);
    }
  }

  // Slewing top: everything above the mast yaws together in armSwing.
  const slew = new THREE.Group();
  slew.position.y = mastTop;
  group.add(slew);

  // Cab.
  const cab = paperMesh(new THREE.BoxGeometry(0.62, 0.55, 0.55), palette.duckEggBlue, seed + 40, 0.05);
  cab.position.set(0.18, 0.32, 0);
  slew.add(cab);
  const cabWin = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), darkMaterial);
  cabWin.rotation.y = Math.PI / 2;
  cabWin.position.set(0.5, 0.36, 0);
  slew.add(cabWin);

  // Peak pyramid the tie bars hang from.
  const peakGeo = new THREE.ConeGeometry(0.3, 1.0, 4);
  peakGeo.rotateY(Math.PI / 4);
  const peak = paperMesh(peakGeo, gold, seed + 41, 0.05);
  peak.position.y = 1.1;
  slew.add(peak);

  // Jib: two bottom rails + top chord + vertical struts, reaching +x.
  const jibLen = height * 0.6 + r() * 0.4;
  for (const s of [-1, 1]) {
    const rail = paperMesh(new THREE.BoxGeometry(jibLen, 0.06, 0.06), gold, seed + 42 + s, 0.04);
    rail.position.set(jibLen / 2, 0.55, s * 0.13);
    slew.add(rail);
  }
  const chord = paperMesh(new THREE.BoxGeometry(jibLen * 0.9, 0.06, 0.06), gold, seed + 45, 0.04);
  chord.position.set(jibLen * 0.45, 0.88, 0);
  slew.add(chord);
  const struts = Math.round(jibLen / 0.75);
  for (let i = 1; i <= struts; i += 1) {
    const strut = paperMesh(new THREE.BoxGeometry(0.045, 0.33, 0.045), gold, seed + 50 + i, 0.04);
    strut.position.set((jibLen * 0.85 * i) / struts, 0.71, 0);
    strut.rotation.z = (i % 2 ? 1 : -1) * 0.35;
    slew.add(strut);
  }

  // Counter-jib with slab counterweight.
  const backLen = jibLen * 0.38;
  const backRail = paperMesh(new THREE.BoxGeometry(backLen, 0.08, 0.26), gold, seed + 60, 0.04);
  backRail.position.set(-backLen / 2, 0.55, 0);
  slew.add(backRail);
  const weight = paperMesh(new THREE.BoxGeometry(0.34, 0.55, 0.6), palette.slateGray, seed + 61, 0.07);
  weight.position.set(-backLen + 0.1, 0.32, 0);
  slew.add(weight);

  // Tie bars: peak → jib mid, peak → counterweight.
  const tieTo = (x2, y2) => {
    const len = Math.hypot(x2, 1.55 - y2);
    const tie = paperMesh(new THREE.BoxGeometry(len, 0.035, 0.035), palette.deepBrown, seed + 62, 0.03);
    tie.position.set(x2 / 2, (1.55 + y2) / 2, 0);
    tie.rotation.z = Math.atan2(1.55 - y2, -x2);
    slew.add(tie);
  };
  tieTo(jibLen * 0.55, 0.88);
  tieTo(-backLen + 0.15, 0.62);

  // Trolley + cable + hook, hanging from the jib (swings with it).
  const trolley = paperMesh(new THREE.BoxGeometry(0.22, 0.1, 0.3), palette.charcoal, seed + 63, 0.04);
  trolley.position.set(jibLen * 0.72, 0.48, 0);
  slew.add(trolley);
  const cableLen = mastTop * 0.55;
  const cable = paperMesh(new THREE.CylinderGeometry(0.02, 0.02, cableLen, 5), palette.charcoal, seed + 64, 0.02);
  cable.position.set(jibLen * 0.72, 0.42 - cableLen / 2, 0);
  slew.add(cable);
  const hook = new THREE.Group();
  const block = paperMesh(new THREE.BoxGeometry(0.14, 0.2, 0.1), palette.slateGray, seed + 65, 0.05);
  hook.add(block);
  const hookGeo = new THREE.TorusGeometry(0.08, 0.03, 5, 8, Math.PI * 1.4);
  const claw = paperMesh(hookGeo, palette.charcoal, seed + 66, 0.04);
  claw.position.y = -0.17;
  claw.rotation.z = Math.PI * 0.8;
  hook.add(claw);
  hook.position.set(jibLen * 0.72, 0.42 - cableLen, 0);
  slew.add(hook);

  group.add(blobShadow(1.1));

  applyAnimation(group, {
    // The jib yaws gently across the site; the hook sways a beat behind.
    armSwing: (t, dt, ctx) => {
      slew.rotation.y = Math.sin(t * 0.5 + ctx.phase) * 0.4;
      hook.rotation.x = Math.sin(t * 0.5 + ctx.phase - 0.6) * 0.06;
      hook.rotation.z = Math.sin(t * 0.8 + ctx.phase) * 0.05;
    },
  }, options, 'armSwing', 'crane');

  return group;
}

// ── excavator ───────────────────────────────────────────────────────────────
// Small digger: charcoal tracks, duck-egg cab, articulated boom + stick +
// bucket that dips in a slow digging loop. Faces +x.
// options: seed, animation: "dig"|"none"
function excavator(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();

  // Tracks: dark pads with a lighter roller strip.
  for (const s of [-1, 1]) {
    const track = paperMesh(new THREE.BoxGeometry(1.5, 0.34, 0.3), palette.charcoal, seed + s, 0.05);
    track.position.set(0, 0.19, s * 0.42);
    group.add(track);
    const guard = paperMesh(new THREE.BoxGeometry(1.3, 0.08, 0.32), palette.slateGray, seed + s + 2, 0.05);
    guard.position.set(0, 0.38, s * 0.42);
    group.add(guard);
  }

  // Deck slab across the tracks.
  const deck = paperMesh(new THREE.BoxGeometry(1.25, 0.16, 0.95), palette.slateGray, seed + 5, 0.05);
  deck.position.y = 0.48;
  group.add(deck);

  // Cab (duck-egg) toward the rear, dark front window, engine block behind.
  const cab = paperMesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), palette.duckEggBlue, seed + 6, 0.05);
  cab.position.set(-0.15, 0.86, 0.12);
  group.add(cab);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.34), darkMaterial);
  win.position.set(0.16, 0.92, 0.12);
  win.rotation.y = Math.PI / 2;
  group.add(win);
  const engine = paperMesh(new THREE.BoxGeometry(0.45, 0.4, 0.85), palette.duckEggBlue, seed + 7, 0.06);
  engine.position.set(-0.55, 0.76, 0);
  group.add(engine);

  // Articulated arm: boom pivot on the deck front, stick pivot at the boom
  // tip, bucket at the stick end. Geometries extend +x from their pivots.
  const boomLen = 0.95;
  const stickLen = 0.65;
  const boom = new THREE.Group();
  boom.position.set(0.42, 0.6, -0.12);
  const boomGeo = new THREE.BoxGeometry(boomLen, 0.16, 0.14);
  boomGeo.translate(boomLen / 2, 0, 0);
  boom.add(paperMesh(boomGeo, palette.strawGold, seed + 8, 0.05));
  group.add(boom);

  const stick = new THREE.Group();
  stick.position.set(boomLen, 0, 0);
  const stickGeo = new THREE.BoxGeometry(stickLen, 0.11, 0.11);
  stickGeo.translate(stickLen / 2, 0, 0);
  stick.add(paperMesh(stickGeo, palette.strawGold, seed + 9, 0.05));
  boom.add(stick);

  const bucket = new THREE.Group();
  bucket.position.set(stickLen, 0, 0);
  const scoopGeo = new THREE.BoxGeometry(0.3, 0.24, 0.3);
  scoopGeo.translate(0.13, -0.08, 0);
  bucket.add(paperMesh(scoopGeo, palette.slateGray, seed + 10, 0.07));
  stick.add(bucket);

  // Rest pose: boom up, stick folded down, bucket curled.
  const pose = (k) => {
    boom.rotation.z = 0.75 + k * 0.22;
    stick.rotation.z = -1.75 + Math.sin(k * Math.PI) * 0.35;
    bucket.rotation.z = -0.7 + k * 0.3;
  };
  pose(0);

  group.add(blobShadow(0.9));

  applyAnimation(group, {
    // A slow, gentle dig: dip, curl the bucket, rise — storybook pace.
    dig: (t, dt, ctx) => {
      pose(Math.sin(t * 0.55 + ctx.phase));
    },
  }, options, 'dig', 'excavator');

  return group;
}

// ── scaffold ────────────────────────────────────────────────────────────────
// Plank-brown scaffolding: four standards, ledgers per level, walk boards
// with seeded misalignment, alternating face diagonals, a leaning spare
// plank. options: seed, levels
function scaffold(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const levels = Math.max(1, options.levels ?? 2);
  const w = 2.2;
  const d = 0.9;
  const levelH = 1.2;
  const h = levels * levelH;
  const group = new THREE.Group();

  // Standards (uprights) on slate foot pads.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pole = paperMesh(new THREE.BoxGeometry(0.09, h + 0.15, 0.09), palette.barkBrown, seed + sx + sz * 2, 0.05);
      pole.position.set(sx * (w / 2), (h + 0.15) / 2, sz * (d / 2));
      group.add(pole);
      const pad = paperMesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), palette.slateGray, seed + 4 + sx + sz, 0.05);
      pad.position.set(sx * (w / 2), 0.03, sz * (d / 2));
      group.add(pad);
    }
  }

  const diagLen = Math.hypot(w, levelH);
  for (let lv = 1; lv <= levels; lv += 1) {
    const y = lv * levelH;
    // Ledgers along x (front/back) and z (sides).
    for (const s of [-1, 1]) {
      const lx = paperMesh(new THREE.BoxGeometry(w + 0.12, 0.07, 0.07), palette.tanBrown, seed + 10 + lv + s, 0.05);
      lx.position.set(0, y, s * (d / 2));
      group.add(lx);
      const lz = paperMesh(new THREE.BoxGeometry(0.07, 0.07, d), palette.tanBrown, seed + 20 + lv + s, 0.05);
      lz.position.set(s * (w / 2), y, 0);
      group.add(lz);
    }
    // Walk boards, each slightly shifted and skewed.
    for (let b = 0; b < 3; b += 1) {
      const board = paperMesh(new THREE.BoxGeometry(w * (0.94 + r() * 0.1), 0.06, 0.24), palette.plankBrown, seed + 30 + lv * 5 + b, 0.06);
      board.position.set((r() - 0.5) * 0.18, y + 0.065, (b - 1) * 0.27 + (r() - 0.5) * 0.04);
      board.rotation.y = (r() - 0.5) * 0.06;
      group.add(board);
    }
    // Front-face diagonal, direction alternating per level.
    const diag = paperMesh(new THREE.BoxGeometry(diagLen * 0.92, 0.06, 0.06), palette.barkBrown, seed + 40 + lv, 0.05);
    diag.position.set(0, y - levelH / 2, d / 2 + 0.05);
    diag.rotation.z = (lv % 2 ? 1 : -1) * Math.atan2(levelH, w);
    group.add(diag);
  }

  // A spare plank leaning against the frame.
  const spare = paperMesh(new THREE.BoxGeometry(0.22, 1.3, 0.05), palette.plankBrown, seed + 50, 0.06);
  spare.position.set(-w * 0.34, 0.6, d / 2 + 0.18);
  spare.rotation.x = -0.28;
  spare.rotation.z = (r() - 0.5) * 0.1;
  group.add(spare);

  group.add(blobShadow(w * 0.55));
  return group;
}

// ── trafficCone ─────────────────────────────────────────────────────────────
// Dusty-rose cone with a paper-white band on a square base. options: seed
function trafficCone(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();

  const base = paperMesh(new THREE.BoxGeometry(0.34, 0.06, 0.34), palette.dustyRose, seed, 0.05);
  base.position.y = 0.03;
  group.add(base);
  const lower = paperMesh(new THREE.CylinderGeometry(0.125, 0.16, 0.14, 7), palette.dustyRose, seed + 1, 0.06);
  lower.position.y = 0.13;
  group.add(lower);
  const band = paperMesh(new THREE.CylinderGeometry(0.09, 0.12, 0.1, 7), palette.paperWhite, seed + 2, 0.05);
  band.position.y = 0.25;
  group.add(band);
  const tip = paperMesh(new THREE.ConeGeometry(0.088, 0.16, 7), palette.dustyRose, seed + 3, 0.06);
  tip.position.y = 0.38;
  group.add(tip);

  group.add(blobShadow(0.24));
  return group;
}

// ── builder ─────────────────────────────────────────────────────────────────
// Big-headed animal builder: straw-gold hard hat and hi-vis vest with a
// white stripe, hammer in the right hand. options: seed,
// animal: "bear"|"fox"|"badger", animation: "idle"|"hammer"|"none"
const BUILDER_ANIMALS = {
  bear: { head: palette.tanBrown, ears: 'round', earColor: palette.deepBrown, muzzle: palette.cream },
  fox: { head: palette.strawGold, ears: 'pointy', earColor: palette.deepBrown, muzzle: palette.cream },
  badger: { head: palette.cream, ears: 'round', earColor: palette.barkBrown, muzzle: palette.barkBrown },
};

function builder(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const animal = BUILDER_ANIMALS[options.animal]
    ? options.animal : ['bear', 'fox', 'badger'][Math.floor(r() * 3)];
  const spec = BUILDER_ANIMALS[animal];
  const group = new THREE.Group();

  // Legs + hi-vis vest body with a white stripe band.
  for (const side of [-1, 1]) {
    const leg = paperMesh(new THREE.BoxGeometry(0.14, 0.24, 0.16), palette.slateGray, seed + side);
    leg.position.set(side * 0.14, 0.12, 0);
    group.add(leg);
  }
  const body = paperMesh(new THREE.BoxGeometry(0.52, 0.66, 0.38), palette.strawGold, seed + 3, 0.05);
  body.position.y = 0.55;
  group.add(body);
  const stripe = paperMesh(new THREE.BoxGeometry(0.54, 0.09, 0.4), palette.paperWhite, seed + 4, 0.03);
  stripe.position.y = 0.62;
  group.add(stripe);

  // Left arm hangs; right arm is a shoulder pivot carrying the hammer.
  const armL = paperMesh(new THREE.BoxGeometry(0.1, 0.34, 0.14), palette.cream, seed + 5, 0.04);
  armL.position.set(-0.33, 0.6, 0);
  armL.rotation.z = -0.12;
  group.add(armL);
  const armR = new THREE.Group();
  armR.position.set(0.33, 0.78, 0);
  const armGeo = new THREE.BoxGeometry(0.1, 0.36, 0.14);
  armGeo.translate(0, -0.18, 0); // pivot at the shoulder
  armR.add(paperMesh(armGeo, palette.cream, seed + 6, 0.04));
  const handle = paperMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6), palette.plankBrown, seed + 7, 0.04);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, -0.36, 0.14);
  armR.add(handle);
  const hammerHead = paperMesh(new THREE.BoxGeometry(0.09, 0.09, 0.15), palette.slateGray, seed + 8, 0.05);
  hammerHead.position.set(0, -0.36, 0.3);
  armR.add(hammerHead);
  armR.rotation.z = 0.14;
  group.add(armR);

  // Big head, animal dressing, hard hat.
  const head = new THREE.Group();
  const face = paperMesh(new THREE.BoxGeometry(0.6, 0.48, 0.42), spec.head, seed + 9, 0.05);
  head.add(face);
  const eyes = [];
  for (const side of [-1, 1]) {
    let ear;
    if (spec.ears === 'pointy') {
      ear = paperMesh(new THREE.ConeGeometry(0.1, 0.26, 4), spec.earColor, seed + 10, 0.06);
      ear.position.set(side * 0.21, 0.32, 0);
    } else {
      const earGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.07, 8);
      earGeo.rotateX(Math.PI / 2);
      ear = paperMesh(earGeo, spec.earColor, seed + 10, 0.06);
      ear.position.set(side * 0.28, 0.24, -0.02);
    }
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), darkMaterial.clone());
    eye.position.set(side * 0.14, 0.04, 0.215);
    head.add(eye);
    eyes.push(eye);
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.065, 8),
      new THREE.MeshBasicMaterial({ color: palette.cheekPink, transparent: true, opacity: 0.85 }),
    );
    cheek.position.set(side * 0.23, -0.09, 0.215);
    head.add(cheek);
  }
  if (spec.muzzle) {
    const muzzle = paperMesh(new THREE.BoxGeometry(0.2, 0.14, 0.08), spec.muzzle, seed + 11, 0.04);
    muzzle.position.set(0, -0.06, 0.22);
    head.add(muzzle);
  }
  const nose = new THREE.Mesh(new THREE.CircleGeometry(0.03, 6), darkMaterial);
  nose.position.set(0, -0.04, spec.muzzle ? 0.265 : 0.215);
  head.add(nose);

  // Straw-gold hard hat: dome cap + brim, sitting above the ears.
  const domeGeo = new THREE.SphereGeometry(0.32, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.46);
  domeGeo.scale(1, 0.9, 0.8);
  const dome = paperMesh(domeGeo, palette.strawGold, seed + 12, 0.06);
  dome.position.y = 0.22;
  head.add(dome);
  const brim = paperMesh(new THREE.CylinderGeometry(0.36, 0.38, 0.05, 9), palette.strawGold, seed + 13, 0.05);
  brim.scale.z = 0.85;
  brim.position.y = 0.22;
  head.add(brim);

  const headRestY = 1.12;
  head.position.y = headRestY;
  group.add(head);
  group.add(blobShadow(0.42));

  let nextBlink = 1.5 + r() * 3;
  const blink = (dt) => {
    nextBlink -= dt;
    if (nextBlink < 0) nextBlink = 2 + r() * 3.5;
    const s = nextBlink < 0.1 ? 0.12 : 1;
    for (const e of eyes) e.scale.y = s;
  };
  applyAnimation(group, {
    idle: (t, dt, ctx) => {
      body.scale.setScalar(1 + Math.sin(t * 1.7 + ctx.phase) * 0.015);
      head.position.y = headRestY + Math.sin(t * 1.7 + ctx.phase) * 0.025;
      head.rotation.z = Math.sin(t * 0.45 + ctx.phase) * 0.05;
      head.rotation.y = Math.sin(t * 0.3 + ctx.phase * 1.7) * 0.12;
      blink(dt);
    },
    // Gentle tap-tap with the hammer arm, head nodding along.
    hammer: (t, dt, ctx) => {
      armR.rotation.x = -0.7 + Math.sin(t * 3 + ctx.phase) * 0.35;
      head.rotation.x = Math.sin(t * 3 + ctx.phase - 0.4) * 0.04;
      body.scale.setScalar(1 + Math.sin(t * 1.7 + ctx.phase) * 0.012);
      blink(dt);
    },
  }, options, 'idle', 'builder');

  return group;
}

register('crane', crane);
register('excavator', excavator);
register('scaffold', scaffold);
register('trafficCone', trafficCone);
register('builder', builder);

import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, prismGeometry, blobShadow, applyAnimation,
} from './helpers.js';

// The school pack: a two-storey schoolhouse with a bell
// gable and clock, a chalk blackboard on easel legs, wooden pupil desks
// with attached benches, big-headed schoolkid characters with backpacks,
// and a straw-gold school bus that patrols a road lane.

const litMaterial = new THREE.MeshBasicMaterial({ color: palette.windowLit });
const darkMaterial = new THREE.MeshBasicMaterial({ color: palette.charcoal });

// ── schoolhouse ─────────────────────────────────────────────────────────────
// Two-storey cream building with a dusty-rose gabled roof, a small bell
// gable astride the ridge, a clock face on the front gable and two rows of
// windows. options: seed, wallColor, roofColor
function schoolhouse(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const wallColor = options.wallColor ?? palette.cream;
  const roofColor = options.roofColor ?? palette.dustyRose;
  const width = 4.6;
  const depth = 2.6;
  const wallH = 2.7;
  const roofH = 0.95;

  const group = new THREE.Group();

  const body = paperMesh(new THREE.BoxGeometry(width, wallH, depth), wallColor, seed, 0.05);
  body.position.y = wallH / 2;
  group.add(body);

  // Thin trim band between the two storeys.
  const trim = paperMesh(new THREE.BoxGeometry(width + 0.06, 0.1, depth + 0.06), palette.parchment, seed + 1, 0.04);
  trim.position.y = wallH * 0.53;
  group.add(trim);

  // Gabled roof with eaves overhang.
  const roof = paperMesh(prismGeometry(width * 1.12, roofH, depth * 1.2), roofColor, seed + 2, 0.06);
  roof.position.y = wallH;
  group.add(roof);

  const front = depth / 2 + 0.01;

  // Front gable panel carrying the clock face.
  const gable = paperMesh(prismGeometry(width * 1.02, roofH * 0.92, 0.14), wallColor, seed + 3, 0.04);
  gable.position.set(0, wallH, front - 0.02);
  group.add(gable);
  const clockRing = paperMesh(new THREE.RingGeometry(0.26, 0.33, 12), palette.deepBrown, seed + 4, 0.02);
  clockRing.position.set(0, wallH + 0.34, front + 0.07);
  group.add(clockRing);
  const clockFace = paperMesh(new THREE.CircleGeometry(0.26, 12), palette.paperWhite, seed + 5, 0.02);
  clockFace.position.set(0, wallH + 0.34, front + 0.065);
  group.add(clockFace);
  // Two charcoal hands at a seeded time of day.
  for (const [len, ang] of [[0.19, r() * Math.PI * 2], [0.13, r() * Math.PI * 2]]) {
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.035, len, 0.01), darkMaterial);
    hand.geometry.translate(0, len / 2, 0);
    hand.position.set(0, wallH + 0.34, front + 0.075);
    hand.rotation.z = ang;
    group.add(hand);
  }

  // Bell gable astride the ridge: little cream post, dark arch, gold bell.
  const belfry = new THREE.Group();
  const post = paperMesh(new THREE.BoxGeometry(0.5, 0.55, 0.3), wallColor, seed + 6, 0.05);
  post.position.y = 0.24;
  belfry.add(post);
  const arch = paperMesh(new THREE.CircleGeometry(0.14, 10), palette.charcoal, seed + 7, 0.02);
  arch.position.set(0, 0.3, 0.16);
  belfry.add(arch);
  const bell = paperMesh(new THREE.CylinderGeometry(0.05, 0.11, 0.15, 7), palette.sunGold, seed + 8, 0.05);
  bell.position.set(0, 0.3, 0.17);
  belfry.add(bell);
  const clapper = paperMesh(new THREE.IcosahedronGeometry(0.03, 0), palette.deepBrown, seed + 9);
  clapper.position.set(0, 0.2, 0.17);
  belfry.add(clapper);
  const cap = paperMesh(prismGeometry(0.66, 0.3, 0.44), roofColor, seed + 10, 0.05);
  cap.position.y = 0.5;
  belfry.add(cap);
  belfry.position.y = wallH + roofH - 0.06;
  group.add(belfry);

  // Double plank door with lintel + a stone step.
  for (const side of [-1, 1]) {
    const leaf = paperMesh(new THREE.BoxGeometry(0.4, 1.35, 0.08), palette.plankBrown, seed + 11 + side);
    leaf.position.set(side * 0.21, 0.675, front);
    group.add(leaf);
  }
  const lintel = paperMesh(new THREE.BoxGeometry(1.0, 0.12, 0.1), palette.plankBrown, seed + 14);
  lintel.position.set(0, 1.41, front);
  group.add(lintel);
  const step = paperMesh(new THREE.BoxGeometry(1.1, 0.12, 0.32), palette.stoneGray, seed + 15, 0.05);
  step.position.set(0, 0.06, front + 0.12);
  group.add(step);

  // Two rows of framed windows, each pane randomly lit or dark.
  const winCols = [-1.55, -0.85, 0.85, 1.55];
  for (const [row, wy] of [[0, 0.95], [1, 2.05]]) {
    for (const wx of winCols) {
      if (row === 0 && Math.abs(wx) < 1.0) continue; // door takes the middle
      const frame = paperMesh(new THREE.BoxGeometry(0.5, 0.62, 0.05), palette.paperWhite, seed + 20 + row, 0.03);
      frame.position.set(wx, wy, front);
      group.add(frame);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.5), r() < 0.45 ? litMaterial : darkMaterial);
      pane.position.set(wx, wy, front + 0.03);
      group.add(pane);
    }
  }

  group.add(blobShadow(width * 0.6));
  return group;
}

// ── blackboard ──────────────────────────────────────────────────────────────
// Kid-sized standing easel board: wood frame, dark slate surface with light
// chalk scribbles. options: seed, variant: "lines" (rows of chalk writing)
// | "figures" (sun, house, stick figure)
function blackboard(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const variant = ['lines', 'figures'].includes(options.variant)
    ? options.variant : (r() < 0.5 ? 'lines' : 'figures');
  const group = new THREE.Group();
  const boardY = 0.84;
  const tilt = -0.08;

  const frame = paperMesh(new THREE.BoxGeometry(1.2, 0.92, 0.06), palette.barkBrown, seed, 0.04);
  frame.position.set(0, boardY, 0);
  frame.rotation.x = tilt;
  group.add(frame);
  const slate = paperMesh(new THREE.BoxGeometry(1.06, 0.78, 0.03), palette.charcoal, seed + 1, 0.02);
  slate.position.set(0, boardY, 0.035);
  slate.rotation.x = tilt;
  group.add(slate);

  // Chalk scribbles drawn on a small canvas (paperWhite strokes).
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(246, 242, 232, 0.7)';
  ctx.lineWidth = 3;
  if (variant === 'lines') {
    // Rows of wavy chalk "writing".
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      let x = 22 + r() * 20;
      const y = 34 + i * 38 + r() * 10;
      ctx.moveTo(x, y);
      const rowLen = 150 + r() * 60;
      while (x < 22 + rowLen) {
        const nx = x + 18 + r() * 22;
        ctx.quadraticCurveTo(x + 9 + r() * 10, y + (r() - 0.5) * 22, nx, y + (r() - 0.5) * 10);
        x = nx;
      }
      ctx.stroke();
    }
  } else {
    // Sun with rays.
    const sx = 48 + r() * 20;
    const sy = 46 + r() * 14;
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + r() * 0.4;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * 20, sy + Math.sin(a) * 20);
      ctx.lineTo(sx + Math.cos(a) * 30, sy + Math.sin(a) * 30);
      ctx.stroke();
    }
    // Little house: square + triangle roof.
    const hx = 150 + r() * 30;
    const hy = 60 + r() * 16;
    ctx.strokeRect(hx, hy, 44, 36);
    ctx.beginPath();
    ctx.moveTo(hx - 5, hy);
    ctx.lineTo(hx + 22, hy - 26);
    ctx.lineTo(hx + 49, hy);
    ctx.stroke();
    // Stick figure: head, body, arms, legs.
    const fx = 70 + r() * 90;
    const fy = 128 + r() * 10;
    ctx.beginPath();
    ctx.arc(fx, fy, 10, 0, Math.PI * 2);
    ctx.moveTo(fx, fy + 10); ctx.lineTo(fx, fy + 34);
    ctx.moveTo(fx - 14, fy + 20); ctx.lineTo(fx + 14, fy + 20);
    ctx.moveTo(fx, fy + 34); ctx.lineTo(fx - 11, fy + 52);
    ctx.moveTo(fx, fy + 34); ctx.lineTo(fx + 11, fy + 52);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.72),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  face.position.set(0, boardY, 0.055);
  face.rotation.x = tilt;
  group.add(face);

  // A-frame easel: splayed side legs behind the board, rear kickstand,
  // chalk tray in front (with a chalk stick).
  for (const sx of [-1, 1]) {
    const leg = paperMesh(new THREE.BoxGeometry(0.07, 1.42, 0.07), palette.barkBrown, seed + sx, 0.05);
    leg.position.set(sx * 0.5, 0.68, -0.07);
    leg.rotation.z = -sx * 0.11;
    leg.rotation.x = tilt;
    group.add(leg);
  }
  const legBack = paperMesh(new THREE.BoxGeometry(0.07, 1.32, 0.07), palette.barkBrown, seed + 5, 0.05);
  legBack.position.set(0, 0.62, -0.26);
  legBack.rotation.x = 0.3;
  group.add(legBack);
  const tray = paperMesh(new THREE.BoxGeometry(1.1, 0.06, 0.13), palette.barkBrown, seed + 6, 0.05);
  tray.position.set(0, 0.4, 0.1);
  tray.rotation.x = tilt;
  group.add(tray);
  const chalk = paperMesh(new THREE.BoxGeometry(0.09, 0.025, 0.025), palette.paperWhite, seed + 7);
  chalk.position.set(0.3, 0.44, 0.1);
  group.add(chalk);

  group.add(blobShadow(0.55));
  return group;
}

// ── schoolDesk ──────────────────────────────────────────────────────────────
// Old-style pupil desk: slightly slanted tan top with an attached bench,
// joined by floor runners; a little book on top. options: seed
function schoolDesk(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const group = new THREE.Group();
  const wood = palette.tanBrown;

  // Desk top (gently slanted toward the sitter) + front panel.
  const top = paperMesh(new THREE.BoxGeometry(1.0, 0.07, 0.42), wood, seed, 0.05);
  top.position.set(0, 0.6, 0.02);
  top.rotation.x = 0.07;
  group.add(top);
  const panel = paperMesh(new THREE.BoxGeometry(0.96, 0.26, 0.05), wood, seed + 1, 0.05);
  panel.position.set(0, 0.46, 0.2);
  group.add(panel);

  // Side slab legs, bench supports and the floor runners joining them.
  for (const sx of [-1, 1]) {
    const leg = paperMesh(new THREE.BoxGeometry(0.07, 0.58, 0.36), palette.deepBrown, seed + 2 + sx, 0.05);
    leg.position.set(sx * 0.45, 0.29, 0.02);
    group.add(leg);
    const support = paperMesh(new THREE.BoxGeometry(0.07, 0.34, 0.22), palette.deepBrown, seed + 5 + sx, 0.05);
    support.position.set(sx * 0.45, 0.17, -0.48);
    group.add(support);
    const runner = paperMesh(new THREE.BoxGeometry(0.07, 0.05, 0.82), palette.deepBrown, seed + 8 + sx, 0.04);
    runner.position.set(sx * 0.45, 0.03, -0.16);
    group.add(runner);
  }

  // Attached bench seat.
  const seat = paperMesh(new THREE.BoxGeometry(1.0, 0.06, 0.28), wood, seed + 11, 0.05);
  seat.position.set(0, 0.37, -0.48);
  group.add(seat);

  // A book left on the desk, seeded color and skew.
  const bookColors = [palette.dustyRose, palette.sage, palette.duckEggBlue];
  const book = paperMesh(new THREE.BoxGeometry(0.24, 0.04, 0.32), bookColors[Math.floor(r() * bookColors.length)], seed + 12, 0.04);
  book.position.set((r() - 0.5) * 0.5, 0.67, 0.02);
  book.rotation.set(0.07, (r() - 0.5) * 0.5, 0);
  group.add(book);

  group.add(blobShadow(0.6));
  return group;
}

// ── pupil ───────────────────────────────────────────────────────────────────
// Big-headed schoolkid with a backpack, smaller than citizen/officeWorker.
// options: seed, animal: "fox"|"bunny"|"bear"|"cat",
// animation: "idle"|"wiggle"|"none"
const PUPILS = {
  fox: { head: palette.strawGold, ears: 'pointy', earColor: palette.strawGold, muzzle: palette.cream, shirt: palette.dustyRose, pack: palette.sage },
  bunny: { head: palette.paperWhite, ears: 'long', earColor: palette.paperWhite, muzzle: null, shirt: palette.duckEggBlue, pack: palette.dustyRose },
  bear: { head: palette.tanBrown, ears: 'round', earColor: palette.deepBrown, muzzle: palette.cream, shirt: palette.sage, pack: palette.strawGold },
  cat: { head: palette.wolfGray, ears: 'pointy', earColor: palette.wolfGrayDark, muzzle: null, shirt: palette.roseMauve, pack: palette.duckEggBlue },
};

function pupil(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const animal = PUPILS[options.animal]
    ? options.animal : ['fox', 'bunny', 'bear', 'cat'][Math.floor(r() * 4)];
  const spec = PUPILS[animal];
  const group = new THREE.Group();
  const figure = new THREE.Group(); // everything but the shadow — wiggles as one
  group.add(figure);

  // Stubby legs + shirt-colored box body with short arms.
  for (const side of [-1, 1]) {
    const leg = paperMesh(new THREE.BoxGeometry(0.12, 0.22, 0.14), palette.deepBrown, seed + side);
    leg.position.set(side * 0.11, 0.11, 0);
    figure.add(leg);
    const arm = paperMesh(new THREE.BoxGeometry(0.09, 0.28, 0.12), spec.shirt, seed + side + 3, 0.04);
    arm.position.set(side * 0.26, 0.46, 0);
    arm.rotation.z = side * 0.14;
    figure.add(arm);
  }
  const body = paperMesh(new THREE.BoxGeometry(0.42, 0.44, 0.3), spec.shirt, seed + 6, 0.05);
  body.position.y = 0.44;
  figure.add(body);

  // Backpack on the back with two shoulder straps.
  const pack = paperMesh(new THREE.BoxGeometry(0.32, 0.36, 0.15), spec.pack, seed + 7, 0.06);
  pack.position.set(0, 0.5, -0.24);
  figure.add(pack);
  const flap = paperMesh(new THREE.BoxGeometry(0.32, 0.12, 0.16), spec.pack, seed + 8, 0.05);
  flap.position.set(0, 0.65, -0.235);
  figure.add(flap);
  for (const side of [-1, 1]) {
    const strap = paperMesh(new THREE.BoxGeometry(0.06, 0.04, 0.34), palette.deepBrown, seed + 9 + side);
    strap.position.set(side * 0.12, 0.665, -0.03);
    figure.add(strap);
  }

  // Big round head with animal ears, dot eyes, blush cheeks.
  const head = new THREE.Group();
  const skullGeo = new THREE.IcosahedronGeometry(0.34, 1);
  skullGeo.scale(1, 0.95, 0.75);
  const skull = paperMesh(skullGeo, spec.head, seed + 12, 0.05);
  head.add(skull);
  if (spec.muzzle) {
    const muzzle = paperMesh(new THREE.ConeGeometry(0.11, 0.26, 4), spec.muzzle, seed + 13, 0.04);
    muzzle.rotation.x = Math.PI;
    muzzle.position.set(0, 0.03, 0.22);
    head.add(muzzle);
  }
  for (const side of [-1, 1]) {
    let ear;
    if (spec.ears === 'pointy') {
      ear = paperMesh(new THREE.ConeGeometry(0.09, 0.22, 4), spec.earColor, seed + 14, 0.06);
      ear.position.set(side * 0.2, 0.32, 0);
    } else if (spec.ears === 'long') {
      ear = paperMesh(new THREE.ConeGeometry(0.07, 0.44, 5), spec.earColor, seed + 14, 0.06);
      ear.position.set(side * 0.12, 0.46, 0);
      ear.rotation.z = -side * 0.15;
    } else { // round
      const earGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10);
      earGeo.rotateX(Math.PI / 2);
      ear = paperMesh(earGeo, spec.earColor, seed + 14, 0.06);
      ear.position.set(side * 0.26, 0.26, -0.02);
    }
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), darkMaterial.clone());
    eye.position.set(side * 0.13, 0.04, 0.26);
    head.add(eye);
    head.userData[side === -1 ? 'eyeL' : 'eyeR'] = eye;
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.06, 8),
      new THREE.MeshBasicMaterial({ color: palette.cheekPink, transparent: true, opacity: 0.85 }),
    );
    cheek.position.set(side * 0.22, -0.07, 0.245);
    head.add(cheek);
  }
  const nose = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), darkMaterial);
  nose.position.set(0, -0.03, 0.265);
  head.add(nose);

  const headRestY = 0.98;
  head.position.y = headRestY;
  figure.add(head);
  group.add(blobShadow(0.3));

  // Shared blink for both animations.
  let nextBlink = 1.5 + r() * 3;
  const blink = (dt) => {
    nextBlink -= dt;
    if (nextBlink < 0) nextBlink = 2 + r() * 3;
    const s = nextBlink < 0.1 ? 0.12 : 1;
    head.userData.eyeL.scale.y = s;
    head.userData.eyeR.scale.y = s;
  };

  // Look-around: the head eases toward a new seeded yaw every few seconds.
  let lookTimer = 1 + r() * 2;
  let lookTarget = 0;
  applyAnimation(group, {
    idle: (t, dt, ctx) => {
      body.scale.setScalar(1 + Math.sin(t * 1.9 + ctx.phase) * 0.015);
      head.position.y = headRestY + Math.sin(t * 1.9 + ctx.phase) * 0.02;
      lookTimer -= dt;
      if (lookTimer < 0) {
        lookTimer = 1.6 + r() * 2.6;
        lookTarget = (r() - 0.5) * 0.8;
      }
      head.rotation.y += (lookTarget - head.rotation.y) * Math.min(1, dt * 4);
      blink(dt);
    },
    wiggle: (t, dt, ctx) => {
      figure.rotation.z = Math.sin(t * 2.6 + ctx.phase) * 0.07;
      head.rotation.z = Math.sin(t * 2.6 + ctx.phase + 0.5) * 0.06;
      blink(dt);
    },
  }, options, 'idle', 'pupil');

  return group;
}

// ── schoolBus ───────────────────────────────────────────────────────────────
// Straw-gold bus with a lighter cream side band. Same footprint and drive
// contract as city.js `bus`: patrols [from, to] world-x at its placed z, so
// it can drive a `meta.roads` lane. options: seed, color, path: [x1, x2],
// speed, startAt, direction, animation: "drive"|"none"

const hubMaterial = new THREE.MeshBasicMaterial({ color: palette.stoneGray });

function roundedBoxShape(L, H, radius) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2 + radius, 0);
  s.lineTo(L / 2 - radius, 0);
  s.quadraticCurveTo(L / 2, 0, L / 2, radius);
  s.lineTo(L / 2, H - radius);
  s.quadraticCurveTo(L / 2, H, L / 2 - radius, H);
  s.lineTo(-L / 2 + radius, H);
  s.quadraticCurveTo(-L / 2, H, -L / 2, H - radius);
  s.lineTo(-L / 2, radius);
  s.quadraticCurveTo(-L / 2, 0, -L / 2 + radius, 0);
  s.closePath();
  return s;
}

function extrudeCentered(shape, depth, color, seed) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 5 });
  geo.translate(0, 0, -depth / 2);
  return paperMesh(geo, color, seed, 0.06);
}

// Windows/lights mirrored on both sides so the bus reads either direction.
function addBothSides(group, makeMesh, x, y, z) {
  for (const side of [1, -1]) {
    const mesh = makeMesh();
    mesh.position.set(x, y, side * z);
    if (side < 0) mesh.rotation.y = Math.PI;
    group.add(mesh);
  }
}

function addAxle(group, wheels, x, wheelR, bodyDepth, seed) {
  for (const side of [1, -1]) {
    const wheel = new THREE.Group();
    const tire = paperMesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.15, 9), palette.charcoal, seed + side, 0.06);
    tire.rotation.x = Math.PI / 2;
    wheel.add(tire);
    const hub = new THREE.Mesh(new THREE.CircleGeometry(wheelR * 0.42, 8), hubMaterial);
    hub.position.z = side * 0.08;
    if (side < 0) hub.rotation.y = Math.PI;
    wheel.add(hub);
    wheel.position.set(x, wheelR + 0.05, side * (bodyDepth / 2 - 0.03));
    group.add(wheel);
    wheels.push(wheel);
  }
}

// Same ping-pong drive contract as city.js vehicles.
function makeDriveAnimation(group, wheels, wheelR, options, speedDefault) {
  const path = Array.isArray(options.path) && options.path.length >= 2
    ? [Number(options.path[0][0] ?? options.path[0]) || 0, Number(options.path[1][0] ?? options.path[1]) || 0]
    : [-6, 6];
  const minX = Math.min(...path);
  const maxX = Math.max(...path);
  const speed = options.speed ?? speedDefault;
  let pos = minX + (maxX - minX) * (options.startAt ?? Math.random());
  let dir = options.direction === -1 ? -1 : 1;
  let baseX = null;

  return (t, dt) => {
    if (baseX === null) baseX = group.position.x;
    pos += speed * dt * dir;
    if (pos > maxX) { pos = maxX; dir = -1; }
    if (pos < minX) { pos = minX; dir = 1; }
    group.position.x = baseX + pos;
    group.rotation.y = dir === 1 ? 0 : Math.PI;
    for (const w of wheels) w.rotation.z -= (speed * dt) / wheelR;
  };
}

function schoolBus(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();
  const wheels = [];
  const wheelR = 0.22;
  const depth = 0.6;
  const length = 3.4;
  const bodyLift = 0.26; // body floats above the wheels

  // One tall rounded lozenge, straw-gold, with a lighter band along the side.
  const body = extrudeCentered(roundedBoxShape(length, 1.16, 0.2), depth, options.color ?? palette.strawGold, seed);
  body.position.y = bodyLift;
  group.add(body);
  const band = extrudeCentered(roundedBoxShape(length - 0.12, 0.2, 0.08), depth + 0.02, palette.cream, seed + 1);
  band.position.y = bodyLift + 0.42;
  group.add(band);

  // Window row above the band, both sides.
  for (let i = 0; i < 4; i += 1) {
    const wx = -length * 0.32 + i * (length * 0.64) / 3;
    addBothSides(group, () => new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.3), darkMaterial), wx, bodyLift + 0.88, depth / 2 + 0.02);
  }
  // Door up front on both sides.
  addBothSides(group, () => new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.72), darkMaterial), length * 0.38, bodyLift + 0.42, depth / 2 + 0.02);
  // Headlight dot at the nose, both sides.
  addBothSides(group, () => new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), litMaterial), length / 2 - 0.06, bodyLift + 0.3, 0.31);

  addAxle(group, wheels, -length * 0.3, wheelR, depth, seed + 10);
  addAxle(group, wheels, length * 0.3, wheelR, depth, seed + 20);

  group.add(blobShadow(length * 0.42));

  applyAnimation(group, {
    drive: makeDriveAnimation(group, wheels, wheelR, options, 2.4),
  }, options, 'drive', 'schoolBus');

  return group;
}

register('schoolhouse', schoolhouse);
register('blackboard', blackboard);
register('schoolDesk', schoolDesk);
register('pupil', pupil);
register('schoolBus', schoolBus);

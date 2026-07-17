import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, prismGeometry, blobShadow, applyAnimation,
} from './helpers.js';

// The civic-services pack: garbage truck on its rounds, recycling bins, the
// waste-to-energy (ZEVO) plant with its puffing chimney, carers, elders,
// a football goal with its ball, and a parent strolling with a pram.

const litMaterial = new THREE.MeshBasicMaterial({ color: palette.windowLit });
const darkMaterial = new THREE.MeshBasicMaterial({ color: palette.charcoal });
const hubMaterial = new THREE.MeshBasicMaterial({ color: palette.stoneGray });

// Decals mirrored on both sides (+z and −z, back side turned around).
function addBothSides(group, makeMesh, x, y, z) {
  for (const side of [1, -1]) {
    const mesh = makeMesh();
    mesh.position.set(x, y, side * z);
    if (side < 0) mesh.rotation.y = Math.PI;
    group.add(mesh);
  }
}

// One axle = two wheels, one per side, hubs facing outward (city.js pattern).
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

// Same drive contract as car/bus in city.js: ping-pong along a prop-local x
// path at the placed z, flipping around at the ends, wheels spinning.
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

// ── garbageTruck ────────────────────────────────────────────────────────────
// Boxy municipal truck: sage cargo box with a leaning rear gate, cream cab up
// front, six wheels. Patrols a road lane exactly like car/bus.
// options: seed, color, path: [x1, x2], speed, startAt, direction,
// animation: "drive"|"none"
function garbageTruck(options = {}) {
  const seed = options.seed ?? 0;
  const color = options.color ?? palette.sage;
  const group = new THREE.Group();
  const wheels = [];
  const wheelR = 0.24;
  const depth = 0.72;
  const bodyLift = 0.28; // body floats above the wheels
  const length = 2.4;

  // Chassis rail under everything.
  const chassis = paperMesh(new THREE.BoxGeometry(length, 0.16, depth - 0.06), palette.charcoal, seed, 0.04);
  chassis.position.y = bodyLift + 0.08;
  group.add(chassis);

  // Cab at the nose (+x), windshield band and side windows.
  const cab = paperMesh(new THREE.BoxGeometry(0.68, 0.82, depth), color, seed + 1, 0.06);
  cab.position.set(length / 2 - 0.36, bodyLift + 0.55, 0);
  group.add(cab);
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), darkMaterial);
  windshield.rotation.y = Math.PI / 2;
  windshield.position.set(length / 2 + 0.01, bodyLift + 0.72, 0);
  group.add(windshield);
  addBothSides(group, () => new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.26), darkMaterial), length / 2 - 0.3, bodyLift + 0.72, depth / 2 + 0.02);

  // Cargo box — the bin body, slightly domed by a cream roof strip.
  const box = paperMesh(new THREE.BoxGeometry(1.52, 1.02, depth + 0.04), color, seed + 2, 0.07);
  box.position.set(-0.32, bodyLift + 0.66, 0);
  group.add(box);
  const roofStrip = paperMesh(new THREE.BoxGeometry(1.42, 0.1, depth - 0.12), palette.cream, seed + 3, 0.05);
  roofStrip.position.set(-0.32, bodyLift + 1.2, 0);
  group.add(roofStrip);

  // Visible rear gate — a darker plate leaning off the tail.
  const gate = paperMesh(new THREE.BoxGeometry(0.12, 0.94, depth - 0.04), palette.sageDark, seed + 4, 0.06);
  gate.position.set(-length / 2 + 0.1, bodyLift + 0.62, 0);
  gate.rotation.z = 0.16;
  group.add(gate);

  addAxle(group, wheels, length * 0.33, wheelR, depth, seed + 10);
  addAxle(group, wheels, -length * 0.18, wheelR, depth, seed + 20);
  addAxle(group, wheels, -length * 0.38, wheelR, depth, seed + 30);

  // Headlight dots at the nose, both sides.
  addBothSides(group, () => new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), litMaterial), length / 2 - 0.05, bodyLift + 0.32, depth / 2 - 0.02);

  group.add(blobShadow(length * 0.42));

  applyAnimation(group, {
    drive: makeDriveAnimation(group, wheels, wheelR, options, 2.2),
  }, options, 'drive', 'garbageTruck');

  return group;
}

// ── recyclingBin ────────────────────────────────────────────────────────────
// Wheeled kerbside bin: tapered square body, flat overhanging lid with a
// handle, two back wheels, paper-white sorting label. `color` picks the
// stream. options: seed, color
function recyclingBin(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const color = options.color
    ?? [palette.duckEggBlue, palette.sunGold, palette.sage, palette.dustyRose][Math.floor(r() * 4)];
  const group = new THREE.Group();

  // Tapered square body (4-sided cylinder turned flat-side forward).
  const bodyGeo = new THREE.CylinderGeometry(0.29, 0.24, 0.54, 4);
  bodyGeo.rotateY(Math.PI / 4);
  const body = paperMesh(bodyGeo, color, seed, 0.06);
  body.position.y = 0.33;
  group.add(body);

  // Flat lid, slightly overhanging, with a stub handle at the front.
  const lid = paperMesh(new THREE.BoxGeometry(0.48, 0.07, 0.48), color, seed + 1, 0.05);
  lid.position.y = 0.63;
  group.add(lid);
  const handle = paperMesh(new THREE.BoxGeometry(0.16, 0.05, 0.07), palette.charcoal, seed + 2, 0.03);
  handle.position.set(0, 0.68, 0.19);
  group.add(handle);

  // Sorting label on the front.
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), new THREE.MeshBasicMaterial({ color: palette.paperWhite }));
  label.position.set(0, 0.38, 0.19);
  group.add(label);

  // Two back wheels.
  for (const side of [-1, 1]) {
    const wheel = paperMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), palette.charcoal, seed + side + 5, 0.05);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(side * 0.14, 0.07, -0.2);
    group.add(wheel);
  }

  group.add(blobShadow(0.32));
  return group;
}

// ── zevoPlant ───────────────────────────────────────────────────────────────
// Waste-to-energy hall: long gabled hall with a lit window band, teal intake
// door, and a tall banded chimney breathing tiny cloud puffs. Back-row scale.
// options: seed, animation: "smoke"|"none"
function zevoPlant(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const group = new THREE.Group();

  const hallW = 5.2;
  const hallH = 2.6;
  const hallD = 3.1;

  const hall = paperMesh(new THREE.BoxGeometry(hallW, hallH, hallD, 2, 1, 1), palette.stoneGray, seed, 0.06);
  hall.position.set(-0.3, hallH / 2, 0);
  group.add(hall);
  const roof = paperMesh(prismGeometry(hallW * 1.06, 1.0, hallD * 1.1), palette.towerSlate, seed + 1, 0.07);
  roof.position.set(-0.3, hallH, 0);
  group.add(roof);

  // Teal intake door + window band on the front, seeded lit/dark.
  const front = hallD / 2 + 0.01;
  const door = paperMesh(new THREE.BoxGeometry(1.3, 1.5, 0.08), palette.waterTeal, seed + 2, 0.05);
  door.position.set(-1.5, 0.75, front);
  group.add(door);
  for (let i = 0; i < 4; i += 1) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.4), r() < 0.6 ? litMaterial : darkMaterial);
    win.position.set(0.1 + i * 0.62, 1.85, front);
    group.add(win);
  }

  // Boiler annex between hall and chimney.
  const annex = paperMesh(new THREE.BoxGeometry(1.5, 1.7, 2.0), palette.slateGray, seed + 3, 0.06);
  annex.position.set(2.25, 0.85, -0.3);
  group.add(annex);

  // Tall banded chimney.
  const chimX = 2.25;
  const chimZ = -0.3;
  const chimney = paperMesh(new THREE.CylinderGeometry(0.3, 0.44, 6, 7), palette.paperWhite, seed + 4, 0.06);
  chimney.position.set(chimX, 3, chimZ);
  group.add(chimney);
  const band = paperMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.4, 7), palette.dustyRose, seed + 5, 0.05);
  band.position.set(chimX, 5.6, chimZ);
  group.add(band);

  group.add(blobShadow(hallW * 0.55));

  // Tiny cloud puffs looping up from the chimney: rise, drift, shrink, reset.
  const puffs = [];
  for (let i = 0; i < 3; i += 1) {
    const puff = paperMesh(new THREE.IcosahedronGeometry(0.2 + r() * 0.08, 0), palette.cloudWhite, seed + 10 + i, 0.04);
    puff.scale.setScalar(0.001);
    puff.userData.offset = i / 3 + r() * 0.15;
    group.add(puff);
    puffs.push(puff);
  }
  applyAnimation(group, {
    smoke: (t) => {
      for (const p of puffs) {
        const cycle = (t * 0.16 + p.userData.offset) % 1;
        p.position.set(chimX + cycle * 0.55, 6.05 + cycle * 1.5, chimZ);
        // Pops in fast, shrinks away — zero at both ends so the loop is seamless.
        p.scale.setScalar(Math.max(Math.min(cycle * 6, 1) * (1 - cycle), 0.001));
      }
    },
  }, options, 'smoke', 'zevoPlant');

  return group;
}

// ── characters (shared bits) ────────────────────────────────────────────────
// Big-headed standing animals in the citizen/shopkeeper mold: faceted diamond
// body, round skull with ears, dot eyes, blush cheeks.

function addFace(head, spec, seed, eyeY = 0.06, faceZ = 0.35) {
  for (const side of [-1, 1]) {
    let ear;
    if (spec.ears === 'pointy') {
      ear = paperMesh(new THREE.ConeGeometry(0.12, 0.3, 4), spec.earColor, seed + 4, 0.06);
      ear.position.set(side * 0.26, 0.44, -0.02);
    } else if (spec.ears === 'long') {
      ear = paperMesh(new THREE.ConeGeometry(0.09, 0.44, 5), spec.earColor, seed + 4, 0.06);
      ear.position.set(side * 0.17, 0.55, -0.04);
      ear.rotation.z = side * -0.12;
    } else {
      const earGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10);
      earGeo.rotateX(Math.PI / 2);
      ear = paperMesh(earGeo, spec.earColor, seed + 4, 0.06);
      ear.position.set(side * 0.34, 0.36, -0.04);
    }
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.04, 8), darkMaterial);
    eye.position.set(side * 0.16, eyeY, faceZ);
    head.add(eye);
    head.userData[side === -1 ? 'eyeL' : 'eyeR'] = eye;
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 8),
      new THREE.MeshBasicMaterial({ color: palette.cheekPink, transparent: true, opacity: 0.85 }),
    );
    cheek.position.set(side * 0.27, eyeY - 0.13, faceZ - 0.02);
    head.add(cheek);
  }
  const nose = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), darkMaterial);
  nose.position.set(0, eyeY - 0.09, faceZ + 0.01);
  head.add(nose);
}

// ── carer ───────────────────────────────────────────────────────────────────
// Gentle care worker: cream body under a duck-egg apron, duck-egg cap with a
// tiny paper-white cross. options: seed, animal: "bunny"|"cat"|"bear",
// animation: "idle"|"none"
const CARERS = {
  bunny: { head: palette.paperWhite, ears: 'long', earColor: palette.paperWhite },
  cat: { head: palette.cream, ears: 'pointy', earColor: palette.wolfGrayDark },
  bear: { head: palette.tanBrown, ears: 'round', earColor: palette.deepBrown },
};

function carer(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const animal = CARERS[options.animal] ? options.animal : 'bunny';
  const spec = CARERS[animal];
  const group = new THREE.Group();

  // Cream body with the duck-egg apron panel and waist band.
  const bodyGeo = new THREE.IcosahedronGeometry(0.44, 0);
  bodyGeo.scale(1, 1.15, 0.78);
  const body = paperMesh(bodyGeo, palette.cream, seed, 0.07);
  body.position.y = 0.52;
  group.add(body);
  const apron = paperMesh(new THREE.BoxGeometry(0.42, 0.5, 0.07), palette.duckEggBlue, seed + 1, 0.05);
  apron.position.set(0, 0.5, 0.31);
  apron.rotation.x = 0.08;
  group.add(apron);
  const bandGeo = new THREE.CylinderGeometry(0.4, 0.42, 0.09, 8);
  const bandMesh = paperMesh(bandGeo, palette.duckEggBlue, seed + 2, 0.04);
  bandMesh.scale.z = 0.78;
  bandMesh.position.y = 0.66;
  group.add(bandMesh);
  for (const side of [-1, 1]) {
    const foot = paperMesh(new THREE.BoxGeometry(0.13, 0.16, 0.15), palette.cream, seed + side);
    foot.position.set(side * 0.13, 0.08, 0.02);
    group.add(foot);
  }

  // Head with the little duck-egg cap and its paper cross.
  const head = new THREE.Group();
  const skullGeo = new THREE.IcosahedronGeometry(0.45, 1);
  skullGeo.scale(1, 0.95, 0.75);
  head.add(paperMesh(skullGeo, spec.head, seed + 3, 0.05));
  addFace(head, spec, seed);
  const capGeo = new THREE.SphereGeometry(0.46, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.36);
  capGeo.scale(1, 1, 0.75);
  const cap = paperMesh(capGeo, palette.duckEggBlue, seed + 5, 0.06);
  head.add(cap);
  for (const [w, h] of [[0.12, 0.04], [0.04, 0.12]]) {
    const bar = paperMesh(new THREE.BoxGeometry(w, h, 0.03), palette.paperWhite, seed + 6, 0.02);
    bar.position.set(0, 0.33, 0.3);
    bar.rotation.x = -0.5;
    head.add(bar);
  }
  const headRestY = 1.1;
  head.position.y = headRestY;
  group.add(head);
  group.add(blobShadow(0.42));

  // Idle: breathing, look-around, auto-blink.
  let nextBlink = 1.5 + r() * 3;
  applyAnimation(group, {
    idle: (t, dt, ctx) => {
      body.scale.setScalar(1 + Math.sin(t * 1.7 + ctx.phase) * 0.015);
      head.position.y = headRestY + Math.sin(t * 1.7 + ctx.phase) * 0.025;
      head.rotation.z = Math.sin(t * 0.5 + ctx.phase) * 0.05;
      head.rotation.y = Math.sin(t * 0.32 + ctx.phase * 1.6) * 0.14;
      nextBlink -= dt;
      if (nextBlink < 0) nextBlink = 2 + r() * 3.5;
      const s = nextBlink < 0.1 ? 0.12 : 1;
      head.userData.eyeL.scale.y = s;
      head.userData.eyeR.scale.y = s;
    },
  }, options, 'idle', 'carer');

  return group;
}

// ── elder ───────────────────────────────────────────────────────────────────
// Small stooped senior — leaning gently forward, either on a bark-brown cane
// or under a dusty-rose headscarf. options: seed, variant: "cane"|"headscarf",
// animation: "idle"|"none"
function elder(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const variant = options.variant === 'headscarf' ? 'headscarf' : 'cane';
  const group = new THREE.Group();

  // Body + head live in a stooped sub-group tilted forward.
  const torso = new THREE.Group();
  torso.rotation.x = 0.13;
  const bodyGeo = new THREE.IcosahedronGeometry(0.4, 0);
  bodyGeo.scale(1, 1.05, 0.78);
  const body = paperMesh(bodyGeo, variant === 'headscarf' ? palette.roseMauve : palette.slateGray, seed, 0.07);
  body.position.y = 0.46;
  torso.add(body);

  const head = new THREE.Group();
  const skullGeo = new THREE.IcosahedronGeometry(0.4, 1);
  skullGeo.scale(1, 0.92, 0.75);
  head.add(paperMesh(skullGeo, palette.cream, seed + 1, 0.05));
  addFace(head, { ears: 'round', earColor: palette.cream }, seed, 0.04, 0.31);
  if (variant === 'headscarf') {
    const scarfGeo = new THREE.SphereGeometry(0.42, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.45);
    scarfGeo.scale(1, 1, 0.78);
    const scarf = paperMesh(scarfGeo, palette.dustyRose, seed + 2, 0.06);
    head.add(scarf);
    const knot = paperMesh(new THREE.ConeGeometry(0.09, 0.22, 4), palette.dustyRose, seed + 3, 0.05);
    knot.rotation.x = Math.PI * 0.6;
    knot.position.set(0, -0.18, -0.26);
    head.add(knot);
  } else {
    // Wisps of paper-white hair.
    const hairGeo = new THREE.SphereGeometry(0.41, 7, 3, 0, Math.PI * 2, 0, Math.PI * 0.3);
    hairGeo.scale(1, 0.9, 0.78);
    head.add(paperMesh(hairGeo, palette.paperWhite, seed + 2, 0.07));
  }
  const headRestY = 0.94;
  head.position.y = headRestY;
  torso.add(head);
  group.add(torso);

  for (const side of [-1, 1]) {
    const foot = paperMesh(new THREE.BoxGeometry(0.12, 0.14, 0.14), palette.deepBrown, seed + side);
    foot.position.set(side * 0.12, 0.07, 0.03);
    group.add(foot);
  }

  if (variant === 'cane') {
    const cane = paperMesh(new THREE.CylinderGeometry(0.025, 0.03, 0.68, 5), palette.barkBrown, seed + 4, 0.04);
    cane.position.set(0.34, 0.34, 0.14);
    cane.rotation.z = -0.1;
    group.add(cane);
    const grip = paperMesh(new THREE.BoxGeometry(0.14, 0.045, 0.05), palette.deepBrown, seed + 5, 0.03);
    grip.position.set(0.36, 0.68, 0.14);
    group.add(grip);
  }

  group.add(blobShadow(0.38));

  // Idle: slow nod + auto-blink, a hint of sway.
  let nextBlink = 1.5 + r() * 3;
  applyAnimation(group, {
    idle: (t, dt, ctx) => {
      head.rotation.x = Math.sin(t * 0.55 + ctx.phase) * 0.07 + 0.05;
      torso.rotation.z = Math.sin(t * 0.4 + ctx.phase * 1.4) * 0.02;
      nextBlink -= dt;
      if (nextBlink < 0) nextBlink = 2.5 + r() * 4;
      const s = nextBlink < 0.12 ? 0.12 : 1;
      head.userData.eyeL.scale.y = s;
      head.userData.eyeR.scale.y = s;
    },
  }, options, 'idle', 'elder');

  return group;
}

// ── footballGoal ────────────────────────────────────────────────────────────
// White frame goal with an angled paper net panel and thin cream net lines.
// Mouth faces +z. options: seed
function footballGoal(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();
  const W = 2;
  const H = 1;
  const D = 0.6;

  // Front frame: posts + crossbar.
  for (const side of [-1, 1]) {
    const post = paperMesh(new THREE.BoxGeometry(0.07, H, 0.07), palette.paperWhite, seed + side, 0.04);
    post.position.set(side * W / 2, H / 2, D / 2);
    group.add(post);
  }
  const crossbar = paperMesh(new THREE.BoxGeometry(W + 0.07, 0.07, 0.07), palette.paperWhite, seed + 2, 0.04);
  crossbar.position.set(0, H, D / 2);
  group.add(crossbar);

  // Angled paper net: one big panel + thin cream lines, leaning crossbar → ground.
  const net = new THREE.Group();
  const slope = Math.hypot(H, D);
  const panel = paperMesh(new THREE.BoxGeometry(W - 0.04, slope, 0.025), palette.cloudWhite, seed + 3, 0.03);
  net.add(panel);
  for (let i = 0; i < 3; i += 1) {
    const line = paperMesh(new THREE.BoxGeometry(0.02, slope - 0.06, 0.03), palette.cream, seed + 4 + i, 0.02);
    line.position.x = (i - 1) * W * 0.28;
    net.add(line);
  }
  for (const ly of [-slope * 0.22, slope * 0.22]) {
    const line = paperMesh(new THREE.BoxGeometry(W - 0.08, 0.02, 0.03), palette.cream, seed + 8, 0.02);
    line.position.y = ly;
    net.add(line);
  }
  net.position.set(0, H / 2, 0);
  net.rotation.x = Math.atan2(D, H);
  group.add(net);

  // Side struts bracing the frame to the net's ground edge.
  for (const side of [-1, 1]) {
    const strut = paperMesh(new THREE.BoxGeometry(0.05, slope, 0.05), palette.paperWhite, seed + side + 10, 0.04);
    strut.position.set(side * W / 2, H / 2, 0);
    strut.rotation.x = Math.atan2(D, H);
    group.add(strut);
  }

  group.add(blobShadow(W * 0.55));
  return group;
}

// ── ball ────────────────────────────────────────────────────────────────────
// Small faceted football: cream ball with sage pentagon panels.
// options: seed, animation: "bounce"|"none"
function ball(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const radius = 0.175;
  const group = new THREE.Group();

  const sphere = new THREE.Group();
  const core = paperMesh(new THREE.IcosahedronGeometry(radius, 0), palette.cream, seed, 0.03);
  sphere.add(core);
  // Sage panels stuck to the surface, facing outward.
  const dirs = [
    new THREE.Vector3(0, 1, 0.3), new THREE.Vector3(0.9, 0.1, 0.5),
    new THREE.Vector3(-0.8, -0.2, 0.6), new THREE.Vector3(0.2, -0.9, -0.4),
    new THREE.Vector3(-0.4, 0.5, -0.8),
  ];
  for (let i = 0; i < dirs.length; i += 1) {
    const dir = dirs[i].normalize();
    const panel = paperMesh(new THREE.CircleGeometry(0.075, 5), palette.sage, seed + 1 + i, 0.02);
    panel.position.copy(dir).multiplyScalar(radius * 0.98);
    panel.lookAt(dir.clone().multiplyScalar(2));
    sphere.add(panel);
  }
  sphere.rotation.y = r() * Math.PI * 2;
  const restY = radius + 0.02;
  sphere.position.y = restY;
  group.add(sphere);

  const shadow = blobShadow(0.2);
  group.add(shadow);

  applyAnimation(group, {
    bounce: (t, dt, ctx) => {
      const b = Math.abs(Math.sin(t * 2.6 + ctx.phase));
      sphere.position.y = restY + b * 0.3;
      // Squash on the ground, round at the top of the arc.
      sphere.scale.set(1 + (1 - b) * 0.08, 1 - (1 - b) * 0.14, 1 + (1 - b) * 0.08);
      shadow.scale.setScalar(1 - b * 0.3);
    },
  }, options, 'bounce', 'ball');

  return group;
}

// ── pram ────────────────────────────────────────────────────────────────────
// Parent pushing a hooded pram — arranged side-on along +x like the vehicles.
// options: seed, animation: "stroll"|"none"
function pram(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const group = new THREE.Group();

  // Parent — sage-dressed big-headed character, turned to face +x.
  const parent = new THREE.Group();
  const bodyGeo = new THREE.IcosahedronGeometry(0.42, 0);
  bodyGeo.scale(1, 1.15, 0.78);
  const body = paperMesh(bodyGeo, palette.sage, seed, 0.07);
  body.position.y = 0.52;
  parent.add(body);
  for (const side of [-1, 1]) {
    const foot = paperMesh(new THREE.BoxGeometry(0.12, 0.15, 0.14), palette.cream, seed + side);
    foot.position.set(side * 0.12, 0.08, 0.02);
    parent.add(foot);
  }
  // Arms reaching forward to the handle.
  for (const side of [-1, 1]) {
    const arm = paperMesh(new THREE.BoxGeometry(0.09, 0.3, 0.1), palette.sage, seed + 2 + side, 0.04);
    arm.position.set(side * 0.26, 0.68, 0.2);
    arm.rotation.x = 1.15; // tipped forward toward the handle
    parent.add(arm);
  }

  const head = new THREE.Group();
  const skullGeo = new THREE.IcosahedronGeometry(0.42, 1);
  skullGeo.scale(1, 0.95, 0.75);
  head.add(paperMesh(skullGeo, palette.tanBrown, seed + 3, 0.05));
  addFace(head, { ears: 'round', earColor: palette.deepBrown }, seed, 0.05, 0.32);
  const headRestY = 1.06;
  head.position.y = headRestY;
  parent.add(head);
  parent.position.x = -0.48;
  parent.rotation.y = Math.PI / 2; // face the pram, +x
  group.add(parent);

  // Pram — dusty-rose bassinet, half-cylinder hood toward the parent, wheels.
  const cart = new THREE.Group();
  const basket = paperMesh(new THREE.BoxGeometry(0.6, 0.3, 0.42), palette.dustyRose, seed + 4, 0.06);
  basket.position.y = 0.5;
  cart.add(basket);
  const hoodGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.4, 8, 1, false, Math.PI / 2, Math.PI);
  hoodGeo.rotateX(Math.PI / 2); // axis across the pram (z), dome bulging up
  hoodGeo.rotateZ(0.5); // tipped back over the parent side
  const hood = paperMesh(hoodGeo, palette.roseMauve, seed + 5, 0.06);
  hood.position.set(-0.14, 0.62, 0);
  cart.add(hood);
  // Handle bar back to the parent's hands.
  const handle = paperMesh(new THREE.BoxGeometry(0.42, 0.045, 0.045), palette.deepBrown, seed + 6, 0.03);
  handle.position.set(-0.42, 0.72, 0);
  handle.rotation.z = 0.55;
  cart.add(handle);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = paperMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8), palette.charcoal, seed + sx + sz * 3, 0.05);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(sx * 0.2, 0.1, sz * 0.18);
      cart.add(wheel);
    }
  }
  cart.position.x = 0.42;
  group.add(cart);

  group.add(blobShadow(0.75));

  // Stroll: the pram rocks gently in place, parent bobs and blinks.
  let nextBlink = 1.5 + r() * 3;
  applyAnimation(group, {
    stroll: (t, dt, ctx) => {
      cart.rotation.z = Math.sin(t * 1.4 + ctx.phase) * 0.035;
      cart.position.y = Math.abs(Math.sin(t * 1.4 + ctx.phase)) * 0.015;
      body.scale.setScalar(1 + Math.sin(t * 1.7 + ctx.phase) * 0.015);
      head.position.y = headRestY + Math.sin(t * 1.7 + ctx.phase) * 0.025;
      head.rotation.x = Math.sin(t * 0.5 + ctx.phase) * 0.05 + 0.06; // watching the pram
      nextBlink -= dt;
      if (nextBlink < 0) nextBlink = 2 + r() * 3.5;
      const s = nextBlink < 0.1 ? 0.12 : 1;
      head.userData.eyeL.scale.y = s;
      head.userData.eyeR.scale.y = s;
    },
  }, options, 'stroll', 'pram');

  return group;
}

register('garbageTruck', garbageTruck);
register('recyclingBin', recyclingBin);
register('zevoPlant', zevoPlant);
register('carer', carer);
register('elder', elder);
register('footballGoal', footballGoal);
register('ball', ball);
register('pram', pram);

import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, prismGeometry, facetedCone, blobShadow, applyAnimation,
} from './helpers.js';

// The city pack, built from the "city 1/2.png" reference sheets: faceted
// towers with punched glowing windows, storybook townhouses, potted park
// trees, street furniture, driving vehicles and a little fox citizen.

const litMaterial = new THREE.MeshBasicMaterial({ color: palette.windowLit });
const darkMaterial = new THREE.MeshBasicMaterial({ color: palette.charcoal });

// ── officeTower ─────────────────────────────────────────────────────────────
// Tall faceted block, grid of punched windows (mix of lit and dark), tapered
// cap — the sage/slate/mauve towers of the reference.
// options: seed, floors (3–8), width, color, animation: "windowGlow"|"none"
function officeTower(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const floors = options.floors ?? 4 + Math.floor(r() * 3);
  const width = options.width ?? 2.6 + r() * 0.5;
  const depth = width * 0.75;
  const floorH = 1.05;
  const bodyH = floors * floorH + 0.5;
  const color = options.color
    ?? [palette.sageLight, palette.towerSlate, palette.roseMauve, palette.parchment][Math.floor(r() * 4)];

  const group = new THREE.Group();

  const body = paperMesh(new THREE.BoxGeometry(width, bodyH, depth, 2, floors, 1), color, seed, 0.07);
  body.position.y = bodyH / 2;
  group.add(body);

  // Tapered faceted cap.
  const capGeo = new THREE.CylinderGeometry(width * 0.18, width * 0.62, 0.7, 4);
  capGeo.rotateY(Math.PI / 4);
  const cap = paperMesh(capGeo, color, seed + 1, 0.09);
  cap.scale.z = depth / width;
  cap.position.y = bodyH + 0.35;
  group.add(cap);

  // Window grid on the front face; each window randomly lit or dark.
  const windows = [];
  const cols = width > 2.8 ? 3 : 2;
  const winGeo = new THREE.PlaneGeometry(0.42, 0.46);
  for (let f = 0; f < floors; f += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = r() < 0.55;
      const win = new THREE.Mesh(winGeo, lit ? litMaterial : darkMaterial);
      win.position.set(
        (c - (cols - 1) / 2) * (width / (cols + 0.6)),
        0.95 + f * floorH,
        depth / 2 + 0.01,
      );
      group.add(win);
      windows.push(win);
    }
  }

  // Door.
  const door = paperMesh(new THREE.BoxGeometry(width * 0.28, 0.85, 0.06), palette.charcoal, seed + 2, 0.02);
  door.position.set(0, 0.42, depth / 2 + 0.01);
  group.add(door);

  group.add(blobShadow(width * 0.7));

  let nextFlip = 1 + r() * 2;
  applyAnimation(group, {
    // Every couple of seconds one window flips lit/dark — the city breathes.
    windowGlow: (t, dt) => {
      nextFlip -= dt;
      if (nextFlip <= 0) {
        nextFlip = 1.2 + r() * 2.4;
        const win = windows[Math.floor(r() * windows.length)];
        win.material = win.material === litMaterial ? darkMaterial : litMaterial;
      }
    },
  }, options, 'windowGlow', 'officeTower');

  return group;
}

// ── townhouse ───────────────────────────────────────────────────────────────
// Two-story city house. Variants per the reference sheets:
//   "awning" cream walls + rose awning over the door and window band
//   "steep"  tall steep mauve gable, minimal front
//   "timber" duck-egg walls with cream A-frame timbering
// options: seed, variant, wallColor, roofColor, awningColor
function townhouse(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const variant = options.variant ?? ['awning', 'steep', 'timber'][Math.floor(r() * 3)];
  const width = options.width ?? 2.6;
  const depth = width * 0.7;
  const wallH = variant === 'steep' ? 2.2 : 2.6;
  const wallColor = options.wallColor
    ?? { awning: palette.cream, steep: palette.roseMauve, timber: palette.duckEggBlue }[variant];
  const roofColor = options.roofColor
    ?? { awning: palette.towerSlate, steep: palette.roseMauve, timber: palette.tanBrown }[variant];

  const group = new THREE.Group();
  const body = paperMesh(new THREE.BoxGeometry(width, wallH, depth), wallColor, seed, 0.06);
  body.position.y = wallH / 2;
  group.add(body);

  const roofH = variant === 'steep' ? wallH * 1.1 : wallH * 0.55;
  const roof = paperMesh(prismGeometry(width * 1.12, roofH, depth * 1.15), roofColor, seed + 1, 0.07);
  roof.position.y = wallH;
  group.add(roof);

  const chim = paperMesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), palette.deepBrown, seed + 2);
  chim.position.set(width * 0.28, wallH + roofH * 0.6, 0);
  group.add(chim);

  const front = depth / 2 + 0.01;
  const door = paperMesh(new THREE.BoxGeometry(0.55, 1.05, 0.06), palette.plankBrown, seed + 3, 0.03);
  door.position.set(-width * 0.18, 0.52, front);
  group.add(door);

  if (variant === 'awning') {
    const awning = paperMesh(new THREE.BoxGeometry(width * 0.9, 0.1, 0.5), options.awningColor ?? palette.dustyRose, seed + 4, 0.05);
    awning.position.set(0, 1.35, front + 0.2);
    awning.rotation.x = 0.35;
    group.add(awning);
    for (const [wx, wy] of [[width * 0.22, 1.9], [-width * 0.22, 1.9], [width * 0.22, 0.7]]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.42), rng(seed + wx * 10)() < 0.6 ? litMaterial : darkMaterial);
      win.position.set(wx, wy, front);
      group.add(win);
    }
  } else if (variant === 'timber') {
    const gable = paperMesh(prismGeometry(width * 1.0, roofH * 0.9, 0.12), palette.cream, seed + 4, 0.04);
    gable.position.set(0, wallH, front - 0.04);
    group.add(gable);
    const tie = paperMesh(new THREE.BoxGeometry(width * 0.75, 0.1, 0.08), palette.tanBrown, seed + 5);
    tie.position.set(0, wallH + 0.04, front + 0.03);
    group.add(tie);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), litMaterial);
    win.position.set(width * 0.2, 1.5, front);
    group.add(win);
  } else {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.6), darkMaterial);
    win.position.set(width * 0.2, 1.5, front);
    group.add(win);
  }

  group.add(blobShadow(width * 0.65));
  return group;
}

// ── parkTree ────────────────────────────────────────────────────────────────
// City greenery, most of it potted, per the reference sheets.
// options: seed, shape: "cone"|"ball"|"poplar"|"round"|"diamond", color,
//          pot (bool), animation: "windSway"|"none"
function parkTree(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const shape = options.shape ?? ['cone', 'ball', 'poplar', 'round'][Math.floor(r() * 4)];
  const color = options.color ?? (shape === 'round' && r() < 0.3 ? palette.strawGold : palette.sage);
  const potted = options.pot ?? !['round', 'diamond'].includes(shape);

  const group = new THREE.Group();
  let baseY = 0;

  if (potted) {
    const pot = paperMesh(new THREE.CylinderGeometry(0.28, 0.36, 0.42, 7), palette.parchment, seed + 1, 0.06);
    pot.position.y = 0.21;
    group.add(pot);
    baseY = 0.42;
  }

  const crown = new THREE.Group();
  if (shape === 'cone') {
    const c = paperMesh(facetedCone(0.55, 1.7, 6, 0.1, seed), color, seed + 2, 0.08);
    c.position.y = 0.85;
    crown.add(c);
  } else if (shape === 'poplar') {
    const c = paperMesh(facetedCone(0.35, 2.6, 6, 0.08, seed), color, seed + 2, 0.08);
    c.position.y = 1.3;
    crown.add(c);
  } else if (shape === 'ball') {
    const trunk = paperMesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), palette.barkBrown, seed + 3);
    trunk.position.y = 0.25;
    crown.add(trunk);
    const c = paperMesh(new THREE.IcosahedronGeometry(0.62, 0), color, seed + 2, 0.08);
    c.position.y = 1.05;
    crown.add(c);
  } else if (shape === 'diamond') { // big faceted diamond crown on a trunk
    const trunk = paperMesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), palette.barkBrown, seed + 3);
    trunk.position.y = 0.35;
    crown.add(trunk);
    const dGeo = new THREE.OctahedronGeometry(0.95, 1);
    dGeo.scale(0.85, 1.25, 0.85);
    const c = paperMesh(dGeo, color, seed + 2, 0.08);
    c.position.y = 1.75;
    crown.add(c);
  } else { // round — taller trunk, faceted sphere crown
    const trunk = paperMesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), palette.barkBrown, seed + 3);
    trunk.position.y = 0.5;
    crown.add(trunk);
    const c = paperMesh(new THREE.IcosahedronGeometry(0.85, 1), color, seed + 2, 0.07);
    c.position.y = 1.75;
    crown.add(c);
  }
  crown.position.y = baseY;
  group.add(crown);
  group.add(blobShadow(0.5));

  applyAnimation(group, {
    windSway: (t, dt, ctx) => {
      crown.rotation.z = Math.sin(t * 1.1 + ctx.phase) * 0.03;
    },
  }, options, 'windSway', 'parkTree');

  return group;
}

// ── streetlamp ──────────────────────────────────────────────────────────────
// Charcoal pole with a warm glowing lantern ball. animation: "glow"|"none"
function streetlamp(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();

  const pole = paperMesh(new THREE.CylinderGeometry(0.06, 0.09, 2.6, 6), palette.charcoal, seed, 0.04);
  pole.position.y = 1.3;
  group.add(pole);
  const collar = paperMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 6), palette.charcoal, seed + 1);
  collar.position.y = 2.62;
  group.add(collar);

  const lampMat = new THREE.MeshBasicMaterial({ color: palette.sunGold });
  const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), lampMat);
  lamp.position.y = 2.85;
  group.add(lamp);
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 12),
    new THREE.MeshBasicMaterial({ color: palette.sunGold, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  halo.position.set(0, 2.85, 0.05);
  group.add(halo);

  const cap = paperMesh(new THREE.ConeGeometry(0.2, 0.18, 6), palette.charcoal, seed + 2);
  cap.position.y = 3.12;
  group.add(cap);
  group.add(blobShadow(0.35));

  applyAnimation(group, {
    glow: (t, dt, ctx) => {
      const k = 0.85 + Math.sin(t * 2.1 + ctx.phase) * 0.08 + Math.sin(t * 7.3 + ctx.phase) * 0.04;
      halo.material.opacity = 0.22 * k;
      halo.scale.setScalar(k);
    },
  }, options, 'glow', 'streetlamp');

  return group;
}

// ── trafficLight ────────────────────────────────────────────────────────────
// Pole + rounded head with red/amber/green lamps. animation: "cycle"|"none"
function trafficLight(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();

  const pole = paperMesh(new THREE.CylinderGeometry(0.07, 0.1, 2.2, 6), palette.towerSlate, seed, 0.05);
  pole.position.y = 1.1;
  group.add(pole);
  const head = paperMesh(new THREE.BoxGeometry(0.5, 1.15, 0.28), palette.charcoal, seed + 1, 0.04);
  head.position.y = 2.75;
  group.add(head);

  const colors = [palette.dustyRose, palette.sunGold, palette.sage];
  const lamps = colors.map((c, i) => {
    const bright = new THREE.MeshBasicMaterial({ color: c });
    const dim = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.32) });
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.13, 10), dim);
    lamp.position.set(0, 3.08 - i * 0.34, 0.155);
    group.add(lamp);
    return { lamp, bright, dim };
  });
  group.add(blobShadow(0.35));

  // red → green → amber → red …
  const phases = [[0, 2.6], [2, 2.4], [1, 0.8]];
  let idx = 0;
  let timer = 0;
  applyAnimation(group, {
    cycle: (t, dt) => {
      timer -= dt;
      if (timer <= 0) {
        idx = (idx + 1) % phases.length;
        timer = phases[idx][1];
        lamps.forEach((l, i) => { l.lamp.material = i === phases[idx][0] ? l.bright : l.dim; });
      }
    },
  }, options, 'cycle', 'trafficLight');

  return group;
}

// ── bench ───────────────────────────────────────────────────────────────────
function bench(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();
  const wood = options.color ?? palette.plankBrown;
  // seat: three slats lying flat; backrest: three slats rising behind
  for (let i = 0; i < 3; i += 1) {
    const seat = paperMesh(new THREE.BoxGeometry(1.7, 0.07, 0.13), wood, seed + i, 0.05);
    seat.position.set(0, 0.55, 0.14 - i * 0.16);
    group.add(seat);
    const back = paperMesh(new THREE.BoxGeometry(1.7, 0.11, 0.06), wood, seed + i + 10, 0.05);
    back.position.set(0, 0.75 + i * 0.18, -0.24);
    group.add(back);
  }
  for (const side of [-1, 1]) {
    const leg = paperMesh(new THREE.BoxGeometry(0.1, 0.55, 0.5), palette.deepBrown, seed + side, 0.04);
    leg.position.set(side * 0.75, 0.28, -0.05);
    group.add(leg);
    const back = paperMesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), palette.deepBrown, seed + side + 5, 0.04);
    back.position.set(side * 0.75, 0.85, -0.22);
    back.rotation.x = -0.12;
    group.add(back);
  }
  group.add(blobShadow(0.8));
  return group;
}

// ── hydrant ─────────────────────────────────────────────────────────────────
function hydrant(options = {}) {
  const seed = options.seed ?? 0;
  const color = options.color ?? '#b0777c';
  const group = new THREE.Group();
  const body = paperMesh(new THREE.CylinderGeometry(0.14, 0.17, 0.5, 7), color, seed, 0.07);
  body.position.y = 0.3;
  group.add(body);
  const dome = paperMesh(new THREE.ConeGeometry(0.15, 0.18, 7), color, seed + 1, 0.06);
  dome.position.y = 0.62;
  group.add(dome);
  for (const side of [-1, 1]) {
    const nub = paperMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 6), color, seed + 2);
    nub.rotation.z = Math.PI / 2;
    nub.position.set(side * 0.18, 0.38, 0);
    group.add(nub);
  }
  group.add(blobShadow(0.22));
  return group;
}

// ── busStop ─────────────────────────────────────────────────────────────────
// Sign pole with a little bus pictogram plate.
function busStop(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();
  const pole = paperMesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 6), palette.towerSlate, seed, 0.05);
  pole.position.y = 1.1;
  group.add(pole);
  const plate = paperMesh(new THREE.BoxGeometry(0.66, 0.5, 0.05), palette.duckEggBlue, seed + 1, 0.05);
  plate.position.y = 2.35;
  group.add(plate);
  // pictogram: cream rounded bus body + dark windows
  const busBody = paperMesh(new THREE.BoxGeometry(0.4, 0.2, 0.02), palette.cream, seed + 2, 0.02);
  busBody.position.set(0, 2.36, 0.035);
  group.add(busBody);
  for (let i = 0; i < 3; i += 1) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), darkMaterial);
    w.position.set(-0.12 + i * 0.12, 2.39, 0.05);
    group.add(w);
  }
  group.add(blobShadow(0.25));
  return group;
}

// ── vehicles ────────────────────────────────────────────────────────────────
// Bodies are extruded rounded side-profiles (like the reference sheet's
// lozenge-shaped cars); tires, hubs, windows and lights exist on BOTH sides,
// so the vehicle reads correctly in either driving direction.

const hubMaterial = new THREE.MeshBasicMaterial({ color: palette.stoneGray });

// Rounded car silhouette: bumpers, hood, domed cabin, tail. bottom at y = 0.
function carProfileShape(L, shoulder, roof) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2 + 0.1, 0);
  s.quadraticCurveTo(-L / 2, 0, -L / 2, 0.14);
  s.lineTo(-L / 2, shoulder - 0.1);
  s.quadraticCurveTo(-L / 2, shoulder, -L / 2 + 0.16, shoulder); // front bumper → hood
  s.lineTo(-L * 0.24, shoulder);
  s.quadraticCurveTo(-L * 0.14, roof, L * 0.02, roof); // windshield → roof dome
  s.quadraticCurveTo(L * 0.18, roof, L * 0.26, shoulder); // roof → rear slope
  s.lineTo(L / 2 - 0.16, shoulder);
  s.quadraticCurveTo(L / 2, shoulder, L / 2, shoulder - 0.1);
  s.lineTo(L / 2, 0.14);
  s.quadraticCurveTo(L / 2, 0, L / 2 - 0.1, 0);
  s.closePath();
  return s;
}

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

// Windows/lights mirrored on both sides (+z and −z, back side turned around).
function addBothSides(group, makeMesh, x, y, z) {
  for (const side of [1, -1]) {
    const mesh = makeMesh();
    mesh.position.set(x, y, side * z);
    if (side < 0) mesh.rotation.y = Math.PI;
    group.add(mesh);
  }
}

// One axle = two wheels, one per side, hubs facing outward.
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

function buildVehicle({ length, color, seed, isBus }) {
  const group = new THREE.Group();
  const wheels = [];
  const wheelR = 0.22;
  const depth = 0.6;
  const bodyLift = 0.26; // body floats above the wheels

  if (isBus) {
    // Long rounded lozenge, duck-egg lower + cream upper band, window row.
    const body = extrudeCentered(roundedBoxShape(length, 0.62, 0.16), depth, color, seed);
    body.position.y = bodyLift;
    group.add(body);
    const upper = extrudeCentered(roundedBoxShape(length - 0.08, 0.62, 0.24), depth + 0.02, palette.cream, seed + 1);
    upper.position.y = bodyLift + 0.6;
    group.add(upper);
    for (let i = 0; i < 4; i += 1) {
      const wx = -length * 0.32 + i * (length * 0.64) / 3;
      addBothSides(group, () => new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.3), darkMaterial), wx, bodyLift + 0.88, depth / 2 + 0.02);
    }
    // door up front on both sides
    addBothSides(group, () => new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.72), darkMaterial), length * 0.38, bodyLift + 0.48, depth / 2 + 0.02);
    addAxle(group, wheels, -length * 0.3, wheelR, depth, seed + 10);
    addAxle(group, wheels, length * 0.3, wheelR, depth, seed + 20);
  } else {
    // Rounded car silhouette with a domed cabin, per the reference sheet.
    const body = extrudeCentered(carProfileShape(length, 0.44, 0.85), depth, color, seed);
    body.position.y = bodyLift;
    group.add(body);
    // two side windows separated by a pillar, both sides
    for (const wx of [-length * 0.1, length * 0.09]) {
      addBothSides(group, () => new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.24), darkMaterial), wx, bodyLift + 0.58, depth / 2 + 0.02);
    }
    addAxle(group, wheels, -length * 0.28, wheelR, depth, seed + 10);
    addAxle(group, wheels, length * 0.28, wheelR, depth, seed + 20);
  }

  // headlight dot at the nose, both sides
  addBothSides(group, () => new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), litMaterial), length / 2 - 0.06, bodyLift + (isBus ? 0.3 : 0.3), 0.31);

  group.add(blobShadow(length * 0.42));
  return { group, wheels, wheelR };
}

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

// options: seed, color, path: [x1, x2] (prop-local), speed, animation: "drive"|"none"
function car(options = {}) {
  const seed = options.seed ?? 0;
  const { group, wheels, wheelR } = buildVehicle({
    length: 1.9, color: options.color ?? palette.sage, seed, isBus: false,
  });
  applyAnimation(group, {
    drive: makeDriveAnimation(group, wheels, wheelR, options, 3.2),
  }, options, 'drive', 'car');
  return group;
}

function bus(options = {}) {
  const seed = options.seed ?? 0;
  const { group, wheels, wheelR } = buildVehicle({
    length: 3.4, color: options.color ?? palette.duckEggBlue, seed, isBus: true,
  });
  applyAnimation(group, {
    drive: makeDriveAnimation(group, wheels, wheelR, options, 2.4),
  }, options, 'drive', 'bus');
  return group;
}

// ── citizen ─────────────────────────────────────────────────────────────────
// The little standing fox from the reference: cream body, tan head with
// pointy ears, dot eyes, blush cheeks. options: seed, color,
// animation: "idle"|"none"
function citizen(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const furColor = options.color ?? palette.strawGold;
  const group = new THREE.Group();

  const body = paperMesh(new THREE.BoxGeometry(0.55, 0.7, 0.4, 1, 1, 1), palette.cream, seed, 0.05);
  body.position.y = 0.55;
  group.add(body);

  for (const side of [-1, 1]) {
    const leg = paperMesh(new THREE.BoxGeometry(0.14, 0.24, 0.16), furColor, seed + side);
    leg.position.set(side * 0.14, 0.12, 0);
    group.add(leg);
    const arm = paperMesh(new THREE.BoxGeometry(0.1, 0.34, 0.14), palette.cream, seed + side + 3, 0.04);
    arm.position.set(side * 0.34, 0.62, 0);
    arm.rotation.z = side * 0.12;
    group.add(arm);
  }

  const head = new THREE.Group();
  const face = paperMesh(new THREE.BoxGeometry(0.62, 0.5, 0.42), furColor, seed + 5, 0.06);
  head.add(face);
  for (const side of [-1, 1]) {
    const ear = paperMesh(new THREE.ConeGeometry(0.11, 0.3, 4), furColor, seed + 6, 0.06);
    ear.position.set(side * 0.2, 0.36, 0);
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), darkMaterial);
    eye.position.set(side * 0.14, 0.06, 0.215);
    head.add(eye);
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 8),
      new THREE.MeshBasicMaterial({ color: palette.cheekPink, transparent: true, opacity: 0.85 }),
    );
    cheek.position.set(side * 0.24, -0.08, 0.215);
    head.add(cheek);
  }
  const nose = new THREE.Mesh(new THREE.CircleGeometry(0.03, 6), darkMaterial);
  nose.position.set(0, -0.02, 0.215);
  head.add(nose);
  const headRestY = 1.18;
  head.position.y = headRestY;
  group.add(head);
  group.add(blobShadow(0.35));

  let nextBlink = 1.5 + r() * 3;
  const eyes = head.children.filter((c) => c.geometry?.type === 'CircleGeometry' && c.material === darkMaterial && c.position.y > 0);
  applyAnimation(group, {
    idle: (t, dt, ctx) => {
      body.scale.setScalar(1 + Math.sin(t * 1.8 + ctx.phase) * 0.015);
      head.position.y = headRestY + Math.sin(t * 1.8 + ctx.phase) * 0.02;
      head.rotation.z = Math.sin(t * 0.5 + ctx.phase) * 0.05;
      nextBlink -= dt;
      if (nextBlink < 0) nextBlink = 2 + r() * 3;
      const s = nextBlink < 0.1 ? 0.15 : 1;
      for (const e of eyes) e.scale.y = s;
    },
  }, options, 'idle', 'citizen');

  return group;
}

register('officeTower', officeTower);
register('townhouse', townhouse);
register('parkTree', parkTree);
register('streetlamp', streetlamp);
register('trafficLight', trafficLight);
register('bench', bench);
register('hydrant', hydrant);
register('busStop', busStop);
register('car', car);
register('bus', bus);
register('citizen', citizen);

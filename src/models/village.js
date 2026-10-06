import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, box, cbox, cyl, cone, beam, gable, fold, group, smoke, eyes, cheek, blinker, facet, mat, PI,
} from './kit.js';

// Village pieces from visual.png: three cottages, the barn, sheep, haystack,
// thatched hut, well — plus the picket fence. Grid helpers read the 10 × 10
// grid laid over each sprite (gx across, gy down).

const WOOD = { tex: 'wood' };
const PLASTER = { tex: 'plaster' };
const STONE = { tex: 'stone' };
const BRICK = { tex: 'brick', texScale: 0.7 };
const PLANKS = { tex: 'planks' };
const STRAW = { tex: 'straw' };
const WOOL = { tex: 'wool', texScale: 1.3 };

function grid(aspect) {
  return {
    X: (gx) => (gx / 10 - 0.5) * aspect,
    Y: (gy) => 100 - gy * 10,
    S: (g) => (g / 10) * aspect,
  };
}

// Gabled roof seen end-on, as ONE continuous solid: the ⋀ cross-section
// (outer edge apex → eaves, slab thickness t measured square to the slope)
// extruded through depth d — a clean ridge, no seam between two slabs.
function roof(apexX, apexY, halfSpan, eaveY, t, d, color, tex = 'shingle') {
  const drop = t / Math.cos(Math.atan2(apexY - eaveY, halfSpan)); // vertical thickness
  const pts = [
    [apexX - halfSpan, eaveY], [apexX, apexY], [apexX + halfSpan, eaveY],
    [apexX + halfSpan, eaveY - drop], [apexX, apexY - drop], [apexX - halfSpan, eaveY - drop],
  ];
  const g = new THREE.Group();
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  g.add(mesh(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2), color, 0, 0, 0, { tex }));
  return g;
}

// Plank door: two boards with a seam and a knob, standing proud of the wall.
function door(x, w, h, z, color, knobX) {
  const g = group(x, 0, z);
  g.add(mesh(box(w / 2 - 0.3, h, 1.6).translate(-w / 4, 0, 0), color, 0, 0, 0, WOOD));
  g.add(mesh(box(w / 2 - 0.3, h, 1.6).translate(w / 4, 0, 0), new THREE.Color(color).offsetHSL(0, 0, -0.04).getStyle(), 0, 0, 0, WOOD));
  const knob = inkMesh(new THREE.SphereGeometry(Math.max(1, w * 0.05), 8, 6), '#4a3423', knobX ?? w * 0.32, h * 0.45, 1.3);
  g.add(knob);
  return g;
}

// Chimney smoke for houses — subtle, always on.
function chimneySmoke(rig, x, y, z, scale = 1) {
  const s = smoke(x, y, z, { size: 2.6 * scale, rise: 26 * scale, drift: 7 * scale });
  rig.body.add(s.group);
  return s;
}

// ── cottageTimber — cream walls, open timber-truss gable ───────────────────
defineModel('cottageTimber', (opts, rig) => {
  const { X, Y, S } = grid(101.8);
  const D = 56;
  const front = D / 2;
  rig.body.add(mesh(box(S(8.1), Y(5.0), D), '#efe8de', X(4.95), 0, 0, PLASTER));
  // gable: dark loft behind an open truss
  rig.body.add(mesh(gable(S(8.1), Y(1.2) - Y(5.0), D - 4).translate(0, Y(5.0), 0), '#3f2f20', X(4.95), 0, -1));
  const truss = '#c9ab7b';
  rig.body.add(mesh(beam(X(4.95), Y(5.0), X(4.95), Y(1.1), 3.4, 3), truss, 0, 0, front - 0.5, WOOD));
  rig.body.add(mesh(beam(X(4.95), Y(4.7), X(2.8), Y(3.25), 3.2, 3), truss, 0, 0, front - 0.5, WOOD));
  rig.body.add(mesh(beam(X(4.95), Y(4.7), X(7.15), Y(3.25), 3.2, 3), truss, 0, 0, front - 0.5, WOOD));
  rig.body.add(mesh(beam(X(1.1), Y(5.0), X(8.8), Y(5.0), 2.4, 3), truss, 0, 0, front - 0.5, WOOD));
  // roof
  rig.body.add(roof(X(5.0), Y(0.0), S(5.0), Y(5.25), 7, D + 10, '#c3a06a'));
  // chimney (toward the back)
  rig.body.add(mesh(box(S(1.5), 30, 10), '#8f928b', X(7.85), Y(1.0) - 30 + 1, -8, STONE));
  rig.body.add(door(X(2.35), S(2.3), Y(6.4), front, '#9b744a', S(0.6)));
  const win = mesh(new THREE.CylinderGeometry(S(1.05), S(1.05), 2, 18).rotateX(PI / 2), '#5a3e22', X(5.8), Y(7.3), front + 0.4);
  rig.body.add(win);
  const sm = chimneySmoke(rig, X(7.85), Y(1.0) + 2, -8);
  rig.anims.always = (t) => sm.update(t);
});

// ── cottageGable — duck-egg cottage with a folded paper gable ──────────────
defineModel('cottageGable', (opts, rig) => {
  const { X, Y, S } = grid(89.7);
  const D = 52;
  const front = D / 2;
  rig.body.add(mesh(box(S(9.2), Y(4.75), D), '#91b3a6', X(4.6), 0, 0, PLASTER));
  // ONE roof: the printed "M" roofline (two side gables and the tall middle
  // peak) as a single solid running front to back — three ridges with
  // valleys between, so it reads as one piece of folded card. The scene
  // light gives every left-facing slope the light tone and every
  // right-facing slope the shaded one, as on the sheet.
  const over = 3; // eave overhang
  const m = [
    [X(0.0) - over, Y(4.75)], [X(2.45), Y(2.15)], [X(3.55), Y(3.15)], [X(5.0), Y(0.8)],
    [X(6.45), Y(3.15)], [X(7.75), Y(2.15)], [X(10.0) + over, Y(4.75)],
    [X(10.0) + over, Y(4.75) - 1.5], [X(0.0) - over, Y(4.75) - 1.5],
  ];
  const roofShape = new THREE.Shape(m.map(([x, y]) => new THREE.Vector2(x, y)));
  const RD = D + over * 2;
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: RD, bevelEnabled: false }).translate(0, 0, -RD / 2);
  // fold the front: each peak is pulled forward into a crease, so every
  // gable face splits into a lit left half and a shaded right half. The
  // extruder's flat front lid is dropped and rebuilt as a strip of folds.
  const pull = new Map([[3, 8], [1, 5], [5, 5]]); // profile index → forward pull
  const zf = RD / 2;
  const src = roofGeo.toNonIndexed().attributes.position;
  const keep = [];
  for (let i = 0; i < src.count; i += 3) {
    const front = [0, 1, 2].every((j) => src.getZ(i + j) > zf - 0.01);
    if (front) continue;
    for (let j = 0; j < 3; j += 1) {
      let x = src.getX(i + j); const y = src.getY(i + j); let z = src.getZ(i + j);
      if (z > zf - 0.01) {
        for (const [k, dz] of pull) if (Math.abs(x - m[k][0]) < 0.01 && Math.abs(y - m[k][1]) < 0.01) z += dz;
      }
      keep.push(x, y, z);
    }
  }
  const yb = Y(4.75) - 1.5;
  for (let k = 0; k < 6; k += 1) {
    const [ax, ay] = m[k];
    const [bx, by] = m[k + 1];
    const az = zf + (pull.get(k) ?? 0);
    const bz = zf + (pull.get(k + 1) ?? 0);
    // quad (A, B, B', A') down to the eave line; the bottom points share
    // their top's pull, so each quad is one clean plane and the creases run
    // straight down from the peaks
    keep.push(ax, ay, az, ax, yb, az, bx, yb, bz);
    keep.push(ax, ay, az, bx, yb, bz, bx, by, bz);
  }
  const folded = new THREE.BufferGeometry();
  folded.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  folded.computeVertexNormals();
  const roofGeo2 = folded;
  rig.body.add(mesh(roofGeo2, '#cdb38c', 0, 0, 0, { side: THREE.DoubleSide, tex: 'shingle' }));
  rig.body.add(mesh(box(S(1.3), 34, 10), '#a58b7b', X(1.65), Y(3.7), -6, BRICK));
  rig.body.add(door(X(2.95), S(2.3), Y(6.0), front, '#8c7458', S(0.55)));
  // planks leaning by the door corner
  for (const [g, h, lean] of [[9.35, 25, -0.05], [9.7, 22, 0.04]]) {
    const p = mesh(box(S(0.35), h, 2), '#c9b386', X(g), 0, front - 4, WOOD);
    p.rotation.z = lean;
    rig.body.add(p);
  }
  const sm = chimneySmoke(rig, X(1.65), Y(0.7) + 2, -6);
  rig.anims.always = (t) => sm.update(t);
});

// ── cottageRound — half-timbered cottage, round gable window ───────────────
defineModel('cottageRound', (opts, rig) => {
  const { X, Y, S } = grid(101.8);
  const D = 56;
  const front = D / 2;
  const timber = '#7a5c3c';
  rig.body.add(mesh(box(S(7.9), Y(5.2), D), '#f0e9df', X(4.95), 0, 0, PLASTER));
  for (const g of [1.45, 8.5]) rig.body.add(mesh(box(S(0.9), Y(5.0), 4), timber, X(g), 0, front + 0.8, WOOD));
  rig.body.add(mesh(beam(X(0.9), Y(5.0), X(9.0), Y(5.0), 6, 4), timber, 0, 0, front + 0.8, WOOD));
  rig.body.add(mesh(gable(S(7.6), Y(1.0) - Y(5.0), D).translate(0, Y(5.0), 0), '#ebe3d8', X(4.95), 0, 0, PLASTER));
  rig.body.add(mesh(beam(X(3.0), Y(3.75), X(4.45), Y(4.65), 3, 3), timber, 0, 0, front, WOOD));
  rig.body.add(mesh(beam(X(7.0), Y(3.75), X(5.55), Y(4.65), 3, 3), timber, 0, 0, front, WOOD));
  rig.body.add(mesh(new THREE.CylinderGeometry(S(0.9), S(0.9), 2, 18).rotateX(PI / 2), '#5b4224', X(5.0), Y(3.05), front + 0.4));
  rig.body.add(roof(X(5.0), Y(0.0), S(5.0), Y(5.35), 8, D + 10, timber));
  rig.body.add(mesh(box(S(1.4), 26, 10), '#a3867a', X(7.9), Y(2.8), -8, BRICK));
  rig.body.add(door(X(4.95), S(2.7), Y(6.5), front, '#8a7050', S(0.9)));
  const sm = chimneySmoke(rig, X(7.9), Y(0.9) + 2, -8);
  rig.anims.always = (t) => sm.update(t);
});

// ── barn — duck-egg walls, mauve plank roof, the dark round hayloft hole ───
defineModel('barn', (opts, rig) => {
  const { X, Y, S } = grid(101.8);
  const D = 60;
  const front = D / 2;
  rig.body.add(mesh(box(S(9.9), Y(4.0), D), '#9dbab1', X(5.0), 0, 0, PLANKS));
  // roof: ridge along x, the front slope faces the viewer — built as a run
  // of plank prisms in alternating mauves
  const rise = Y(0.0) - Y(4.0);
  const run = D / 2 + 6;
  const planks = ['#cdb6b1', '#bba29d', '#c6aea9', '#ad918c', '#c3aaa5'];
  const n = planks.length;
  const pw = (S(10) + 2) / n;
  for (let i = 0; i < n; i += 1) {
    const shape = new THREE.Shape([new THREE.Vector2(-run, 0), new THREE.Vector2(run, 0), new THREE.Vector2(0, rise)]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: pw, bevelEnabled: false }).rotateY(PI / 2);
    rig.body.add(mesh(g, planks[i], X(0.0) - 1 + pw * i, Y(4.0), 0, { tex: 'wood', texRotate: true }));
  }
  // gable ends under the roof
  const tri = new THREE.Shape([new THREE.Vector2(-run + 6, 0), new THREE.Vector2(run - 6, 0), new THREE.Vector2(0, rise - 2)]);
  for (const side of [-1, 1]) {
    const g = mesh(new THREE.ExtrudeGeometry(tri, { depth: 2, bevelEnabled: false }).rotateY(PI / 2), '#93b1a7', X(5.0) + side * S(4.9), Y(4.0), 0, PLANKS);
    rig.body.add(g);
  }
  rig.body.add(door(X(2.7), S(2.6), Y(5.8), front, '#9b744e', S(0.7)));
  rig.body.add(inkMesh(new THREE.CircleGeometry(S(1.2), 24), '#1d1a17', X(6.95), Y(6.2), front + 0.2));
});

// ── sheep — the round frontal sheep: wool body, wool halo round a tan face ─
function sheepModel(rig, { lamb = false } = {}) {
  const { X, Y, S } = grid(82.0);
  // wool in the sheet's own paper tones (warm off-white, soft beige shade),
  // smooth-shaded and barely jittered — fluffy, but as calm as the rest
  const wool = '#e6e2d8';
  const woolShade = '#dcd6c9';
  const woolMat = (c) => mat(c, { flat: false, soft: true, ...WOOL });
  const tan = '#dcbfa2';
  const muzzleC = '#e8d2b8';
  const legC = '#a9815d';
  const inkC = '#2a221c';
  const puff = (r, x, y, z, color = wool) => mesh(new THREE.IcosahedronGeometry(r, 2), color, x, y, z, { material: woolMat(color), jitter: 0.012 });

  const body = group(0, 0, 0);
  rig.body.add(body);

  // ── fleece: a round body built from wool puffs, so it reads as fluffy ──
  const torso = group(X(4.15), Y(6.4), -8);
  body.add(torso);
  torso.add(mesh(new THREE.SphereGeometry(1, 18, 12).scale(25, 23, 27), wool, 0, 0, 0, { material: woolMat(wool), jitter: 0.01 }));
  const rng = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  // a few big puffs sunk deep into the body: only a gently scalloped
  // outline shows, not a busy pattern
  const N = 14;
  for (let i = 0; i < N; i += 1) {
    // points spread over the ellipsoid (golden-angle spiral)
    const k = (i + 0.5) / N;
    const phi = Math.acos(1 - 2 * k);
    const th = i * 2.39996;
    const x = Math.sin(phi) * Math.cos(th) * 17;
    const y = Math.cos(phi) * 15.5;
    const z = Math.sin(phi) * Math.sin(th) * 19;
    if (y < -12) continue; // keep the belly clean above the legs
    torso.add(puff(10.5 + rng(i) * 2, x, y, z, i % 4 ? wool : woolShade));
  }
  // round puff tail on the rump
  const tail = group(0, 6, -27);
  tail.add(puff(7.5, 0, 0, -2));
  torso.add(tail);

  // legs: slim, set under the fleece, with darker little hooves
  const legs = [];
  for (const [g, z, len] of [[2.75, 6, 21], [5.55, 6, 21], [3.3, -20, 20], [5.0, -20, 20]]) {
    const leg = group(X(g), 22, z);
    leg.add(mesh(box(S(0.6), len, 5).translate(0, -len, 0), legC));
    leg.add(mesh(box(S(0.66), 3, 5.6).translate(0, -len, 0), '#6e523a'));
    body.add(leg);
    legs.push(leg);
  }

  // ── head: a real round head with a little muzzle, wearing a wool bonnet ──
  const head = group(X(4.0), Y(5.2), 4); // pivot at the neck — grazing dips it
  body.add(head);
  const hy = Y(3.25) - Y(5.2); // head center above the neck
  const hz = 7;
  const R = 15.5;
  head.add(mesh(new THREE.SphereGeometry(R, 20, 14).scale(1, 0.96, 0.92), tan, 0, hy, hz));
  // the face's front surface, for placing features on it
  const surf = (x, y) => hz + R * 0.92 * Math.sqrt(Math.max(0, 1 - (x / R) ** 2 - (y / (R * 0.96)) ** 2));
  // muzzle: a soft, slightly paler pad low on the face
  const mz = surf(0, -5) - 3;
  head.add(mesh(new THREE.SphereGeometry(1, 16, 10).scale(8.5, 6.2, 5.5), muzzleC, 0, hy - 5.2, mz));
  // nose: a small rounded dark pad on top of the muzzle
  const nose = mesh(new THREE.SphereGeometry(1, 12, 8).scale(2.6, 1.7, 1.4), inkC, 0, hy - 2.6, mz + 4.6);
  nose.material = new THREE.MeshBasicMaterial({ color: inkC });
  head.add(nose);
  // mouth: a short philtrum line splitting into a little "w" smile
  const mouthZ = mz + 5.2;
  const mouth = new THREE.Group();
  mouth.add(inkMesh(new THREE.BoxGeometry(0.6, 2.2, 0.4), inkC, 0, hy - 4.6, mouthZ));
  for (const s2 of [-1, 1]) {
    const arc = inkMesh(new THREE.TorusGeometry(1.5, 0.32, 4, 10, PI), inkC, s2 * 1.5, hy - 5.6, mouthZ - 0.5);
    arc.rotation.z = PI;
    mouth.add(arc);
  }
  head.add(mouth);
  // eyes + cheeks sitting on the round face, turned with its curve
  const ey = eyes(6.6, 2.1);
  ey.group.position.set(0, hy + 2.2, surf(6.6, 2.2) + 0.4);
  head.add(ey.group);
  for (const s2 of [-1, 1]) {
    const c = cheek(3.8, '#df9a92');
    c.position.set(s2 * 10.2, hy - 3.6, surf(10.2, -3.6) + 0.35);
    c.rotation.y = s2 * 0.62;
    head.add(c);
  }
  // wool bonnet: puffs ringing the face over the top and sides, a forelock,
  // and a round fleece cap over the back of the head — the face sits INSIDE
  // the wool, the wool doesn't grow out of the face
  const bonnet = new THREE.Group();
  bonnet.add(mesh(new THREE.SphereGeometry(1, 16, 12).scale(18.5, 18.5, 15), wool, 0, hy + 2.5, hz - 7, { material: woolMat(wool), jitter: 0.01 }));
  const ring = 17.5;
  for (let i = 0; i <= 8; i += 1) {
    const a = (-35 + (i / 8) * 250) * (PI / 180); // from lower right over the top to lower left
    const r = 7.6 + (i % 2) * 1.0;
    bonnet.add(puff(r, Math.cos(a) * (ring - 1.5), hy + 1.5 + Math.sin(a) * (ring - 1.5) * 0.95, hz - 0.5 - Math.abs(Math.cos(a)) * 3, wool));
  }
  bonnet.add(puff(7, 0, hy + 14.5, hz + 5));

  head.add(bonnet);
  // ears: tan leaves poking out sideways from under the bonnet
  const ears = [];
  for (const s2 of [-1, 1]) {
    const ear = group(s2 * 20, hy + 3, hz - 2);
    const leaf = mesh(new THREE.SphereGeometry(1, 10, 6).scale(10, 4.4, 3.2), '#b5845a', s2 * 8, -3, 0);
    leaf.rotation.z = s2 * -0.45;
    ear.add(leaf);
    head.add(ear);
    ears.push(ear);
  }

  const blink = blinker(rig.seed + (lamb ? 1.7 : 0));
  rig.anims.always = (t, dt, ctx) => {
    ey.blink(blink(t));
    const c = (t + rig.seed * 1.3) % 4.7;
    ears[0].rotation.z = c < 0.25 ? -Math.sin((c / 0.25) * PI) * 0.4 : 0;
    const c2 = (t + rig.seed * 1.3 + 2.2) % 5.9;
    ears[1].rotation.z = c2 < 0.25 ? Math.sin((c2 / 0.25) * PI) * 0.4 : 0;
    // happy little tail wiggle every few seconds
    const c3 = (t + (ctx?.phase ?? 0)) % 3.8;
    tail.rotation.y = c3 < 0.6 ? Math.sin(c3 * 30) * 0.35 * (1 - c3 / 0.6) : 0;
  };
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2 + ctx.phase);
    torso.scale.set(1 + b * 0.012, 1 + b * 0.02, 1);
    head.rotation.z = Math.sin(t * 0.6 + ctx.phase) * 0.05;
    head.rotation.x = 0;
    head.position.y = Y(5.2);
  };
  // grazing: bow the head right down to the grass, nibble, look up again
  rig.anims.graze = (t, dt, ctx) => {
    const cyc = (t + ctx.phase * 2) % 7;
    const down = cyc < 4 ? Math.min(1, cyc / 0.6, (4 - cyc) / 0.6) : 0;
    head.rotation.x = down * 0.75;
    head.position.y = Y(5.2) - down * 6;
    head.rotation.z = down * Math.sin(t * 9) * 0.04; // chewing
    mouth.scale.y = 1 + down * Math.abs(Math.sin(t * 9)) * 0.4;
    const b = Math.sin(t * 2 + ctx.phase);
    torso.scale.set(1, 1 + b * 0.015, 1);
  };
  rig.anims.walk = (t) => {
    legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 8 + (i % 2) * PI) * 0.4; });
    body.position.y = Math.abs(Math.sin(t * 8)) * 1.5;
  };
}
defineModel('sheep', (opts, rig) => sheepModel(rig));

// ── haystack — thatched dome with a fluttering fringe on a mauve base ──────
defineModel('haystack', (opts, rig) => {
  const { Y, S } = grid(94.7);
  const R = S(4.55);
  // two-band hexagonal base, vertex to the front (light / dark halves)
  rig.body.add(mesh(new THREE.CylinderGeometry(R, R, Y(7.4), 6).translate(0, Y(7.4) / 2, 0), '#9a7b73', 0, 0, 0, PLANKS));
  rig.body.add(mesh(new THREE.CylinderGeometry(R + 0.4, R + 0.4, Y(5.0) - Y(7.4), 6).translate(0, Y(7.4) + (Y(5.0) - Y(7.4)) / 2, 0), '#b49c94', 0, 0, 0, PLANKS));
  // dome in three thatch rings
  const top = Y(5.0) - 1;
  // rounded dome in thatch rings (a quarter ellipse, ring by ring)
  const domeH = 100 - top;
  const ringsN = 5;
  const tones = ['#d5bd92', '#dcc59c', '#e1cca6', '#e6d3b0', '#ead9b8'];
  for (let i = 0; i < ringsN; i += 1) {
    const a0 = (i / ringsN) * PI / 2;
    const a1 = ((i + 1) / ringsN) * PI / 2;
    const r0 = R * 1.04 * Math.cos(a0);
    const r1 = R * 1.04 * Math.cos(a1);
    const y0 = top + domeH * Math.sin(a0);
    const y1 = top + domeH * Math.sin(a1);
    const g = r1 > 0.5 ? new THREE.CylinderGeometry(r1, r0, y1 - y0, 14) : new THREE.ConeGeometry(r0, y1 - y0, 14);
    rig.body.add(mesh(g.translate(0, (y0 + y1) / 2, 0), tones[i], 0, 0, 0, STRAW));
  }
  // fringe: straw flaps hanging around the dome's rim
  const flaps = [];
  const n = 16;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * PI * 2;
    const f = group(Math.sin(a) * R * 1.02, top + 2, Math.cos(a) * R * 1.02);
    f.rotation.y = a;
    const len = 18 + (i % 3) * 4;
    const shape = new THREE.Shape([new THREE.Vector2(-9, 0), new THREE.Vector2(9, 0), new THREE.Vector2(0, -len)]);
    f.add(mesh(new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }), i % 2 ? '#cdb07a' : '#c4a46d', 0, 0, 0, STRAW));
    f.children[0].rotation.x = -0.25;
    rig.body.add(f);
    flaps.push(f);
  }
  rig.anims.always = (t, dt, ctx) => {
    flaps.forEach((f, i) => { f.children[0].rotation.x = -0.25 - Math.max(0, Math.sin(t * 1.7 + i * 0.6 + ctx.phase)) * 0.12; });
  };
});

// ── hut — a straw stack (a cone of thatch round crossed poles), not a
// dwelling: no door, no smoke ───────────────────────────────────────────────
defineModel('hut', (opts, rig) => {
  const { Y, S } = grid(107.1);
  const R = S(5.0);
  const collarY = Y(3.6);
  const apex = Y(0.9);
  // straw strips: alternate light / dark per segment, ragged hem
  function straw(geo, base, tones) {
    const g = facet(geo, 0.02);
    const col = g.attributes.color;
    for (let tri = 0; tri < col.count / 3; tri += 1) {
      const k = tones[Math.floor(tri / 2) % tones.length];
      for (let j = 0; j < 3; j += 1) col.setXYZ(tri * 3 + j, k, k, k);
    }
    return new THREE.Mesh(g, mat(base, { side: THREE.DoubleSide, ...STRAW }));
  }
  const skirt = new THREE.CylinderGeometry(S(2.4), R, collarY, 20, 1, true).translate(0, collarY / 2, 0);
  const sp = skirt.attributes.position;
  for (let i = 0; i < sp.count; i += 1) {
    if (sp.getY(i) < 1) sp.setY(i, sp.getY(i) - ((i * 7) % 5) * 1.2); // ragged hem
  }
  rig.body.add(straw(skirt, '#c9a679', [1, 0.82, 0.94, 0.76, 0.9]));
  rig.body.add(mesh(new THREE.CylinderGeometry(S(2.5), S(2.6), 4, 20).translate(0, collarY - 1, 0), '#7f5f38', 0, 0, 0, WOOD));
  // dark straw bundles fanning down the skirt
  const slope = Math.atan2(R - S(2.4), collarY);
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * PI * 2 + 0.2;
    const len = Math.hypot(collarY, R - S(2.4)) * (0.75 + (i % 3) * 0.12);
    const st = group(Math.sin(a) * S(2.45), collarY - 2, Math.cos(a) * S(2.45));
    st.rotation.y = a;
    const strip = mesh(box(5.5, len, 0.6).translate(0, -len, 0), i % 2 ? '#a3804f' : '#b08b58', 0, 0, 0, STRAW);
    strip.rotation.x = -slope;
    strip.position.z = 0.8;
    st.add(strip);
    rig.body.add(st);
  }
  const hat = new THREE.ConeGeometry(S(3.2), apex - collarY + 3, 20, 1, true).translate(0, collarY + (apex - collarY + 3) / 2 - 3, 0);
  rig.body.add(straw(hat, '#cfb088', [1, 0.9, 0.97, 0.86]));
  // crossed poles out of the top
  for (const [x, lean] of [[-3, 0.38], [0, 0], [3, -0.38]]) {
    const p = mesh(box(2.6, 16, 2.6), '#7b5b3a', x, apex - 6, 0, WOOD);
    p.rotation.z = lean;
    rig.body.add(p);
  }
});

// ── well — stone ring, timber frame, rope drum with a working crank ────────
defineModel('well', (opts, rig) => {
  const { X, Y, S } = grid(84.9);
  const R = S(4.65);
  const H = Y(5.3) - 2;
  // stone courses with offset joints
  const courses = 3;
  for (let i = 0; i < courses; i += 1) {
    const h = H / courses;
    const g = new THREE.CylinderGeometry(R - (i % 2) * 0.4, R - (i % 2) * 0.4, h + 0.6, 12, 1, true).translate(0, h * i + h / 2, 0);
    g.rotateY((i % 2) * (PI / 12));
    rig.body.add(mesh(g, i % 2 ? '#b9c5ca' : '#c5d0d5', 0, 0, 0, { side: THREE.DoubleSide, jitter: 0.08, ...STONE }));
  }
  // rim and the dark water inside
  rig.body.add(mesh(new THREE.TorusGeometry(R - 2.5, 3, 4, 12).rotateX(PI / 2).rotateY(PI / 12), '#dfe6e9', 0, H, 0, STONE));
  rig.body.add(inkMesh(new THREE.CircleGeometry(R - 3, 18).rotateX(-PI / 2), '#38463f', 0, H * 0.55, 0));
  rig.body.add(new THREE.Mesh(new THREE.CylinderGeometry(R - 3, R - 3, H * 0.5, 12, 1, true).translate(0, H * 0.75, 0), new THREE.MeshBasicMaterial({ color: '#56635d', side: THREE.BackSide })));
  // timber frame
  const wood = '#8a6a48';
  for (const g of [1.1, 8.2]) rig.body.add(mesh(box(S(0.6), Y(0.2) - 6, 5), wood, X(g), 6, 0, WOOD));
  rig.body.add(mesh(box(S(9.4), 4, 9), wood, X(4.7), Y(0.4), 0, WOOD));
  // axle + rope drum + crank: one pivot so the crank turns them all
  const axleY = Y(3.45);
  const axle = group(X(4.65), axleY, 0);
  axle.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, S(7.4), 8).rotateZ(PI / 2), wood));
  axle.add(mesh(new THREE.CylinderGeometry(3.6, 3.6, S(1.2), 10).rotateZ(PI / 2), '#a07a4c', 0, 0, 0, WOOD));
  const crank = group(S(3.9), 0, 0);
  crank.add(mesh(box(1.6, 8, 1.6).translate(0, -8, 0), wood));
  crank.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 6, 6).rotateZ(PI / 2).translate(3, -8, 0), wood));
  axle.add(crank);
  rig.body.add(axle);
  // rope + bucket
  const rope = mesh(cbox(0.7, 1, 0.7), '#c8b089', X(4.65), axleY, 0);
  rig.body.add(rope);
  const bucket = group(X(4.65), axleY - 20, 0);
  bucket.add(mesh(new THREE.CylinderGeometry(3.4, 2.6, 5.5, 8).translate(0, -5.5, 0), '#8f6a45', 0, 0, 0, PLANKS));
  rig.body.add(bucket);
  // the crank: every few seconds a few turns, hauling the bucket up and back
  rig.anims.always = (t, dt, ctx) => {
    const cyc = (t + ctx.phase * 3) % 9;
    const k = cyc < 4 ? Math.sin((cyc / 4) * PI) : 0; // 0 → 1 → 0 bucket height
    axle.rotation.x = cyc < 4 ? -(cyc / 4) * PI * 6 : 0;
    const drop = 30 - k * 24;
    bucket.position.y = axleY - drop;
    bucket.rotation.z = Math.sin(t * 3) * 0.05;
    rope.scale.y = drop - 5;
    rope.position.y = axleY - (drop - 5) / 2;
  };
});

// ── fence — picket fence in the sheet's mixed wood tones ───────────────────
// (not a sprite piece: the fence on visual.png is half hidden by the lamb)
defineModel('fence3d', (opts, rig) => {
  const len = (opts.length ?? 5) * 100 / 1.45; // world length → percent units (height 1.45)
  const woods = ['#7a5f45', '#8f7256', '#a88a66', '#c2a37a', '#6c5440', '#9a8170'];
  let s = (opts.seed ?? 0) * 9301 + 49297;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (const y of [42, 70]) rig.body.add(mesh(box(len, 7, 3.5), '#6c5440', 0, 100 - y - 3.5, -2.5, WOOD));
  const step = 25;
  const pickets = [];
  for (let x = -len / 2 + step * 0.4; x < len / 2 - step * 0.3; x += step) {
    const h = 72 + r() * 24;
    const w = 15 + r() * 3;
    const flat = r() < 0.3;
    const p = group(x, 0, 0);
    p.add(mesh(box(w, h - (flat ? 0 : w * 0.7), 4), woods[Math.floor(r() * woods.length)], 0, 0, 0, WOOD));
    if (!flat) {
      const tip = new THREE.ConeGeometry(w * 0.72, w * 0.7, 4, 1).rotateY(PI / 4).scale(1, 1, 4 / w);
      p.add(mesh(tip.translate(0, h - (w * 0.7) / 2, 0), woods[Math.floor(r() * woods.length)], 0, 0, 0, WOOD));
    }
    p.rotation.z = (r() - 0.5) * 0.06;
    rig.body.add(p);
    pickets.push(p);
  }
});

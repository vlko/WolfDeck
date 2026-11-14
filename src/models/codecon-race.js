// CodeCon 2026 — pack "codecon-race" (see tools/sprites-src/codecon-race for the
// drawn reference sprites): the paper racing circuit of the slide "Posledný
// rok bol jazda" — three formula cars, the flat oval track, the start-light
// gantry, a tyre barrier, the chequered flag, a pit-crew bear and the timing
// tower.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, box, cbox, beam, group, eyes, cheek, blinker, PI,
} from './kit.js';

const C = {
  red: '#b5544d', teal: '#6fa3a0', ochre: '#c79a4f',
  cream: '#ebe7d7', ivory: '#f2eee2', slate: '#4b5654', post: '#56625f', dark: '#2f3331',
  tyre: '#2f312e', ink: '#1f1d1a', sand: '#d6b386', glass: '#2c3533', rose: '#d79c92',
};
const METAL = { tex: 'metal' };
const FABRIC = { tex: 'fabric' };
const FUR = { tex: 'fur' };

const shade = (hex, dl) => `#${new THREE.Color(hex).offsetHSL(0, 0, dl).getHexString()}`;

// ── local geometry helpers ───────────────────────────────────────────────

// Chamfered-rectangle cross-section at x: bottom yb, top yt, half-width hw.
function oct(x, yb, yt, hw, k = 0.32) {
  const c = Math.min(hw, (yt - yb) / 2) * k;
  return {
    x,
    pts: [[yb, hw - c], [yb + c, hw], [yt - c, hw], [yt, hw - c], [yt, -(hw - c)], [yt - c, -hw], [yb + c, -hw], [yb, -(hw - c)]],
  };
}

// Faceted hull through cross-sections [{ x, pts: [[y, z], …] }] (same point
// count each), capped at both ends. Triangles are wound outward from the
// hull's own axis, so the sections may be listed in either direction.
function loft(secs) {
  const pos = [];
  const cen = secs.map((s) => {
    const n = s.pts.length;
    return [s.x, s.pts.reduce((a, p) => a + p[0], 0) / n, s.pts.reduce((a, p) => a + p[1], 0) / n];
  });
  const v = (i, j) => { const s = secs[i]; const p = s.pts[j % s.pts.length]; return [s.x, p[0], p[1]]; };
  const tri = (a, b, c, inside) => {
    const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
    const wx = c[0] - a[0]; const wy = c[1] - a[1]; const wz = c[2] - a[2];
    const nx = uy * wz - uz * wy; const ny = uz * wx - ux * wz; const nz = ux * wy - uy * wx;
    if (Math.hypot(nx, ny, nz) < 1e-9) return;
    const gx = (a[0] + b[0] + c[0]) / 3 - inside[0];
    const gy = (a[1] + b[1] + c[1]) / 3 - inside[1];
    const gz = (a[2] + b[2] + c[2]) / 3 - inside[2];
    if (nx * gx + ny * gy + nz * gz >= 0) pos.push(...a, ...b, ...c);
    else pos.push(...a, ...c, ...b);
  };
  const n = secs[0].pts.length;
  for (let i = 0; i < secs.length - 1; i += 1) {
    const inside = [(cen[i][0] + cen[i + 1][0]) / 2, (cen[i][1] + cen[i + 1][1]) / 2, (cen[i][2] + cen[i + 1][2]) / 2];
    for (let j = 0; j < n; j += 1) {
      tri(v(i, j), v(i, j + 1), v(i + 1, j + 1), inside);
      tri(v(i, j), v(i + 1, j + 1), v(i + 1, j), inside);
    }
  }
  const last = secs.length - 1;
  for (const [i, o] of [[0, 1], [last, last - 1]]) {
    const inside = cen[o];
    for (let j = 1; j < n - 1; j += 1) tri(v(i, 0), v(i, j), v(i, j + 1), inside);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Outline [[x, y], …] extruded to depth d (centred in z), no bevel.
function slabXY(points, d) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
}

// A cylinder between two points.
function rod(parent, a, b, r, color, seg = 6) {
  const A = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(A);
  const L = d.length();
  const m = mesh(new THREE.CylinderGeometry(r, r, L, seg), color);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  parent.add(m);
  return m;
}

// Disc with its axis along z (roundels, lamps), centred.
const zDisc = (r, t, seg = 16) => new THREE.CylinderGeometry(r, r, t, seg).rotateX(PI / 2);

// Faceted solid of revolution from a profile [[r, y], …]; 6 sides by default
// with a vertex toward the viewer, so the light splits it down the middle.
function gem(profile, seg = 6, depth = 1) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y)), seg);
  g.scale(1, 1, depth);
  return g;
}

const merge = (list) => BufferGeometryUtils.mergeGeometries(list.map((g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.clearGroups();
  return n;
}));

// An unlit material of its own (lights that change colour).
const glowMat = (color) => new THREE.MeshBasicMaterial({ color });

// smooth 0 → 1
const ease = (k) => k * k * (3 - 2 * k);

// ── formula cars — one factory, three liveries ───────────────────────────

// Fat slick tyre (axis z, pivot at the centre) with a cream rim, a cap in
// the car's colour and five lugs.
function raceWheel(r, w, cap) {
  const g = new THREE.Group();
  const c = 4.5;
  const prof = [[r * 0.6, -w / 2], [r - c, -w / 2], [r, -w / 2 + c], [r, w / 2 - c], [r - c, w / 2], [r * 0.6, w / 2]];
  const tyre = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 14).rotateX(PI / 2);
  g.add(mesh(tyre, C.tyre, 0, 0, 0, { side: THREE.DoubleSide }));
  g.add(mesh(zDisc(r * 0.63, w - 2.4, 14), C.cream));
  g.add(mesh(zDisc(r * 0.23, w - 0.8, 10), cap));
  for (const s of [1, -1]) {
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * PI * 2 + 0.3;
      g.add(mesh(zDisc(1.7, 1, 6), shade(C.cream, -0.24), Math.cos(a) * r * 0.41, Math.sin(a) * r * 0.41, s * (w / 2 - 1.1)));
    }
  }
  return g;
}

function formula(rig, L) {
  const WR = 26; // wheel radius
  const WX = 90; // axle x (front +, rear −)
  const WZ = 43; // wheel centre z
  const WW = 24; // tyre width
  const chassis = group();
  rig.body.add(chassis);
  const add = (m) => { chassis.add(m); return m; };

  // tub, nose cone, engine cover, gearbox, floor plank
  add(mesh(loft([oct(122, 11, 24, 8), oct(60, 9, 34, 13), oct(22, 8, 46, 19), oct(-24, 8, 46, 21), oct(-70, 8, 40, 21), oct(-122, 12, 32, 13)]), L.body));
  add(mesh(loft([oct(152, 13, 19, 4.5), oct(122, 11, 24, 8)]), C.cream));
  add(mesh(loft([oct(-20, 44, 68, 9), oct(-26, 44, 70, 9), oct(-60, 40, 56, 8), oct(-122, 30, 36, 6)]), L.dark));
  add(mesh(cbox(20, 18, 18), C.dark, -130, 25, 0));
  add(inkMesh(cbox(1.2, 6, 7), '#d9534a', -140.4, 25, 0));
  add(mesh(cbox(226, 3.5, 30), C.dark, -5, 6.6, 0));
  // cockpit: dark opening, windscreen wedge, mirrors, shoulders
  add(mesh(cbox(34, 1, 26), C.dark, -3, 46.2, 0));
  add(mesh(slabXY([[18, 46], [29, 46], [20, 56]], 26), C.glass));
  for (const s of [1, -1]) {
    add(mesh(cbox(6, 5, 5), shade(L.body, -0.08), 25, 51.5, s * 16.5));
    add(inkMesh(cbox(0.5, 3.6, 3.6), '#55625e', 21.8, 51.5, s * 16.5));
  }
  add(mesh(cbox(14, 8, 28), L.suit, 0, 48, 0));

  // side pods with a dark intake and a cream roundel
  const podOutline = [[-60, 10], [36, 10], [40, 14], [26, 36], [-50, 36], [-60, 28]];
  for (const s of [1, -1]) {
    add(mesh(slabXY(podOutline, 14), L.dark, 0, 0, s * 23.5));
    const intake = mesh(beam(39.4, 15, 27, 34.5, 1, 9), C.dark, 0.4, 0.26, s * 24.5);
    add(intake);
    add(mesh(zDisc(8, 0.9), C.cream, -12, 22, s * 30.9));
  }

  // front wing: main plane, cream flaps, end plates, two pylons to the nose
  add(mesh(cbox(30, 3.5, 104), C.slate, 143, 7.25, 0));
  for (const s of [1, -1]) {
    add(mesh(cbox(32, 18, 3), L.body, 143, 14, s * 53.5));
    add(mesh(cbox(13, 2.5, 39), C.cream, 136.5, 12.2, s * 32.6));
    add(mesh(cbox(5, 4.6, 2.4), C.slate, 138, 10.6, s * 3.6));
  }
  // rear wing: end plates, tilted main element, cream lower beam, pylon
  for (const s of [1, -1]) add(mesh(cbox(32, 52, 3), L.body, -142, 66, s * 36));
  const mainPlane = mesh(cbox(28, 5, 69.4), C.slate, -142, 85, 0);
  mainPlane.rotation.z = -0.12;
  add(mainPlane);
  add(mesh(cbox(22, 3.5, 69.4), C.cream, -140, 52, 0));
  add(mesh(cbox(8, 17, 6), C.slate, -134, 42, 0));

  // suspension: an axle and two wishbone rods per wheel
  for (const s of [1, -1]) {
    rod(chassis, [WX, 26, s * 32], [WX, 24, s * 8], 1.5, C.dark);
    rod(chassis, [WX, 27, s * 32], [WX - 20, 26, s * 10], 1.2, C.dark);
    rod(chassis, [WX, 25, s * 32], [WX + 16, 21, s * 7], 1.2, C.dark);
    rod(chassis, [-WX, 26, s * 32], [-WX, 26, s * 15], 1.5, C.dark);
    rod(chassis, [-WX, 27, s * 32], [-WX + 20, 27, s * 18], 1.2, C.dark);
    rod(chassis, [-WX, 27, s * 32], [-WX - 18, 26, s * 14], 1.2, C.dark);
  }

  // wheels stay on the ground (the engine spins them)
  rig.parts.wheels = [];
  for (const x of [WX, -WX]) {
    for (const s of [1, -1]) {
      const w = raceWheel(WR, WW, L.body);
      w.position.set(x, WR, s * WZ);
      rig.body.add(w);
      rig.parts.wheels.push(w);
    }
  }
  rig.parts.wheelRadius = WR;

  // driver: a helmeted head on a neck pivot. The head is built facing its
  // own +z and turned to look down the track (+x).
  const neck = group(2, 48, 0);
  chassis.add(neck);
  const head = group(0, 19, 0);
  head.rotation.y = PI / 2;
  neck.add(head);
  head.add(mesh(new THREE.IcosahedronGeometry(17, 1), L.helmet));
  head.add(mesh(new THREE.CylinderGeometry(17.3, 17.3, 5, 14).rotateZ(PI / 2), L.body)); // centre stripe
  for (const s of [1, -1]) head.add(mesh(new THREE.CylinderGeometry(5, 5, 1.2, 12).rotateZ(PI / 2), L.body, s * 16.3, 1, -5));
  head.add(mesh(new THREE.IcosahedronGeometry(14.5, 1), L.fur, 0, 0, 5.5, FUR));
  head.add(mesh(new THREE.IcosahedronGeometry(5, 1).scale(1.05, 0.8, 0.9), C.cream, 0, -4, 18.6));
  head.add(inkMesh(new THREE.SphereGeometry(1.7, 10, 8), C.ink, 0, -2.6, 23));
  const e = eyes(7.5, 2);
  e.group.position.set(0, 3.2, 17.5);
  head.add(e.group);
  for (const s of [1, -1]) {
    const ch = cheek(2.6, C.rose);
    ch.position.set(s * 9.6, -3, 16.6);
    ch.rotation.y = s * 0.72;
    head.add(ch);
    const ear = group(s * 8, 12.5, -2);
    ear.rotation.z = -s * 0.28;
    ear.add(mesh(new THREE.ConeGeometry(5.6, 21, 4).translate(0, 10.5, 0), L.fur, 0, 0, 0, FUR));
    ear.add(mesh(new THREE.ConeGeometry(3.1, 13, 4).translate(0, 7.5, 0), L.earIn, 0, 0.6, 2.2));
    head.add(ear);
  }
  rig.parts.chassis = chassis;
  rig.parts.head = head;

  const blink = blinker(rig.seed + 2);
  rig.anims.always = (t) => { e.blink(blink(t)); };
  // idle: the engine trembles, the driver glances about (now and then at us)
  rig.anims.idle = (t, dt, ctx) => {
    const p = ctx.phase;
    chassis.position.y = Math.sin(t * 31 + p) * 0.22;
    chassis.rotation.x = Math.sin(t * 27 + p) * 0.003;
    chassis.rotation.z = 0;
    neck.rotation.z = 0;
    const c = (t + p * 2) % 6;
    const look = c < 2 ? Math.sin((c / 2) * PI) ** 2 : 0;
    head.rotation.y = PI / 2 - look * 0.95 + Math.sin(t * 0.8 + p) * 0.16 * (1 - look);
    head.rotation.x = Math.sin(t * 0.55 + p) * 0.04;
  };
  // drive: light bounce and pitch, helmet leaning into the wind
  rig.anims.drive = (t, dt, ctx) => {
    const p = ctx.phase;
    chassis.position.y = 0.5 + Math.sin(t * 13 + p) * 0.45;
    chassis.rotation.x = 0;
    chassis.rotation.z = -0.005 + Math.sin(t * 6.5 + p) * 0.008;
    neck.rotation.z = -0.13 + Math.sin(t * 3.1 + p) * 0.04;
    head.rotation.y = PI / 2 + Math.sin(t * 1.3 + p) * 0.14;
    head.rotation.x = 0;
  };
}

const SUIT = '#e2dccb';
defineModel('formulaRed', (opts, rig) => formula(rig, { body: C.red, dark: '#93433d', helmet: C.cream, fur: '#8f8a86', earIn: '#d9b9b0', suit: SUIT }));
defineModel('formulaTeal', (opts, rig) => formula(rig, { body: C.teal, dark: '#55827f', helmet: C.cream, fur: '#c58a5c', earIn: '#ecd9c0', suit: SUIT }));
defineModel('formulaOchre', (opts, rig) => formula(rig, { body: C.ochre, dark: '#a37b3b', helmet: C.cream, fur: '#6b6f70', earIn: '#d9b9b0', suit: SUIT }));

// ── raceTrack — flat stadium oval, 360 × 100 units, open infield ─────────
// Centreline: straights at z = ±35 for x ∈ [−130, 130], semicircles r = 35
// about x = ±130; lane 30 wide (asphalt r 20 … 50). Layers (y): asphalt
// 0 … 0.4, paint and racing line … 0.7, kerbs … 0.8, chequer squares … 1.0.
// Cars start toward +x on the near straight (z = +35); the grid is at x < 0.
defineModel('raceTrack', (opts, rig) => {
  const SX = 130;
  const stadium = (r, P = THREE.Shape) => {
    const s = new P();
    s.moveTo(-SX, -r);
    s.lineTo(SX, -r);
    s.absarc(SX, 0, r, -PI / 2, PI / 2, false);
    s.lineTo(-SX, r);
    s.absarc(-SX, 0, r, PI / 2, PI * 1.5, false);
    return s;
  };
  // a shape drawn in (x, −z) laid flat between y0 and y1
  const lay = (shape, y0, y1, seg = 28) => new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: seg })
    .rotateX(-PI / 2).translate(0, y0, 0);
  const ring = (r0, r1) => { const s = stadium(r1); s.holes.push(stadium(r0, THREE.Path)); return s; };
  const slab = (x0, x1, z0, z1, y0, y1) => new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

  // asphalt: the two straights full width, the turns 0.3 short of each edge
  // so the kerb blocks own the rim there (no coincident side walls)
  const halfRing = (cx, r0, r1) => {
    const a0 = cx > 0 ? -PI / 2 : PI / 2;
    const s = new THREE.Shape();
    s.moveTo(cx + r0 * Math.cos(a0), r0 * Math.sin(a0));
    s.lineTo(cx + r1 * Math.cos(a0), r1 * Math.sin(a0));
    s.absarc(cx, 0, r1, a0, a0 + PI, false);
    s.lineTo(cx + r0 * Math.cos(a0 + PI), r0 * Math.sin(a0 + PI));
    s.absarc(cx, 0, r0, a0 + PI, a0, true);
    return s;
  };
  const asphalt = merge([
    slab(-SX, SX, 20, 50, 0, 0.4), slab(-SX, SX, -50, -20, 0, 0.4),
    lay(halfRing(SX, 20.3, 49.7), 0, 0.4), lay(halfRing(-SX, 20.3, 49.7), 0, 0.4),
  ]);
  rig.body.add(mesh(asphalt, '#a9ab9e', 0, 0, 0, { tex: 'asphalt', jitter: 0.02 }));
  // faint rubbered racing line down the middle of the lane
  rig.body.add(mesh(lay(ring(32.5, 37.5), 0.1, 0.7), '#9c9e92', 0, 0, 0, { tex: 'asphalt', jitter: 0.02 }));

  // kerbs: 12 red/white blocks per half-turn on the inner and the outer edge
  const sector = (cx, r0, r1, a, b) => {
    const s = new THREE.Shape();
    s.moveTo(cx + r0 * Math.cos(a), r0 * Math.sin(a));
    s.lineTo(cx + r1 * Math.cos(a), r1 * Math.sin(a));
    s.absarc(cx, 0, r1, a, b, false);
    s.lineTo(cx + r0 * Math.cos(b), r0 * Math.sin(b));
    s.absarc(cx, 0, r0, b, a, true);
    return s;
  };
  const kerbs = { red: [], white: [] };
  for (const cx of [-SX, SX]) {
    const a0 = cx > 0 ? -PI / 2 : PI / 2;
    for (let i = 0; i < 12; i += 1) {
      const a = a0 + (i / 12) * PI;
      const b = a0 + ((i + 1) / 12) * PI;
      const list = i % 2 ? kerbs.white : kerbs.red;
      list.push(lay(sector(cx, 46.6, 50, a, b), 0, 0.8, 4));
      list.push(lay(sector(cx, 20, 23.4, a, b), 0, 0.8, 4));
    }
  }
  rig.body.add(mesh(merge(kerbs.red), C.red));
  rig.body.add(mesh(merge(kerbs.white), C.cream));

  // painted edge lines along the straights
  const paint = [];
  for (const z of [-48.5, -21.5, 21.5, 48.5]) paint.push(slab(-SX, SX, z - 0.6, z + 0.6, 0.1, 0.7));
  // start / finish band across the near straight + six staggered grid slots
  paint.push(slab(-3, 3, 22.6, 47.4, 0.1, 0.7));
  for (let i = 0; i < 6; i += 1) {
    const x = -12 - i * 11;
    const z = i % 2 ? 41 : 29;
    paint.push(slab(x - 0.6, x + 0.6, z - 4.5, z + 4.5, 0.1, 0.7));
    paint.push(slab(x - 4.5, x - 0.6, z - 4.5, z - 3.5, 0.1, 0.7));
    paint.push(slab(x - 4.5, x - 0.6, z + 3.5, z + 4.5, 0.1, 0.7));
  }
  rig.body.add(mesh(merge(paint), C.ivory));
  const squares = [];
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 2; c += 1) {
      if ((r + c) % 2 === 0) squares.push(slab(-3 + c * 3, c * 3, 47.4 - (r + 1) * 3.1, 47.4 - r * 3.1, 0.3, 1.0));
    }
  }
  rig.body.add(mesh(merge(squares), '#363a38'));
});

// ── startGantry — two posts, a beam, five start lights ───────────────────
defineModel('startGantry', (opts, rig) => {
  const PX = 44; // post centre; clear width between the posts = 80
  for (const s of [-1, 1]) {
    rig.body.add(mesh(box(18, 4, 18), C.slate, s * PX, 0, 0, METAL));
    rig.body.add(mesh(box(8, 78, 8), C.post, s * PX, 4, 0));
    for (let i = 0; i < 3; i += 1) rig.body.add(mesh(box(9.2, 5, 9.2), i % 2 ? C.cream : C.red, s * PX, 4 + i * 5, 0));
    rig.body.add(mesh(beam(s * 40, 64, s * 24, 80, 3.6, 4), C.post));
  }
  rig.body.add(mesh(box(104, 16, 10), '#3a413f', 0, 80, 0));
  rig.body.add(mesh(box(108, 4, 13), C.cream, 0, 96, 0));
  const OFF = new THREE.Color('#5a3a37');
  const RED = new THREE.Color('#e8564a');
  const GREEN = new THREE.Color('#7fd08f');
  const lamps = [];
  for (let i = 0; i < 5; i += 1) {
    const x = -32 + i * 16;
    const m = glowMat(OFF);
    const lenses = [];
    for (const s of [1, -1]) {
      rig.body.add(mesh(zDisc(6.4, 1), '#262a29', x, 88, s * 5.3));
      const lens = new THREE.Mesh(zDisc(5, 1.2, 18), m);
      lens.position.set(x, 88, s * 6.2);
      rig.body.add(lens);
      lenses.push(lens);
    }
    lamps.push({ m, lenses });
  }
  rig.parts.lamps = lamps;
  // 8 s loop: reds come on one by one, hold, all green, all out
  rig.anims.lights = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 8;
    lamps.forEach((l, i) => {
      let col = OFF;
      if (c >= 5.2 && c < 6.9) col = GREEN;
      else if (c < 5.2 && c >= 0.6 + i * 0.8) col = RED;
      l.m.color.copy(col);
      const k = col === OFF ? 1 : 1.08;
      for (const lens of l.lenses) lens.scale.set(k, k, 1);
    });
  };
  rig.anims.idle = rig.anims.lights;
});

// ── tyreStack — 3 columns × 3 tyres, painted red and white ───────────────
defineModel('tyreStack', (opts, rig) => {
  const R = 30;
  const H = 100 / 3;
  const c = 6;
  const prof = [[15, 2.5], [R - c, 0], [R, c], [R, H - c], [R - c, H], [15, H - 2.5], [15, 2.5]];
  for (let col = 0; col < 3; col += 1) {
    const x = (col - 1) * 60;
    rig.body.add(mesh(new THREE.CylinderGeometry(15.4, 15.4, 90, 12).translate(0, 46, 0), '#262928', x, 0, 0));
    for (let row = 0; row < 3; row += 1) {
      const k = col * 3 + row;
      // (the turn is baked into the geometry so the footprint box stays tight)
      const g = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 12).rotateY(k * 0.37);
      const tyre = mesh(g, (col + row) % 2 ? C.ivory : C.red, x, row * H, 0, { side: THREE.DoubleSide });
      // hand-stacked: the upper tyres sit a touch off-centre
      tyre.position.x += row ? Math.sin(k * 2.1) * 1.1 : 0;
      tyre.position.z += row ? Math.cos(k * 1.7) * 1.4 : 0;
      rig.body.add(tyre);
    }
  }
});

// ── chequeredFlag — pole on a small base, hinged waving cloth ────────────
defineModel('chequeredFlag', (opts, rig) => {
  const PXc = -24;
  rig.body.add(mesh(gem([[0, 0], [10, 0], [6, 6], [0, 6]], 8), C.slate, PXc, 0, 0));
  rig.body.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 91, 6).translate(0, 51.5, 0), C.sand, PXc, 0, 0));
  rig.body.add(mesh(new THREE.IcosahedronGeometry(2.9, 0), '#bd9662', PXc, 97.1, 0));
  const COLS = 6;
  const ROWS = 4;
  const SW = 8;
  const SH = 9;
  // the cloth hangs from a pivot on the pole; each column of squares is
  // hinged to the one before it
  const cloth = group(PXc + 1.5, 78, 0);
  rig.body.add(cloth);
  const segs = [];
  let parent = cloth;
  for (let i = 0; i < COLS; i += 1) {
    const seg = group(i ? SW : 0, 0, 0);
    for (let r = 0; r < ROWS; r += 1) {
      const dark = (i + r) % 2 === 0;
      seg.add(mesh(cbox(SW, SH, 1), dark ? '#33383a' : '#efeadc', SW / 2, (r - (ROWS - 1) / 2) * SH, 0));
    }
    parent.add(seg);
    parent = seg;
    segs.push(seg);
  }
  rig.parts.cloth = segs;
  rig.anims.wave = (t, dt, ctx) => {
    const p = ctx.phase;
    segs.forEach((s, i) => {
      s.rotation.y = (0.2 + i * 0.045) * Math.sin(t * 4.4 - i * 1.05 + p) + (i === 0 ? 0.12 : 0);
    });
    cloth.rotation.z = -0.05 + Math.sin(t * 2.2 + p) * 0.025;
  };
  rig.anims.idle = rig.anims.wave;
});

// ── pitCrew — a bear mechanic in overalls with a headset and a lollipop ──
defineModel('pitCrew', (opts, rig) => {
  const FURC = '#a47e5c';
  const OVER = '#5d8a88';
  const PAW = '#8a6648';
  const D = 0.85; // head depth squash
  const torso = group();
  rig.body.add(torso);
  for (const s of [-1, 1]) {
    torso.add(mesh(box(8.4, 19, 9), OVER, s * 7, 3, 0, FABRIC));
    torso.add(mesh(box(9.6, 4, 13), '#333735', s * 7, 0, 1.6));
  }
  torso.add(mesh(gem([[0, 19], [14, 19], [17, 28], [13.5, 54], [0, 54]], 6, 0.8), OVER, 0, 0, 0, FABRIC));
  // reflective chest band (follows the facets, 0.5 proud) and a cream collar
  torso.add(mesh(gem([[15.9, 39.5], [15.35, 43.5]], 6, 0.8), C.cream, 0, 0, 0, { side: THREE.DoubleSide }));
  torso.add(mesh(gem([[0, 53], [9.8, 53], [8.6, 57], [0, 57]], 6, 0.8), C.cream));
  torso.add(mesh(new THREE.IcosahedronGeometry(4, 0), FURC, 0, 25, -13.5, FUR)); // stub tail

  // head
  const head = group(0, 56, 0);
  torso.add(head);
  const prof = [[0, 0], [13, 2], [22, 13], [21, 28], [11, 38], [0, 40]];
  const rAt = (y) => {
    for (let i = 0; i < prof.length - 1; i += 1) {
      const [r0, y0] = prof[i];
      const [r1, y1] = prof[i + 1];
      if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
    }
    return 0;
  };
  const zF = (x, y) => D * (rAt(y) - 0.5774 * Math.abs(x)); // front surface of the folded face
  head.add(mesh(gem(prof, 6, D), FURC, 0, 0, 0, FUR));
  for (const s of [-1, 1]) {
    head.add(mesh(new THREE.IcosahedronGeometry(6.5, 1).scale(1, 1, 0.55), FURC, s * 14, 37, -4, FUR));
    head.add(mesh(zDisc(3.4, 0.8, 10), '#c9a08f', s * 14, 37, -0.3));
  }
  head.add(mesh(new THREE.IcosahedronGeometry(6.6, 1).scale(1.15, 0.85, 0.7), C.cream, 0, 9.5, zF(0, 9.5) - 1.2));
  head.add(inkMesh(new THREE.SphereGeometry(1, 10, 8).scale(2.4, 1.8, 1.4), C.ink, 0, 11.6, zF(0, 9.5) + 3.2));
  const e = eyes(8.5, 2.1);
  e.group.position.set(0, 20, zF(8.5, 20) + 0.3);
  head.add(e.group);
  for (const s of [-1, 1]) {
    const ch = cheek(3, C.rose);
    ch.position.set(s * 13, 14.5, zF(13, 14.5) + 0.7);
    ch.rotation.y = s * 0.46;
    head.add(ch);
  }
  // headset: band over the top, one ear cup with a boom mic, a pad opposite
  const HS = '#333735';
  head.add(mesh(new THREE.TorusGeometry(22.5, 1.3, 5, 16, PI), HS, 0, 18, 0));
  head.add(mesh(new THREE.CylinderGeometry(6, 6, 4.4, 10).rotateZ(PI / 2), HS, -21, 18, 0));
  head.add(mesh(cbox(2.6, 6, 6), HS, 20.6, 18, 0));
  rod(head, [-21.5, 15, 2], [-10.5, 7.5, 16.5], 0.8, HS);
  head.add(mesh(new THREE.IcosahedronGeometry(2, 0), HS, -10.5, 7.5, 16.5));

  // arms on shoulder pivots; the right one (viewer's right) holds the sign
  const arms = [-1, 1].map((s) => {
    const a = group(s * 14.5, 48, 0);
    a.add(mesh(new THREE.CylinderGeometry(3.8, 3.1, 19, 6).translate(0, -9.5, 0), OVER, 0, 0, 0, FABRIC));
    a.add(mesh(new THREE.IcosahedronGeometry(3.5, 0), PAW, 0, -20.5, 0, FUR));
    torso.add(a);
    return a;
  });
  const sign = group(0, -20.5, 3.4);
  arms[1].add(sign);
  sign.add(mesh(new THREE.CylinderGeometry(1.2, 1.2, 42, 6).translate(0, 11, 0), C.sand));
  sign.add(mesh(zDisc(12, 2.4, 18), C.cream, 0, 42, 0));
  sign.add(mesh(zDisc(9.6, 0.7, 18), C.red, 0, 42, 1.4));
  sign.add(mesh(cbox(13, 3.2, 0.6), C.cream, 0, 42, 2.0));
  sign.add(mesh(zDisc(9.6, 0.7, 18), '#7fae84', 0, 42, -1.4));
  rig.parts.head = head;
  rig.parts.arms = arms;
  rig.parts.sign = sign;

  const blink = blinker(rig.seed + 4);
  rig.anims.always = (t) => { e.blink(blink(t)); };
  const pose = (lift, tilt) => {
    arms[1].rotation.z = lift;
    sign.rotation.z = -lift - 0.12 + tilt; // the pole stays upright in the paw
  };
  // idle: breathe, look about, the sign sways a little
  rig.anims.idle = (t, dt, ctx) => {
    const p = ctx.phase;
    const b = Math.sin(t * 2 + p);
    torso.scale.set(1 - b * 0.005, 1 + b * 0.01, 1);
    torso.position.y = 0;
    head.rotation.y = Math.sin(t * 0.45 + p) * 0.3;
    head.rotation.z = Math.sin(t * 0.7 + p) * 0.05;
    arms[0].rotation.z = -0.35 - b * 0.03;
    arms[1].rotation.x = 0;
    pose(1.0 + b * 0.03, Math.sin(t * 1.1 + p) * 0.05);
  };
  // wave: the lollipop goes up and swings from side to side
  rig.anims.wave = (t, dt, ctx) => {
    const p = ctx.phase;
    const w = Math.sin(t * 4.6 + p);
    torso.scale.set(1, 1, 1);
    torso.position.y = Math.abs(Math.sin(t * 4.6 + p)) * 0.7;
    head.rotation.y = 0.12 + Math.sin(t * 1.3 + p) * 0.1;
    head.rotation.z = w * 0.05;
    arms[0].rotation.z = -0.5 - w * 0.08;
    arms[1].rotation.x = 0;
    pose(2.25 + w * 0.16, w * 0.3);
  };
});

// ── timingTower — pylon with three position slots and a glowing top ──────
defineModel('timingTower', (opts, rig) => {
  const BODY = '#3f4745';
  rig.body.add(mesh(box(30, 4, 22), C.slate, 0, 0, 0, METAL));
  rig.body.add(mesh(box(24, 3, 18), '#6d7a6c', 0, 4, 0, METAL));
  rig.body.add(mesh(box(22, 80, 14), BODY, 0, 7, 0));
  rig.body.add(mesh(box(26, 4, 18), C.cream, 0, 87, 0));
  const lampMat = glowMat('#ffe7a8');
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(3, 6, 9, 4).rotateY(PI / 4).translate(0, 4.5, 0), lampMat);
  lamp.position.set(0, 91, 0);
  rig.body.add(lamp);
  // cream corner stripes on the narrow sides
  for (const s of [-1, 1]) rig.body.add(mesh(cbox(0.6, 70, 3), C.cream, s * 11.2, 47, 0));

  const SLOT_Y = [71, 51, 31];
  const COLORS = [C.red, C.teal, C.ochre];
  const BZ = 8.7; // block centre z (front panel surface at 7.5)
  const blocks = COLORS.map(() => []);
  for (const turn of [0, PI]) {
    const side = group();
    side.rotation.y = turn;
    rig.body.add(side);
    SLOT_Y.forEach((y, i) => {
      side.add(mesh(cbox(18, 17, 0.5), '#566260', 0, y, 7.25));
      const n = i + 1;
      for (let k = 0; k < n; k += 1) side.add(inkMesh(cbox(2, 2, 0.5), C.ivory, -5.4, y + (k - (n - 1) / 2) * 4.2, 7.75));
    });
    COLORS.forEach((col, i) => {
      const b = inkMesh(cbox(9.5, 12, 1.6), col, 3.25, SLOT_Y[i], BZ);
      side.add(b);
      blocks[i].push(b);
    });
  }
  rig.parts.blocks = blocks;
  rig.parts.lamp = lamp;

  // 18 s loop: every 3 s two neighbouring slots swap (the riser pops out and
  // passes in front); six swaps bring the starting order back
  const SWAPS = [[0, 1], [1, 2], [0, 1], [1, 2], [0, 1], [1, 2]];
  const STEP = 3;
  const HI = new THREE.Color('#fff0c4');
  const LO = new THREE.Color('#d8b565');
  rig.anims.idle = (t, dt, ctx) => {
    const tt = t + ctx.phase * 2;
    const step = Math.floor(tt / STEP) % 6;
    const frac = tt / STEP - Math.floor(tt / STEP);
    const order = [0, 1, 2]; // order[slot] = block index
    for (let i = 0; i < step; i += 1) { const [a, b] = SWAPS[i]; [order[a], order[b]] = [order[b], order[a]]; }
    const k = frac > 0.74 ? ease((frac - 0.74) / 0.26) : 0;
    const [sa, sb] = SWAPS[step];
    order.forEach((bi, slot) => {
      let y = SLOT_Y[slot];
      let z = BZ;
      if (slot === sa) { y += (SLOT_Y[sb] - y) * k; }
      if (slot === sb) { y += (SLOT_Y[sa] - y) * k; z += Math.sin(k * PI) * 2.6; }
      for (const b of blocks[bi]) b.position.set(3.25, y, z);
    });
    const g = 0.5 + 0.5 * Math.sin(t * 2.4 + ctx.phase);
    lampMat.color.copy(LO).lerp(HI, g);
    lamp.scale.setScalar(0.96 + g * 0.06);
  };
});

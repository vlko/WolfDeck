// CodeCon 2026 — pack "codecon-voice" (see tools/sprites-src/codecon-voice for the
// drawn reference sprites). "Start writing" (typewriter, newsletters, paper
// plane, post box, the endless feed) and "start talking" (podcast mic,
// headphones, speech bubbles, ON AIR sign, the fox host).
import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, box, cbox, beam, cyl, ball, extrude, group, fold, foldPanel, blinker, cheek, PI,
} from './kit.js';

const C = {
  cream: '#e4dcc9', ivory: '#f1ecdf', paper: '#f6f2e6', paperD: '#ded6c2',
  slate: '#4b5654', slateD: '#3a4442', slateL: '#66726f',
  mauve: '#a5817f', ochre: '#b58e5c', ochreD: '#a07d4f', sand: '#d6b386',
  sage: '#8d9d8b', sageL: '#a4b1a2', brown: '#6f5a40',
  red: '#b5544d', redL: '#c9645a', redD: '#93423e', teal: '#74a4a0', rose: '#dca096',
  wood: '#a8845a', fox: '#c27f52', foxDark: '#7b4a35', ink: '#24221e', line: '#8f9891',
  led: '#e0685b',
};
const WOOD = { tex: 'woodFine' };
const FABRIC = { tex: 'fabric' };
const SHEET = { side: THREE.DoubleSide };

// ── local helpers ─────────────────────────────────────────────────────────
const cylX = (r, len, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(PI / 2);
const cylZ = (r, len, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(PI / 2);
const clamp01 = (k) => Math.min(1, Math.max(0, k));
const smooth = (k) => { const c = clamp01(k); return c * c * (3 - 2 * c); };
const backOut = (k) => { const c = clamp01(k) - 1; return 1 + c * c * (2.7 * c + 1.7); };
const hash = (n) => {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
};

// Tapered rod from point a (radius r0) to point b (radius r1).
function rod(a, b, r0, r1 = r0, seg = 6) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()));
  return g.translate(A.x, A.y, A.z);
}

// A side profile [[z, y], …] extruded across x (width w, centred).
function profileX(points, w, hole) {
  const s = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  if (hole) s.holes.push(new THREE.Path(hole.map(([z, y]) => new THREE.Vector2(z, y))));
  return new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }).rotateY(-PI / 2).translate(w / 2, 0, 0);
}

// Closed (or partial) faceted solid from vertices + triangles; every face is
// turned to look away from `inside`.
function solid(verts, faces, inside) {
  const pos = [];
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  const n = new THREE.Vector3(); const m = new THREE.Vector3(); const o = new THREE.Vector3(...inside);
  for (const [i, j, k] of faces) {
    a.set(...verts[i]); b.set(...verts[j]); c.set(...verts[k]);
    n.subVectors(b, a).cross(m.subVectors(c, a));
    m.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(o);
    const tri = n.dot(m) >= 0 ? [a, b, c] : [a, c, b];
    for (const p of tri) pos.push(p.x, p.y, p.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

// Thin sheet triangles (rendered double-sided).
function tris(list) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(list.flat(2), 3));
  return g;
}

// A decal polygon lying on triangle a-b-c: corners given as barycentric
// [u, v] pairs (p = a + (b−a)·u + (c−a)·v), lifted along the face normal
// that points away from `inside`.
function onFace(a, b, c, uvs, lift, inside) {
  const A = new THREE.Vector3(...a); const B = new THREE.Vector3(...b); const Cc = new THREE.Vector3(...c);
  const e1 = B.clone().sub(A); const e2 = Cc.clone().sub(A);
  const n = e1.clone().cross(e2).normalize();
  if (n.dot(A.clone().sub(new THREE.Vector3(...inside))) < 0) n.negate();
  const pts = uvs.map(([u, v]) => A.clone().addScaledVector(e1, u).addScaledVector(e2, v).addScaledVector(n, lift));
  const pos = [];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const t = [pts[0], pts[i], pts[i + 1]];
    const tn = t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0]));
    if (tn.dot(n) < 0) t.reverse();
    for (const p of t) pos.push(p.x, p.y, p.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.userData.normal = n;
  return g;
}

// Ring sector outline (angles in degrees) for extrude().
function arcPts(r0, r1, a0, a1, n, cx = 0, cy = 0) {
  const pts = [];
  for (let i = 0; i <= n; i += 1) { const a = ((a0 + ((a1 - a0) * i) / n) * PI) / 180; pts.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]); }
  for (let i = n; i >= 0; i -= 1) { const a = ((a0 + ((a1 - a0) * i) / n) * PI) / 180; pts.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]); }
  return pts;
}

// Little paper heart outline around (0, 0), half-width 4.6·k.
const heartPts = (k = 1) => [[0, -4.2], [4.6, 0.6], [4.6, 2.6], [3, 4], [1.4, 4], [0, 2.6], [-1.4, 4], [-3, 4], [-4.6, 2.6], [-4.6, 0.6]].map(([x, y]) => [x * k, y * k]);

// ── typewriter — sage body, round keys, a carriage with the sheet ─────────
defineModel('typewriter', (opts, rig) => {
  const B = rig.body;
  B.add(mesh(box(116, 7, 68), C.slate, 0, 0, 1));
  // keyboard deck (sloping up to the housing) + rear housing
  B.add(mesh(profileX([[34, 7], [34, 11], [2, 27], [-32, 27], [-32, 7]], 108), C.sage));
  B.add(mesh(box(104, 18, 32), C.sage, 0, 27, -16));
  B.add(mesh(box(106, 2, 34), C.sageL, 0, 43.4, -16));
  // typebar basket: dark half disc on the housing front + a fan of bars
  B.add(mesh(new THREE.CircleGeometry(18, 8, 0, PI).scale(1, 15 / 18, 1), C.slateD, 0, 27, 0.5));
  const bars = [];
  for (let i = 0; i < 9; i += 1) {
    const a = (0.12 + (i / 8) * 0.76) * PI;
    const bar = group(Math.cos(a) * 3, 27 + Math.sin(a) * 2.5, 1.1, mesh(box(0.9, 11.5, 0.7), C.ivory));
    bar.rotation.z = a - PI / 2;
    B.add(bar);
    bars.push(bar);
  }
  // keys on the slope
  const keys = [];
  const tilt = Math.atan(0.5);
  [[29, 10], [20, 9], [11, 10]].forEach(([z, n]) => {
    for (let i = 0; i < n; i += 1) {
      const cap = group(0, 0, 0,
        mesh(cyl(1.1, 1.1, 2.4, 6), C.slateD),
        mesh(cyl(3.3, 3.3, 1.5, 10), C.ivory, 0, 2.2, 0));
      const key = group((i - (n - 1) / 2) * 9.6, 11 + (34 - z) * 0.5 - 0.6, z, cap);
      key.rotation.x = tilt;
      B.add(key);
      keys.push(cap);
    }
  });
  const space = group(0, 10.6, 33.2, mesh(box(44, 2.2, 4.4), C.ivory, 0, 0.4, 0));
  space.rotation.x = tilt;
  B.add(space);

  // carriage: rail, platen with knobs, paper rest, bail, return lever, paper
  const car = group();
  B.add(car);
  car.add(mesh(box(120, 4, 22), C.slateL, 0, 45, -17));
  for (const s of [-1, 1]) {
    car.add(mesh(box(3, 13, 20), C.slate, s * 56.5, 47, -17));
    car.add(mesh(cylX(8, 7, 10), C.ochre, s * 61.5, 55, -16));
    car.add(mesh(cylX(1.8, 4, 8), C.cream, s * 18, 63, -21.6));
    car.add(mesh(box(1.2, 8, 1.2), C.slateL, s * 33.6, 56, -22.4));
  }
  car.add(mesh(cylX(6, 110, 10), C.slateD, 0, 55, -16));
  car.add(mesh(cbox(68, 1.2, 1.2), C.slateL, 0, 63, -21.6));
  car.add(mesh(beam(-60, 50, -70, 64, 2.2, 2.2), C.slateL, 0, 0, -10));
  car.add(mesh(ball(2.8, 0), C.mauve, -70, 64, -10));
  const rest = group(0, 49, -25.4, mesh(box(52, 32, 1.4), C.slate));
  rest.rotation.x = -0.12;
  car.add(rest);
  const tiltG = group(0, 50, -23.4);
  tiltG.rotation.x = -0.12;
  car.add(tiltG);
  const paper = group();
  tiltG.add(paper);
  paper.add(mesh(box(60, 47.5, 0.7), C.paper, 0, -4, 0));
  const lineAt = (y, w, h, color) => mesh(cbox(w, h, 0.5).translate(w / 2, 0, 0), color, -22, y, 0.5);
  paper.add(lineAt(37, 32, 2.4, C.slate));
  [[31.6, 44], [28.4, 38], [25.2, 44], [22, 30]].forEach(([y, w]) => paper.add(lineAt(y, w, 1.1, C.slateL)));
  const typed = [18.8, 15.6, 12.4].map((y, i) => {
    const l = lineAt(y, [40, 44, 34][i], 1.1, C.slateL);
    paper.add(l);
    return l;
  });

  const STEPS = 12; // characters per line
  rig.anims.type = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 7.2;
    const line = Math.min(2, Math.floor(c / 2.4));
    const u = c - line * 2.4;
    const k = clamp01(u / 2.0);
    const ret = smooth((u - 2.0) / 0.4);
    car.position.x = 7 - 14 * k + 14 * ret;
    paper.position.y = line < 2 ? (line + ret) * 3.2 : 6.4 * (1 - ret);
    typed.forEach((l, i) => {
      let s = i < line ? 1 : i === line ? Math.floor(k * STEPS) / STEPS : 0;
      if (line === 2) s *= 1 - ret;
      l.visible = s > 0.01;
      l.scale.x = Math.max(s, 0.01);
    });
    const step = Math.floor(k * STEPS);
    const p = k * STEPS - step;
    const press = u < 2.0 ? Math.sin(PI * clamp01(p / 0.7)) : 0;
    const id = hash(line * 31 + step + Math.floor((t + ctx.phase) / 7.2) * 97);
    keys.forEach((cap, i) => { cap.position.y = i === id % keys.length ? -1.3 * press : 0; });
    bars.forEach((bar, i) => { bar.rotation.x = i === (id >>> 8) % bars.length ? 0.85 * press : 0; });
    space.position.y = 10.6 - (step % 5 === 4 ? 0.7 * press : 0);
  };
  rig.anims.idle = () => {
    car.position.x = 0;
    paper.position.y = 0;
    typed.forEach((l) => { l.visible = false; });
  };
});

// ── newsletterStack — a tied bundle of folded issues, one leaning in front ─
defineModel('newsletterStack', (opts, rig) => {
  const B = rig.body;
  const offs = [-1.2, 1.2, -0.6, 1.2, -1.2, 0.6, 0];
  const yaws = [0.02, -0.03, 0.015, -0.02, 0.03, -0.02, 0];
  const cols = [C.cream, C.ivory, '#dccfb4', C.ivory, C.cream, '#dccfb4', C.ivory];
  offs.forEach((o, i) => {
    const g = group(o, i * 11.6, 0,
      mesh(box(100, 5, 66), cols[i]),
      mesh(box(98, 1.2, 64), '#a39a86', 0, 4.6, 0),
      mesh(box(100, 5.2, 66), cols[i], 0, 5.6, 0),
      mesh(box(97, 0.9, 63.5), '#857c6a', 0, 10.7, 0));
    g.rotation.y = yaws[i];
    B.add(g);
  });
  const TOP = 7 * 11.6 - 0.8; // 80.4: top of the last issue
  // the top sheet with its masthead; its front-right corner is a hinged flap
  const sheetGeo = extrude([[-50, 33], [50, 33], [50, -5], [28, -33], [-50, -33]], 0.6).rotateX(-PI / 2);
  B.add(mesh(sheetGeo, C.paper, 0, TOP + 0.3, 0));
  const print = (x0, x1, z0, z1, color) => B.add(mesh(cbox(x1 - x0, 0.5, z1 - z0), color, (x0 + x1) / 2, TOP + 0.75, (z0 + z1) / 2));
  print(-44, 8, -28, -20, C.slate);
  print(-44, -18, -15, 4, C.mauve);
  [-14, -9.5, -5, -0.5].forEach((z, i) => print(-13, i === 3 ? -2 : 8, z, z + 2, C.line));
  [10, 14.5, 19, 23.5].forEach((z, i) => print(-44, i === 3 ? -20 : 8, z, z + 2, C.line));
  const hinge = group(28, TOP + 0.35, 33);
  hinge.rotation.y = Math.atan2(28, 22);
  const flap = group(0, 0, 0, mesh(tris([[[0, 0, 0], [35.6, 0, 0], [13.6, 0, 17.3]]]), C.paper, 0, 0, 0, { ...SHEET, emissive: '#3b3832' }));
  hinge.add(flap);
  B.add(hinge);
  // twine: one loop front-to-back, one side-to-side, a bow where they cross
  const TW = C.ochreD;
  for (const z of [-34.6, 34.6]) B.add(mesh(box(2, TOP + 1.6, 1.6), TW, 17, 0, z));
  B.add(mesh(cbox(2, 1.4, 70.8), TW, 17, TOP + 1.3, 0));
  for (const x of [-51.9, 51.9]) B.add(mesh(box(1.6, TOP + 1.6, 2), TW, x, 0, 0));
  B.add(mesh(cbox(105.4, 1.4, 2), TW, 0, TOP + 1.3, 0));
  const kx = 17; const ky = TOP + 2.2;
  B.add(mesh(extrude([[0, 0], [-13, 14.6], [-16, 3.4]], 2.6), C.ochre, kx, ky, 0));
  B.add(mesh(extrude([[0, 0], [14, 17], [18, 5.4]], 2.6), C.ochre, kx, ky, 0));
  B.add(mesh(ball(2.9, 0), C.brown, kx, ky + 0.4, 0));
  // bow tails trail over the front edge
  B.add(mesh(rod([kx, ky, 1], [kx - 5, TOP + 1.2, 34.4], 0.8, 0.8, 4), TW));
  B.add(mesh(rod([kx - 5, TOP + 1.4, 34.6], [kx - 9, TOP - 11, 35.4], 0.8, 0.8, 4), TW));
  B.add(mesh(rod([kx, ky, 1], [kx + 6, TOP + 1.2, 34.4], 0.8, 0.8, 4), TW));
  B.add(mesh(rod([kx + 6, TOP + 1.4, 34.6], [kx + 10, TOP - 13, 35.4], 0.8, 0.8, 4), TW));

  // a loose issue leaning against the front (pivot: its lower-left corner)
  const lean = group(-57, 0, 51.5);
  lean.rotation.x = -0.22;
  const page = group();
  page.rotation.z = 0.07;
  lean.add(page);
  B.add(lean);
  page.add(mesh(box(46, 62, 1.6), C.paper, 23, 0, 0));
  const P = (x0, x1, y0, y1, color) => page.add(mesh(cbox(x1 - x0, y1 - y0, 0.6), color, 23 + (x0 + x1) / 2, (y0 + y1) / 2, 0.95));
  P(-19, 19, 51, 57, C.slate);
  P(-19, 19, 47.6, 48.6, C.slateL);
  P(-19, -1, 27, 44, C.mauve);
  [42, 38.5, 35, 31.5, 28].forEach((y, i) => P(2, i === 4 ? 12 : 19, y, y + 1.4, C.line));
  [22, 18.5, 15, 11.5, 8].forEach((y, i) => P(-19, i === 4 ? 4 : 19, y, y + 1.4, C.line));

  rig.parts.flap = flap;
  rig.anims.idle = (t, dt, ctx) => {
    const a = t * 1.1 + ctx.phase;
    flap.rotation.x = -(0.34 + Math.sin(a) * 0.2 + Math.sin(a * 2.7) * 0.04);
  };
  rig.anims.idle(0, 0, { phase: 0 });
});

// ── paperPlane — a folded dart, nose toward +x, banked to show its wings ──
defineModel('paperPlane', (opts, rig) => {
  const N = [50, 0, 0]; const A = [-42, 0, 0]; const K = [-40, -18, 0];
  const TF = [-46, 5, -38]; const TN = [-46, 5, 38];
  const hold = group(0, 76, 0);
  hold.rotation.order = 'ZYX'; // roll (x) first, then pitch (z)
  rig.body.add(hold);
  // keel: two sheets meeting at the bottom crease
  hold.add(mesh(tris([[N, [-42, 0, -1.4], K], [N, [-42, 0, 1.4], K], [[-42, 0, -1.4], [-42, 0, 1.4], K]]), '#b9b09c', 0, 0, 0, SHEET));
  const up = [0, -100, 0]; // decals lift away from below = upward
  const wing = (T, color, decals) => {
    const g = group();
    g.add(mesh(tris([[N, A, T]]), color, 0, 0, 0, SHEET));
    for (const [uvs, col] of decals) g.add(mesh(onFace(N, A, T, uvs, 0.45, up), col, 0, 0, 0, SHEET));
    hold.add(g);
    return g;
  };
  const bar = (u0, u1, v) => [[u0 - v, v], [u1 - v, v], [u1 - v - 0.045, v + 0.045], [u0 - v - 0.045, v + 0.045]];
  const far = wing(TF, C.paper, [[bar(0.55, 0.9, 0.3), C.line], [bar(0.6, 0.88, 0.48), C.line], [bar(0.68, 0.86, 0.66), C.line]]);
  const near = wing(TN, '#ddd5c1', [[[[0.3, 0.6], [0.2, 0.8], [0.08, 0.8], [0.18, 0.6]], C.red]]);
  rig.parts.wings = [far, near];
  const fly = (amp) => (t, dt, ctx) => {
    const a = t + ctx.phase;
    hold.position.y = 76 + Math.sin(a * 1.4) * 1.8 * amp;
    hold.rotation.x = 0.5 + Math.sin(a * 0.9) * 0.1 * amp;
    hold.rotation.z = 0.1 + Math.sin(a * 1.4 + 1.2) * 0.05 * amp;
    hold.rotation.y = Math.sin(a * 0.6) * 0.06 * amp;
    const f = Math.sin(a * 5.2) * 0.035 * amp;
    far.rotation.x = f;
    near.rotation.x = -f;
  };
  rig.anims.glide = fly(1);
  rig.anims.idle = fly(0.45);
  rig.anims.fly = rig.anims.glide;
  rig.anims.glide(0, 0, { phase: 0 });
});

// ── postBoxOpen — pillar box with its flap up, swallowing envelopes ────────
defineModel('postBoxOpen', (opts, rig) => {
  const B = rig.body;
  const turn = (g) => g.rotateY(PI / 12); // a flat facet to the front
  B.add(mesh(turn(cyl(25, 25, 6, 12)), C.slate));
  B.add(mesh(turn(cyl(22, 22, 4, 12)), C.slateL, 0, 6, 0));
  B.add(mesh(turn(cyl(20, 20, 70, 12)), C.red, 0, 10, 0));
  B.add(mesh(turn(cyl(20.7, 20.7, 3, 12)), C.redD, 0, 20, 0));
  B.add(mesh(turn(cyl(24, 24, 4, 12)), C.redL, 0, 80, 0));
  B.add(mesh(turn(cyl(18, 23, 7, 12)), C.red, 0, 84, 0));
  B.add(mesh(turn(cyl(8, 18, 3, 12)), C.red, 0, 91, 0));
  B.add(mesh(cyl(4, 4, 6, 8), C.redL, 0, 94, 0));
  // plaque with collection-time bars
  B.add(mesh(box(18, 12, 6), C.cream, 0, 33, 18));
  B.add(mesh(cbox(12, 2, 0.8), C.slate, 0, 41, 21.2));
  B.add(mesh(cbox(9, 1.5, 0.8), C.slateL, -1.5, 37.2, 21.2));
  // slot hood + the dark slot
  B.add(mesh(box(34, 14, 14), C.ivory, 0, 52, 15));
  B.add(inkMesh(cbox(30, 6, 0.8), C.ink, 0, 59, 21.8));
  const flap = group(0, 62.6, 22.2, mesh(cbox(31, 1, 6).translate(0, 0, 3), C.redL));
  flap.rotation.x = -0.35;
  B.add(flap);
  // an envelope: body lying in xz (long axis z) with a flap V + stamp on `face`
  const envelope = (w, l, color, face, opts = {}) => {
    const g = group();
    g.add(mesh(cbox(w, 0.9, l), color, 0, 0, 0, opts));
    const y = face * 0.75;
    g.add(mesh(tris([[[-w / 2, y, l / 2], [w / 2, y, l / 2], [0, y, -l * 0.1]]]), '#d3ccb9', 0, 0, 0, SHEET));
    return g;
  };
  const peek = [];
  [[-7.5, 0.22, C.sand], [8, -0.16, C.paper]].forEach(([x, yaw, color]) => {
    const e = envelope(11, 14, color, 1);
    e.position.z = 4;
    const droop = group(0, 0, 0, e);
    droop.rotation.x = 1.0;
    const p = group(x, 58.6, 21.6, droop);
    p.rotation.y = yaw;
    B.add(p);
    peek.push(p);
  });
  // the envelope sliding in: travels along `dir` through the slot point
  const DIR = [0, 0.78, 0.625];
  const SLOT = [0, 59, 22];
  const letter = group();
  const lean = group(0, 0, 0, envelope(24, 15, C.paper, -1, { emissive: '#45423a' }));
  lean.children[0].add(mesh(cbox(3.6, 0.5, 3.6), C.mauve, 8, -0.7, -3.6));
  lean.rotation.x = -Math.atan2(DIR[1], DIR[2]);
  letter.add(lean);
  B.add(letter);
  rig.parts.flap = flap;
  rig.anims.post = (t, dt, ctx) => {
    const u = ((t + ctx.phase) % 3) / 3;
    const pop = backOut(u / 0.12);
    const k = smooth((u - 0.3) / 0.45);
    const s = 30 - 43 * k * k;
    const gone = smooth((u - 0.7) / 0.05);
    const sc = Math.max(0.001, pop * (1 - gone));
    letter.visible = sc > 0.01;
    letter.scale.setScalar(sc);
    const hover = (1 - k) * Math.sin((t + ctx.phase) * 4) * 0.8;
    letter.position.set(SLOT[0], SLOT[1] + DIR[1] * s + hover, SLOT[2] + DIR[2] * s);
    letter.rotation.z = -0.12 * (1 - smooth((u - 0.3) / 0.25));
    const gulp = u > 0.62 && u < 0.92 ? Math.sin(((u - 0.62) / 0.3) * PI * 3) * (0.92 - u) * 1.6 : 0;
    flap.rotation.x = -0.35 + Math.abs(gulp) * 0.5;
    peek.forEach((p, i) => { p.rotation.z = Math.sin((t + ctx.phase) * 1.7 + i * 2) * 0.05 + gulp * 0.2 * (i ? 1 : -1); });
  };
  rig.anims.idle = (t, dt, ctx) => {
    letter.visible = false;
    flap.rotation.x = -0.35 + Math.sin(t * 1.2 + ctx.phase) * 0.05;
    peek.forEach((p, i) => { p.rotation.z = Math.sin((t + ctx.phase) * 1.3 + i * 2) * 0.04; });
  };
  rig.anims.post(0.6, 0, { phase: 0 });
});

// ── podcastMic — condenser in a shock mount on a boom arm, pop filter ─────
defineModel('podcastMic', (opts, rig) => {
  const B = rig.body;
  B.add(mesh(cyl(18, 18, 5, 12), C.slateD, -24, 0, 0));
  B.add(mesh(cyl(15, 16.5, 1.2, 12), C.slateL, -24, 5, 0));
  B.add(mesh(cyl(2, 2, 9, 6), C.slateD, -24, 6, 0));
  // boom arm: two rails per section, a spring, cream joints
  for (const z of [-2.6, 2.6]) {
    B.add(mesh(beam(-24, 14, -36, 52, 2, 1.6), C.slate, 0, 0, z));
    B.add(mesh(beam(-36, 52, 3, 62, 2, 1.6), C.slateL, 0, 0, z));
  }
  B.add(mesh(beam(-20.5, 18, -29.5, 46, 1, 1), C.ochre));
  B.add(mesh(beam(-30, 57.5, -6, 63.5, 1, 1), C.ochre));
  B.add(mesh(cylZ(3.6, 8, 8), C.cream, -24, 14, 0));
  B.add(mesh(cylZ(4.4, 8.4, 8), C.cream, -36, 52, 0));
  B.add(mesh(cylZ(1.6, 9.4, 6), C.slateD, -36, 52, 0));
  B.add(mesh(cylZ(3.6, 8, 8), C.cream, 3, 62, 0));
  // microphone: body, LED ring, grille head
  const MX = 10;
  B.add(mesh(cyl(7, 7, 24, 10), C.slate, MX, 54, 0));
  const ledMat = new THREE.MeshBasicMaterial({ color: C.led });
  const led = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 2.1, 10), ledMat);
  led.position.set(MX, 57.6, 0);
  B.add(led);
  B.add(mesh(cyl(8.4, 8.4, 2.6, 10), C.slateD, MX, 78, 0));
  B.add(mesh(cyl(8.4, 8.4, 13.4, 10), C.ivory, MX, 80.6, 0));
  B.add(mesh(cyl(4.6, 8.4, 6, 10), C.ivory, MX, 94, 0));
  for (const y of [84, 87.5, 91]) B.add(mesh(cyl(8.7, 8.7, 0.8, 10), '#aaa694', MX, y, 0));
  // shock mount: two rings, elastic struts, straps to the body
  const ring = () => new THREE.TorusGeometry(11.5, 1.3, 4, 10).rotateX(PI / 2);
  B.add(mesh(ring(), C.sand, MX, 63.3, 0));
  B.add(mesh(ring(), C.sand, MX, 73.3, 0));
  for (let i = 0; i < 4; i += 1) {
    const a = PI / 4 + (i * PI) / 2;
    const cx = Math.cos(a); const cz = Math.sin(a);
    B.add(mesh(rod([MX + cx * 11.5, 63.3, cz * 11.5], [MX + cx * 6.6, 73.3, cz * 6.6], 0.5, 0.5, 4), C.ochreD));
    B.add(mesh(rod([MX + cx * 6.6, 63.3, cz * 6.6], [MX + cx * 11.5, 73.3, cz * 11.5], 0.5, 0.5, 4), C.ochreD));
  }
  // gooseneck + pop filter (turned toward the speaker, front-right)
  const NRM = [Math.sin(0.93), 0, Math.cos(0.93)];
  B.add(mesh(rod([MX + 10, 62.6, 3], [27, 61, 6], 0.9, 0.9, 5), C.slateD));
  B.add(mesh(rod([27, 61, 6], [30.5, 66, 10], 0.9, 0.9, 5), C.slateD));
  B.add(mesh(rod([30.5, 66, 10], [30.5, 74.4, 12], 0.9, 0.9, 5), C.slateD));
  const filter = group(30.5, 74, 12);
  const disc = group(0.5, 12, 0);
  disc.rotation.y = 0.93;
  disc.add(mesh(new THREE.TorusGeometry(11.3, 1.1, 4, 14), C.slateD));
  const membrane = new THREE.Mesh(new THREE.CircleGeometry(10.8, 14),
    new THREE.MeshLambertMaterial({ color: '#7b8683', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  disc.add(membrane);
  filter.add(disc);
  B.add(filter);
  // paper sound waves in front of the filter (talk)
  const waves = group(31, 86, 12);
  waves.rotation.y = -Math.atan2(NRM[2], NRM[0]);
  const arcs = [10, 15.5, 21].map((r) => {
    const a = group(0, 0, 0, mesh(extrude(arcPts(r, r + 2.2, -34, 34, 6), 1.2), C.teal));
    a.scale.setScalar(0.001);
    a.visible = false;
    waves.add(a);
    return a;
  });
  B.add(waves);
  const base = new THREE.Color(C.led);
  rig.anims.always = (t) => {
    const k = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(t * 2.6 + rig.seed));
    ledMat.color.copy(base).multiplyScalar(k);
  };
  rig.anims.idle = (t, dt, ctx) => {
    filter.rotation.z = Math.sin(t * 17 + ctx.phase) * 0.012 * (0.5 + 0.5 * Math.sin(t * 1.3));
    filter.rotation.x = Math.sin(t * 13 + ctx.phase) * 0.008;
    for (const a of arcs) a.visible = false;
  };
  rig.anims.talk = (t, dt, ctx) => {
    filter.rotation.z = Math.sin(t * 21 + ctx.phase) * 0.02;
    filter.rotation.x = Math.sin(t * 16 + ctx.phase) * 0.012;
    arcs.forEach((a, i) => {
      const k = (((t + ctx.phase) * 0.9 - i * 0.22) % 1 + 1) % 1;
      const s = Math.min(clamp01(k / 0.18), clamp01((1 - k) / 0.3));
      a.visible = s > 0.02;
      a.scale.setScalar(Math.max(0.001, 0.75 + 0.25 * s));
      a.scale.y = Math.max(0.001, s);
      a.position.x = k * 5;
    });
  };
});

// ── headphones — over-ear pair resting on a wooden stand ──────────────────
defineModel('headphones', (opts, rig) => {
  const B = rig.body;
  B.add(mesh(cyl(22, 22, 4, 12), C.wood, 0, 0, 0, WOOD));
  B.add(mesh(box(6, 88, 6), C.wood, 0, 4, 0, WOOD));
  B.add(mesh(box(20, 4.4, 13), C.wood, 0, 90, 0, WOOD));
  const phones = group();
  B.add(phones);
  phones.add(mesh(extrude(arcPts(28.5, 32, -8, 188, 14, 0, 68), 9), C.slate));
  phones.add(mesh(extrude(arcPts(26, 28.6, 48, 132, 6, 0, 68), 10.5), C.mauve, 0, 0, 0, FABRIC));
  const cups = [];
  for (const s of [-1, 1]) {
    const cup = group(s * 30, 64, 0);
    cup.add(mesh(box(6, 6, 10), C.slateL, 0, -1, 0));
    cup.add(mesh(cylX(16, 13, 12), C.slate, s * 3.5, -14, 0));
    cup.add(mesh(cylX(14, 5.4, 12), C.mauve, s * -5.4, -14, 0, FABRIC));
    cup.add(mesh(cylX(8, 3, 10), C.ochre, s * 11, -14, 0));
    phones.add(cup);
    cups.push(cup);
  }
  // curled cable from the left cup down to the base
  const pts = [];
  for (let i = 0; i <= 80; i += 1) {
    const k = i / 80;
    const env = Math.sin(k * PI);
    pts.push(new THREE.Vector3(-33 + Math.sin(k * PI * 9) * 3.2 * env + k * 9, 36 - k * 31.2, Math.cos(k * PI * 9) * 3.2 * env - 3.2 * env + 2 * k));
  }
  pts.push(new THREE.Vector3(-19, 4.8, 4), new THREE.Vector3(-12, 4.8, 5));
  B.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.75, 5, false), C.slateD));
  rig.parts.cups = cups;
  rig.anims.idle = (t, dt, ctx) => {
    const a = (t + ctx.phase) * 4.2; // ≈ 80 bpm, two bobs a beat
    const beat = Math.pow(0.5 + 0.5 * Math.sin(a), 3);
    const off = Math.pow(0.5 + 0.5 * Math.sin(a - 0.5), 3);
    cups.forEach((cup, i) => {
      const s = i ? 1 : -1;
      cup.rotation.z = s * (i ? off : beat) * 0.07;
      cup.position.y = 64 - (i ? off : beat) * 0.7;
    });
    phones.rotation.z = Math.sin(a / 2) * 0.012;
  };
});

// ── speechBubbles — three paper bubbles popping up in turn ────────────────
defineModel('speechBubbles', (opts, rig) => {
  // chamfered bubble outline with a tail (side −1 = tail to the left)
  const outline = (cx, cy, w, h, ch, tail, side) => {
    const x0 = cx - w / 2; const x1 = cx + w / 2; const y0 = cy - h / 2; const y1 = cy + h / 2;
    const ta = cx + side * w * 0.12; const tb = cx + side * w * 0.34;
    const pts = [[x0, y0 + ch], [x0 + ch, y0]];
    if (side < 0) pts.push([tb, y0], tail, [ta, y0]); else pts.push([ta, y0], tail, [tb, y0]);
    pts.push([x1 - ch, y0], [x1, y0 + ch], [x1, y1 - ch], [x1 - ch, y1], [x0 + ch, y1], [x0, y1 - ch]);
    return pts;
  };
  const defs = [
    { cx: -10, cy: 86.5, w: 56, h: 27, ch: 6, tail: [-31, 65], side: -1, color: C.paper, z: -5, yaw: -0.14 },
    { cx: 14, cy: 59.5, w: 46, h: 21, ch: 5, tail: [37, 42], side: 1, color: C.teal, z: 2, yaw: 0.1 },
    { cx: -13, cy: 41, w: 30, h: 15, ch: 4, tail: [-29, 30], side: -1, color: C.rose, z: 8, yaw: -0.1 },
  ];
  const bubbles = defs.map((d, i) => {
    const [tx, ty] = d.tail;
    // geometry relative to the tail tip, so the bubble grows out of it
    const geo = fold(outline(d.cx - tx, d.cy - ty, d.w, d.h, d.ch, [0, 0], d.side), 4, 1.8, { cx: d.cx - tx });
    const g = group(tx, ty, d.z, mesh(geo, d.color));
    const zAt = geo.userData.zAt;
    const ox = d.cx - tx; const oy = d.cy - ty;
    if (i === 0) {
      for (const x of [-13, 0, 13]) g.add(mesh(cylZ(3, 1.2, 10), C.slate, ox + x, oy, zAt(ox) + 0.2));
    } else if (i === 1) {
      g.add(mesh(foldPanel(geo, ox - 16, ox + 16, oy + 2, oy + 5, 0.45), C.paper));
      g.add(mesh(foldPanel(geo, ox - 16, ox + 4, oy - 4.5, oy - 1.5, 0.45), C.paper));
    } else {
      g.add(mesh(extrude(heartPts(1), 1.2), C.paper, ox, oy, zAt(ox) + 0.2));
    }
    g.rotation.y = d.yaw;
    rig.body.add(g);
    return { g, y: ty, yaw: d.yaw };
  });
  rig.parts.bubbles = bubbles.map((b) => b.g);
  const hover = (b, i, t) => {
    b.g.position.y = b.y + Math.sin(t * 1.5 + i * 2.1) * 0.8;
    b.g.rotation.z = Math.sin(t * 1.1 + i * 1.7) * 0.03;
  };
  rig.anims.chat = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 6.4;
    bubbles.forEach((b, i) => {
      const s = backOut((c - 0.2 - i * 0.85) / 0.45) * (1 - smooth((c - 5.0 - i * 0.25) / 0.3));
      b.g.visible = s > 0.01;
      b.g.scale.setScalar(Math.max(0.001, s));
      hover(b, i, t);
    });
  };
  rig.anims.idle = (t) => {
    bubbles.forEach((b, i) => {
      b.g.visible = true;
      b.g.scale.setScalar(1);
      hover(b, i, t);
    });
  };
});

// ── onAirSign — lit studio sign box on a pole ─────────────────────────────
defineModel('onAirSign', (opts, rig) => {
  const B = rig.body;
  B.add(mesh(cyl(15, 15, 4, 12), C.slateD));
  B.add(mesh(cyl(2.4, 2.4, 63, 8), C.slateL, 0, 4, 0));
  B.add(mesh(box(14, 5, 8), C.slate, 0, 62, 0));
  B.add(mesh(extrude([[-36, 69], [-33, 66], [33, 66], [36, 69], [36, 97], [33, 100], [-33, 100], [-36, 97]], 12), C.slate));
  // raised frame around the lit panel
  B.add(mesh(cbox(68, 2, 1.6), C.slateD, 0, 97, 6.6));
  B.add(mesh(cbox(68, 2, 1.6), C.slateD, 0, 69, 6.6));
  for (const x of [-33, 33]) B.add(mesh(cbox(2, 26, 1.6), C.slateD, x, 83, 6.6));
  // back: vents + a junction box
  for (const y of [77, 81, 85, 89]) B.add(mesh(cbox(30, 1.4, 0.8), C.slateD, 0, y, -6.2));
  B.add(mesh(cbox(10, 6, 2), C.slateL, 0, 70.5, -6.8));

  // the panel: letters painted on a canvas (same strokes as the predloha)
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 208;
  const g = cv.getContext('2d');
  const X = (x) => (x + 32) * 8; const Y = (y) => (96 - y) * 8;
  g.fillStyle = '#d8695d'; g.fillRect(0, 0, 256, 208);
  g.fillStyle = '#c4554c'; g.fillRect(256, 0, 256, 208);
  g.strokeStyle = '#fbf3df'; g.lineWidth = 2.2 * 8; g.lineJoin = 'miter'; g.miterLimit = 4; g.lineCap = 'butt';
  const stroke = (pts, close) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
    if (close) g.closePath();
    g.stroke();
  };
  const y0 = 76; const y1 = 90;
  stroke([[-23.25, y0], [-15.75, y0], [-15.75, y1], [-23.25, y1]], true);
  stroke([[-13.25, y0 - 1.1], [-13.25, y1], [-5.75, y0], [-5.75, y1 + 1.1]]);
  stroke([[1.25, y0 - 1.1], [5, y1], [8.75, y0 - 1.1]]);
  stroke([[3, 80.5], [7, 80.5]]);
  stroke([[12.15, y0 - 1.1], [12.15, y1 + 1.1]]);
  stroke([[15.55, y0 - 1.1], [15.55, y1], [23.05, y1], [23.05, 83.5], [15.55, 83.5]]);
  stroke([[18, 83.5], [23.05, y0 - 1.1]]);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const panelMat = new THREE.MeshBasicMaterial({ map: tex });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(64, 26), panelMat);
  panel.position.set(0, 83, 6.5);
  B.add(panel);
  // soft red glow in front of the box
  const gc = document.createElement('canvas');
  gc.width = 128; gc.height = 64;
  const gg = gc.getContext('2d');
  const grad = gg.createRadialGradient(64, 32, 4, 64, 32, 62);
  grad.addColorStop(0, 'rgba(255,120,100,0.9)');
  grad.addColorStop(0.55, 'rgba(240,96,80,0.35)');
  grad.addColorStop(1, 'rgba(240,96,80,0)');
  gg.setTransform(1, 0, 0, 0.5, 0, 16);
  gg.fillStyle = grad;
  gg.fillRect(0, -32, 128, 128);
  const glowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, opacity: 0.32 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(88, 44), glowMat);
  glow.position.set(0, 83, 8);
  B.add(glow);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(88, 44), glowMat);
  back.position.set(0, 83, -8);
  back.rotation.y = PI;
  B.add(back);

  const set = (k) => {
    panelMat.color.setScalar(k);
    glowMat.opacity = Math.max(0, (k - 0.3) / 0.7) * 0.32;
    glow.visible = glowMat.opacity > 0.01;
    back.visible = glow.visible;
  };
  rig.parts.panel = panel;
  // the deck may mirror a prop (flip): keep the lettering readable
  rig.anims.always = () => { panel.scale.x = B.matrixWorld.determinant() < 0 ? -1 : 1; };
  rig.anims.on = (t, dt, ctx) => {
    let k = 0.9 + 0.1 * Math.sin(t * 1.6 + ctx.phase);
    const c = (t + ctx.phase * 2) % 7.3;
    if (c < 0.07 || (c > 0.14 && c < 0.19)) k *= 0.5;
    set(k);
  };
  rig.anims.off = () => set(0.24);
  set(1);
});

// ── podcastHost — a fox on a stool, headset on, one paw raised ────────────
defineModel('podcastHost', (opts, rig) => {
  const B = rig.body;
  // stool
  B.add(mesh(cyl(15, 15, 4.5, 10), C.wood, 0, 28.5, 0, WOOD));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(mesh(rod([sx * 15, 0.3, sz * 15], [sx * 9, 29.5, sz * 9], 1.6, 1.8), C.wood, 0, 0, 0, WOOD));
  B.add(mesh(new THREE.TorusGeometry(17.4, 1, 4, 12).rotateX(PI / 2), C.slateL, 0, 12, 0));
  // tail
  const tail = group(9, 37.5, -8);
  tail.rotation.order = 'YXZ';
  tail.add(mesh(cyl(6.5, 3.4, 16, 6), C.fox, 0, 0, 0, { tex: 'fur' }));
  tail.add(mesh(cyl(5, 6.5, 6, 6), C.fox, 0, 16, 0, { tex: 'fur' }));
  tail.add(mesh(new THREE.ConeGeometry(5, 9, 6).translate(0, 4.5, 0), C.ivory, 0, 22, 0));
  B.add(tail);
  // legs: thighs on the seat, shins dangling, feet on the ring
  const shins = [];
  for (const s of [-1, 1]) {
    B.add(mesh(box(7.5, 6.5, 15), C.slate, s * 8, 33, 10.5, FABRIC));
    const shin = group(s * 8, 37.5, 15.5);
    shin.add(mesh(box(6.8, 21.5, 6.4).translate(0, -21.5, 0), C.slate, 0, 0, 0, FABRIC));
    shin.add(mesh(box(8.4, 4.5, 11).translate(0, -24.5, 2.2), C.brown));
    B.add(shin);
    shins.push(shin);
  }
  // torso (everything above the seat breathes together)
  const torso = group(0, 33, 0);
  B.add(torso);
  torso.add(mesh(cyl(10.5, 13, 24, 6).scale(1, 1, 0.8), C.teal, 0, 0, 0, FABRIC));
  torso.add(mesh(cyl(6.5, 8, 3, 6).scale(1, 1, 0.8), C.ivory, 0, 22.4, 0));
  const bib = mesh(fold([[-5.5, 24], [5.5, 24], [0, 14]], 1, 2.54, { back: false }), C.ivory, 0, 0, 6.6);
  torso.add(bib);
  // left arm resting on the knee
  const armL = group(-9.6, 21, 0);
  armL.add(mesh(rod([0, 0, 0], [-3, -14.5, 12], 3.2, 2.7), C.teal, 0, 0, 0, FABRIC));
  armL.add(mesh(ball(3.2, 0), C.fox, -3.1, -15.6, 13));
  torso.add(armL);
  // right arm raised: shoulder → elbow → paw
  const armR = group(9.6, 21, 0);
  armR.add(mesh(rod([0, 0, 0], [10, -5.5, 6], 3.2, 2.8), C.teal, 0, 0, 0, FABRIC));
  armR.add(mesh(ball(3, 0), C.teal, 10, -5.5, 6));
  const fore = group(10, -5.5, 6);
  fore.add(mesh(rod([0, 0, 0], [3.4, 11.5, 6], 2.8, 2.5), C.teal, 0, 0, 0, FABRIC));
  fore.add(mesh(ball(3.5, 0), C.fox, 3.9, 13.6, 7));
  armR.add(fore);
  torso.add(armR);

  // head — hand-folded: orange brow facets, cream muzzle facets
  const head = group(0, 24, 1);
  torso.add(head);
  const V = {
    T: [0, 30, 6], Br: [0, 13, 12], Nz: [0, 3, 15], Ch: [0, 1, -2], Bk: [0, 17, -11], BkT: [0, 29, -7],
    E: [13, 31, 0], Ck: [25, 16, 0],
  };
  const IN = [0, 17, 0];
  const mir = ([x, y, z]) => [-x, y, z];
  const sides = (list) => list.flatMap((f) => [f, f.map(mir)]);
  const flat = (list) => {
    const verts = list.flat();
    return solid(verts, list.map((_, i) => [i * 3, i * 3 + 1, i * 3 + 2]), IN);
  };
  head.add(mesh(flat(sides([
    [V.T, V.E, V.Br], [V.E, V.Ck, V.Br], [V.T, V.BkT, V.E], [V.E, V.BkT, V.Bk], [V.E, V.Bk, V.Ck], [V.Ck, V.Bk, V.Ch],
  ])), C.fox));
  head.add(mesh(flat(sides([[V.Br, V.Ck, V.Nz], [V.Nz, V.Ck, V.Ch]])), C.ivory));
  head.add(inkMesh(ball(1.9, 1).scale(1.25, 0.9, 0.9), C.ink, 0, 3.5, 14.3));
  // eyes on the brow facets, cheeks on the muzzle facets
  const eyeList = [];
  for (const s of [-1, 1]) {
    const m = s < 0 ? mir : (p) => p;
    const eg = onFace(m(V.E), m(V.Ck), m(V.Br), [[0, 0]], 0, IN); // just for the normal
    const n = eg.userData.normal;
    // plane point at (x, y): solve z on the facet
    const zOn = (a, b, c, nn, x, y) => a[2] - (nn.x * (x - a[0]) + nn.y * (y - a[1])) / nn.z;
    const ex = s * 9; const ey = 18.5;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.75, 12, 8), new THREE.MeshBasicMaterial({ color: C.ink }));
    eye.position.set(ex, ey, zOn(m(V.E), m(V.Ck), m(V.Br), n, ex, ey));
    eye.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    eye.scale.z = 0.4;
    head.add(eye);
    eyeList.push(eye);
    const cn = onFace(m(V.Br), m(V.Ck), m(V.Nz), [[0, 0]], 0, IN).userData.normal;
    const ck = cheek(3.4, C.rose);
    const cx = s * 15.5; const cy = 12.6;
    ck.position.set(cx, cy, zOn(m(V.Br), m(V.Ck), m(V.Nz), cn, cx, cy)).addScaledVector(cn, 0.35);
    ck.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), cn);
    head.add(ck);
  }
  // mouth: dark inside + a hinged lower jaw
  const JP = [0, 2.2, 4.5];
  const rot = (a, [x, y, z]) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  const mouthV = [[-2.3, -0.1, 0.5], [2.3, -0.1, 0.5], [0, -0.1, 6.2]];
  const mouthAll = [...mouthV, ...mouthV.map((p) => rot(-0.34, p))];
  head.add(mesh(solid(mouthAll, [[0, 1, 2], [3, 4, 5], [0, 2, 3], [2, 5, 3], [1, 2, 4], [2, 5, 4], [0, 1, 3], [1, 4, 3]], [0, -0.8, 3]), '#7b3f3a', ...JP));
  const jaw = group(...JP);
  jaw.add(mesh(solid([[-3.3, 0, 0], [3.3, 0, 0], [0, 0, 8.6], [0, -3.3, 6.6], [0, -2.2, 0]],
    [[0, 1, 2], [0, 2, 3], [1, 2, 3], [0, 3, 4], [1, 3, 4], [0, 1, 4]], [0, -1.2, 3.5]), C.ivory));
  head.add(jaw);
  // ears (each on its own pivot) with dark inner triangles
  const ears = [-1, 1].map((s) => {
    const P0 = [14.5, 26, -1];
    const loc = (p) => [s * (p[0] - P0[0]), p[1] - P0[1], p[2] - P0[2]];
    const a = loc([8, 30, 2]); const b = loc([21, 21.5, 0.5]); const c = loc([14, 26, -6]); const tip = loc([20, 43, -1]);
    const ear = group(s * P0[0], P0[1], P0[2]);
    ear.add(mesh(solid([a, b, c, tip], [[0, 1, 3], [1, 2, 3], [2, 0, 3], [0, 2, 1]], [s * 1, 4, -1.5]), C.fox, 0, 0, 0, { tex: 'fur' }));
    ear.add(mesh(onFace(a, b, tip, [[0.2, 0.14], [0.66, 0.14], [0.2, 0.62]], 0.4, [s * 1, 4, -1.5]), C.foxDark));
    head.add(ear);
    return ear;
  });
  // headset: band tilted back behind the ears, cups on the cheeks, boom mic
  const band = group(0, 16, 0, mesh(extrude(arcPts(24, 26.6, 4, 176, 12), 4.4), C.slate));
  band.rotation.x = -0.36;
  head.add(band);
  for (const s of [-1, 1]) {
    head.add(mesh(cylX(8.6, 6, 10), C.slate, s * 28, 16, 0));
    head.add(mesh(cylX(7.4, 2, 10), C.mauve, s * 24.2, 16, 0));
    head.add(mesh(cylX(4.4, 1.6, 8), C.ochre, s * 31.6, 16, 0));
  }
  head.add(mesh(rod([-28, 9, 3], [-21, 1.5, 11], 0.6, 0.6, 4), C.slateD));
  head.add(mesh(rod([-21, 1.5, 11], [-9, -0.6, 15], 0.6, 0.6, 4), C.slateD));
  head.add(mesh(ball(2.1, 0), C.red, -8.4, -0.6, 15.2));

  const blink = blinker(rig.seed + 2.4);
  rig.parts.head = head;
  rig.parts.arms = [armL, armR];
  rig.parts.jaw = jaw;
  rig.anims.always = (t) => {
    const k = blink(t);
    for (const e of eyeList) e.scale.y = Math.max(0.12, 1 - k);
    ears.forEach((e, i) => {
      const c = (t + rig.seed + i * 2.3) % 5.5;
      e.rotation.z = c < 0.28 ? Math.sin((c / 0.28) * PI) * 0.22 * (i ? -1 : 1) : 0;
    });
    tail.rotation.z = -1.0 + Math.sin(t * 1.6) * 0.1;
    tail.rotation.y = Math.sin(t * 2.3) * 0.22;
  };
  rig.anims.talk = (t, dt, ctx) => {
    const a = t + ctx.phase;
    const b = Math.sin(a * 2.1);
    torso.scale.set(1 - b * 0.005, 1 + b * 0.01, 1);
    // syllables: a rectified wobble gated by a slower phrase envelope
    const phrase = smooth(0.5 + Math.sin(a * 0.9) * 0.9);
    const syl = Math.abs(Math.sin(a * 7.3)) * (0.6 + 0.4 * Math.sin(a * 3.1));
    jaw.rotation.x = 0.03 + clamp01(syl) * 0.33 * phrase;
    head.rotation.x = Math.sin(a * 3.6) * 0.035 * phrase + 0.02;
    head.rotation.z = Math.sin(a * 0.8) * 0.06;
    head.rotation.y = Math.sin(a * 0.45) * 0.2;
    armR.rotation.z = Math.sin(a * 2.2) * 0.14 * phrase;
    armR.rotation.x = Math.sin(a * 1.4) * 0.1;
    fore.rotation.z = Math.sin(a * 2.2 + 0.9) * 0.22 * phrase;
    fore.rotation.x = Math.sin(a * 4.4) * 0.1 * phrase;
    armL.rotation.x = Math.sin(a * 2.1) * 0.015;
    shins.forEach((s, i) => { s.rotation.x = Math.sin(a * 1.9 + i * PI) * 0.035; });
  };
  rig.anims.idle = (t, dt, ctx) => {
    const a = t + ctx.phase;
    const b = Math.sin(a * 2.1);
    torso.scale.set(1 - b * 0.005, 1 + b * 0.01, 1);
    jaw.rotation.x = 0.03;
    // listening: slow tilts and an agreeing double nod every few seconds
    const c = a % 6;
    const nod = c > 4.4 ? Math.sin(((c - 4.4) / 1.6) * PI * 2) * Math.sin(((c - 4.4) / 1.6) * PI) : 0;
    head.rotation.x = Math.max(0, nod) * 0.12;
    head.rotation.z = Math.sin(a * 0.7) * 0.05;
    head.rotation.y = Math.sin(a * 0.33) * 0.22;
    armR.rotation.z = Math.sin(a * 1.1) * 0.04;
    armR.rotation.x = 0;
    fore.rotation.z = Math.sin(a * 1.1 + 0.6) * 0.05;
    fore.rotation.x = 0;
    armL.rotation.x = 0;
    shins.forEach((s, i) => { s.rotation.x = Math.sin(a * 1.2 + i * PI) * 0.02; });
  };
});

// ── fomoFeed — an endless strip of posts running over two rollers ─────────
defineModel('fomoFeed', (opts, rig) => {
  const B = rig.body;
  const Y0 = 14; const Y1 = 91; const R = 7;
  B.add(mesh(box(54, 4, 30), C.slateD));
  for (const s of [-1, 1]) {
    B.add(mesh(box(4, 93, 9), C.ochre, s * 21, 4, 0, WOOD));
    for (const y of [Y0, Y1]) B.add(mesh(cylX(2.4, 3, 8), C.slate, s * 23.6, y, 0));
  }
  for (const y of [Y0, Y1]) B.add(mesh(cylX(6.2, 38, 10), C.slate, 0, y, 0));
  // the band: a stadium loop of paper
  const loop = (r) => {
    const pts = [];
    for (let i = 0; i <= 8; i += 1) { const a = (i / 8) * PI; pts.push([Math.cos(a) * r, Y1 + Math.sin(a) * r]); }
    for (let i = 0; i <= 8; i += 1) { const a = PI + (i / 8) * PI; pts.push([Math.cos(a) * r, Y0 + Math.sin(a) * r]); }
    return pts;
  };
  B.add(mesh(profileX(loop(R), 34, loop(R - 0.7)), C.cream));
  // crank on the top roller
  const crank = group(25.2, Y1, 0);
  crank.add(mesh(cbox(2, 9.5, 2.4).translate(0, -3.4, 0), C.slateD));
  crank.add(mesh(cylX(1.9, 5.5, 6), C.red, 3.4, -7, 0));
  B.add(crank);
  // post tiles riding the band
  const RT = R + 0.45;
  const LS = Y1 - Y0; const LA = PI * RT; const L = 2 * LS + 2 * LA;
  const N = 17;
  const avatars = [C.mauve, C.sageL, C.ochre, C.teal, C.slateL, C.rose, C.sand];
  const dotMats = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: C.led }));
  const tiles = [];
  for (let i = 0; i < N; i += 1) {
    const g = group();
    g.add(mesh(cbox(30, 10, 0.7), C.paper));
    g.add(mesh(cbox(6, 6, 0.9), avatars[i % avatars.length], -10, 0, 0.35));
    g.add(mesh(cbox(i % 3 === 1 ? 9 : 13, 1.8, 0.9).translate(i % 3 === 1 ? 4.5 : 6.5, 0, 0), C.slateL, -5, 1.5, 0.3));
    g.add(mesh(cbox(i % 2 ? 11 : 7, 1.4, 0.9).translate(i % 2 ? 5.5 : 3.5, 0, 0), '#aab1aa', -5, -1.9, 0.3));
    if (i % 2 === 0) g.add(mesh(extrude(heartPts(0.48), 0.9), C.red, 11, -0.8, 0.35));
    if (i % 3 !== 2) {
      const dot = new THREE.Mesh(cylZ(2, 1, 10), dotMats[i % 3]);
      dot.position.set(14.2, 4.4, 0.5);
      g.add(dot);
    }
    B.add(g);
    tiles.push(g);
  }
  const place = (g, s0) => {
    const s = ((s0 % L) + L) % L;
    let y; let z; let a;
    if (s < LS) { z = RT; y = Y0 + s; a = 0; }
    else if (s < LS + LA) { const th = (s - LS) / RT; z = Math.cos(th) * RT; y = Y1 + Math.sin(th) * RT; a = -th; }
    else if (s < 2 * LS + LA) { z = -RT; y = Y1 - (s - LS - LA); a = -PI; }
    else { const th = PI + (s - 2 * LS - LA) / RT; z = Math.cos(th) * RT; y = Y0 + Math.sin(th) * RT; a = -th; }
    g.position.set(0, y, z);
    g.rotation.x = a;
    // squeeze the card as it nears a roller, so it curls round instead of
    // sticking out like a flap
    const onFront = s < LS; const onBack = s >= LS + LA && s < 2 * LS + LA;
    const e = onFront ? Math.min(s, LS - s) : onBack ? Math.min(s - LS - LA, 2 * LS + LA - s) : 0;
    g.scale.y = 1 - 0.62 * smooth((6 - e) / 6);
  };
  const SPEED = 5;
  const base = new THREE.Color(C.led);
  const run = (speed) => (t, dt, ctx) => {
    const off = (t + ctx.phase) * speed;
    tiles.forEach((g, i) => place(g, (i * L) / N + off + 3));
    crank.rotation.x = -off / R;
    dotMats.forEach((m, i) => {
      const c = ((t + ctx.phase) * 0.9 + i / 3) % 1;
      m.color.copy(base).multiplyScalar(c < 0.5 ? 1.12 : 0.62);
    });
  };
  rig.anims.scroll = run(SPEED);
  rig.anims.idle = run(1.2);
  rig.anims.scroll(0, 0, { phase: 0 });
});

// CodeCon 2026 — pack "codecon-stage" (see tools/sprites-src/codecon-stage for the
// drawn reference sprites): the maker's corner, the night stage and the
// closing curtain. Units: sprite percent (100 = the object's height).
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, box, cbox, beam, cyl, extrude, lathe, fold, group, facet, mat, ink, eyes, smoke, PI,
} from './kit.js';

const C = {
  mauve: '#a5817f', ochre: '#bd9662', sand: '#d6b386', cream: '#e9e2d1', ivory: '#ebe7d7', sage: '#a4b1a2',
  sageMid: '#798877', sageDeep: '#6d7a6c', brown: '#7b6548', slate: '#4b5654', slateSoft: '#7c8784', rose: '#d79c92',
  glow: '#f3e3b8', glow2: '#ffe7a8', gold: '#d3ab55', goldDeep: '#b58d42', goldLight: '#e2c478',
  drape: '#96606a', valance: '#8a5560', red: '#b5544d', teal: '#6fa3a0', wood: '#b08c5e', inkDark: '#1f1d1a',
};
const WOOD_FINE = { tex: 'woodFine' };
const METAL = { tex: 'metal' };

const shade = (c, l) => new THREE.Color(c).offsetHSL(0, 0, l).getStyle();
const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// A cylinder whose axis runs along z (wheels, pips, gears' hubs), centred.
const zcyl = (r, d, seg = 10, r2 = r) => new THREE.CylinderGeometry(r2, r, d, seg).rotateX(PI / 2);

// Unlit paper for glowing parts: the facet light split (left lighter, right
// darker, a little tone jitter) is baked into vertex colours, so the piece
// keeps its folded look while it shines in a dark scene.
function glowGeo(geo, { split = 0.09, lift = 0.05, jitter = 0.035, seed = 5 } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const r = rng(seed);
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  for (let t = 0; t < pos.count; t += 3) {
    a.fromBufferAttribute(pos, t); b.fromBufferAttribute(pos, t + 1); c.fromBufferAttribute(pos, t + 2);
    const n = b.sub(a).cross(c.sub(a)).normalize();
    const v = Math.min(1, 0.93 - n.x * split + n.y * lift + (r() - 0.5) * jitter);
    for (let j = 0; j < 9; j += 1) col[t * 3 + j] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const glowMat = (color, opts = {}) => new THREE.MeshBasicMaterial({ color, vertexColors: true, ...opts });

// Per-instance paper material (for parts whose opacity is animated — the
// kit's mat() is shared by every model and must not be touched).
const ownMat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });

// Faceted five-point star, a point up, in the xy plane; the centre stands
// d proud on both faces. Returns [lightGeo, darkGeo] — every point has a
// light and a dark facet (light on the viewer's left of each ridge).
function starGeo(R, r, d, n = 5) {
  const rim = [];
  for (let i = 0; i < n * 2; i += 1) {
    const a = PI / 2 + (i * PI) / n;
    const q = i % 2 ? r : R;
    rim.push([Math.cos(a) * q, Math.sin(a) * q, 0]);
  }
  const light = []; const dark = [];
  for (let i = 0; i < n * 2; i += 1) {
    const p = rim[i]; const q = rim[(i + 1) % (n * 2)];
    (i % 2 === 0 ? light : dark).push(0, 0, d, ...p, ...q);
    (i % 2 === 0 ? dark : light).push(0, 0, -d, ...q, ...p);
  }
  return [light, dark].map((v) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    return g;
  });
}

// ── brandStairs — three deep steps rising to the right, 1/2/3 pips, a
// star-topped pennant on the top step ─────────────────────────────────────
defineModel('brandStairs', (opts, rig) => {
  const W = 208; const D = 70; const SW = W / 3; const RIDGE = 2;
  const cols = [C.sage, C.ochre, C.mauve];
  for (let s = 0; s < 3; s += 1) {
    const x0 = -W / 2 + SW * s;
    const h = 20 * (s + 1);
    const g = fold([[0, 0], [SW, 0], [SW, h - 3], [0, h - 3]], D, RIDGE);
    rig.body.add(mesh(g, cols[s], x0, 0, 0));
    // tread: a lighter slab, overhanging the front, the back and the free ends
    const tw = SW + 1.5 + (s === 2 ? 1.5 : 0);
    rig.body.add(mesh(box(tw, 3, D + RIDGE * 2 + 3), shade(cols[s], 0.09), x0 - 1.5 + tw / 2, h - 3, 0));
    // pips on the front (and the back, so it reads from behind too)
    for (let i = 0; i <= s; i += 1) {
      const lx = SW / 2 + (i - s / 2) * 13;
      for (const side of [1, -1]) {
        rig.body.add(mesh(zcyl(4, 1.6, 10), shade(cols[s], -0.13), x0 + lx, h - 13, side * (g.userData.zAt(lx) + 0.3)));
      }
    }
  }
  // flag on the top step
  const fx = 84;
  rig.body.add(mesh(cyl(1.5, 2.4, 2.5, 6), C.goldDeep, fx, 60, 0));
  rig.body.add(mesh(cyl(1.1, 1.3, 31, 6), C.ivory, fx, 60, 0));
  const [sl, sd] = starGeo(6, 2.7, 1.8);
  rig.body.add(mesh(sl, C.goldLight, fx, 94, 0), mesh(sd, C.goldDeep, fx, 94, 0));
  // pennant: three hinged slices of a triangle pointing to the lower steps
  const LEN = 23; const HH = 6.5; const N = 3;
  const segs = [];
  let parent = group(fx - 1, 82.5, 0);
  rig.body.add(parent);
  for (let k = 0; k < N; k += 1) {
    const a = (k / N) * LEN; const b = ((k + 1) / N) * LEN;
    const ha = HH * (1 - a / LEN); const hb = HH * (1 - b / LEN);
    const seg = group(k === 0 ? 0 : -LEN / N, 0, 0);
    seg.add(mesh(extrude([[0, -ha], [0, ha], [-(b - a), hb], [-(b - a), -hb]], 0.7), shade(C.red, 0.05)));
    parent.add(seg);
    segs.push(seg);
    parent = seg;
  }
  rig.parts.flag = segs;
  rig.anims.idle = (t, dt, ctx) => {
    segs.forEach((s, k) => { s.rotation.y = Math.sin(t * 2.6 + ctx.phase - k * 0.9) * (0.12 + k * 0.1); });
  };
});

// ── stageSpot — theatre spotlight on a tripod, with its cone of light ─────
defineModel('stageSpot', (opts, rig) => {
  const PY = 74.3; // pan joint (top of the pole)
  const dark = shade(C.slate, -0.06);
  const flapCol = shade(C.slate, 0.03);
  // tripod
  for (const az of [30, 150, 270]) {
    const a = (az * PI) / 180;
    rig.body.add(mesh(beam(0, 31, 24, 1.4, 2.4, 2.4).rotateY(-a), C.slate, 0, 0, 0, METAL));
    rig.body.add(mesh(box(5.5, 1.6, 5.5).rotateY(-a), dark, Math.cos(a) * 24, 0, Math.sin(a) * 24));
  }
  rig.body.add(mesh(cyl(4, 4.4, 7, 6), dark, 0, 26.5, 0));
  rig.body.add(mesh(cyl(1.8, 2.3, PY - 30, 6), C.slate, 0, 30, 0, METAL));
  rig.body.add(mesh(cyl(3, 3, 3, 6), C.ochre, 0, 50, 0));
  // pan: the yoke turns on the pole
  const pan = group(0, PY, 0);
  rig.body.add(pan);
  pan.add(mesh(box(28.4, 2.4, 5), C.slate, 0, 0, 0, METAL));
  for (const s of [-1, 1]) pan.add(mesh(box(2.4, 14.5, 5), C.slate, s * 13, 0, 0, METAL));
  // tilt: the head hangs between the yoke arms
  const head = group(0, 12, 0);
  pan.add(head);
  head.add(mesh(new THREE.CylinderGeometry(10.5, 9, 24, 10).rotateX(PI / 2), C.sageDeep, 0, 0, 1, METAL)); // z −11 … 13
  head.add(mesh(new THREE.CylinderGeometry(9, 6, 4, 10).rotateX(PI / 2), shade(C.sageDeep, -0.08), 0, 0, -13));
  head.add(mesh(zcyl(11.5, 3, 12), C.ochre, 0, 0, 14.5));
  for (const s of [-1, 1]) head.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 2.6, 6).rotateZ(PI / 2), C.ochre, s * 10.9, 0, 0));
  const lensMat = glowMat('#fff1c4');
  const lens = new THREE.Mesh(glowGeo(new THREE.CircleGeometry(9.6, 10), { split: 0, jitter: 0.05 }), lensMat);
  lens.position.z = 16.15;
  head.add(lens);
  // barn doors, flaring out around the lens
  for (let i = 0; i < 4; i += 1) {
    const turn = group(0, 0, 16);
    turn.rotation.z = (i * PI) / 2;
    const flap = group(0, 11.2, 0, mesh(box(16, 9, 0.9), flapCol));
    flap.rotation.x = 1.15;
    turn.add(flap);
    head.add(turn);
  }
  // the light cone: narrow at the lens, fading out with distance
  const CL = 80;
  const coneGeo = new THREE.CylinderGeometry(9, 24, CL, 14, 3, true).rotateX(-PI / 2).translate(0, 0, CL / 2);
  {
    const pos = coneGeo.attributes.position;
    const col = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i += 1) {
      const k = pos.getZ(i) / CL;
      col.set([1, 1, 1, lerp(1, 0.12, Math.sqrt(k))], i * 4);
    }
    coneGeo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  }
  const coneMat = new THREE.MeshBasicMaterial({
    color: C.glow2, vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide,
  });
  const beamCone = new THREE.Mesh(coneGeo, coneMat);
  beamCone.position.z = 16.4;
  beamCone.renderOrder = 2;
  // built collapsed: the footprint (shadow, obstacle) is the stand alone —
  // the animations open the cone
  beamCone.scale.setScalar(0.001);
  head.add(beamCone);
  const YAW = 0.35; const TILT = 0.6;
  pan.rotation.y = YAW;
  head.rotation.x = TILT;
  rig.parts.pan = pan;
  rig.parts.head = head;
  rig.parts.cone = beamCone;
  rig.anims.sweep = (t, dt, ctx) => {
    pan.rotation.y = YAW + Math.sin(t * 0.45 + ctx.phase) * 0.55;
    head.rotation.x = TILT + Math.sin(t * 0.9 + ctx.phase * 2) * 0.06;
    beamCone.scale.setScalar(1);
    coneMat.opacity = 0.4;
    lensMat.color.set('#fff1c4');
  };
  rig.anims.idle = (t, dt, ctx) => {
    const k = 0.5 + 0.5 * Math.sin(t * 1.3 + ctx.phase);
    pan.rotation.y = YAW;
    head.rotation.x = TILT;
    beamCone.scale.set(0.95 + k * 0.07, 0.95 + k * 0.07, 1);
    coneMat.opacity = 0.28 + k * 0.16;
    lensMat.color.setRGB(1, 0.9 + k * 0.06, 0.66 + k * 0.14, THREE.SRGBColorSpace);
  };
});

// ── curtain — proscenium: scalloped valance, two pleated drapes that open ─
defineModel('curtain', (opts, rig) => {
  const HALF = 100; // the drapes' outer edges
  const TOP = 87;
  const Z0 = -2.5;
  // frame: slim posts outside the drapes' outer edges, the header the valance hangs on
  for (const s of [-1, 1]) rig.body.add(mesh(box(3, 85.5, 4), C.brown, s * 101.1, 0, -4, WOOD_FINE));
  rig.body.add(mesh(box(206, 12.5, 8), shade(C.valance, -0.06), 0, 85, -3, { tex: 'fabric' }));
  rig.body.add(mesh(box(208, 3.5, 12), C.gold, 0, 96.5, -1));
  // valance: six folded scallops with a gold hem, tassels between them
  const SW = 206 / 6;
  const arc = (k0, k1, dy = 0) => Array.from({ length: 9 }, (_, q) => {
    const u = lerp(k0, k1, q / 8);
    return [SW * u, 86 - 7 * Math.sin(u * PI) + dy];
  });
  const scallop = fold([[0, 96.5], ...arc(0, 1), [SW, 96.5]], 2, 1.5, { back: false });
  const hem = fold([...arc(0, 1), ...arc(1, 0, 2.2)], 2, 1.5, { back: false });
  for (let i = 0; i < 6; i += 1) {
    const x0 = -103 + SW * i;
    rig.body.add(mesh(scallop, C.valance, x0, 0, 2, { tex: 'fabric' }));
    rig.body.add(mesh(hem, C.gold, x0, 0, 2.5));
  }
  for (let i = 0; i <= 6; i += 1) {
    const x = -103 + SW * i;
    rig.body.add(mesh(new THREE.IcosahedronGeometry(1.9, 0), C.gold, x, 86.6, 3.4));
    rig.body.add(mesh(new THREE.ConeGeometry(1.7, 6, 5).rotateX(PI), C.goldDeep, x, 82.4, 3.4));
  }

  // drapes: a pleated sheet per side — N pleats across, hinged rows down;
  // the vertices are re-posed every frame (k: 0 closed … 1 tied open)
  const N = 10;
  const ROWS = [0, 14, 28, 42, 56, 70, TOP];
  const OPEN = [-80, -81, -83, -88, -80, -66, -50]; // inner edge when open, per row
  const TIE = 3; // the row the tie-back pinches
  const drapeMat = mat(C.drape, { tex: 'fabric', side: THREE.DoubleSide });
  const innerAt = (r, k) => lerp(0, OPEN[r], k); // closed: the two drapes meet at the centre
  const drapes = [-1, 1].map((side) => {
    const count = N * (ROWS.length - 1) * 6;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const col = new Float32Array(count * 3);
    const r = rng(side < 0 ? 11 : 23);
    for (let t = 0; t < count / 3; t += 1) col.fill(0.97 + r() * 0.05, t * 9, t * 9 + 9);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, drapeMat);
    m.frustumCulled = false;
    rig.body.add(m);
    const P = Array.from({ length: ROWS.length }, () => Array.from({ length: N + 1 }, () => [0, 0, 0]));
    // tie-back: a gold cord that tightens round the gathered drape, + tassel
    const tie = mesh(box(1, 4, 9), C.gold, 0, 40, Z0);
    const tassel = mesh(new THREE.ConeGeometry(1.8, 8, 5), C.goldDeep, side * -97, 35.5, Z0 + 4.6);
    rig.body.add(tie, tassel);
    return { side, geo, P, tie, tassel };
  });
  function pose(k, t, phase) {
    const e = smooth((k - 0.55) / 0.4);
    for (const d of drapes) {
      const { side, geo, P } = d;
      for (let r = 0; r < ROWS.length; r += 1) {
        const y = ROWS[r];
        const hang = 1 - y / TOP; // sway grows toward the hem
        const free = r < TIE ? hang : hang * (1 - k * 0.85); // tied: only the tail below the tie swings
        const xin = innerAt(r, k);
        for (let j = 0; j <= N; j += 1) {
          const u = j / N;
          const sway = Math.sin(t * 0.8 + phase + y * 0.02 + u * 1.6) * 1.3 * free * u; // both drapes swing the same way
          const amp = lerp(2.6, 3.4, k) * (j === 0 ? 0.4 : 1);
          const zs = Math.sin(t * 0.63 + phase + (N - j) * 0.7) * 0.45 * free;
          P[r][j][0] = side * -lerp(-HALF, xin, u) + sway;
          P[r][j][1] = y;
          P[r][j][2] = Z0 + (j % 2 ? -amp : amp) + zs;
        }
      }
      const pos = geo.attributes.position.array;
      let o = 0;
      const put = (p) => { pos[o] = p[0]; pos[o + 1] = p[1]; pos[o + 2] = p[2]; o += 3; };
      for (let r = 0; r < ROWS.length - 1; r += 1) {
        for (let j = 0; j < N; j += 1) {
          const a = P[r][j]; const b = P[r][j + 1]; const c = P[r + 1][j + 1]; const dd = P[r + 1][j];
          if (side < 0) { put(a); put(b); put(c); put(a); put(c); put(dd); } else { put(a); put(c); put(b); put(a); put(dd); put(c); }
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
      // the cord: from the post to just past the drape's inner edge
      const x0 = -HALF - 1.2; const x1 = innerAt(TIE, k) + 1.2;
      d.tie.scale.set(Math.max(0.001, x1 - x0), Math.max(0.001, e), Math.max(0.001, e));
      d.tie.position.x = side * -((x0 + x1) / 2);
      d.tassel.scale.setScalar(Math.max(0.001, e));
      d.tassel.rotation.z = Math.sin(t * 1.1 + phase + side) * 0.08 * e;
    }
  }
  pose(1, 0, 0);
  rig.parts.pose = pose; // pose(k, t, phase): 0 closed … 1 open
  rig.anims.open = (t, dt, ctx) => pose(1, t, ctx.phase);
  rig.anims.closed = (t, dt, ctx) => pose(0, t, ctx.phase);
  rig.anims.reveal = (t, dt, ctx) => {
    const c = t % 14; // 2 s closed, 3 s opening, 6 s open, 3 s closing
    const k = c < 2 ? 0 : c < 5 ? smooth((c - 2) / 3) : c < 11 ? 1 : 1 - smooth((c - 11) / 3);
    pose(k, t, ctx.phase);
  };
});

// ── starBadge — a faceted gold star on a short pedestal with a banner ─────
defineModel('starBadge', (opts, rig) => {
  const oct = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, 8).rotateY(PI / 8).translate(0, h / 2, 0);
  rig.body.add(mesh(oct(27, 30, 7), shade(C.ivory, -0.07), 0, 0, 0));
  rig.body.add(mesh(oct(22, 22.6, 12.5), C.cream, 0, 7, 0));
  rig.body.add(mesh(oct(25.5, 24.5, 2.5), C.ivory, 0, 19, 0));
  // banner: wraps the three front faces, its notched tails fly out behind
  const band = new THREE.CylinderGeometry(23.6, 23.6, 10, 3, 1, true, -PI * 0.375, PI * 0.75).translate(0, 5, 0);
  rig.body.add(mesh(band, C.mauve, 0, 8, 0, { side: THREE.DoubleSide }));
  for (const s of [-1, 1]) {
    const tail = group(s * 21.8, 6.5, 9, mesh(extrude([[0, 0], [s * 14, 0], [s * 10.5, 5], [s * 14, 10], [0, 10]], 1), shade(C.mauve, -0.08)));
    tail.rotation.y = s * 0.45;
    rig.body.add(tail);
  }
  // the star: bobs (hold) and spins (spinner) on its rod
  const hold = group(0, 62, 0);
  rig.body.add(hold);
  hold.add(mesh(cyl(2.2, 2.2, 36, 6), C.goldDeep, 0, -49, 0));
  hold.add(mesh(cyl(2.4, 4.2, 4, 6), C.gold, 0, -17.5, 0));
  const spinner = group(0, 0, 0);
  hold.add(spinner);
  const [sl, sd] = starGeo(38, 15.8, 8);
  spinner.add(mesh(sl, C.goldLight), mesh(sd, C.goldDeep));
  // glint: a small four-point sparkle at the top tip, now and then
  const glintMat = new THREE.MeshBasicMaterial({ color: '#fffbe6' });
  const g4 = extrude(Array.from({ length: 8 }, (_, i) => {
    const a = (i * PI) / 4; const q = i % 2 ? 1.5 : 8;
    return [Math.cos(a) * q, Math.sin(a) * q];
  }), 0.5);
  const glint = group(3, 29, 3.5, new THREE.Mesh(g4, glintMat), new THREE.Mesh(g4.clone().rotateY(PI / 2), glintMat));
  glint.scale.setScalar(0.001);
  hold.add(glint);
  rig.parts.star = spinner;
  const bob = (t, phase) => {
    hold.position.y = 60.8 + Math.sin(t * 1.4 + phase) * 1.2;
    const c = (t + phase) % 4.6;
    const k = c < 0.7 ? Math.sin((c / 0.7) * PI) : 0;
    glint.scale.setScalar(Math.max(0.001, k));
    glint.rotation.z = c * 1.4;
  };
  rig.anims.spin = (t, dt, ctx) => { bob(t, ctx.phase); spinner.rotation.y = t * 0.7 + ctx.phase; };
  rig.anims.idle = (t, dt, ctx) => { bob(t, ctx.phase); spinner.rotation.y = 0; };
});

// ── confettiCannon — a little party cannon (side-on, aimed up to +x) ──────
defineModel('confettiCannon', (opts, rig) => {
  const EL = 0.9; const WR = 22; const LEN = 78;
  const root = group(0, 0, 0);
  rig.body.add(root);
  // wheels + axle
  const wheels = [];
  for (const s of [-1, 1]) {
    const w = group(0, WR, s * 18);
    w.add(mesh(zcyl(WR, 5, 12), C.slate));
    w.add(mesh(zcyl(17, 5.6, 12), C.sand));
    for (let i = 0; i < 3; i += 1) w.add(mesh(cbox(32, 3.2, 6.2).rotateZ((i * PI) / 3 + 0.3), shade(C.brown, -0.02)));
    w.add(mesh(zcyl(5.5, 7.4, 8), C.cream));
    root.add(w);
    wheels.push(w);
  }
  root.add(mesh(zcyl(2.2, 36, 6), C.brown, 0, WR, 0));
  // carriage: trail to the ground, two cheeks carrying the barrel
  const carriage = group(0, WR, 0);
  root.add(carriage);
  carriage.add(mesh(beam(0, 0, -44, -18.6, 6, 10), C.brown, 0, 0, 0, WOOD_FINE));
  carriage.add(mesh(box(9, 2.4, 11), shade(C.brown, -0.08), -45, -22, 0));
  for (const s of [-1, 1]) carriage.add(mesh(extrude([[-13, -4], [13, -4], [5, 13], [-5, 13]], 2.6), shade(C.wood, -0.04), 0, 0, s * 12.6, WOOD_FINE));
  carriage.add(mesh(zcyl(3.2, 29, 8), C.ochre, 0, 8, 0));
  // barrel (built along +x, pivoted at the trunnions)
  const barrel = group(0, 8, 0);
  const tube = group(0, 0, 0);
  barrel.add(tube);
  const along = (g) => g.rotateZ(-PI / 2);
  tube.add(mesh(along(lathe([[0.01, -22], [7, -22], [10, -18], [10.5, -8], [9.5, 2], [9, 44], [9.5, LEN - 12]], 10)), C.mauve));
  tube.add(mesh(along(lathe([[9.5, LEN - 12], [14, LEN - 6], [14, LEN], [10.5, LEN], [10.5, LEN - 3]], 10)), C.ochre));
  tube.add(mesh(along(new THREE.CylinderGeometry(11.3, 11.3, 4, 10).translate(0, -10, 0)), C.ochre));
  tube.add(mesh(along(new THREE.CylinderGeometry(10.1, 10.2, 4, 10).translate(0, 28, 0)), C.ochre));
  tube.add(inkMesh(new THREE.CircleGeometry(10.5, 10).rotateY(PI / 2), '#3a3233', LEN - 3, 0, 0));
  barrel.rotation.z = EL;
  carriage.add(barrel);
  rig.parts.wheels = wheels;
  rig.parts.wheelRadius = WR;
  rig.parts.barrel = barrel;

  // confetti: paper rectangles, hidden (collapsed in the muzzle) at rest
  const PERIOD = 3.5; const FIRE = 0.3; const COUNT = 24; const SETS = 4;
  const mx = Math.cos(EL) * (LEN - 2); const my = WR + 8 + Math.sin(EL) * (LEN - 2);
  const colors = [C.mauve, C.ochre, C.sage, C.cream, C.rose, C.red, C.teal, C.gold];
  const mats = colors.map((c) => ownMat(c, { side: THREE.DoubleSide, transparent: true }));
  const pieceGeo = new THREE.PlaneGeometry(7, 4.4);
  const r = rng(77 + (rig.seed | 0));
  const pieces = [];
  const fx = group(mx, my, 0);
  rig.body.add(fx);
  for (let i = 0; i < COUNT; i += 1) {
    const m = new THREE.Mesh(pieceGeo, mats[i % mats.length]);
    m.scale.setScalar(0.001);
    fx.add(m);
    const sets = [];
    for (let s = 0; s < SETS; s += 1) {
      const el = EL + 0.12 + (r() - 0.5) * 0.7; const v = 420 + r() * 340;
      sets.push({
        vx: Math.cos(el) * v, vy: Math.sin(el) * v, vz: (r() - 0.5) * 220, k: 3.4 + r() * 1.2,
        w1: 3 + r() * 5, w2: 2 + r() * 4, ph: r() * 6.28, fl: 3 + r() * 5, size: 0.75 + r() * 0.5,
      });
    }
    pieces.push({ m, sets });
  }
  const puffMat = ownMat('#f4f0e6', { transparent: true });
  const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(7, 0), puffMat);
  puff.scale.setScalar(0.001);
  fx.add(puff);
  const G = 260;
  const hide = () => {
    for (const p of pieces) { p.m.position.set(0, 0, 0); p.m.scale.setScalar(0.001); }
    puff.scale.setScalar(0.001);
    puff.position.set(0, 0, 0);
    barrel.position.set(0, 8, 0);
    root.position.x = 0;
    for (const w of wheels) w.rotation.z = 0;
  };
  rig.anims.pop = (t, dt, ctx) => {
    const T = t + ctx.phase;
    const c = T % PERIOD;
    const n = Math.floor(T / PERIOD) % SETS;
    // recoil: a slow squeeze back, the kick, the settle
    const tau = c - FIRE;
    const back = tau < 0 ? 2.5 * smooth(c / FIRE) : 2.5 + 5 * Math.exp(-tau * 5) * (1 - Math.exp(-tau * 40)) - 2.5 * smooth(tau / 0.8);
    barrel.position.set(-Math.cos(EL) * back, 8 - Math.sin(EL) * back, 0);
    const roll = tau < 0 ? 0 : 3 * Math.exp(-tau * 3.5) * Math.sin(Math.min(tau * 9, PI));
    root.position.x = -roll;
    for (const w of wheels) w.rotation.z = roll / WR;
    const fade = tau < 0 ? 0 : 1 - smooth((tau - 2.3) / 0.6);
    for (const mm of mats) mm.opacity = fade;
    for (const p of pieces) {
      const s = p.sets[n];
      if (tau <= 0 || fade <= 0) { p.m.position.set(0, 0, 0); p.m.scale.setScalar(0.001); continue; }
      const q = (1 - Math.exp(-s.k * tau)) / s.k;
      const air = Math.min(1, tau * 1.5);
      const x = s.vx * q + Math.sin(tau * s.fl + s.ph) * 7 * air;
      let y = s.vy * q - (G / s.k) * (tau - q);
      const z = s.vz * q + Math.cos(tau * s.fl * 0.8 + s.ph) * 7 * air;
      const floor = -my + 0.6;
      if (y <= floor + 4) {
        // landed: lies flat where it came down
        y = floor;
        p.m.rotation.set(PI / 2, 0, s.ph);
      } else {
        p.m.rotation.set(tau * s.w1 + s.ph, tau * s.w2, s.ph);
      }
      p.m.position.set(x, y, z);
      p.m.scale.setScalar(s.size * Math.min(1, tau * 12) * (0.4 + 0.6 * fade));
    }
    const pk = tau < 0 ? 0 : tau / 0.7;
    puff.scale.setScalar(pk > 0 && pk < 1 ? 0.5 + pk * 1.6 : 0.001);
    puff.position.set(Math.cos(EL) * pk * 16, Math.sin(EL) * pk * 16, 0);
    puff.rotation.set(pk * 2, pk * 3, 0);
    puffMat.opacity = Math.max(0, 1 - pk) * 0.85;
  };
  rig.anims.idle = () => hide();
});

// ── lightbulb — an idea: a glowing bulb in a wooden socket-base ───────────
defineModel('lightbulb', (opts, rig) => {
  const CY = 58;
  rig.body.add(mesh(new THREE.CylinderGeometry(17, 20, 13, 8).rotateY(PI / 8).translate(0, 6.5, 0), C.brown, 0, 0, 0, WOOD_FINE));
  rig.body.add(mesh(new THREE.CylinderGeometry(13, 13, 2, 8).rotateY(PI / 8).translate(0, 1, 0), shade(C.brown, -0.08), 0, 13, 0));
  for (let i = 0; i < 3; i += 1) rig.body.add(mesh(cyl(9.5, 10.5, 4.5, 8), shade(C.slateSoft, i % 2 ? -0.03 : 0.03), 0, 15 + i * 4.5, 0, METAL));
  // filament: two posts and a zig-zag (unlit — it is what glows)
  const filMat = new THREE.MeshBasicMaterial({ color: '#c8823c', transparent: true }); // drawn after the glass, so it reads through it
  const postMat = new THREE.MeshBasicMaterial({ color: '#8a6a44', transparent: true });
  const fil = new THREE.Group();
  for (const s of [-1, 1]) fil.add(new THREE.Mesh(beam(s * 4, 28, s * 8, 52, 1, 1), postMat));
  const zig = [[-8, 52], [-4, 59], [0, 52], [4, 59], [8, 52]];
  for (let i = 0; i < 4; i += 1) fil.add(new THREE.Mesh(beam(...zig[i], ...zig[i + 1], 1.5, 1.5, 0.5), filMat));
  fil.traverse((o) => { o.renderOrder = 4; });
  rig.body.add(fil);
  // glass: unlit, pale, a little see-through
  const glassMat = glowMat('#fff3cc', { transparent: true, opacity: 0.74, depthWrite: false });
  const profile = [[8, 28.4], [9, 34], [14, 40], [21, 47], [25, 55], [25.5, 60], [23, 69], [17, 77], [9, 82], [0.01, 84]];
  const glass = new THREE.Mesh(glowGeo(lathe(profile, 10).rotateY(PI / 10), { split: 0.1, lift: 0.04 }), glassMat);
  glass.renderOrder = 2;
  rig.body.add(glass);
  const haloMat = new THREE.MeshBasicMaterial({ color: C.glow2, transparent: true, opacity: 0.2, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(30, 1), haloMat);
  halo.position.y = CY;
  halo.renderOrder = 3;
  rig.body.add(halo);
  // rays: dashes round the bulb, in the facing plane and across it
  const rayMat = new THREE.MeshBasicMaterial({ color: '#f2cd74' });
  const rays = [];
  const addRay = (deg, turn) => {
    const g = group(0, CY, 0);
    g.rotation.order = 'YZX';
    g.rotation.y = turn;
    g.rotation.z = ((deg - 90) * PI) / 180;
    const m = new THREE.Mesh(cbox(3, 11, 3), rayMat);
    m.position.y = 36.5;
    g.add(m);
    rig.body.add(g);
    rays.push(m);
  };
  for (const d of [-20, 15, 50, 90, 130, 165, 200]) addRay(d, 0);
  rig.parts.rays = rays;
  rig.anims.glow = (t, dt, ctx) => {
    const k = 0.5 + 0.5 * Math.sin(t * 1.7 + ctx.phase);
    glassMat.color.setRGB(1, 0.925 + k * 0.045, 0.72 + k * 0.13, THREE.SRGBColorSpace);
    filMat.color.setRGB(0.86 + k * 0.1, 0.5 + k * 0.12, 0.2 + k * 0.08, THREE.SRGBColorSpace);
    haloMat.opacity = 0.1 + k * 0.16;
    halo.visible = true;
    halo.scale.setScalar(0.97 + k * 0.05);
    rays.forEach((m, i) => {
      const w = 0.5 + 0.5 * Math.sin(t * 2.4 + ctx.phase - i * 0.9);
      m.scale.set(1, 0.3 + 0.7 * w, 1);
      m.position.y = 31 + 5.5 * (0.3 + 0.7 * w);
    });
  };
  rig.anims.off = () => {
    glassMat.color.set('#9aa39c');
    filMat.color.set('#5d5142');
    halo.visible = false;
    for (const m of rays) m.scale.setScalar(0.001);
  };
});

// ── makerBench — workbench, pegboard with tools, two meshing paper gears ──
function gearGeo(N, m, depth, holes, holeR, holeD) {
  const rp = (m * N) / 2; const ro = rp + 2; const rr = rp - 2.5; const p = (2 * PI) / N;
  const s = new THREE.Shape();
  for (let k = 0; k < N; k += 1) {
    const a = k * p;
    [[rr, -0.3], [ro, -0.17], [ro, 0.17], [rr, 0.3]].forEach(([q, da], i) => {
      const x = Math.cos(a + da * p) * q; const y = Math.sin(a + da * p) * q;
      if (k === 0 && i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    });
  }
  s.closePath();
  for (let i = 0; i < holes; i += 1) {
    const a = (i / holes) * 2 * PI + 0.4;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * holeD, Math.sin(a) * holeD, holeR, 0, PI * 2, true);
    s.holes.push(h);
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 3 }).translate(0, 0, -depth / 2);
}

defineModel('makerBench', (opts, rig) => {
  const TOP = 50; const ZB = -19; // bench top height, pegboard's front plane
  // bench
  rig.body.add(mesh(box(141, 6, 44), C.wood, 0, 44, 0, WOOD_FINE));
  rig.body.add(mesh(box(127, 5, 36), shade(C.wood, -0.07), 0, 39, 0, WOOD_FINE));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rig.body.add(mesh(box(6, 44, 6), C.brown, sx * 63.5, 0, sz * 17, WOOD_FINE));
  rig.body.add(mesh(box(127, 2.5, 34), shade(C.wood, -0.1), 0, 12, 0, WOOD_FINE));
  // pegboard
  rig.body.add(mesh(box(133, 47.5, 3), '#dccfb2', 0, TOP, ZB - 1.5));
  rig.body.add(mesh(box(137, 3, 5), C.brown, 0, 97, ZB - 1.5, WOOD_FINE));
  for (const s of [-1, 1]) rig.body.add(mesh(box(3, 47, 5), C.brown, s * 67, TOP, ZB - 1.5, WOOD_FINE));
  const dots = [];
  for (let x = -60; x <= 60; x += 8) for (let y = 65; y <= 92; y += 9) dots.push(new THREE.CircleGeometry(0.9, 6).translate(x, y, ZB + 0.4));
  rig.body.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(dots), ink('#b3a384')));
  // ruler with tick marks
  rig.body.add(mesh(box(50, 5, 1.2), '#dcbf7e', -37, 55, ZB + 0.6));
  const ticks = [];
  for (let i = 1; i < 20; i += 1) {
    const h = i % 4 === 0 ? 2.8 : 1.6;
    ticks.push(cbox(0.5, h, 0.9).translate(-62 + i * 2.5, 60 - h / 2, ZB + 1.25));
  }
  rig.body.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(ticks), ink(C.brown)));
  // tools on the board: hammer, wrench, screwdriver
  rig.body.add(mesh(box(3, 24, 2.4), C.wood, -56, 66, ZB + 1.4, WOOD_FINE));
  rig.body.add(mesh(box(13, 6, 4.4), C.slate, -55.5, 88, ZB + 2.2, METAL));
  const wrench = group(-42, 68, ZB + 1.2);
  wrench.add(mesh(box(3.2, 20.5, 1.8), C.slateSoft, 0, 0, 0, METAL));
  wrench.add(mesh(extrude([[-4.5, 22], [-4.5, 28], [-2, 28], [-2, 24.5], [2, 24.5], [2, 28], [4.5, 28], [4.5, 22], [2.5, 19.5], [-2.5, 19.5]], 1.8), C.slateSoft, 0, 0, 0, METAL));
  wrench.add(mesh(zcyl(2.6, 1.8, 8), C.slateSoft, 0, 0, 0, METAL));
  wrench.rotation.z = -0.12;
  rig.body.add(wrench);
  rig.body.add(mesh(cyl(0.9, 0.9, 16.5, 6), C.slateSoft, -30, 66, ZB + 1.6));
  rig.body.add(mesh(cyl(2.6, 2.6, 10, 6), C.red, -30, 82, ZB + 2.7));
  // gears: 12 and 8 teeth on pegs, in mesh
  const PHI = (-28 * PI) / 180; const M = 2.3; const N1 = 12; const N2 = 8;
  const cd = (M * (N1 + N2)) / 2;
  const gz = ZB + 2.6;
  const mkGear = (x, y, geo, color) => {
    const g = group(x, y, gz, mesh(geo, color));
    g.add(mesh(zcyl(2.6, 3.4, 8), C.cream));
    g.add(mesh(zcyl(1, 2.6, 6), C.slate, 0, 0, -1.5)); // the peg, into the board
    rig.body.add(g);
    return g;
  };
  const g1 = mkGear(24, 79, gearGeo(N1, M, 2.4, 4, 3, 6.6), C.mauve);
  const g2 = mkGear(24 + Math.cos(PHI) * cd, 79 + Math.sin(PHI) * cd, gearGeo(N2, M, 2.4, 3, 2, 4.4), C.ochre);
  // the gadget: a little robot buggy, half built — its head rides a spring,
  // one arm and a wheel still lie on the bench
  const bot = group(-8, TOP, 2);
  rig.body.add(bot);
  for (const [x, z] of [[-7, 7.6], [7, 7.6], [-7, -7.6]]) bot.add(mesh(zcyl(3.5, 2.4, 8), C.slate, x, 3.5, z));
  bot.add(mesh(box(22, 7, 13), C.cream, 0, 4, 0));
  bot.add(mesh(cyl(1.2, 1.2, 6, 5), C.slateSoft, 0, 11, 0));
  const botHead = group(0, 13.5, 0);
  botHead.add(mesh(box(12, 9, 10), C.sage));
  const ey = eyes(2.6, 1.1);
  ey.group.position.set(0, 5, 5.1);
  botHead.add(ey.group);
  botHead.add(mesh(cyl(0.4, 0.4, 4.5, 4), C.slateSoft, 0, 9, 0));
  botHead.add(mesh(new THREE.IcosahedronGeometry(1.5, 0), C.red, 0, 14.3, 0));
  bot.add(botHead);
  rig.body.add(mesh(new THREE.CylinderGeometry(3.5, 3.5, 2.4, 8).translate(0, 1.2, 0), C.slate, -27, TOP, 12)); // the 4th wheel
  const arm = mesh(box(10, 2.4, 2.4), C.mauve, 13, TOP, 9);
  arm.rotation.y = 0.4;
  rig.body.add(arm);
  // parts tray
  const tray = group(46, TOP, 6);
  tray.add(mesh(box(22, 1.2, 14), C.sageMid));
  for (const s of [-1, 1]) {
    tray.add(mesh(box(22, 5, 1.2), C.sageMid, 0, 0, s * 6.4));
    tray.add(mesh(box(1.2, 5, 14), C.sageMid, s * 10.4, 0, 0));
  }
  tray.add(mesh(new THREE.IcosahedronGeometry(2.4, 0), C.ochre, -4, 3.4, 0));
  tray.add(mesh(new THREE.IcosahedronGeometry(2.8, 0), C.mauve, 3, 3.6, 1));
  tray.rotation.y = -0.15;
  rig.body.add(tray);
  rig.parts.gears = [g1, g2];
  rig.parts.gadgetHead = botHead;
  rig.anims.work = (t, dt, ctx) => {
    const a = t * 0.6 + ctx.phase;
    g1.rotation.z = a;
    g2.rotation.z = -(a - PHI) * (N1 / N2) + PHI + PI + PI / N2;
    botHead.position.y = 13.5 + (0.5 + 0.5 * Math.sin(t * 2.2 + ctx.phase)) * 2.4;
    botHead.rotation.y = Math.sin(t * 1.1 + ctx.phase) * 0.25;
  };
  rig.anims.work(0, 0, { phase: 0 });
});

// ── paperRocket — a paper rocket on its little launch stand ───────────────
defineModel('paperRocket', (opts, rig) => {
  const T8 = PI / 8; // a flat facet faces the viewer
  rig.body.add(mesh(new THREE.CylinderGeometry(27, 29, 4, 8).rotateY(T8).translate(0, 2, 0), C.brown, 0, 0, 0, WOOD_FINE));
  rig.body.add(mesh(new THREE.CylinderGeometry(22, 24, 4, 8).rotateY(T8).translate(0, 2, 0), C.sand, 0, 4, 0));
  const rocket = group(0, 8, 0);
  rig.body.add(rocket);
  const hull = group(0, 0, 0); // shakes inside `rocket`
  rocket.add(hull);
  hull.add(mesh(lathe([[6, 7], [10.5, 10], [12.5, 24], [12.5, 50], [11, 60]], 8).rotateY(T8), '#f1ebdc'));
  hull.add(mesh(new THREE.CylinderGeometry(11.95, 12.85, 6, 8).rotateY(T8), C.mauve, 0, 54, 0));
  hull.add(mesh(new THREE.ConeGeometry(11, 32, 8).rotateY(T8), C.red, 0, 76, 0));
  hull.add(mesh(new THREE.CylinderGeometry(4.5, 6.5, 6.5, 8).rotateY(T8), C.slate, 0, 5, 0));
  // window on the front facet
  hull.add(mesh(zcyl(6, 3, 12), C.ivory, 0, 42, 10.6));
  hull.add(inkMesh(new THREE.CircleGeometry(4.2, 12), C.teal, 0, 42, 12.3));
  hull.add(inkMesh(new THREE.CircleGeometry(4.2, 12, PI * 0.5, PI * 0.6), '#9cc3bf', 0, 42, 12.4));
  // three fins: one toward the viewer, two behind
  const finPts = [[10.5, 26], [22, 6], [22, 0], [12.6, 0], [11, 8]];
  for (const a of [-PI / 2, PI / 6, (5 * PI) / 6]) hull.add(mesh(extrude(finPts, 2.2).rotateY(a), shade(C.mauve, -0.04)));
  // flame (unlit), collapsed at rest
  const flame = group(0, 2, 0);
  flame.add(new THREE.Mesh(glowGeo(new THREE.ConeGeometry(6, 26, 6).rotateX(PI).translate(0, -13, 0), { split: 0.12 }), glowMat('#ffc66e')));
  flame.add(new THREE.Mesh(glowGeo(new THREE.ConeGeometry(3.4, 15, 6).rotateX(PI).translate(0, -7.5, 0), { split: 0.05 }), glowMat('#fff3cf')));
  flame.children[1].position.z = 0; flame.children[1].scale.setScalar(1.02);
  flame.scale.setScalar(0.001);
  hull.add(flame);
  // idle steam wisps from under the nozzle
  const steam = [smoke(7, 10, 2, { size: 2, rise: 13, count: 3, drift: 9 }), smoke(-7, 10, -2, { size: 2, rise: 13, count: 3, drift: -9 })];
  for (const s of steam) { rig.body.add(s.group); s.update(0); for (const p of s.group.children) { p.position.set(0, 0, 0); p.scale.setScalar(0.5); } }
  // launch smoke: puffs rolling out over the pad
  const pr = rng(31);
  const puffs = Array.from({ length: 8 }, (_, i) => {
    const m = new THREE.Mesh(facet(new THREE.IcosahedronGeometry(5, 0), 0.06), ownMat('#f4f0e6', { vertexColors: true, transparent: true }));
    m.scale.setScalar(0.001);
    m.position.set(0, 10, 0);
    rig.body.add(m);
    const a = (i / 8) * PI * 2 + pr() * 0.5;
    return { m, a, d: 16 + pr() * 14, lag: pr() * 0.9, up: 6 + pr() * 14, s: 0.8 + pr() * 0.7 };
  });
  const rest = () => {
    rocket.position.set(0, 8, 0); rocket.scale.setScalar(1);
    hull.position.set(0, 0, 0); hull.rotation.z = 0;
    flame.scale.setScalar(0.001);
  };
  const noPuffs = () => { for (const p of puffs) p.m.scale.setScalar(0.001); };
  rig.parts.rocket = rocket;
  rig.anims.idle = (t, dt, ctx) => {
    rest();
    noPuffs();
    hull.position.x = Math.sin(t * 31 + ctx.phase) * 0.12;
    hull.rotation.z = Math.sin(t * 23 + ctx.phase) * 0.003;
    for (const s of steam) { s.group.visible = true; s.update(t + ctx.phase); }
  };
  const P = 8; const IGN = 1.6; const FLY = 2.6; const BACK = 6.2;
  rig.anims.launch = (t, dt, ctx) => {
    const c = (t + ctx.phase) % P;
    rest();
    for (const s of steam) s.group.visible = false;
    if (c < IGN) {
      const a = (c / IGN) ** 2;
      hull.position.x = Math.sin(c * 47) * a * 0.7;
      hull.rotation.z = Math.sin(c * 31) * a * 0.012;
      const f = smooth((c - 0.7) / 0.9) * 0.45;
      // on the stand there is no room under the nozzle: a short, wide splash
      flame.scale.set(Math.max(0.001, f * 1.5), Math.max(0.001, f * 0.14 * (0.85 + 0.15 * Math.sin(c * 40))), Math.max(0.001, f * 1.5));
    } else if (c < IGN + FLY) {
      const u = (c - IGN) / FLY;
      rocket.position.y = 8 + 250 * u * u;
      rocket.scale.setScalar(Math.max(0.001, 1 - smooth((u - 0.72) / 0.28)));
      hull.position.x = Math.sin(c * 47) * 0.5 * (1 - u);
      const room = (rocket.position.y - 8 + 1.8) / 26; // never through the pad
      flame.scale.set(1, Math.min(1 + 0.25 * Math.sin(c * 38) + 0.1 * Math.sin(c * 71), room), 1);
    } else if (c < BACK) {
      rocket.scale.setScalar(0.001);
    } else {
      // pops back onto the stand
      const u = Math.min(1, (c - BACK) / 0.7);
      const s = 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2; // ease-out-back
      rocket.scale.setScalar(Math.max(0.001, s));
    }
    // smoke: starts at ignition, rolls outward, thins away
    for (const p of puffs) {
      const tau = c - (IGN - 0.5) - p.lag;
      const life = 3.2;
      if (tau <= 0 || tau >= life) { p.m.scale.setScalar(0.001); continue; }
      const k = tau / life;
      const out = 1 - Math.exp(-tau * 1.6);
      p.m.position.set(Math.cos(p.a) * p.d * out, 10 + p.up * k, Math.sin(p.a) * p.d * out);
      p.m.scale.setScalar(p.s * (0.5 + out * 1.3) * (1 - smooth((k - 0.6) / 0.4) * 0.5));
      p.m.rotation.set(k * 2 + p.a, k * 3, 0);
      p.m.material.opacity = Math.min(1, tau * 4) * (1 - smooth((k - 0.45) / 0.55)) * 0.9;
    }
  };
});

// ── trophyPick — a gold cup whose bowl is a robot head: chosen by AI ──────
defineModel('trophyPick', (opts, rig) => {
  rig.body.add(mesh(box(58, 5, 40), shade(C.brown, -0.05), 0, 0, 0, WOOD_FINE));
  rig.body.add(mesh(box(50, 13, 34), C.brown, 0, 5, 0, WOOD_FINE));
  rig.body.add(mesh(cbox(26, 7, 1.2), '#e3d3a4', 0, 11.5, 17.2));
  rig.body.add(mesh(lathe([[14, 18], [6, 23], [3.5, 26], [3.5, 33], [7, 35], [7, 37], [4, 39], [4, 40.5]], 8).rotateY(PI / 8), C.gold));
  const RIDGE = 2.5; const HD = 26;
  const headGeo = fold([[-15, 40], [15, 40], [22, 78], [-22, 78]], HD, RIDGE);
  rig.body.add(mesh(headGeo, C.gold));
  rig.body.add(mesh(fold([[-23.5, 76], [23.5, 76], [23.5, 80], [-23.5, 80]], HD + 3, RIDGE + 0.2), C.goldLight));
  const ey = eyes(8, 3);
  ey.group.position.set(0, 61, headGeo.userData.zAt(8) + 0.2);
  rig.body.add(ey.group);
  // handles = ears
  for (const s of [-1, 1]) {
    rig.body.add(mesh(new THREE.TorusGeometry(8.5, 2.2, 4, 6, PI).rotateZ(s < 0 ? PI / 2 : -PI / 2), s < 0 ? C.gold : C.goldDeep, s * 17.5, 59, 0));
  }
  // antenna
  const ant = group(0, 80, 0);
  ant.add(mesh(cyl(0.9, 1.1, 12.5, 5), C.goldDeep));
  ant.add(mesh(new THREE.IcosahedronGeometry(4.2, 0), C.goldLight, 0, 16.3, 0));
  rig.body.add(ant);
  // gleam: a pale slanted band that sweeps across the folded face
  const gleamMat = new THREE.MeshBasicMaterial({ color: '#fff6d4', transparent: true, opacity: 0, depthWrite: false });
  const gleamGeo = new THREE.BufferGeometry();
  gleamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(36), 3));
  const gleam = new THREE.Mesh(gleamGeo, gleamMat);
  gleam.frustumCulled = false;
  gleam.renderOrder = 2;
  rig.body.add(gleam);
  const Y0 = 44; const Y1 = 74; const HW = 2.4; const SL = 2.6;
  const zAt = (x) => HD / 2 + RIDGE * (1 - Math.abs(x) / 22) + 0.55;
  const setGleam = (cx) => {
    const a = gleamGeo.attributes.position.array;
    let o = 0;
    const put = (x, y) => { a[o] = x; a[o + 1] = y; a[o + 2] = zAt(x); o += 3; };
    for (const [d0, d1] of [[-HW, 0], [0, HW]]) {
      put(cx - SL + d0, Y0); put(cx - SL + d1, Y0); put(cx + SL + d1, Y1);
      put(cx - SL + d0, Y0); put(cx + SL + d1, Y1); put(cx + SL + d0, Y1);
    }
    gleamGeo.attributes.position.needsUpdate = true;
  };
  setGleam(-8);
  rig.parts.antenna = ant;
  rig.anims.idle = (t, dt, ctx) => {
    const c = ((t + ctx.phase) % 5) / 1.6;
    if (c < 1) { setGleam(lerp(-9.5, 9.5, smooth(c))); gleamMat.opacity = Math.sin(c * PI) * 0.6; } else gleamMat.opacity = 0;
    ant.rotation.z = Math.sin(t * 2.1 + ctx.phase) * 0.06 + Math.sin(t * 5.3 + ctx.phase) * 0.02;
    ant.rotation.x = Math.sin(t * 1.7 + ctx.phase) * 0.03;
  };
});

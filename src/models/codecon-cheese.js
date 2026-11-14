// CodeCon 2026 — pack "codecon-cheese" (see tools/sprites-src/codecon-cheese for the
// drawn reference sprites): the "AI moved my cheese" slide. A paper mouse
// that scampers after a wedge of cheese which keeps hopping away, plus the
// props around them — the crumbs it left, the mouse hole, a signpost, a
// snap trap and an empty cake stand under a glass dome.
import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, box, cbox, beam, cyl, ball, disc, extrude, lathe, pyramid, group, blinker, facet, ink, PI,
} from './kit.js';

const WOOD = { tex: 'wood' };
const WOOD_V = { tex: 'wood', texRotate: true };
const WOOD_FINE = { tex: 'woodFine' };
const FUR = { tex: 'fur' };
const METAL = { tex: 'metal' };
const PLASTER = { tex: 'plaster' };
const FABRIC = { tex: 'fabric' };
const FLAT = { jitter: 0 };

const C = {
  fur: '#d3c9c1', furDeep: '#c0b5ad', belly: '#f1ecdf', pink: '#e8b5ad', nose: '#d68c88', tail: '#c99d96',
  ink: '#1f1d1a', rose: '#d79c92', whisker: '#4b5654',
  cheese: '#f0c868', cheeseDeep: '#dfb357', rind: '#f8ecc6', hole: '#b0843c', holeLit: '#c99b4a',
  wood: '#9a774f', woodDeep: '#7b6548', board: '#d6b386', boardDeep: '#bd9662',
  cream: '#e9e2d1', ivory: '#f2ede2', sage: '#aebbab', sageLight: '#c0cbbd', mauve: '#a5817f', mauveDeep: '#8e6c6b',
  slate: '#4b5654', steel: '#8a9391', plaster: '#d9d2c0', dark: '#2b2523', glow: '#fff6d6',
};

const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
// 0 → 1 → 0 window over a…b with soft edges e
const win = (c, a, b, e) => smooth(a, a + e, c) * (1 - smooth(b - e, b, c));
// one soft bump for u in 0…1, else 0
const bump = (u) => (u > 0 && u < 1 ? Math.sin(u * PI) ** 2 : 0);

// Lathe around the X axis from a profile [[x, r], …] (x increasing).
function xlathe(profile, seg = 8) {
  const g = new THREE.LatheGeometry(profile.map(([x, r]) => new THREE.Vector2(Math.max(r, 0.001), x)), seg);
  return g.rotateZ(-PI / 2);
}

// Radius of an [[x, r], …] profile at x.
function radiusAt(profile, x) {
  for (let i = 0; i < profile.length - 1; i += 1) {
    const [x0, r0] = profile[i];
    const [x1, r1] = profile[i + 1];
    if (x >= x0 && x <= x1) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return 0;
}

// A thin square rod between two 3D points.
function rod(a, b, thick, color, opts) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const m = mesh(cbox(va.distanceTo(vb), thick, thick), color, 0, 0, 0, opts);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), vb.clone().sub(va).normalize());
  return m;
}

// Outline extruded from z = 0 to z = d with round holes [[x, y, r], …]
// punched right through — real dents once a floor is put behind them.
function holed(points, holes, d) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const [x, y, r] of holes) {
    const h = new THREE.Path();
    h.absarc(x, y, r, 0, PI * 2, true);
    s.holes.push(h);
  }
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 10 });
}

// A painted cheese hole (for pieces too small for a real dent): a dark disc
// with a lit lower-right lip, facing +z, `lift` proud of z = 0.
function dent(r, lift = 0.45) {
  const g = new THREE.Group();
  g.add(mesh(disc(r, 12), C.hole, 0, 0, lift, FLAT));
  g.add(mesh(disc(r * 0.72, 12), C.holeLit, r * 0.16, -r * 0.16, lift + 0.4, FLAT));
  return g;
}

// The wedge's side outline: tall rind end on the left, tip on the right.
// w wide, h tall (rind included); returns { body, rind, k (slope), top(x) }.
function wedgeShape(w, h) {
  const x0 = -w / 2;
  const x1 = w / 2;
  const rw = w * 0.046; // rind thickness
  const tip = h * 0.07;
  const k = (h - tip) / w;
  const top = (x) => tip + (x1 - x) * k;
  return {
    body: [[x0 + rw, 0], [x1 - w * 0.015, 0], [x1, tip], [x0 + rw, top(x0 + rw)]],
    rind: [[x0, 0], [x0 + rw, 0], [x0 + rw, top(x0 + rw)], [x0, h]],
    k,
    top,
  };
}

// A small solid wedge of cheese (leftover corner, bait): painted holes.
function miniWedge(w, h, d, holes = []) {
  const g = new THREE.Group();
  const s = wedgeShape(w, h);
  g.add(mesh(extrude(s.body, d), C.cheese, 0, 0, 0, FLAT));
  g.add(mesh(extrude(s.rind, d + d * 0.05), C.rind));
  for (const [x, y, r, back] of holes) {
    const dn = dent(r, 0.4);
    dn.position.set(x, y, back ? -d / 2 : d / 2);
    if (back) dn.rotation.y = PI;
    g.add(dn);
  }
  return g;
}

// ── mouse — origami paper mouse, side-on, FRONT toward +x ─────────────────
// Rig: root (bob) → hind legs + torso (pivots at the hips: sitting up) →
// body, front legs, head (neck pivot) → ears, whiskers; tail = 7 joints.
// Animations write a whole pose, cross-faded over 0.2 s when the engine
// switches between them (run → sniff → idle), so nothing ever pops.
defineModel('mouse', (opts, rig) => {
  const root = group(10, 0, 0);
  rig.body.add(root);

  const hind = [-1, 1].map((s) => {
    const g = group(-20, 16, s * 12);
    g.add(mesh(ball(10, 1).scale(1.1, 1.12, 0.6), C.furDeep, 0, 0, 0, FUR));
    g.add(mesh(cyl(3, 4.2, 9, 6).translate(0, -13, 0), C.furDeep, 1, 0, s, FUR)); // shank
    const ankle = group(1, -12.5, s);
    ankle.add(mesh(cbox(16, 3.5, 7), C.pink, 5, -1.75, 0));
    g.add(ankle);
    root.add(g);
    return { g, ankle };
  });

  const torso = group(-20, 20, 0);
  root.add(torso);
  const BODY = [[-32, 0], [-29.5, 9], [-22, 15.5], [-9, 19.5], [5, 19], [17, 15.5], [26, 10.5], [32, 0]];
  const bodyG = group(22, 8, 0);
  bodyG.add(mesh(xlathe(BODY, 9).scale(1, 1, 0.88), C.fur, 0, 0, 0, FUR));
  bodyG.add(mesh(xlathe(BODY, 9).scale(0.9, 0.9, 0.78), C.belly, 1, -4.5, 0));
  torso.add(bodyG);

  const front = [-1, 1].map((s) => {
    const g = group(44, -5, s * 9);
    g.add(mesh(cyl(3, 4.2, 14, 6).translate(0, -12, 0), C.furDeep, 0, 0, 0, FUR));
    const ankle = group(0, -11.5, 0);
    ankle.add(mesh(cbox(10, 3.5, 6), C.pink, 2.5, -1.75, 0));
    g.add(ankle);
    torso.add(g);
    return { g, ankle };
  });

  // head: a faceted teardrop along x ending in the pink nose
  const head = group(46, 18, 0);
  torso.add(head);
  const skull = group(8, 8, 0);
  skull.rotation.z = -0.1;
  head.add(skull);
  const HEAD = [[-17, 0], [-15, 8.5], [-9, 14], [-1, 16.5], [7, 15], [15, 11], [23, 6.5], [29.5, 3.2], [32, 0]];
  const HZ = 0.95;
  skull.add(mesh(xlathe(HEAD, 8).scale(1, 1, HZ), C.fur, 0, 0, 0, FUR));
  skull.add(mesh(ball(3.5, 1), C.nose, 31.5, 0, 0));
  const onHead = (x, deg, k = 1) => {
    const r = radiusAt(HEAD, x) * k;
    const a = (deg * PI) / 180;
    return [x, r * Math.sin(a), r * Math.cos(a) * HZ];
  };
  const eyeballs = [];
  const ears = [];
  const whiskers = [];
  for (const s of [-1, 1]) {
    const [ex, ey, ez] = onHead(10, 30, 0.95);
    const eye = group(ex, ey, s * ez);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(2.8, 12, 8), ink(C.ink));
    dot.scale.z = 0.55;
    eye.add(dot);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), ink('#ffffff'));
    glint.position.set(0.9, 1, s * 1.25);
    eye.add(glint);
    skull.add(eye);
    eyeballs.push(eye);

    const [cx, cy, cz] = onHead(17, -24, 0.97);
    const ch = new THREE.Mesh(new THREE.SphereGeometry(3.7, 12, 8), ink(C.rose));
    ch.scale.z = 0.45;
    ch.position.set(cx, cy, s * cz);
    skull.add(ch);

    // big round ear: pivot at its root (pins back / twitches about z)
    const pv = group(-4, 13, s * 8.5);
    const tilt = group(0, 0, 0);
    tilt.rotation.set(s * 0.25, s * 0.7, 0);
    tilt.add(mesh(new THREE.CylinderGeometry(20.5, 20.5, 2.4, 10).rotateX(PI / 2).scale(1, 1.04, 1), C.fur, 0, 18, 0));
    tilt.add(mesh(new THREE.CylinderGeometry(16.5, 16.5, 1, 10).rotateX(PI / 2).scale(1, 1.04, 1), C.pink, 0, 17.8, s * 1.3, { soft: true }));
    pv.add(tilt);
    skull.add(pv);
    ears.push(pv);

    // whiskers fan back and out from the snout
    const wg = group(26, -0.5, s * radiusAt(HEAD, 26) * 0.8);
    [[0.34, 15], [0.02, 16.5], [-0.3, 14]].forEach(([f, len]) => {
      const dir = new THREE.Vector3(-0.5, f, s * 0.85).normalize();
      wg.add(rod([0, 0, 0], dir.multiplyScalar(len).toArray(), 0.55, C.whisker, FLAT));
    });
    skull.add(wg);
    whiskers.push(wg);
  }

  // tail: seven tapering joints, drooping to the ground and curling up
  const TAIL = [0.35, 0.1, -0.2, -0.3, -0.3, -0.25, -0.2];
  const tail = [];
  let parent = torso;
  TAIL.forEach((a, i) => {
    const g = group(i ? -9 : -8, i ? 0 : 2, 0);
    const r0 = 3.3 - i * 0.34;
    const r1 = 3.3 - (i + 1) * 0.34;
    g.add(mesh(new THREE.CylinderGeometry(r1, r0, 9.4, 5).translate(0, 4.7, 0).rotateZ(PI / 2), C.tail));
    g.add(mesh(ball(r0 * 0.9, 0), C.tail));
    parent.add(g);
    parent = g;
    tail.push(g);
  });

  const rest = () => {
    const p = {
      by: 0, sit: 0, st: 0, hz: 0, hy: 0, eL: 0, eR: 0, es: 0, fl: 0, fl2: 0, hl: 0, hl2: 0, fp: 0, fp2: 0, hp: 0, hp2: 0, wt: 0, ws: 0,
    };
    TAIL.forEach((a, i) => { p[`z${i}`] = a; p[`u${i}`] = 0; });
    return p;
  };
  const apply = (p) => {
    root.position.y = p.by;
    torso.rotation.z = p.sit;
    bodyG.scale.x = 1 + p.st;
    head.position.x = 46 + 30 * p.st;
    head.rotation.z = p.hz;
    head.rotation.y = p.hy;
    front.forEach((f, i) => {
      const a = i ? p.fl : p.fl2;
      f.g.position.x = 44 + 22 * p.st;
      f.g.rotation.z = a;
      f.ankle.rotation.z = -(a + p.sit) + (i ? p.fp : p.fp2); // paws stay level on the ground
    });
    hind.forEach((h, i) => {
      const a = i ? p.hl : p.hl2;
      h.g.rotation.z = a;
      h.ankle.rotation.z = -a + (i ? p.hp : p.hp2);
    });
    ears[1].rotation.z = p.eL;
    ears[0].rotation.z = p.eR;
    for (const e of ears) e.scale.x = 1 - p.es; // pinned ears fold narrow
    whiskers.forEach((w, i) => {
      const s = i ? 1 : -1;
      w.rotation.x = s * p.wt;
      w.rotation.y = -s * p.ws;
    });
    tail.forEach((g, i) => { g.rotation.z = p[`z${i}`]; g.rotation.y = p[`u${i}`]; });
    tail[0].position.x = -8 - 30 * p.st;
  };

  let cur = null;
  let from = null;
  let blend = 1;
  let last = null;
  const play = (id, target, dt) => {
    if (last !== id) {
      if (cur && last !== null) { from = { ...cur }; blend = 0; }
      last = id;
    }
    if (blend < 1) {
      blend = Math.min(1, blend + (dt > 0 && dt < 0.2 ? dt : 0.2) / 0.2);
      const k = blend * blend * (3 - 2 * blend);
      cur = {};
      for (const key of Object.keys(target)) cur[key] = from[key] + (target[key] - from[key]) * k;
    } else cur = target;
    apply(cur);
  };

  // idle: sits up a little, breathing; ears and whiskers twitch, tail sways
  rig.anims.idle = (t, dt, ctx) => {
    const c = t + ctx.phase;
    const p = rest();
    p.sit = 0.075 + 0.035 * Math.sin(c * 1.1);
    p.hz = 0.04 + 0.04 * Math.sin(c * 1.1 + 0.9);
    p.hy = 0.14 * Math.sin(c * 0.47);
    p.fl = 0.3 + 0.08 * Math.sin(c * 1.1 + 0.4);
    p.fl2 = 0.36 + 0.08 * Math.sin(c * 1.1 + 0.9);
    p.eL = -0.3 * bump((c % 3.7) / 0.34);
    p.eR = -0.3 * bump(((c + 1.6) % 4.9) / 0.34);
    p.wt = 0.16 * Math.sin(c * 17) * win(c % 2.9, 0.4, 1.5, 0.25);
    TAIL.forEach((a, i) => {
      p[`z${i}`] = a + 0.07 * Math.sin(c * 1.5 - i * 0.7) * (i ? 1 : 0.4);
      p[`u${i}`] = 0.1 * Math.sin(c * 1.1 - i * 0.6);
    });
    play('idle', p, dt);
  };

  // sniff: nose bobbing at the ground, then head up — left? right? — "where
  // did it go?" — and back down. Loop 4.4 s.
  rig.anims.sniff = (t, dt, ctx) => {
    const tt = t + ctx.phase;
    const c = tt % 4.4;
    const up = win(c, 2.2, 4.25, 0.4);
    const down = 1 - up;
    const p = rest();
    p.sit = -0.04 * down + 0.1 * up;
    p.hz = -0.5 * down + 0.14 * up + 0.07 * Math.sin(tt * 15) * down;
    p.hy = up * 0.62 * Math.sin(((c - 2.2) / 2.05) * 2 * PI);
    p.fl = 0.55 * down + 0.32 * up;
    p.fl2 = p.fl;
    p.wt = 0.2 * Math.sin(tt * 24) * (0.35 + 0.65 * down);
    p.eL = -0.12 * up + 0.05 * Math.sin(tt * 15) * down;
    p.eR = -0.12 * up + 0.05 * Math.sin(tt * 15 + 1) * down;
    TAIL.forEach((a, i) => {
      p[`z${i}`] = a + 0.05 * Math.sin(tt * 2.2 - i * 0.7) * (i ? 1 : 0.4) - 0.05 * down * (i > 3 ? 1 : 0);
      p[`u${i}`] = 0.07 * Math.sin(tt * 2.9 - i * 0.6);
    });
    play('sniff', p, dt);
  };

  // run: a scamper in place — front and hind pairs gallop against each
  // other, the body stretches and bobs, ears pinned back, tail streaming
  rig.anims.run = (t, dt, ctx) => {
    const q = t * 2.7 * 2 * PI + ctx.phase;
    const p = rest();
    p.fl = 0.15 + 0.8 * Math.sin(q);
    p.fl2 = 0.15 + 0.8 * Math.sin(q - 0.5);
    p.hl = -0.05 - 0.75 * Math.sin(q - 0.3);
    p.hl2 = -0.05 - 0.75 * Math.sin(q - 0.8);
    p.fp = 0.35 * p.fl;
    p.fp2 = 0.35 * p.fl2;
    p.hp = 0.35 * p.hl;
    p.hp2 = 0.35 * p.hl2;
    p.st = 0.06 * Math.sin(q);
    p.by = 4 + 2.2 * Math.sin(q - 0.5);
    p.sit = 0.05 * Math.cos(q);
    p.hz = -0.06 - 0.05 * Math.cos(q);
    p.eL = 1.2 + 0.07 * Math.sin(q + 1);
    p.eR = 1.2 + 0.07 * Math.sin(q + 1.7);
    p.es = 0.3;
    p.ws = 0.35;
    p.wt = 0.05 * Math.sin(q * 2);
    TAIL.forEach((a, i) => {
      p[`z${i}`] = (i ? 0.02 : -0.14) + 0.13 * Math.sin(q - i * 0.9);
      p[`u${i}`] = 0;
    });
    play('run', p, dt);
  };

  const blink = blinker(rig.seed + 0.7);
  rig.anims.always = (t) => {
    const k = blink(t);
    for (const e of eyeballs) e.scale.y = Math.max(0.12, 1 - k);
  };
  apply(rest());
  rig.parts.head = head;
  rig.parts.tail = tail;
  rig.parts.ears = ears;
  rig.parts.legs = [...front.map((f) => f.g), ...hind.map((h) => h.g)];
});

// ── cheese — a fat wedge of holey cheese: tall rind end on the left, tip on
// the right; the cut faces carry real dents ──────────────────────────────
defineModel('cheese', (opts, rig) => {
  const D = 62; // depth
  const S = 6; // depth of the dents
  const s = wedgeShape(130, 100);
  const g = group(0, 0, 0);
  rig.body.add(g);
  g.add(mesh(extrude(s.body, D - S * 2), C.cheese, 0, 0, 0, FLAT));
  g.add(mesh(extrude(s.rind, D + 3), C.rind));
  const FRONT = [[-38, 57, 11], [-31, 21, 8], [-7, 39, 9.5], [13, 14, 6.5], [31, 20, 4.5], [-11, 12, 4], [-49, 37, 4], [-47, 78, 3.5]];
  const BACK = [[-40, 30, 10], [-25, 58, 7], [0, 25, 9], [24, 14, 6], [-49, 72, 4.5], [-16, 9, 3.5]];
  g.add(mesh(holed(s.body, FRONT, S), C.cheese, 0, 0, D / 2 - S, FLAT));
  g.add(mesh(holed(s.body, BACK, S), C.cheese, 0, 0, -D / 2, FLAT));
  for (const [x, y, r] of FRONT) {
    g.add(mesh(disc(r + 0.8, 12), C.hole, x, y, D / 2 - S + 0.4, FLAT));
    g.add(mesh(disc(r * 0.7, 12), C.holeLit, x + r * 0.2, y - r * 0.2, D / 2 - S + 0.8, FLAT));
  }
  for (const [x, y, r] of BACK) g.add(mesh(disc(r + 0.8, 12).rotateY(PI), C.hole, x, y, -D / 2 + S - 0.4, FLAT));
  // painted holes on the sloping top
  const ang = Math.atan(s.k);
  for (const [x, z, r] of [[8, 9, 7], [-30, -10, 9], [38, -8, 4.5], [-14, 16, 3.5]]) {
    const dn = dent(r, 0.45);
    dn.rotation.order = 'ZXY';
    dn.rotation.set(-PI / 2, 0, -ang);
    dn.position.set(x, s.top(x), z);
    g.add(dn);
  }
  // the glint: a four-point paper sparkle at the top corner
  const star = [];
  for (let i = 0; i < 8; i += 1) {
    const r = i % 2 ? 3.4 : 15;
    star.push([Math.cos((i * PI) / 4) * r, Math.sin((i * PI) / 4) * r]);
  }
  const glint = new THREE.Mesh(extrude(star, 0.8), ink(C.glow));
  glint.position.set(-50, 86, D / 2 + 4);
  glint.visible = false;
  g.add(glint);

  // rocking on its bottom corners keeps the wedge on the ground
  const rock = (a) => { g.rotation.z = a; g.position.y = 65 * Math.abs(Math.sin(a)) * g.scale.x; };
  rig.anims.idle = (t, dt, ctx) => {
    const c = t + ctx.phase;
    const b = 0.012 * Math.sin(c * 3.4 + 1);
    g.scale.set(1 - b, 1 + b, 1 - b);
    rock(0.03 * Math.sin(c * 1.7));
    const u = (c % 4.6) / 0.75;
    glint.visible = u < 1;
    if (u < 1) { glint.scale.setScalar(Math.sin(u * PI)); glint.rotation.z = u * 1.3; }
  };
  // hop: stretch tall on take-off, squash on landing — 0.6 s loop
  rig.anims.hop = (t) => {
    const c = ((t / 0.6) % 1) * 2 * PI;
    const sy = 1 + 0.2 * Math.sin(c);
    const sx = 1 / Math.sqrt(sy);
    g.scale.set(sx, sy, sx);
    rock(0.06 * Math.sin(c + 0.6));
    glint.visible = false;
  };
  rig.parts.wedge = g;
});

// ── cheeseCrumbs — where the cheese used to be: a wooden board, crumbs and
// one tiny leftover corner ───────────────────────────────────────────────
defineModel('cheeseCrumbs', (opts, rig) => {
  const root = group(-22, 0, 0);
  rig.body.add(root);
  const T = 22;
  root.add(mesh(new THREE.CylinderGeometry(1, 1, 1, 14).scale(150, T, 96).translate(0, T / 2, 0), C.board, 0, 0, 0, WOOD));
  root.add(mesh(new THREE.CylinderGeometry(1, 1, 1, 14).scale(138, 2, 86), C.boardDeep, 0, T + 0.2, 0, WOOD)); // worn middle
  root.add(mesh(box(56, T - 4, 44), C.board, 168, 2, 0, WOOD)); // handle
  root.add(mesh(new THREE.CylinderGeometry(9, 9, T - 3, 8), C.dark, 176, T / 2 - 0.1, 0)); // hanging hole
  const top = T + 1.2;
  const corner = miniWedge(84, 76, 40, [[-18, 30, 9], [8, 12, 5], [-12, 22, 7, true]]);
  corner.position.set(-52, top, -14);
  corner.rotation.y = -0.3;
  root.add(corner);
  const CR = [[18, 20, 9, 0.4], [44, -18, 6, 1.9], [70, 26, 7.5, 2.6], [96, -6, 5, 0.9], [8, -40, 6.5, 3.4], [-10, 46, 5, 5.1], [58, 52, 4.5, 4.2], [-104, 30, 6, 2.2], [112, 30, 4, 1.2]];
  CR.forEach(([x, z, r, a], i) => {
    const m = mesh(new THREE.TetrahedronGeometry(r * 1.5, 0).rotateY(a).rotateX(a * 1.7), i % 3 ? C.cheese : C.cheeseDeep);
    // rest the crumb on the board: lift by its own lowest vertex
    m.geometry.computeBoundingBox();
    m.position.set(x, top - m.geometry.boundingBox.min.y - 0.3, z);
    root.add(m);
  });
});

// ── mouseHole — a piece of wall: striped wallpaper over a skirting board,
// an arched mouse hole (dark inside) and a tiny doormat ───────────────────
defineModel('mouseHole', (opts, rig) => {
  const W = 138;
  const SK = 22; // skirting height
  const A = 13; // hole half-width
  const AY = 24; // arch springing
  const arch = (r, y0, n = 10) => {
    const pts = [];
    for (let i = 0; i <= n; i += 1) {
      const a = PI - (i / n) * PI;
      pts.push([Math.cos(a) * r, y0 + Math.sin(a) * r]);
    }
    return pts;
  };
  const notched = (w, h) => [[-w / 2, 0], [-A, 0], ...arch(A, AY), [A, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]];
  // back half: solid plaster; front half: wallpaper with the hole cut in
  rig.body.add(mesh(box(W, 100, 8), C.plaster, 0, 0, -4, PLASTER));
  rig.body.add(mesh(extrude(notched(W, 100), 8), C.sage, 0, 0, 4));
  rig.body.add(mesh(box(W + 1, 2, 17), C.cream, 0, 100 - 2, 0)); // capping
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(A * 2 + 4, AY + A + 2), ink(C.dark));
  inside.position.set(0, (AY + A + 2) / 2, 0.45);
  rig.body.add(inside);
  // wallpaper stripes
  for (const x of [-56, -40, -24, 24, 40, 56]) {
    rig.body.add(mesh(box(7, 98 - SK - 2, 0.5), C.sageLight, x, SK + 1, 8.2, FLAT));
  }
  rig.body.add(mesh(box(7, 98 - 44, 0.5), C.sageLight, -8, 44, 8.2, FLAT));
  rig.body.add(mesh(box(7, 98 - 44, 0.5), C.sageLight, 8, 44, 8.2, FLAT));
  // skirting: front (with the hole), returns and back
  for (const sd of [-1, 1]) {
    rig.body.add(mesh(box((W + 7) / 2 - A, SK, 3.5), C.cream, sd * ((W + 7) / 4 + A / 2), 0, 9.75, WOOD_FINE));
    rig.body.add(mesh(box(3.5, SK, 16), C.cream, sd * (W / 2 + 1.75), 0, 0, WOOD_FINE));
    rig.body.add(mesh(box((W + 7) / 2 - A - 2.4, 2.4, 5.5), C.ivory, sd * ((W + 7) / 4 + A / 2 + 1.2), SK, 10.75)); // lip
    rig.body.add(mesh(box(4.5, 2.4, 17), C.ivory, sd * (W / 2 + 1.75), SK, 0));
  }
  rig.body.add(mesh(box(W + 7, SK, 3.5), C.cream, 0, 0, -9.75, WOOD_FINE));
  rig.body.add(mesh(box(W + 8, 2.4, 4.5), C.ivory, 0, SK, -10.25));
  // arch trim around the hole
  const band = [[-A - 3.4, 0], [-A, 0], ...arch(A, AY), [A, 0], [A + 3.4, 0], ...arch(A + 3.4, AY).reverse()];
  rig.body.add(mesh(extrude(band, 5.5), C.ivory, 0, 0, 10.75));
  // doormat
  rig.body.add(mesh(box(34, 1.6, 15), C.mauve, 0, 0, 23, FABRIC));
  for (const z of [18.5, 27.5]) rig.body.add(mesh(box(34, 0.5, 1.6), C.cream, 0, 1.55, z, FLAT));
});

// ── cheeseSign — wooden post with an arrow board (cheese pictogram + "?")
// hanging on one nail; the board swings a little ─────────────────────────
defineModel('cheeseSign', (opts, rig) => {
  const root = group(-10, 0, 0);
  rig.body.add(root);
  root.add(mesh(box(6.5, 94, 6.5), C.wood, 0, 0, 0, WOOD_V));
  root.add(mesh(pyramid(4.6, 6, 4), C.woodDeep, 0, 94, 0));
  root.add(mesh(ball(4.6, 0).scale(1.25, 0.62, 1), '#9aa39a', 5.5, 1.6, 3.5));
  root.add(mesh(ball(3.6, 0).scale(1.2, 0.6, 1), '#aab2a8', -5, 1.2, -2.5));
  const swing = group(0, 80, 3.25);
  root.add(swing);
  const Y = -8.5; // board centre below the nail
  const pts = [[-30, Y - 12], [34, Y - 12], [50, Y], [34, Y + 12], [-30, Y + 12], [-23, Y]];
  swing.add(mesh(extrude(pts, 3), C.board, 0, 0, 1.5, WOOD));
  swing.add(mesh(cyl(1.4, 1.4, 1.2, 8).rotateX(PI / 2), C.slate, 0, 0, 3));
  swing.add(mesh(cyl(1.4, 1.4, 1.2, 8).rotateX(-PI / 2), C.slate, 34, Y, 0));
  const icons = (back) => {
    const z = back ? -0.05 : 3.05;
    const ch = group(-9, Y, z);
    ch.add(mesh(extrude([[-10, -6.5], [10, -6.5], [10, -4.8], [-10, 7]], 1), C.cheese, 0, 0, 0.45, FLAT));
    ch.add(mesh(disc(1.9, 10), C.hole, -5.5, -1.2, 1.4, FLAT));
    ch.add(mesh(disc(1.2, 10), C.hole, 1.5, -3.6, 1.4, FLAT));
    ch.add(mesh(disc(0.9, 10), C.hole, -7, 3.2, 1.4, FLAT));
    const qm = group(22, Y, z);
    qm.add(mesh(new THREE.TorusGeometry(3.7, 1.15, 4, 8, (PI * 4) / 3).rotateZ(-PI / 3), C.slate, 0, 3.2, 0.5));
    qm.add(mesh(beam(1.85, 0, 0, -3.4, 2.1, 1.8), C.slate, 0, 0, 0.5));
    qm.add(mesh(cbox(2.5, 2.5, 1.8), C.slate, 0, -7, 0.5));
    if (back) { ch.rotation.y = PI; qm.rotation.y = PI; }
    swing.add(ch, qm);
  };
  icons(false);
  icons(true);
  rig.anims.swing = (t, dt, ctx) => {
    const c = t + ctx.phase;
    swing.rotation.z = -0.045 + 0.05 * Math.sin(c * 1.4) + 0.012 * Math.sin(c * 3.3);
  };
  rig.anims.swing(0, 0, { phase: 0 });
  rig.parts.board = swing;
});

// ── mouseTrap — the classic: wooden board, coil spring, wire bail held down
// by the latch rod, a crumb of cheese on the pedal. Every few seconds the
// bail twitches as if about to snap ─────────────────────────────────────
defineModel('mouseTrap', (opts, rig) => {
  const BT = 16; // board thickness
  const PY = 27; // spring axis height
  const LB = 100; // bail length
  const EX = -143; // latch rod eyelet
  const EY = 21;
  rig.body.add(mesh(box(300, BT, 140), '#c8a476', 0, 0, 0, WOOD));
  for (const sz of [-1, 1]) {
    rig.body.add(mesh(new THREE.CylinderGeometry(9.5, 9.5, 30, 8).rotateX(PI / 2), C.steel, 0, PY, sz * 33, METAL));
    for (const dz of [-10, 0, 10]) rig.body.add(mesh(new THREE.CylinderGeometry(11, 11, 3.4, 8).rotateX(PI / 2), C.slate, 0, PY, sz * 33 + dz));
    rig.body.add(mesh(box(5, PY - BT, 4), C.slate, 0, BT, sz * 15.5)); // spring mounts
  }
  const bail = group(0, PY, 0);
  for (const sz of [-1, 1]) bail.add(mesh(cbox(LB, 4.5, 4.5), C.slate, -LB / 2, 0, sz * 51));
  bail.add(mesh(cbox(4.5, 4.5, 106.5), C.slate, -LB, 0, 0));
  rig.body.add(bail);
  // latch rod: hinged at the eyelet, always resting on the bail's cross bar
  rig.body.add(mesh(box(5, EY - BT + 2.5, 3), C.slate, EX - 1, BT, 4));
  rig.body.add(mesh(box(5, EY - BT + 2.5, 3), C.slate, EX - 1, BT, -4));
  const latch = group(EX, EY, 0);
  latch.add(mesh(cbox(172, 3, 3), C.steel, 86, 0, 0));
  rig.body.add(latch);
  // bait pedal, hinged at its far end
  const pedal = group(88, BT + 3, 0);
  pedal.add(mesh(cbox(56, 2.5, 40), C.boardDeep, -28, 0, 0, METAL));
  pedal.add(mesh(cbox(3, 12, 10), C.boardDeep, -54.5, 6, 0));
  const bait = miniWedge(62, 56, 30, [[-12, 22, 6.5], [6, 9, 4], [-10, 16, 5, true]]);
  bait.position.set(-22, 1.2, 0);
  bait.rotation.y = -0.35;
  pedal.add(bait);
  rig.body.add(mesh(box(5, 4, 44), C.slate, 88, BT, 0));
  rig.body.add(pedal);

  const TH0 = Math.asin((BT + 2.25 + 0.4 - PY) / LB); // bail resting on the board
  const pose = (lift) => {
    const th = TH0 + lift;
    bail.rotation.z = -th;
    const cx = -LB * Math.cos(th);
    const cy = PY + LB * Math.sin(th);
    latch.rotation.z = Math.atan2(cy + 3.9 - EY, cx - EX);
    pedal.rotation.z = -(0.1 + lift * 1.2);
  };
  rig.anims.idle = (t, dt, ctx) => {
    const u = ((t + ctx.phase) % 4.2) / 0.6;
    pose(u < 1 ? 0.11 * Math.sin(u * 2 * PI) ** 2 * (1 - 0.45 * u) : 0);
  };
  pose(0);
  rig.parts.bail = bail;
});

// ── cheeseCloche — an EMPTY cake stand under a thin glass dome; a little
// "moved" tag hangs from the knob and sways ──────────────────────────────
defineModel('cheeseCloche', (opts, rig) => {
  const STAND = [[0.01, 0], [19, 0], [19, 2.5], [9, 5.5], [4.5, 10], [4, 22], [7, 26.5], [30, 29.5], [40, 30.5], [40, 33], [0.01, 33]];
  rig.body.add(mesh(lathe(STAND, 12), C.cream));
  rig.body.add(mesh(cyl(40.6, 40.6, 1.3, 12), C.mauve, 0, 31.2, 0));
  rig.body.add(mesh(cyl(19.5, 19.5, 1.1, 12), C.mauve, 0, 0.6, 0));
  for (const [x, z, r, a] of [[-9, 6, 2.2, 0.5], [7, -4, 1.6, 2.1], [14, 10, 1.3, 4]]) {
    rig.body.add(mesh(new THREE.TetrahedronGeometry(r, 0).rotateY(a), C.cheese, x, 33 + r * 0.33, z));
  }
  const DOME = [[34, 33.2], [34.5, 52], [32, 65], [25, 77], [14, 85], [4, 88], [0.01, 88]];
  const glass = new THREE.MeshLambertMaterial({
    color: '#e3f0ec', transparent: true, opacity: 0.3, depthWrite: false, flatShading: true, vertexColors: true,
  });
  rig.body.add(new THREE.Mesh(facet(lathe(DOME, 12), 0.05), glass));
  rig.body.add(mesh(lathe([[33.3, 33.05], [34.9, 33.05], [34.9, 34.6], [33.3, 34.6], [33.3, 33.05]], 12), '#c3d5cf'));
  // paper highlights on the upper left of the glass
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
  const streak = (pts, phi, len) => {
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r + 0.5, y)), 1, phi, len);
    rig.body.add(new THREE.Mesh(g, shine));
  };
  streak([[34.5, 50], [32, 65], [27, 74.5]], -0.82, 0.2);
  streak([[34.4, 44], [34.5, 52], [33.2, 59]], -0.52, 0.09);
  rig.body.add(mesh(cyl(1.9, 2.8, 4, 8), C.mauveDeep, 0, 87.6, 0));
  rig.body.add(mesh(ball(4.6, 1), C.mauve, 0, 95.3, 0));

  // the tag's string: tied round the knob, over the dome's shoulder
  const PHI = 0.16;
  const at = (r, y) => [(r + 0.6) * Math.sin(PHI), y, (r + 0.6) * Math.cos(PHI)];
  const path = [[2.2, 90.4], [4.5, 88.6], [14, 85.5], [25, 77.5], [32, 65.5], [34.9, 56]];
  for (let i = 0; i < path.length - 1; i += 1) rig.body.add(rod(at(...path[i]), at(...path[i + 1]), 0.7, '#8a7a66', FLAT));
  const hang = group(...at(35.2, 56));
  hang.rotation.y = PHI;
  const sway = group(0, 0, 0);
  hang.add(sway);
  sway.add(rod([0, 0, 0], [-8, -7.4, 0], 0.7, '#8a7a66', FLAT));
  sway.add(rod([0, 0, 0], [8, -7.4, 0], 0.7, '#8a7a66', FLAT));
  sway.add(mesh(cbox(25, 13, 0.8), C.ivory, 0, -13.5, 0));
  // the word on the tag (canvas made here, inside the build)
  const cv = document.createElement('canvas');
  cv.width = 400;
  cv.height = 208;
  const g2 = cv.getContext('2d');
  if (g2) {
    g2.fillStyle = '#f2ede2';
    g2.fillRect(0, 0, 400, 208);
    g2.strokeStyle = '#b5544d';
    g2.lineWidth = 8;
    g2.strokeRect(14, 14, 372, 180);
    g2.fillStyle = '#4b5654';
    g2.font = 'italic bold 104px Georgia, "Times New Roman", serif';
    g2.textAlign = 'center';
    g2.textBaseline = 'middle';
    g2.fillText('moved', 200, 108);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(25, 13), new THREE.MeshLambertMaterial({ map: tex, emissive: '#2b2927' }));
  label.position.set(0, -13.5, 0.85);
  sway.add(label);
  rig.body.add(hang);
  rig.anims.idle = (t, dt, ctx) => {
    const c = t + ctx.phase;
    sway.rotation.z = 0.13 * Math.sin(c * 1.6) + 0.03 * Math.sin(c * 3.7 + 1);
  };
  rig.parts.tag = sway;
});

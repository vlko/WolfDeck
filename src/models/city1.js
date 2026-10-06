import * as THREE from 'three';
import { defineModel } from './registry.js';
import * as K from './kit.js';
import { tieredTree } from './trees.js';

// Models for the pieces on the city 1 sheet: faceted towers, townhouses, the
// chapel, cone and potted park trees, street furniture, cars, the bus and the
// animal townsfolk. Measured off a 10 × 10 grid over each sprite (gx across,
// gy down); 1 unit = 1 % of the sprite's height.

const { mesh, inkMesh, fold, foldPanel, box, cbox, beam, group, eyes, cheek, blinker, PI } = K;

function grid(aspect) {
  return {
    X: (gx) => (gx / 10 - 0.5) * aspect,
    Y: (gy) => 100 - gy * 10,
    S: (g) => (g / 10) * aspect,
    P: (pts) => pts.map(([gx, gy]) => [(gx / 10 - 0.5) * aspect, 100 - gy * 10]),
  };
}

const WOOD_FINE = { tex: 'woodFine' };
const BOARDS = { tex: 'boards' };
const PLASTER = { tex: 'plaster' };
const SHINGLE = { tex: 'shingle' };
const BRICK = { tex: 'brick' };
const FABRIC = { tex: 'fabric' };
const METAL = { tex: 'metal' };
const FUR = { tex: 'fur' };
const LEAF = { tex: 'leaf' };
const DOOR = { tex: 'woodFine', texRotate: true }; // one door leaf: fine grain running up
const BARK = { tex: 'bark' };

const LIT = '#f3e6bf';
const litMat = new THREE.MeshBasicMaterial({ color: LIT });

// ── faceted towers ─────────────────────────────────────────────────────────
// outline: silhouette polygon (grid); windows: [gx0, gx1, gy0, gy1, lit];
// door: [gx0, gx1, gy0]. The front is folded down the middle; lit windows
// flick on and off now and then — somebody is home.
function tower(name, aspect, { outline, windows, door, wall, dark = '#26312e', doorColor = '#2b3532', depth = 0.62, ridge = 0.07 }) {
  defineModel(name, (opts, rig) => {
    const { X, Y, S, P } = grid(aspect);
    const D = aspect * depth;
    const R = aspect * ridge;
    const geo = fold(P(outline), D, R, { cx: 0 });
    rig.body.add(mesh(geo, wall, 0, 0, 0, PLASTER));
    const darkMat = K.ink(dark);
    const panes = [];
    for (const [g0, g1, y0, y1, lit] of windows) {
      const w = S(g1 - g0);
      const h = Y(y0) - Y(y1);
      const p = new THREE.Mesh(foldPanel(geo, X(g0), X(g0) + w, Y(y1), Y(y1) + h, 0.35), lit ? litMat : darkMat);
      p.userData.lit = !!lit;
      rig.body.add(p);
      panes.push(p);
    }
    if (door) {
      const [g0, g1, y0] = door;
      const d = new THREE.Mesh(foldPanel(geo, X(g0), X(g1), 0, Y(y0), 0.35), K.ink(doorColor));
      rig.body.add(d);
    }
    // windows flick on/off: every ~2.5 s one pane toggles
    let next = 1.5 + (rig.seed % 3);
    let n = rig.seed * 7 + 3;
    rig.anims.always = (t) => {
      if (t < next || !panes.length) return;
      next = t + 1.8 + ((n * 37) % 23) / 10;
      n += 1;
      const p = panes[(n * 13) % panes.length];
      p.userData.lit = !p.userData.lit;
      p.material = p.userData.lit ? litMat : darkMat;
    };
  });
}

const L = 1;
const D0 = 0;

tower('towerSmallA', 57.7, {
  wall: '#c2cdc0',
  outline: [[1.5, 0], [8.4, 0], [10, 6.9], [9.4, 10], [0.6, 10], [0, 6.9]],
  windows: [[5.6, 7.5, 2.4, 3.7, L], [0.7, 2.6, 4.6, 5.9, L], [5.6, 7.5, 4.6, 5.9, L]],
  door: [3.1, 6.2, 7.1],
});
tower('towerSmallB', 57.5, {
  wall: '#c2cdc0',
  outline: [[1.5, 0], [8.4, 0], [10, 6.9], [9.4, 10], [0.6, 10], [0, 6.9]],
  windows: [[5.6, 7.5, 2.4, 3.7, L], [0.7, 2.6, 4.6, 5.9, L], [5.6, 7.5, 4.6, 5.9, D0]],
  door: [3.1, 6.2, 7.1],
});
{
  const rows = [[1.0, 1.9], [2.5, 3.3], [3.9, 4.7], [5.3, 6.1], [6.6, 7.5]];
  const left = [D0, L, L, D0, L];
  const right = [L, L, D0, D0, D0];
  tower('towerTall', 38.4, {
    wall: '#c0cbc3',
    outline: [[1.0, 0], [8.6, 0], [9.6, 3.7], [8.5, 10], [1.0, 10], [0.0, 3.7]],
    windows: rows.flatMap(([a, b], i) => [[1.0, 2.8, a, b, left[i]], [5.5, 7.4, a, b, right[i]]]),
    door: [3.3, 6.3, 8.0],
  });
}
{
  const rows = [[0.8, 1.6], [2.0, 2.9], [3.3, 4.1], [4.6, 5.4], [5.8, 6.6], [7.0, 7.8]];
  tower('towerSage', 35.4, {
    wall: '#bfcbbf',
    outline: [[0.5, 0], [8.2, 0], [9.9, 4.0], [8.6, 10], [0.6, 10], [0.0, 4.0]],
    windows: rows.flatMap(([a, b], i) => [[1.0, 2.8, a, b, [0, 1, 0, 1, 0, 1][i]], [5.6, 7.5, a, b, [0, 0, 1, 1, 1, 0][i]]]),
    door: [2.8, 6.0, 8.2],
  });
  tower('towerMauve', 35.4, {
    wall: '#b89ca0', dark: '#2a2324', doorColor: '#3b1d14',
    outline: [[0.5, 0], [8.2, 0], [9.9, 4.0], [8.6, 10], [0.6, 10], [0.0, 4.0]],
    windows: rows.flatMap(([a, b], i) => [[1.0, 2.8, a, b, [1, 0, 0, 0, 0, 0][i]], [5.6, 7.5, a, b, [0, 0, 1, 0, 0, 0][i]]]),
    door: [2.5, 5.2, 8.0],
  });
}
tower('towerSpire', 34.8, {
  wall: '#e3dbbd', dark: '#4a3410', doorColor: '#5a4518', ridge: 0.08,
  outline: [[4.9, 0], [10, 5.4], [9.5, 10], [0.5, 10], [0, 5.4]],
  windows: [[3.4, 5.7, 1.8, 2.6, D0], [3.4, 5.7, 3.2, 4.0, D0], [1.6, 3.3, 4.5, 5.3, D0], [5.6, 7.5, 4.5, 5.3, D0],
    [1.6, 3.3, 5.7, 6.5, L], [5.6, 7.5, 5.7, 6.5, D0], [1.6, 3.3, 6.9, 7.7, D0], [5.6, 7.5, 6.9, 7.7, D0]],
  door: [3.4, 6.3, 8.2],
});

// ── signalPole — striped way-mark post with three pairs of dark fins ──────
defineModel('signalPole', (opts, rig) => {
  const { X, Y, S } = grid(39.8);
  // stripes: a flush stack of segments, each sheared the same way, so the
  // colour boundaries run as clean continuous diagonals round the post
  const band = (y0, y1, w, colors) => {
    const n = Math.max(2, Math.round((y1 - y0) / 13));
    const h = (y1 - y0) / n;
    for (let i = 0; i < n; i += 1) {
      const g = new THREE.BoxGeometry(w, h, w * 0.9);
      const pp = g.attributes.position;
      const yc = y0 + h * (i + 0.5);
      for (let k = 0; k < pp.count; k += 1) {
        const yy = pp.getY(k) + yc;
        // shear, but keep the very bottom and top of the band flat
        const sh = (yy <= y0 + 0.01 || yy >= y1 - 0.01) ? 0 : pp.getX(k) * 0.85;
        pp.setY(k, pp.getY(k) + sh);
      }
      rig.body.add(mesh(g, colors[i % 2], 0, yc, 0));
    }
  };
  band(0, Y(5.0), S(2.6), ['#e1d2a6', '#26302f']);
  band(Y(5.0), 100, S(4.1), ['#d2b675', '#26302f']);
  // fins
  const fins = [];
  for (const gy of [0.7, 2.2, 3.7]) {
    const f = group(0, Y(gy), 0);
    for (const s of [-1, 1]) {
      const tri = fold([[0, 0], [s * S(5), 0], [s * S(2.0), -S(1.6)]].map(([x, y]) => [x, y]), 4, 1);
      f.add(mesh(tri, '#2f3e3f'));
    }
    rig.body.add(f);
    fins.push(f);
  }
  rig.anims.always = (t, dt, ctx) => {
    fins.forEach((f, i) => { f.rotation.y = Math.sin(t * 0.8 + i + ctx.phase) * 0.12; });
  };
});

// ── townhouses — cream walls, slate roof, sage awning, chimney ─────────────
// Continuous gabled roof seen end-on: ONE extruded ⋀ band (no seam or
// groove at the ridge). Outer apex (apexX, apexY), outer eaves at
// apexX ± halfSpan / eaveY, slab thickness t (perpendicular), depth d.
function roofSolid(apexX, apexY, halfSpan, eaveY, t, d) {
  const rise = apexY - eaveY;
  const drop = t / Math.cos(Math.atan2(rise, halfSpan)); // vertical thickness
  const s = new THREE.Shape();
  s.moveTo(-halfSpan, 0);
  s.lineTo(0, rise);
  s.lineTo(halfSpan, 0);
  s.lineTo(halfSpan, -drop);
  s.lineTo(0, rise - drop);
  s.lineTo(-halfSpan, -drop);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false })
    .translate(apexX, eaveY, -d / 2);
}

// The roof resting ON a gable (half-width hw, base baseY, apex apexY, centred
// on cx): same pitch as the gable, inner face just above it, so the walls
// never poke through; overhang past the walls, thickness t, depth d.
function roofOver(cx, hw, baseY, apexY, overhang, t, d, lift = 0.3) {
  const k = (apexY - baseY) / hw;
  const drop = t * Math.sqrt(1 + k * k);
  const span = hw + overhang;
  const outer = apexY + lift + drop;
  return roofSolid(cx, outer, span, outer - k * span, t, d);
}

function townhouse(name, { window: [wg0, wg1, wy0, wy1, wcol], lower, chimney, scallop }) {
  defineModel(name, (opts, rig) => {
    const { X, Y, S } = grid(66.7);
    const D = 46;
    const front = D / 2;
    const cream = '#efece2';
    rig.body.add(mesh(box(S(8.8), Y(4.3), D), cream, X(5.0), 0, 0, PLASTER));
    rig.body.add(mesh(K.gable(S(8.8), Y(0.7) - Y(4.3), D).translate(0, Y(4.3), 0), cream, X(5.0), 0, 0, PLASTER));
    // slate roof: one continuous ⋀ from the apex down to the eaves
    rig.body.add(mesh(roofOver(X(5.0), S(4.4), Y(4.3), Y(0.7), S(0.7), 6, D + 8), '#53635e', 0, 0, 0, SHINGLE));
    rig.body.add(mesh(box(S(1.0), 19, 9), '#3a2c1b', X(chimney), Y(2.2), -6, BRICK));
    rig.body.add(mesh(box(S(1.5), 2.4, 11), '#5a4a35', X(chimney), Y(2.2) + 19, -6));
    // gable window
    const win = wcol === 'lit' ? new THREE.Mesh(new THREE.PlaneGeometry(S(wg1 - wg0), Y(wy0) - Y(wy1)), litMat)
      : inkMesh(new THREE.PlaneGeometry(S(wg1 - wg0), Y(wy0) - Y(wy1)), wcol);
    win.position.set((X(wg0) + X(wg1)) / 2, (Y(wy0) + Y(wy1)) / 2, front + 0.5);
    rig.body.add(win);
    // awning: a sage slab tipping forward, dark edge (scalloped on B)
    const aw = group(X(5.0), Y(5.7), front);
    aw.add(mesh(box(S(9.4), 1, 1).scale(1, 7, 10).translate(0, -7, 5), '#a3b2a5', 0, 0, 0, FABRIC));
    aw.children[0].rotation.x = 0.35;
    aw.add(mesh(cbox(S(9.4), 3.2, 2), '#4f695e', 0, -7.2, 8.6, FABRIC));
    if (scallop) {
      for (let i = 0; i < 9; i += 1) {
        const sc = mesh(new THREE.CylinderGeometry(S(0.52), S(0.52), 1.6, 10, 1, false, 0, PI).rotateX(PI / 2).rotateZ(PI), '#4f695e', -S(4.7) + S(9.4) * (i + 0.5) / 9, -8.6, 8.8);
        aw.add(sc);
      }
    }
    rig.body.add(aw);
    // ground floor: window + door
    for (const [kind, g0, g1] of lower) {
      const x = (X(g0) + X(g1)) / 2;
      if (kind === 'win') {
        rig.body.add(inkMesh(new THREE.PlaneGeometry(S(g1 - g0), Y(7.1) - Y(8.8)), '#4a3a26', x, (Y(7.1) + Y(8.8)) / 2, front + 0.5));
        rig.body.add(mesh(cbox(S(g1 - g0) + 2, 1.6, 2), '#d9d3c4', x, Y(8.8) - 0.8, front + 1));
      } else {
        rig.body.add(mesh(box(S(g1 - g0), Y(7.1), 1.4), '#5a4321', x, 0, front + 0.7, WOOD_FINE));
        rig.body.add(inkMesh(new THREE.SphereGeometry(1.3, 8, 6), '#d8c9a0', x - S((g1 - g0) * 0.3) * (kind === 'doorR' ? 1 : -1), Y(8.6), front + 1.8));
      }
    }
    const sm = K.smoke(X(chimney), Y(0) + 1, -6, { size: 2.2, rise: 22 });
    rig.body.add(sm.group);
    rig.anims.always = (t) => sm.update(t);
  });
}
townhouse('townhouseA', { window: [3.9, 5.6, 2.5, 3.8, 'lit'], lower: [['win', 1.3, 3.0], ['doorR', 5.4, 7.6]], chimney: 2.5 });
townhouse('townhouseB', { window: [4.0, 5.6, 2.6, 3.8, '#2b1a10'], lower: [['doorL', 1.2, 3.3], ['win', 5.4, 7.4]], chimney: 7.3, scallop: true });

// ── chapel — steep mauve A-frame with cream roof edges ─────────────────────
defineModel('chapel', (opts, rig) => {
  const { X, Y, S, P } = grid(55.3);
  const D = 50;
  const front = D / 2;
  const wall = fold(P([[0.8, 10], [0.8, 6.0], [4.9, 0.6], [9.2, 6.0], [9.2, 10]]), D, 3.5, { cx: X(4.95) });
  rig.body.add(mesh(wall, '#9b7a72', 0, 0, 0, PLASTER));
  // mauve roof as one continuous ⋀, a cream bargeboard ⋀ trimming its front
  rig.body.add(mesh(roofOver(X(4.9), S(4.2), Y(6.0), Y(0.6), S(0.45), 5, D + 6), '#8c6a64', 0, 0, 0, SHINGLE));
  rig.body.add(mesh(roofOver(X(4.9), S(4.2), Y(6.0), Y(0.6), S(0.55), 6.5, 3, 1.2), '#f1e9da', 0, 0, D / 2 + 4.5));
  const fz = wall.userData.zAt(X(4.95)) - 1.5;
  rig.body.add(mesh(cbox(S(5.0), Y(6.6) - Y(7.1), 6), '#caa9a2', X(5.05), (Y(6.6) + Y(7.1)) / 2, fz + 2));
  // the door: dark doorway that swings open now and then
  // dark doorway laid on the fold's half-planes (a flat plane would let
  // the wall's crease poke through it); the leaf hangs just proud of the crease
  rig.body.add(new THREE.Mesh(foldPanel(wall, X(5.0) - S(1.7), X(5.0) + S(1.7), 0, Y(7.1), 0.35), K.ink('#1f0d08')));
  const leaf = group(X(3.3), 0, fz + 2.4);
  leaf.add(mesh(box(S(3.4), Y(7.1) - 1, 1.2).translate(S(1.7), 0, 0), '#5e3530', 0, 0, 0, DOOR));
  rig.body.add(leaf);
  rig.anims.always = (t, dt, ctx) => {
    const c = (t + ctx.phase * 3) % 11;
    leaf.rotation.y = c < 3 ? -Math.sin((c / 3) * PI) * 1.1 : 0;
  };
});

// ── coneTreeSlate — tall two-stage slate cone ──────────────────────────────
tieredTree('coneTreeSlate', { aspect: 50.0, trunk: [4.4, 5.4, '#3b311c'], tiers: [
  [0, 0, 4.4, 1.7, '#a9b8ad'], [4.3, 1.7, 8.1, 4.9, '#5f6e6d']] });

// ── streetlamp — slim dark post, globe lamp ───────────────────────────────
defineModel('streetlamp', (opts, rig) => {
  const { Y, S } = grid(19.7);
  rig.body.add(mesh(K.cyl(S(2.4), S(2.6), Y(7.2), 6), '#3f3526', 0, 0, 0, METAL));
  rig.body.add(mesh(K.cyl(S(0.7), S(0.7), Y(2.0) - Y(7.2), 6).translate(0, Y(7.2), 0), '#5a4a2a', 0, 0, 0, METAL));
  const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(S(4.6), 2), new THREE.MeshBasicMaterial({ color: '#fff3c6' }));
  globe.position.y = Y(1.3);
  rig.body.add(globe);
  rig.body.add(mesh(K.cyl(S(1.2), S(1.6), 2.2, 6).translate(0, Y(2.3) - 1, 0), '#3f3526'));
  rig.body.add(mesh(K.cyl(S(0.5), S(1.1), 2, 6).translate(0, Y(0.3), 0), '#3f3526'));
  rig.anims.always = (t, dt, ctx) => {
    globe.material.color.setHSL(0.13, 1, 0.88 + Math.sin(t * 3.1 + ctx.phase) * 0.02);
  };
});

// ── busStop — post with a framed sign showing a little bus ────────────────
defineModel('busStop', (opts, rig) => {
  const { X, Y, S } = grid(32.0);
  rig.body.add(mesh(box(S(0.9), Y(2.3), S(0.9)), '#2f3a36', X(4.9), 0, 0, METAL));
  const sign = group(X(5.0), Y(1.15), 0);
  sign.add(mesh(cbox(S(9.6), Y(0) - Y(2.3), 3), '#506c64', 0, 0, 0, METAL));
  sign.add(mesh(cbox(S(8.0), Y(0.3) - Y(2.0), 1), '#f2ecdc', 0, 0, 1.6));
  const bus = group(0, 0.5, 2.3);
  bus.add(inkMesh(new THREE.PlaneGeometry(S(6), 7), '#33433f'));
  for (let i = 0; i < 4; i += 1) bus.add(inkMesh(new THREE.PlaneGeometry(S(1.0), 2.6), '#f2ecdc', -S(2.2) + S(1.45) * i, 1.4, 0.05));
  for (const s of [-1, 1]) bus.add(inkMesh(new THREE.CircleGeometry(1.6, 10), '#33433f', s * S(1.8), -3.6, 0.04));
  sign.add(bus);
  rig.body.add(sign);
  rig.anims.always = (t, dt, ctx) => { sign.rotation.z = Math.sin(t * 1.3 + ctx.phase) * 0.01; };
});

// ── hydrant — octagonal red-mauve hydrant with side nozzles ────────────────
defineModel('hydrant', (opts, rig) => {
  const { Y, S } = grid(57.3);
  const body = '#87595c';
  const light = '#b18c8a';
  rig.body.add(mesh(K.cyl(S(3.5), S(3.5), Y(9.2), 8), '#7b4d50', 0, 0, 0, METAL));
  rig.body.add(mesh(K.cyl(S(2.4), S(2.4), Y(3.4) - Y(9.2), 8).translate(0, Y(9.2), 0), body, 0, 0, 0, METAL));
  rig.body.add(mesh(K.cyl(S(3.4), S(3.4), Y(2.6) - Y(3.4), 8).translate(0, Y(3.4), 0), light, 0, 0, 0, METAL));
  rig.body.add(mesh(new THREE.SphereGeometry(S(2.6), 8, 5, 0, PI * 2, 0, PI / 2).scale(1, 0.75, 1).translate(0, Y(2.6), 0), light, 0, 0, 0, METAL));
  rig.body.add(mesh(K.cyl(S(0.4), S(0.45), 6, 6).translate(0, Y(2.6) + S(2.6) * 0.75 - 1, 0), light));
  for (const s of [-1, 1]) {
    rig.body.add(mesh(new THREE.CylinderGeometry(S(0.6), S(0.6), S(2.2), 8).rotateZ(PI / 2), '#6e3f43', s * S(3.4), Y(5.2), 0));
    rig.body.add(mesh(new THREE.CylinderGeometry(S(0.8), S(0.8), 1.5, 8).rotateZ(PI / 2), '#5a2f33', s * S(4.6), Y(5.2), 0));
  }
});

// ── animal townsfolk ───────────────────────────────────────────────────────
// Shared idle: breathing, a slow sway, blinking, ear flicks, and now and then
// a little wave of a paw. parts: { torso, head?, ears[], paws[], tail?, ey }.
function townsfolkIdle(rig, parts, { wagAmp = 0.25, tailYaw = 0 } = {}) {
  const blink = blinker(rig.seed * 1.7 + 0.4);
  rig.anims.always = (t) => {
    parts.ey?.blink(blink(t));
    parts.ears?.forEach((e, i) => {
      const c = (t + rig.seed * 1.1 + i * 2.3) % (5 + i * 1.3);
      e.rotation.z = c < 0.28 ? Math.sin((c / 0.28) * PI) * 0.35 * (i ? -1 : 1) : 0;
    });
    if (parts.tail) parts.tail.rotation.y = tailYaw + Math.sin(t * 2.4 + rig.seed) * wagAmp;
  };
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2.1 + ctx.phase);
    parts.torso.scale.set(1 - b * 0.006, 1 + b * 0.014, 1);
    if (parts.head) {
      parts.head.rotation.z = Math.sin(t * 0.6 + ctx.phase) * 0.06;
      parts.head.rotation.y = Math.sin(t * 0.37 + ctx.phase) * 0.18;
    } else {
      parts.torso.rotation.z = Math.sin(t * 0.6 + ctx.phase) * 0.03;
    }
    // a wave every ~9 s
    const c = (t + ctx.phase * 4) % 9;
    const p = parts.paws?.[1];
    if (p) p.rotation.z = c < 1.6 ? (Math.min(1, c / 0.3, (1.6 - c) / 0.3)) * (1.9 + Math.sin(c * 14) * 0.3) * p.userData.side : 0;
    const hop = (t + ctx.phase * 2.7) % 7.3;
    parts.torso.position.y = hop < 0.4 ? Math.sin((hop / 0.4) * PI) * 4 : 0;
  };
}

// Big round "bean" folk (badger, wolfHead): a lathed body with a gray
// muzzle stripe, dot eyes, rosy cheeks, ears on top and stubby side paws.
function bean(name, aspect, o) {
  defineModel(name, (opts, rig) => {
    const { X, Y, S } = grid(aspect);
    const torso = group(0, 0, 0);
    rig.body.add(torso);
    const prof = o.profile.map(([g, gy]) => [S(g), Y(gy)]);
    const rAt = (y) => {
      for (let i = 0; i < prof.length - 1; i += 1) {
        const [r0, y0] = prof[i];
        const [r1, y1] = prof[i + 1];
        if ((y >= y0 && y <= y1) || (y <= y0 && y >= y1)) return r0 + ((y - y0) / (y1 - y0 || 1)) * (r1 - r0);
      }
      return 0;
    };
    const ZS = 0.72;
    const bodyMesh = mesh(K.lathe(prof, 24).scale(1, 1, ZS), o.body, 0, 0, 0, FUR);
    torso.add(bodyMesh);
    // exact front surface: cast a ray onto the faceted body, so face decals
    // (stripe, cheeks, nose, eyes) sit ON it — never sunk into a facet
    bodyMesh.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    const zf = (x, y) => {
      ray.set(new THREE.Vector3(x, y, 500), new THREE.Vector3(0, 0, -1));
      const hit = ray.intersectObject(bodyMesh, false)[0];
      return hit ? hit.point.z : ZS * Math.sqrt(Math.max(rAt(y) ** 2 - x * x, 0));
    };
    // places a decal on the surface, facing along the surface normal
    const onFace = (m, x, y, lift = 0.6) => {
      const z = zf(x, y);
      const n = new THREE.Vector3(zf(x - 1, y) - zf(x + 1, y), zf(x, y - 1) - zf(x, y + 1), 2).normalize();
      m.position.set(x, y, z).addScaledVector(n, lift);
      m.lookAt(m.position.clone().add(n));
      torso.add(m);
      return m;
    };
    // muzzle stripe (raised folded wedge)
    const [m0, m1, mt, mtip] = o.muzzle; // gx left/right at top gy mt, tip gy
    // a finely subdivided triangle draped over the face (every vertex sits
    // on the surface, a soft crease down the middle) — follows the curve
    // everywhere instead of cutting into it between three corners
    const wedge = (() => {
      const rows = 16;
      const cols = 8;
      const cx = X((m0 + m1) / 2);
      const hw0 = (X(m1) - X(m0)) / 2;
      const pos = [];
      const idx = [];
      for (let r = 0; r <= rows; r += 1) {
        const k = r / rows;
        const y = Y(mt) + (Y(mtip) - Y(mt)) * k;
        const hw = hw0 * (1 - k);
        for (let c = 0; c <= cols; c += 1) {
          const u = c / cols * 2 - 1;
          const x = cx + u * hw;
          pos.push(x, y, zf(x, y) + 0.7 + (1 - Math.abs(u)) * 1.6 * (1 - k * 0.5));
        }
      }
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const i0 = r * (cols + 1) + c;
          const i1 = i0 + cols + 1;
          idx.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1); // counter-clockwise from the front
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      return g;
    })();
    torso.add(mesh(wedge, o.muzzleColor));
    const [nx, ny, nr] = o.nose;
    onFace(inkMesh(new THREE.SphereGeometry(S(nr), 14, 8).scale(1, 1, 0.5), '#121212'), X(nx), Y(ny), 2.2);
    // eyes
    const ey = eyes(Math.abs(X(o.eyes[0]) - X(o.eyes[1])) / 2, S(o.eyes[3]) * 1.45);
    ey.group.position.set((X(o.eyes[0]) + X(o.eyes[1])) / 2, Y(o.eyes[2]), zf(X(o.eyes[0]), Y(o.eyes[2])) + 0.5);
    torso.add(ey.group);
    for (const g of [o.cheeks[0], o.cheeks[1]]) onFace(cheek(S(o.cheeks[3]), o.cheekColor), X(g), Y(o.cheeks[2]), 1.1);
    // ears (pivots at the base)
    const ears = o.ears.map(([g, gy, kind], i) => {
      const e = group(X(g), Y(gy), 0);
      if (kind === 'round') {
        // half-sunk disc ear with a dark inner fold
        e.add(mesh(new THREE.CylinderGeometry(S(1.0), S(1.0), 7, 14).rotateX(PI / 2), o.earColor, 0, 0, 0, FUR));
        const inner = inkMesh(new THREE.CircleGeometry(S(0.62), 3), '#3f5249', 0, S(0.18), 3.6);
        inner.rotation.z = PI / 2;
        e.add(inner);
      } else {
        // right-triangle ear, outer edge upright (as printed)
        const s = i ? 1 : -1;
        const tri = fold([[-S(1.0), 0], [S(1.0), 0], [s * S(1.0), Y(0) - Y(o.earTop ?? 2.0)]], 6, 1.8);
        e.add(mesh(tri, o.earColor, 0, 0, 0, FUR));
      }
      torso.add(e);
      return e;
    });
    // stubby side paws (shoulder pivots) — they wave
    const paws = [-1, 1].map((s) => {
      const r0 = rAt(Y(o.pawGy));
      // shoulder sunk into the body's side, a little forward of center
      const p = group(s * r0 * 0.86, Y(o.pawGy), zf(r0 * 0.86, Y(o.pawGy)) * 0.55);
      p.add(mesh(new THREE.SphereGeometry(1, 10, 8).scale(S(0.62), S(0.95), S(0.6)).translate(s * S(0.15), -S(0.7), 0), o.pawColor, 0, 0, 0, FUR));
      p.userData.side = s;
      torso.add(p);
      return p;
    });
    for (const g of o.feet) rig.body.add(mesh(box(S(0.7), Y(9.7) + 2, S(0.8)), '#1d201c', X(g), 0, 6));
    townsfolkIdle(rig, { torso, ears, paws, ey });
  });
}

bean('badger', 94.4, {
  body: '#ece9dc', muzzleColor: '#93a395', earColor: '#5d7268', pawColor: '#d9d2bd', cheekColor: '#d29a85',
  profile: [[0, 9.7], [3.0, 9.65], [4.3, 9.2], [4.9, 8.0], [5.0, 6.5], [4.5, 4.0], [3.8, 1.6], [0, 1.5]],
  muzzle: [3.4, 6.6, 1.6, 7.4], nose: [5.0, 7.45, 0.55], eyes: [2.65, 7.35, 4.95, 0.22], cheeks: [1.5, 8.5, 6.3, 1.35],
  ears: [[2.25, 1.75, 'round'], [7.75, 1.75, 'round']], pawGy: 7.0, feet: [4.1, 5.75],
});
bean('wolfHead', 89.4, {
  body: '#ece9dc', muzzleColor: '#97a597', earColor: '#2d4642', pawColor: '#d9d2bd', cheekColor: '#d39f8b',
  profile: [[0, 9.6], [3.0, 9.55], [4.3, 9.1], [4.9, 7.8], [5.0, 6.4], [4.5, 4.0], [3.7, 2.0], [0, 1.9]],
  // symmetric about the center line (gx 5) — the printed head is
  muzzle: [3.3, 6.7, 2.0, 7.5], nose: [5.0, 7.6, 0.6], eyes: [2.7, 7.3, 5.2, 0.2], cheeks: [1.25, 8.75, 6.6, 1.3],
  ears: [[2.0, 2.05, 'point'], [7.95, 2.05, 'point']], earTop: 2.1, pawGy: 7.0, feet: [3.9, 5.55],
});

// Block folk (bearDog, fox): a folded block body, a head block on a neck
// pivot, a snout poking out to one side, a big rosy eye patch, a fan tail
// from the rump and little forepaws.
function blockFolk(name, aspect, o) {
  defineModel(name, (opts, rig) => {
    const { X, Y, S, P } = grid(aspect);
    const D = S(o.depth);
    const torso = group(0, 0, 0);
    rig.body.add(torso);
    const cx = X((o.x0 + o.x1) / 2);
    const bodyGeo = fold(P([[o.x0, o.neck], [o.x1, o.neck], [o.x1, o.bottom], [o.x0, o.bottom]]), D, 3, { cx });
    torso.add(mesh(bodyGeo, o.color, 0, 0, 0, FUR));
    // the paler folded bib on the lower body
    const bib = fold(P(o.bib), 2, 2.4, { cx: X(o.bib[1][0]) });
    torso.add(mesh(bib, o.bibColor, 0, 0, bodyGeo.userData.zAt(X(o.bib[1][0])) - 1.2, FUR));
    const head = group(cx, Y(o.neck), 0);
    torso.add(head);
    const HP = (pts) => P(pts).map(([x, y]) => [x - cx, y - Y(o.neck)]);
    const headGeo = fold(HP([[o.x0, o.top], [o.x1, o.top], [o.x1, o.neck], [o.x0, o.neck]]), D, 3, { cx: 0 });
    head.add(mesh(headGeo, o.color, 0, 0, 0, FUR));
    const hz = headGeo.userData.zAt;
    const hx = (g) => X(g) - cx;
    const hy = (gy) => Y(gy) - Y(o.neck);
    // ears
    const ears = o.ears.map(([g, kind]) => {
      const e = group(hx(g), hy(o.top), -D * 0.1);
      if (kind === 'round') e.add(mesh(new THREE.CylinderGeometry(S(0.75), S(0.75), 6, 12).rotateX(PI / 2).translate(0, S(0.3), 0), o.earColor, 0, 0, 0, FUR));
      else e.add(mesh(fold([[-S(0.9), 0], [S(0.9), 0], [0, S(1.4)]], 5, 1.5), o.earColor, 0, 0, 0, FUR));
      head.add(e);
      return e;
    });
    // The sheet draws this head in profile (snout to one side, one eye).
    // In 3D it faces the viewer: a square snout pyramid pointing +z from the
    // middle of the face, the black nose on its tip, and TWO eyes on rosy
    // patches, one on each half of the folded face.
    const [sy] = o.snout;
    const hw = (X(o.x1) - X(o.x0)) / 2;
    const sl = S(o.snoutLen ?? 1.9);
    // a soft rounded muzzle (paler) with a round nose button on its front
    const mr = S(1.25);
    const snout = group(0, hy(sy) - S(0.35), hz(0) - mr * 0.35);
    snout.add(mesh(new THREE.SphereGeometry(1, 12, 8).scale(mr * 1.15, mr * 0.85, mr * 0.95), o.muzzleColor ?? o.bibColor));
    const noseB = inkMesh(new THREE.SphereGeometry(1, 12, 8).scale(S(0.42), S(0.32), S(0.28)), '#151311', 0, mr * 0.35, mr * 0.88);
    snout.add(noseB);
    head.add(snout);
    void sl;
    const [, ey0, er] = o.eye;
    const eyeDx = hw * 0.5;
    const tilt = Math.atan2(3, hw); // the fold's half-plane slope (ridge 3)
    const ey = eyes(eyeDx, S(0.33));
    for (const side of [-1, 1]) {
      const patch = cheek(S(er) * 0.72, '#d9917e');
      patch.position.set(side * eyeDx, hy(ey0), hz(side * eyeDx) + 0.35);
      patch.rotation.y = side * tilt;
      head.add(patch);
    }
    ey.group.position.set(0, hy(ey0), 0);
    ey.group.children.forEach((e) => {
      const side = Math.sign(e.position.x);
      e.position.z = hz(e.position.x) + 0.9;
      e.rotation.y = side * tilt;
    });
    head.add(ey.group);
    // feet + forepaws
    for (const [g0, g1] of o.feet) torso.add(mesh(box(S(g1 - g0), Y(o.bottom) + 2, S(1.4)), '#4a3214', X((g0 + g1) / 2), 0, D * 0.25));
    const paws = o.paws.map(([g, s]) => {
      // rounded forepaws hanging from shoulders sunk into the chest's corners
      const ex = s < 0 ? X(o.x0) : X(o.x1); // the body's side edge
      const p = group(ex - s * S(0.15), Y(o.pawGy), D * 0.12);
      p.add(mesh(new THREE.CapsuleGeometry(S(0.5), S(1.0), 3, 8).translate(s * S(0.25), -S(0.95), 0), o.pawColor, 0, 0, 0, FUR));
      p.userData.side = s;
      torso.add(p);
      return p;
    });
    // tail from the rump; yaw wraps it round to where the sheet shows it
    const tail = group(X(o.tail.x), Y(o.tail.gy), -D / 2 + 2);
    tail.rotation.order = 'YXZ';
    tail.rotation.x = o.tail.pitch;
    const along = (g, from) => g.translate(0, from + g.parameters.height / 2, 0).rotateX(-PI / 2);
    tail.add(mesh(along(new THREE.CylinderGeometry(S(1.1), S(0.6), S(1.8), 4), 0).scale(0.8, 1, 1), o.tail.color, 0, 0, 0, FUR));
    tail.add(mesh(along(new THREE.ConeGeometry(S(1.1), S(1.6), 4), S(1.8)).scale(0.8, 1, 1), o.tail.tip, 0, 0, 0, FUR));
    torso.add(tail);
    townsfolkIdle(rig, { torso, head, ears, paws, ey, tail }, { tailYaw: o.tail.yaw, wagAmp: 0.22 });
  });
}

blockFolk('bearDog', 73.3, {
  color: '#cfb17d', earColor: '#6e4a1c', pawColor: '#b8955f', depth: 4.6,
  x0: 1.3, x1: 7.4, top: 1.0, neck: 5.3, bottom: 9.05,
  ears: [[2.35, 'round'], [6.3, 'round']], snout: [4.2, -1], eye: [3.35, 3.45, 1.3],
  feet: [[2.2, 3.5], [5.1, 6.3]], paws: [[2.6, -1], [6.1, 1]], pawGy: 6.4,
  tail: { x: 6.6, gy: 7.6, yaw: -2.1, pitch: 0.75, color: '#a7843f', tip: '#c5a668' },
  bib: [[2.0, 9.05], [4.6, 6.4], [6.0, 9.05]], bibColor: '#e3cf9f',
});
blockFolk('fox', 70.0, {
  color: '#d2b47e', earColor: '#5a2a0c', pawColor: '#bc9c63', depth: 4.6,
  x0: 2.9, x1: 9.0, top: 1.3, neck: 5.1, bottom: 9.1,
  ears: [[3.9, 'point'], [8.2, 'point']], snout: [4.35, -1], eye: [7.85, 3.55, 1.2],
  feet: [[3.6, 4.6], [6.9, 7.9]], paws: [[4.2, -1], [7.8, 1]], pawGy: 6.3,
  tail: { x: 3.6, gy: 8.4, yaw: 2.15, pitch: 0.55, color: '#c9aa72', tip: '#efe2c4' },
  bib: [[3.2, 9.1], [5.9, 6.2], [8.7, 9.1]], bibColor: '#e6d4a8',
});

// ── cone trees ──────────────────────────────────────────────────────────────
tieredTree('coneTreeSage', { aspect: 37.0, trunk: [2.6, 7.3, '#8b6a3a'], tiers: [
  [0, 0, 6.0, 3.5, '#c6d1c6'], [5.9, 3.5, 8.6, 5.0, '#9aab9a']] });
tieredTree('coneTreeMauve', { aspect: 37.0, trunk: [4.3, 5.6, '#2a2116'], tiers: [
  [0, 0, 6.0, 3.4, '#c2aaa9'], [5.9, 3.4, 8.6, 4.9, '#a07f80']] });

// ── potted park trees ──────────────────────────────────────────────────────
// pot: [rimX0, rimX1, rimTop, rimBottom, bodyX0, bodyX1, bodyBottomInset]
// crowns(grid helpers) → array of { obj, y } hung on the trunk's top joint.
function potted(name, aspect, { pot, potColor = '#6e5a3e', rimColor = '#8c7559', trunk, crown }) {
  defineModel(name, (opts, rig) => {
    const g = grid(aspect);
    const { X, Y, S } = g;
    const [r0, r1, rt, rb, b0, b1, inset] = pot;
    const pw = S(b1 - b0);
    rig.body.add(mesh(new THREE.CylinderGeometry(pw / 2, pw / 2 - S(inset), Y(rb), 4).rotateY(PI / 4).scale(1, 1, 0.75).translate(X((b0 + b1) / 2), Y(rb) / 2, 0), potColor));
    rig.body.add(mesh(cbox(S(r1 - r0), Y(rt) - Y(rb), pw * 0.8), rimColor, X((r0 + r1) / 2), (Y(rt) + Y(rb)) / 2, 0));
    // trunk joint: the crown sways from the pot up
    const [t0, t1, ttop] = trunk;
    const joint = group(X((t0 + t1) / 2), Y(rt), 0);
    joint.add(mesh(box(S(t1 - t0), Y(ttop) - Y(rt), S(t1 - t0)), '#4a3a24', 0, 0, 0, BARK));
    rig.body.add(joint);
    const top = group(0, Y(ttop) - Y(rt), 0);
    joint.add(top);
    crown(g, top, joint, Y(ttop), X((t0 + t1) / 2));
    rig.anims.sway = (t, dt, ctx) => {
      joint.rotation.z = Math.sin(t * 0.9 + ctx.phase) * 0.018;
      top.rotation.z = Math.sin(t * 1.1 + ctx.phase + 0.6) * 0.03;
      top.rotation.y = Math.sin(t * 0.5 + ctx.phase) * 0.12;
    };
  });
}

// A crooked branch from (x0,y0) to (x1,y1) in the crown's local frame.
const branch = (x0, y0, x1, y1, w) => mesh(beam(x0, y0, x1, y1, w, w), '#4a3a24', 0, 0, 0, BARK);

potted('potConeSlate', 30.7, {
  pot: [1.6, 8.3, 8.0, 8.7, 2.0, 7.8, 0.6], trunk: [4.0, 5.6, 7.4],
  crown: ({ Y, S }, top, joint, ty) => {
    const lower = new THREE.CylinderGeometry(S(2.4), S(4.5), Y(5.0) - Y(7.4), 4).translate(0, (Y(5.0) - Y(7.4)) / 2, 0);
    top.add(mesh(lower, '#576872', 0, 0, 0, LEAF));
    top.add(mesh(new THREE.ConeGeometry(S(2.4), Y(0) - Y(5.0), 4).translate(0, Y(5.0) - Y(7.4) + (Y(0) - Y(5.0)) / 2, 0), '#6b7a84', 0, 0, 0, LEAF));
  },
});
potted('potTreeHex', 44.6, {
  pot: [1.0, 8.6, 7.9, 8.5, 1.2, 8.4, 0.4], trunk: [4.6, 5.4, 5.8],
  crown: ({ X, Y, S }, top, joint, ty, tx) => {
    const ly = (gy) => Y(gy) - ty;
    const lx = (gx) => X(gx) - tx;
    top.add(branch(0, 0, lx(1.3), ly(4.7), 2.6), branch(lx(1.3), ly(4.7), lx(1.0), ly(4.4), 2.6));
    top.add(branch(0, 0, lx(8.7), ly(4.7), 2.6), branch(lx(8.7), ly(4.7), lx(8.9), ly(4.4), 2.6));
    top.add(mesh(box(S(0.8), ly(4.4), S(0.8)), '#4a3a24', 0, 0, 0, BARK));
    const c = mesh(new THREE.DodecahedronGeometry(1, 0).scale(S(4.9), (Y(0.2) - Y(4.6)) / 2, S(3.6)), '#aabaab', 0, (ly(0.2) + ly(4.6)) / 2, 0, LEAF);
    top.add(c);
  },
});
potted('potTreeTrio', 75.7, {
  pot: [3.1, 6.8, 8.0, 8.6, 3.3, 6.6, 0.3], trunk: [4.7, 5.3, 5.8],
  crown: ({ X, Y, S }, top, joint, ty, tx) => {
    const ly = (gy) => Y(gy) - ty;
    const lx = (gx) => X(gx) - tx;
    top.add(mesh(box(S(0.6), ly(2.8), S(0.6)), '#4a3a24', 0, 0, 0, BARK));
    top.add(branch(0, 0, lx(2.6), ly(4.6), 2.4), branch(lx(2.6), ly(4.6), lx(1.6), ly(3.8), 2.4));
    top.add(branch(0, 0, lx(7.6), ly(4.6), 2.4), branch(lx(7.6), ly(4.6), lx(8.3), ly(3.8), 2.4));
    top.add(mesh(new THREE.IcosahedronGeometry(1, 1).scale(S(1.9), 17, S(1.9)), '#a7b8aa', lx(5.0), ly(1.6), 0, LEAF));
    top.add(mesh(new THREE.OctahedronGeometry(1, 0).scale(S(1.45), 14, S(1.2)).rotateZ(0.1), '#8a9f84', lx(1.35), ly(3.1), 0, LEAF));
    top.add(mesh(new THREE.OctahedronGeometry(1, 0).scale(S(1.45), 14, S(1.2)).rotateZ(-0.1), '#56706f', lx(8.25), ly(3.1), 0, LEAF));
  },
});
potted('potGemTree', 56.9, {
  pot: [2.6, 7.6, 7.4, 8.3, 3.0, 7.2, 0.4], trunk: [4.4, 5.4, 6.0], potColor: '#6a5841', rimColor: '#8e7a5f',
  crown: ({ Y, S }, top) => {
    const mid = Y(3.5) - Y(6.0);
    top.add(mesh(new THREE.ConeGeometry(S(5.0), Y(3.5) - Y(6.0), 6).rotateX(PI).translate(0, mid / 2, 0), '#5f6f76', 0, 0, 0, LEAF));
    top.add(mesh(new THREE.ConeGeometry(S(5.0), Y(0) - Y(3.5), 6).translate(0, mid + (Y(0) - Y(3.5)) / 2, 0), '#7d8d97', 0, 0, 0, LEAF));
  },
});

// ── vehicles ───────────────────────────────────────────────────────────────
// Drawn in side profile on the sheet; here they get a real track width and
// four wheels. Front = +x. The catalog drives them: it spins
// rig.parts.wheels (local z = axle) and yaws the body round for U-turns.

// One wheel: dark faceted tire + pale hub + a bolt so the spin shows.
function wheel(r, w, x, y, z) {
  const g = group(x, y, z);
  g.add(mesh(new THREE.CylinderGeometry(r, r, w, 12).rotateX(PI / 2), '#2a302c'));
  const side = Math.sign(z) || 1;
  g.add(mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, w + 1, 8).rotateX(PI / 2), '#9aa49c'));
  g.add(inkMesh(new THREE.CircleGeometry(r * 0.12, 6), '#4a524d', 0, r * 0.62, side * (w / 2 + 0.3)));
  if (side < 0) g.children[2].rotation.y = PI;
  return g;
}

// Rounded side-profile outline: a box from (x0,y0) to (x1,y1) with corner radii.
function roundRect(x0, y0, x1, y1, [rbl, rbr, rtr, rtl]) {
  const s = new THREE.Shape();
  s.moveTo(x0 + rbl, y0);
  s.lineTo(x1 - rbr, y0);
  if (rbr) s.quadraticCurveTo(x1, y0, x1, y0 + rbr);
  s.lineTo(x1, y1 - rtr);
  if (rtr) s.quadraticCurveTo(x1, y1, x1 - rtr, y1);
  s.lineTo(x0 + rtl, y1);
  if (rtl) s.quadraticCurveTo(x0, y1, x0, y1 - rtl);
  s.lineTo(x0, y0 + rbl);
  if (rbl) s.quadraticCurveTo(x0, y0, x0 + rbl, y0);
  return s;
}
const slab = (shape, d) => new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 1.2, bevelSegments: 1, curveSegments: 5 }).translate(0, 0, -d / 2);



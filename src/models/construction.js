import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, box, cbox, beam, group, eyes, cheek, blinker, fold, PI,
} from './kit.js';

// Models for the pieces on construction.png (generated from
// docs/prompts/missing-objects.md, prompt #1): tower crane, excavator, two
// rollers, scaffolding, cones, barriers, bricks, a cement mixer and two bear
// builders. Coordinates are read off a 10 × 10 grid laid over each sprite.

function grid(aspect) {
  return {
    X: (gx) => (gx / 10 - 0.5) * aspect,
    Y: (gy) => 100 - gy * 10,
    S: (g) => (g / 10) * aspect,
  };
}

const C = {
  yellow: '#d8bb72', yellowDeep: '#b8974f', sand: '#dcc79a', olive: '#a9a27a',
  dark: '#363a34', darkSoft: '#4c524c', glass: '#2f3a35', hub: '#d8ceb3',
  steel: '#5b6359', plank: '#7a5d40', ladder: '#6a4e33',
  orange: '#c48558', white: '#e4dfcc', coneBase: '#3d2c1d',
  brick: '#d7b98b', brickDeep: '#c19c6c', frame: '#7b5a3a',
};

// material textures (see assets/materialTextures.js)
const METAL = { tex: 'metal' };
const PLANKS = { tex: 'planks' };
const WOOD = { tex: 'wood' };
const CONCRETE = { tex: 'concrete' };
const BOARDS = { tex: 'boards' };
const WOOD_FINE = { tex: 'woodFine' };
const FABRIC = { tex: 'fabric' };
const FUR = { tex: 'fur' };
const BRICK = { tex: 'brick', texScale: 0.35 };

// A road wheel / drum: tyre + hub with a bolt (so turning shows), axle on z.
function wheel(r, w, tyre = C.dark, hub = C.hub) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(r, r, w, 14).rotateX(PI / 2), tyre));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, w + 0.8, 10).rotateX(PI / 2), hub));
  g.add(mesh(cbox(r * 0.16, r * 0.16, w + 1.4), C.darkSoft, r * 0.25, r * 0.18, 0));
  return g;
}

// A flat decal (patch of color) lying on a folded surface: the polygon is
// drawn in xy and pushed onto the surface with the geometry's zAt(x).
function patch(pts, zAt, color, lift = 0.35, opts = {}) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 1) p.setZ(i, zAt(p.getX(i)) + lift);
  return mesh(g, color, 0, 0, 0, opts);
}

// Lattice truss between two points in the xy plane (chords on the front and
// back faces, zig-zag braces), thickness t, depth d. Returns a Group.
function truss(x1, y1, x2, y2, h, d, color, braceColor = color, opts = {}) {
  const g = new THREE.Group();
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(2, Math.round(len / h));
  const inner = new THREE.Group();
  for (const z of [-d / 2, d / 2]) {
    inner.add(mesh(cbox(len, 2, 2).translate(len / 2, h / 2, z), color, 0, 0, 0, opts));
    inner.add(mesh(cbox(len, 2, 2).translate(len / 2, -h / 2, z), color, 0, 0, 0, opts));
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * len;
      const b = ((i + 1) / n) * len;
      inner.add(mesh(i % 2 ? beam(a, -h / 2, b, h / 2, 1.4, 1.4) : beam(a, h / 2, b, -h / 2, 1.4, 1.4), braceColor, 0, 0, z));
    }
  }
  // cross ties between the two faces
  for (let i = 0; i <= n; i += 1) inner.add(mesh(cbox(1.4, 1.4, d), braceColor, (i / n) * len, h / 2, 0));
  inner.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  inner.position.set(x1, y1, 0);
  g.add(inner);
  return g;
}

// ── crane — tower crane: lattice mast, slewing jib, counter-jib, ties, hook ─
// (the sprite's quarry mound and little digger are separate props)
defineModel('crane', (opts, rig) => {
  const { X, Y } = grid(77.7);
  const mx = X(3.85);
  const m = 4; // half mast width
  const jibY = Y(2.5);
  // concrete foot
  rig.body.add(mesh(box(20, 5, 20), '#8f938a', mx, 0, 0, CONCRETE));
  // mast: four posts + braces on all four faces
  for (const [x, z] of [[-m, -m], [m, -m], [-m, m], [m, m]]) rig.body.add(mesh(box(2.2, jibY, 2.2), C.yellow, mx + x, 0, z, METAL));
  for (let y = 5, i = 0; y < jibY - 4; y += 8, i += 1) {
    const y2 = Math.min(y + 8, jibY - 2);
    for (const z of [-m, m]) {
      rig.body.add(mesh(i % 2 ? beam(-m, y, m, y2, 1.4, 1.4) : beam(m, y, -m, y2, 1.4, 1.4), C.yellowDeep, mx, 0, z));
    }
    for (const x of [-m, m]) {
      const b = mesh(i % 2 ? beam(-m, y, m, y2, 1.4, 1.4) : beam(m, y, -m, y2, 1.4, 1.4), C.yellowDeep, mx + x, 0, 0);
      b.rotation.y = PI / 2;
      rig.body.add(b);
    }
  }
  // slewing top, pivot on the mast axis
  const top = group(mx, jibY, 0);
  rig.body.add(top);
  top.add(mesh(box(11, 5, 11), C.yellowDeep, 0, -2, 0, METAL)); // slewing ring
  // jib to the left, counter-jib to the right (as printed)
  const jibL = X(0.1) - mx;
  const cjR = X(9.6) - mx;
  top.add(truss(0, 3, jibL, 3, 5, 5, C.yellow, C.yellowDeep, METAL));
  top.add(truss(0, 3, cjR, 3, 5, 5, C.yellow, C.yellowDeep, METAL));
  // A-frame tower head and tie cables to both ends
  const apex = Y(0) - jibY;
  for (const z of [-2.5, 2.5]) {
    top.add(mesh(beam(-m, 0, 0, apex, 2, 2), C.yellow, 0, 0, z));
    top.add(mesh(beam(m, 0, 0, apex, 2, 2), C.yellow, 0, 0, z));
  }
  top.add(mesh(beam(0, apex, jibL + 3, 6, 0.6, 0.6), C.dark));
  top.add(mesh(beam(0, apex, cjR - 3, 6, 0.6, 0.6), C.dark));
  // cab under the jib root
  top.add(mesh(box(8, 7, 8), C.sand, 6, -7, 5, METAL));
  top.add(mesh(box(5, 4, 0.6), C.glass, 6.5, -5, 9.5)); // proud of the cab front (no z-fight)
  // counterweight block at the right end
  top.add(mesh(box(7, 9, 7), C.darkSoft, cjR - 4, -8, 0, CONCRETE));
  // trolley runs on the jib; cable + hook block hang from it
  const trolley = group(jibL + 6, 0, 0);
  top.add(trolley);
  trolley.add(mesh(box(5, 2.5, 7), C.dark, 0, -1.5, 0, METAL));
  const cable = mesh(cbox(1.2, 1, 1.2), C.dark);
  trolley.add(cable);
  const hook = group(0, -20, 0);
  hook.add(mesh(box(3.6, 5, 3), C.dark, 0, -5, 0, METAL));
  for (const x of [-0.9, 0.9]) hook.add(mesh(cbox(0.5, 4, 0.5), C.darkSoft, x, -7, 0));
  const hk = mesh(new THREE.TorusGeometry(1.8, 0.6, 5, 10, PI * 1.35), C.dark, 0, -10.5, 0);
  hk.rotation.z = PI * 0.95;
  hook.add(hk);
  trolley.add(hook);
  rig.anims.idle = (t, dt, ctx) => {
    top.rotation.y = Math.sin(t * 0.16 + ctx.phase) * 0.7;
    trolley.position.x = jibL + 10 + (Math.sin(t * 0.27 + ctx.phase) * 0.5 + 0.5) * (Math.abs(jibL) - 16);
    const drop = 18 + (Math.sin(t * 0.43 + ctx.phase * 2) * 0.5 + 0.5) * 22;
    hook.position.y = -drop;
    hook.rotation.z = Math.sin(t * 1.3) * 0.04;
    cable.scale.y = drop;
    cable.position.y = -drop / 2;
  };
});




// ── scaffold — steel tube frame, two plank decks, ladders, a hoist hook ───
defineModel('scaffold', (opts, rig) => {
  const { X, Y } = grid(92.6);
  const D = 34;
  const posts = [0.15, 4.6, 9.5];
  for (const gx of posts) {
    for (const z of [-D / 2, D / 2]) rig.body.add(mesh(box(2.2, Y(0.2), 2.2), gx === 4.6 ? C.dark : C.steel, X(gx), 0, z, METAL));
  }
  // rails, decks
  for (const gy of [1.1, 4.78, 8.2]) { // (4.78: the lower deck rests on it)
    for (const z of [-D / 2, D / 2]) rig.body.add(mesh(cbox(X(9.5) - X(0.15), 1.6, 1.6), C.steel, 0, Y(gy), z, METAL));
  }
  for (const [gy, x0, x1] of [[0.9, 1.2, 8.8], [4.6, 0.8, 8.0]]) {
    for (let i = 0; i < 3; i += 1) {
      rig.body.add(mesh(box(X(x1) - X(x0) + i * 3, 2, D / 3 - 0.6), i % 2 ? C.plank : '#86694a', (X(x0) + X(x1)) / 2, Y(gy) - 1, -D / 3 + i * (D / 3), PLANKS));
    }
  }
  // cross braces on the front face
  rig.body.add(mesh(beam(X(0.15), Y(4.9), X(4.6), Y(1.1), 1.2, 1.2), C.steel, 0, 0, D / 2 + 1));
  rig.body.add(mesh(beam(X(4.6), Y(3.2), X(9.5), Y(1.1), 1.2, 1.2), C.steel, 0, 0, D / 2 + 1));
  rig.body.add(mesh(beam(X(0.15), Y(9.9), X(9.5), Y(5.2), 1.2, 1.2), C.steel, 0, 0, D / 2 + 1));
  // ladders
  const ladder = (x0, y0, x1, y1, w, z) => {
    const g = new THREE.Group();
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (const s of [-w / 2, w / 2]) g.add(mesh(cbox(1.4, len, 1.4).translate(s, len / 2, 0), C.ladder, 0, 0, 0, WOOD));
    for (let y = 4; y < len - 1; y += 5) g.add(mesh(cbox(w, 1, 1), C.ladder, 0, y, 0, WOOD));
    g.position.set(x0, y0, z);
    g.rotation.z = -Math.atan2(x1 - x0, y1 - y0);
    return g;
  };
  rig.body.add(ladder(X(3.1), 0, X(1.9), Y(4.7), 8, D / 2 + 3));
  rig.body.add(ladder(X(5.95), Y(4.7), X(5.95), Y(1.0), 6, D / 2 - 3));
  rig.body.add(ladder(X(7.95), 0, X(7.95), Y(4.7), 6, D / 2 - 3));
  // hoist arm + rope with a swinging bucket (right post)
  rig.body.add(mesh(box(8, 1.4, 1.4), C.steel, X(9.5) + 4, Y(2.6), D / 2));
  const rope = group(X(9.5) + 7.4, Y(2.6), D / 2);
  rope.add(mesh(cbox(0.5, 14, 0.5).translate(0, -7, 0), C.dark));
  rope.add(mesh(new THREE.CylinderGeometry(2.6, 2, 4, 8).translate(0, -16, 0), C.frame, 0, 0, 0, BOARDS)); // a wooden stave bucket
  rig.body.add(rope);
  rig.anims.idle = (t, dt, ctx) => { rope.rotation.z = Math.sin(t * 1.4 + ctx.phase) * 0.1; };
});

// ── cones — three printed variants, one recipe ───────────────────────────
function coneModel(name, aspect, { bands, base }) {
  defineModel(name, (opts, rig) => {
    const W = aspect;
    const baseH = base;
    rig.body.add(mesh(box(W * 0.96, baseH, W * 0.96), C.coneBase));
    const R = W * 0.37;
    const H = 100 - baseH;
    const rAt = (k) => 1.2 + (R - 1.2) * (1 - k); // k: 0 bottom … 1 tip
    for (const [k0, k1, col] of bands) {
      const g = k1 >= 0.999
        ? new THREE.ConeGeometry(rAt(k0), (k1 - k0) * H, 12)
        : new THREE.CylinderGeometry(rAt(k1), rAt(k0), (k1 - k0) * H, 12);
      rig.body.add(mesh(g.translate(0, baseH + ((k0 + k1) / 2) * H, 0), col));
    }
  });
}
const ORANGE = C.orange;
coneModel('trafficCone', 65.7, { base: 5, bands: [[0, 0.42, ORANGE], [0.42, 0.68, C.white], [0.68, 1, ORANGE]] });
coneModel('trafficCone2', 65.7, { base: 5, bands: [[0, 0.42, '#c99067'], [0.42, 0.68, '#e6e1cf'], [0.68, 1, '#c99067']] });
coneModel('trafficCone3', 71.9, { base: 6, bands: [[0, 0.42, '#ad6d47'], [0.42, 0.68, '#d2cbb1'], [0.68, 1, '#b7794f']] });

// ── barriers ──────────────────────────────────────────────────────────────
// A striped board on two legs with little feet.
function stripedBoard(name, aspect, { boardTop, boardBottom, legs, stripes, a, b }) {
  defineModel(name, (opts, rig) => {
    const { X, Y } = grid(aspect);
    const D = 6;
    const bw = X(10) - X(0);
    const bh = Y(boardTop) - Y(boardBottom);
    const n = stripes;
    for (let i = 0; i < n; i += 1) {
      // stripes butt together; every other one is a hair thicker so no two
      // faces ever share a plane (no flickering seams)
      rig.body.add(mesh(box(bw / n, bh - (i % 2 ? 0 : 0.6), D + (i % 2 ? 0.8 : 0)), i % 2 ? a : b, X(0) + (i + 0.5) * (bw / n), Y(boardBottom) + (i % 2 ? 0 : 0.3), 0, WOOD_FINE));
    }
    for (const gx of legs) {
      rig.body.add(mesh(box(3, Y(boardBottom), 3), C.dark, X(gx), 0, -1));
      rig.body.add(mesh(box(12, 2.5, 14), C.dark, X(gx), 0, -1));
    }
  });
}
stripedBoard('stripedBarrier', 203.2, { boardTop: 0.2, boardBottom: 5.6, legs: [1.7, 9.0], stripes: 11, a: '#c4875c', b: '#e2dcc6' });
stripedBoard('barrierLow', 192.2, { boardTop: 0.2, boardBottom: 4.3, legs: [0.6, 9.4], stripes: 9, a: '#b9774c', b: '#d9d3ba' });

// Road barrier: a dark rail with yellow flashes over a dark panel, two legs.
defineModel('roadBarrier', (opts, rig) => {
  const { X, Y, S } = grid(249.2);
  const D = 6;
  rig.body.add(mesh(box(S(10), Y(0) - Y(1.7), D), C.dark, 0, Y(1.7), 0, METAL));
  for (const [x0, x1] of [[0.1, 3.1], [6.2, 9.9]]) rig.body.add(mesh(box(S(x1 - x0), 2.4, 0.6), '#d5c07f', (X(x0) + X(x1)) / 2, Y(0.9) - 1.2, D / 2 + 0.2));
  rig.body.add(mesh(box(S(8.6), Y(3.7) - Y(8.2), D), C.darkSoft, X(4.6), Y(8.2), 0, METAL));
  for (const gx of [3.1, 8.3]) {
    rig.body.add(mesh(box(2.4, Y(1.7), 2.4), '#1f241f', X(gx), 0, -D / 2 - 1.2));
    rig.body.add(mesh(box(12, 2, 12), '#1f241f', X(gx), 0, -D / 2 - 1.2));
  }
});

// ── bricks — a stepped pallet stack of paper bricks ──────────────────────
defineModel('bricks', (opts, rig) => {
  const { S } = grid(163.6);
  const bw = S(1.85);
  const bh = 18;
  const D = 30;
  const rows = [6, 5, 3, 1];
  rows.forEach((n, r) => {
    const x0 = -((n - 1) / 2) * bw - r * 4;
    for (let i = 0; i < n; i += 1) {
      const col = (i + r) % 3 === 0 ? C.brickDeep : (i + r) % 3 === 1 ? C.brick : '#cfae80';
      rig.body.add(mesh(box(bw - 1.2, bh - 1, D - (r % 2) * 4), col, x0 + i * bw, r * bh, 0, BRICK));
    }
  });
});


// ── characters ────────────────────────────────────────────────────────────

// Arm: shoulder pivot with a chunky sleeve and a round paw.
function arm(len, w, sleeve, paw, sleeveOpts = {}) {
  const g = new THREE.Group();
  g.add(mesh(cbox(w, len, w * 0.9).translate(0, -len / 2, 0), sleeve, 0, 0, 0, sleeveOpts));
  g.add(mesh(new THREE.SphereGeometry(w * 0.62, 10, 8), paw, 0, -len - 1, 0));
  return g;
}

// foremanBear — the big origami bear: a folded block head with round ears,
// mauve / tan / sage panels, a folded body, short arms; blinks, tilts his
// head, flicks his ears and waves now and then.
defineModel('foremanBear', (opts, rig) => {
  const { X, Y } = grid(77.3);
  const torso = group(0, 0, 0);
  rig.body.add(torso);
  // feet
  for (const [x0, x1] of [[1.9, 3.6], [6.1, 8.0]]) torso.add(mesh(box(X(x1) - X(x0), Y(9.2) + 1, 16), '#3d332a', (X(x0) + X(x1)) / 2, 0, 2));
  // body: folded slab, widest at the elbows
  const bodyPts = [[X(1.2), Y(4.6)], [X(8.8), Y(4.6)], [X(10), Y(7.6)], [X(9.0), Y(9.3)], [X(1.0), Y(9.3)], [X(0.0), Y(7.6)]];
  const bodyGeo = fold(bodyPts, 34, 5, { cx: X(5) });
  torso.add(mesh(bodyGeo, '#b49172', 0, 0, 0, FUR));
  const bz = bodyGeo.userData.zAt;
  torso.add(patch([[X(5), Y(4.6)], [X(1.2), Y(4.6)], [X(0.0), Y(7.6)], [X(1.0), Y(9.3)], [X(3.2), Y(9.3)]], bz, '#7e6161', 0.35, FUR));
  torso.add(patch([[X(5), Y(4.6)], [X(8.8), Y(4.6)], [X(10), Y(7.6)], [X(9.0), Y(9.3)], [X(6.8), Y(9.3)]], bz, '#748575', 0.35, FUR));
  torso.add(patch([[X(5), Y(4.6)], [X(10), Y(7.6)], [X(9.0), Y(9.3)], [X(7.6), Y(9.3)]], bz, '#4c5a50', 0.85, FUR));
  // arms at the shoulders (sides), tucked against the body
  const arms = [-1, 1].map((s) => {
    const a = group(s * (X(9.2) - 2), Y(5.3), 2);
    a.add(arm(22, 9, s < 0 ? '#7e6161' : '#748575', s < 0 ? '#c9a77c' : '#c9a77c', FUR));
    a.rotation.z = s * 0.18;
    torso.add(a);
    return a;
  });
  // head: pivot at the neck
  const head = group(0, Y(4.7), 4);
  torso.add(head);
  const hy = (gy) => Y(gy) - Y(4.7);
  const headPts = [[X(0.6), hy(0.8)], [X(5), hy(0.45)], [X(9.4), hy(0.8)], [X(9.6), hy(4.7)], [X(0.4), hy(4.7)]];
  const headGeo = fold(headPts, 34, 6, { cx: X(5) });
  head.add(mesh(headGeo, '#c9a77c', 0, 0, 0, FUR));
  const hz = headGeo.userData.zAt;
  head.add(patch([[X(0.6), hy(0.8)], [X(5), hy(0.45)], [X(3.3), hy(4.7)], [X(0.4), hy(4.7)]], hz, '#86696a', 0.35, FUR));
  head.add(patch([[X(0.6), hy(0.8)], [X(3.0), hy(0.6)], [X(0.5), hy(2.8)]], hz, '#d6c6b8', 0.85, FUR));
  head.add(patch([[X(5), hy(0.45)], [X(9.4), hy(0.8)], [X(9.6), hy(4.7)], [X(6.7), hy(4.7)]], hz, '#7e8f81', 0.35, FUR));
  head.add(patch([[X(7.6), hy(0.65)], [X(9.4), hy(0.8)], [X(9.6), hy(2.8)]], hz, '#bfcabd', 0.85, FUR));
  // eyes, cheeks, soft nose button on a little muzzle bump
  const ey = eyes(X(6.3) - X(5), 1.8);
  ey.group.position.set(0, hy(2.3), hz(X(6.3)) + 0.8);
  head.add(ey.group);
  for (const s of [-1, 1]) {
    const c = cheek(6.2, '#e2a3a1');
    c.position.set(s * (X(7.5) - X(5)), hy(3.3), hz(X(7.5)) + 0.9);
    c.rotation.y = s * 0.17; // lies on its half of the fold
    head.add(c);
  }
  head.add(mesh(new THREE.SphereGeometry(1, 14, 10).scale(7, 5, 3.4), '#d8bf98', 0, hy(3.4), hz(0) - 0.6));
  const nose = mesh(new THREE.SphereGeometry(1, 12, 8).scale(3.6, 2.6, 2), '#1d1b18', 0, hy(3.05), hz(0) + 2.2);
  head.add(nose);
  // round ears at the top corners, sunk into the head
  const ears = [-1, 1].map((s) => {
    const e = group(s * (X(8.2) - X(5)), hy(0.45), -3);
    e.add(mesh(new THREE.CylinderGeometry(7.5, 7.5, 6, 16).rotateX(PI / 2), s < 0 ? '#8d7272' : '#76857a'));
    e.add(mesh(new THREE.CylinderGeometry(4.6, 4.6, 6.6, 14).rotateX(PI / 2), '#2f2a28'));
    e.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 7.2, 10).rotateX(PI / 2), '#e8e0d2'));
    head.add(e);
    return e;
  });
  const blink = blinker(rig.seed + 0.4);
  rig.anims.always = (t) => {
    ey.blink(blink(t));
    const c = (t + rig.seed) % 5.1;
    ears[0].rotation.z = c < 0.3 ? Math.sin((c / 0.3) * PI) * 0.25 : 0;
    const c2 = (t + rig.seed + 2.3) % 6.4;
    ears[1].rotation.z = c2 < 0.3 ? -Math.sin((c2 / 0.3) * PI) * 0.25 : 0;
  };
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2 + ctx.phase);
    torso.scale.set(1 + b * 0.006, 1 + b * 0.01, 1);
    head.rotation.z = Math.sin(t * 0.6 + ctx.phase) * 0.05;
    head.rotation.y = Math.sin(t * 0.37 + ctx.phase) * 0.12;
    // wave every few seconds with the right arm
    const w = (t + ctx.phase) % 7;
    const up = w < 2 ? Math.sin((w / 2) * PI) : 0;
    arms[1].rotation.z = 0.18 + up * 2.2;
    arms[1].rotation.x = up * Math.sin(t * 12) * 0.25;
    arms[0].rotation.z = -0.18 - b * 0.03;
  };
});

// builderBear — a bear kid in a yellow hard hat, black bob, hi-vis vest
// over a navy shirt; swings a hammer; blinks, tilts, flicks his ears.
defineModel('builderBear', (opts, rig) => {
  const { X, Y } = grid(71.4);
  const D = 26;
  const torso = group(0, 0, 0);
  rig.body.add(torso);
  // boots + trousers (two legs)
  for (const [x0, x1] of [[3.0, 5.3], [5.5, 7.9]]) {
    const cx = (X(x0) + X(x1)) / 2;
    torso.add(mesh(box(X(x1) - X(x0), Y(9.6), 18), '#3c3b37', cx, 0, 1));
    torso.add(mesh(box(X(x1) - X(x0) - 0.6, Y(7.9) - Y(9.6), 16), '#706466', cx, Y(9.6), 0, FABRIC));
  }
  // shirt body + vest panels + reflective stripes
  torso.add(mesh(box(X(8.5) - X(2.6), Y(5.0) - Y(7.9), D), '#2e3548', (X(2.6) + X(8.5)) / 2, Y(7.9), 0, FABRIC));
  const vz = D / 2 + 0.6;
  for (const [x0, x1] of [[2.9, 5.15], [5.75, 8.2]]) {
    torso.add(mesh(box(X(x1) - X(x0), Y(5.1) - Y(7.9), 1.2), '#d5d89a', (X(x0) + X(x1)) / 2, Y(7.9), vz, FABRIC));
  }
  for (const gx of [3.6, 7.4]) torso.add(mesh(box(2.6, Y(5.1) - Y(7.9), 1.4), '#8f958c', X(gx), Y(7.9), vz + 0.2));
  torso.add(mesh(box(X(8.2) - X(2.9), 2.6, 1.4), '#8f958c', (X(2.9) + X(8.2)) / 2, Y(7.6), vz + 0.6));
  // little tail at the rump
  torso.add(mesh(new THREE.SphereGeometry(4.2, 10, 8), '#c79c6e', X(5.6), Y(7.6), -D / 2 - 1.5, FUR));
  // arms: left raised with the hammer, right at the side
  const armL = group(X(2.6) + 1, Y(5.4), 2);
  armL.add(arm(12, 7.5, '#2e3548', '#e0bf98', FABRIC));
  const hammer = group(0, -13, 8); // held a little forward, clear of the hair
  hammer.add(mesh(box(2.2, 26, 2.2), '#8a6a44', 0, -4, 0, WOOD));
  hammer.add(mesh(cbox(10, 5, 5), '#3d3f3c', -2, 22, 0));
  armL.add(hammer);
  torso.add(armL);
  const armR = group(X(8.5) - 1, Y(5.4), 2);
  armR.add(arm(14, 7.5, '#2e3548', '#e0bf98', FABRIC));
  armR.rotation.z = 0.12;
  torso.add(armR);
  // head on a neck pivot: face block, hair, hard hat, ears
  const head = group(X(5.0), Y(5.0), 2);
  torso.add(head);
  const hx = (gx) => X(gx) - X(5.0);
  const hy = (gy) => Y(gy) - Y(5.0);
  const faceGeo = fold([[hx(1.9), hy(2.0)], [hx(8.1), hy(2.0)], [hx(8.1), hy(5.0)], [hx(1.9), hy(5.0)]], 26, 3, { cx: 0 });
  head.add(mesh(faceGeo, '#dfbf97'));
  const fz = faceGeo.userData.zAt;
  // hair: back of the head + side bob, bangs across the brow (left)
  head.add(mesh(box(hx(8.6) - hx(1.4), hy(2.0) - hy(4.8), 22), '#262420', 0, hy(4.8), -5));
  for (const s of [-1, 1]) {
    const lock = fold(s < 0
      ? [[hx(1.9), hy(2.0)], [hx(1.2), hy(2.6)], [hx(0.9), hy(4.9)], [hx(1.95), hy(4.9)]]
      : [[hx(8.1), hy(2.0)], [hx(8.8), hy(2.6)], [hx(9.1), hy(4.9)], [hx(8.05), hy(4.9)]], 20, 1);
    head.add(mesh(lock, '#262420', 0, 0, -1));
  }
  head.add(patch([[hx(1.9), hy(2.0)], [hx(4.4), hy(2.0)], [hx(3.0), hy(2.6)], [hx(1.9), hy(3.4)]], fz, '#262420', 0.4));
  // ears peeking out above the hat brim, attached to the hat's side
  const ears = [-1, 1].map((s) => {
    const e = group(s * (hx(8.4) - 1), hy(1.3), -4);
    e.add(mesh(new THREE.CylinderGeometry(5.5, 5.5, 5, 14).rotateX(PI / 2), '#c79c6e', 0, 0, 0, FUR));
    head.add(e);
    return e;
  });
  // hard hat: dome + brim + ridge
  const hat = new THREE.Group();
  hat.add(mesh(new THREE.SphereGeometry(1, 16, 10, 0, PI * 2, 0, PI / 2).scale(hx(8.6), hy(0.0) - hy(1.95), 16), '#dcc278', 0, hy(1.95), -1));
  hat.add(mesh(new THREE.CylinderGeometry(hx(8.95), hx(8.95), 2.4, 18).scale(1, 1, 0.62), '#cdb36a', 0, hy(2.05), -1)); // brim sits ON the head (no gap)
  hat.add(mesh(cbox(4, hy(0.15) - hy(1.95), 32).translate(0, (hy(0.15) - hy(1.95)) / 2 + 0.5, 0), '#e2cc8a', 0, hy(1.95), -1));
  head.add(hat);
  // face: eyes, cheeks, tiny mouth
  const ey = eyes(hx(6.7), 1.7);
  ey.group.position.set(0, hy(3.25), fz(hx(6.7)) + 0.7);
  head.add(ey.group);
  for (const s of [-1, 1]) {
    const c = cheek(5, '#e2a196');
    c.position.set(s * hx(7.25), hy(4.0), fz(hx(7.25)) + 0.5);
    c.rotation.y = s * 0.14;
    head.add(c);
  }
  head.add(inkMesh(new THREE.BoxGeometry(4, 0.7, 0.4), '#5a4030', hx(5.1), hy(3.95), fz(hx(5.1)) + 0.5));
  const blink = blinker(rig.seed + 1.1);
  rig.anims.always = (t) => {
    ey.blink(blink(t));
    const c = (t + rig.seed) % 4.6;
    ears[0].rotation.z = c < 0.3 ? Math.sin((c / 0.3) * PI) * 0.3 : 0;
    const c2 = (t + rig.seed + 1.9) % 5.8;
    ears[1].rotation.z = c2 < 0.3 ? -Math.sin((c2 / 0.3) * PI) * 0.3 : 0;
  };
  // hammering: the raised arm swings the hammer down onto an imaginary nail
  // rest: fist out to the side at chest height, hammer held upright
  const swing = (k) => {
    armL.rotation.z = -1.05 + k * 0.35;
    hammer.rotation.z = 1.05 + k * 1.1;
  };
  rig.anims.work = (t, dt, ctx) => {
    const k = Math.max(0, Math.sin(t * 6 + ctx.phase));
    swing(k);
    torso.position.y = k * 0.8;
    head.rotation.x = k * 0.06;
  };
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2.1 + ctx.phase);
    torso.scale.set(1 + b * 0.006, 1 + b * 0.012, 1);
    head.rotation.z = Math.sin(t * 0.7 + ctx.phase) * 0.06;
    // a few hammer taps every few seconds
    const c = (t + ctx.phase) % 6;
    swing(c < 1.5 ? Math.max(0, Math.sin(c * 4 * PI)) : 0);
  };
});

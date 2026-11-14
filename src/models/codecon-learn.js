// CodeCon 2026 — pack "codecon-learn" (see tools/sprites-src/codecon-learn for the
// drawn reference sprites). Scenes: a small community meetup where people
// learn (give up: COMFORT) and books vs. a TV (give up: WATCHING).
import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, box, cbox, beam, cyl, extrude, fold, group, plate, blinker, cheek, PI,
} from './kit.js';

const WOOD = { tex: 'wood' };
const WOODF = { tex: 'woodFine' };
const FABRIC = { tex: 'fabric' };
const METAL = { tex: 'metal' };
const FUR = { tex: 'fur' };

const C = {
  mauve: '#a5817f', mauveL: '#b39290', mauveD: '#8f6c6b', ochre: '#bd9662', ochreD: '#a17d4e',
  sand: '#d6b386', cream: '#e9e2d1', ivory: '#f2ede2', sage: '#a4b1a2', sageM: '#798877', sageD: '#6d7a6c',
  brown: '#7b6548', brownD: '#6a5539', slate: '#4b5654', slateL: '#5f6b68', rose: '#d79c92', red: '#b5544d',
  green: '#6f9e74', teal: '#6fa3a0', glow: '#ffe7a8', glowSoft: '#f3e3b8', grey: '#9aa39c', ink: '#1f1d1a',
};

const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// A straight bar between two points (legs, struts, frames): square section,
// or a faceted tube when seg > 0.
function strut(a, b, thick, color, opts = {}, seg = 0) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = seg ? new THREE.CylinderGeometry(thick / 2, thick / 2, len, seg) : new THREE.BoxGeometry(thick, len, thick);
  const m = mesh(g, color, 0, 0, 0, opts);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
  return m;
}

// Plump faceted cushion (centred): face centres pushed out, corners tucked in.
function pillow(w, h, d, puff = 2) {
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const ax = Math.abs(x) > 1e-4 ? 1 : 0;
    const ay = Math.abs(y) > 1e-4 ? 1 : 0;
    const az = Math.abs(z) > 1e-4 ? 1 : 0;
    const n = ax + ay + az;
    if (n === 1) p.setXYZ(i, x + Math.sign(x) * puff * ax, y + Math.sign(y) * puff * ay, z + Math.sign(z) * puff * az);
    else if (n === 3) p.setXYZ(i, x - Math.sign(x) * puff * 0.6, y - Math.sign(y) * puff * 0.45, z - Math.sign(z) * puff * 0.6);
  }
  return g;
}

// Own unlit material (animated colour / opacity — never the shared cache).
function lit(color, opacity = 1, side = THREE.FrontSide) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side });
}

// ── couch — a very comfy two-seat sofa: the comfort zone to give up ───────
defineModel('couch', (opts, rig) => {
  const b = rig.body;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.add(mesh(cyl(4.2, 3, 7, 6), sx < 0 ? C.brown : C.brownD, sx * 95, 0, sz * 33, WOODF));
  }
  // base and back: folded fronts (light left half, dark right half)
  b.add(mesh(fold([[-82, 0], [82, 0], [82, 23], [-82, 23]], 72, 1.6, { back: false }), C.mauve, 0, 6, 0, FABRIC));
  const back = group(0, 28, -27);
  back.rotation.x = -0.12;
  back.add(mesh(fold([[-84, 0], [84, 0], [84, 60], [76, 70], [-76, 70], [-84, 60]], 18, 2), C.mauve, 0, 0, 0, FABRIC));
  b.add(back);
  // plump arms with a flat top
  const armGeo = () => extrude([[-12, 0], [12, 0], [12, 44], [7, 52], [-7, 52], [-12, 44]], 78);
  b.add(mesh(armGeo(), C.mauveL, -92, 6, 0, FABRIC));
  b.add(mesh(armGeo(), C.mauveD, 92, 6, 0, FABRIC));
  // seat cushions (on bottom pivots, so they can settle)
  const seats = [-1, 1].map((s) => {
    const g = group(s * 40, 29, 11, mesh(pillow(79, 13, 54, 3.2), s < 0 ? '#bb9b98' : '#a88886', 0, 6.5, 0, FABRIC));
    b.add(g);
    return g;
  });
  // back cushions, leaning on the back
  const backs = [-1, 1].map((s) => {
    const g = group(s * 40, 43, -13, mesh(pillow(76, 40, 13, 4), s < 0 ? '#c3a5a2' : '#b08f8d', 0, 20, 0, FABRIC));
    g.rotation.x = -0.14;
    b.add(g);
    return g;
  });
  // folded blanket on the left seat
  const blanket = group(-55, 42.6, 14);
  [[34, C.sageM], [32.6, C.sage], [34, '#8c9c8a']].forEach(([w, col], i) => blanket.add(mesh(box(w, 3.6, 28), col, 0, i * 3.6, 0, FABRIC)));
  blanket.add(mesh(box(2.8, 11.2, 28.9), C.cream, 11.6, 0, 0, FABRIC));
  blanket.rotation.y = 0.05;
  b.add(blanket);
  // throw pillow leaning in the right corner
  const throwP = group(61, 57, 3, mesh(pillow(22, 22, 7, 2.5), C.ochre, 0, 0, 0, FABRIC));
  throwP.rotation.set(-0.2, 0, 0.35);
  b.add(throwP);
  // tv remote on the right armrest
  const remote = group(92, 58, 14);
  remote.rotation.y = 0.15;
  remote.add(mesh(box(13, 2, 5), C.slate));
  remote.add(mesh(box(1.7, 0.6, 1.6), C.red, -4.4, 2, 0));
  for (let i = 0; i < 3; i += 1) remote.add(mesh(box(1.3, 0.5, 1.3), C.cream, -1.2 + i * 2.4, 2, 0));
  b.add(remote);

  rig.parts.cushions = [...seats, ...backs];
  rig.anims.idle = (t, dt, ctx) => {
    const k = Math.sin(t * 1.1 + ctx.phase);
    const k2 = Math.sin(t * 1.1 + ctx.phase - 0.9);
    backs[1].scale.set(1, 1 + k * 0.022, 1 + k * 0.07);
    seats[1].scale.set(1, 1 - k2 * 0.04, 1);
    throwP.rotation.z = 0.35 + k2 * 0.02;
    throwP.position.y = 57 - k2 * 0.25;
  };
});

// ── plannerBoard — weekly planner on an easel ─────────────────────────────
defineModel('plannerBoard', (opts, rig) => {
  const b = rig.body;
  const lean = 0.14;
  const easel = group(0, 0, 12);
  easel.rotation.x = -lean;
  b.add(easel);
  easel.add(strut([-28.5, 0.8, 0], [-4.4, 100, 0], 3.2, C.ochre, WOODF));
  easel.add(strut([28.5, 0.8, 0], [4.4, 100, 0], 3.2, C.ochreD, WOODF));
  easel.add(mesh(box(13.6, 3.4, 3.8), '#8a6c47', 0, 97, 0, WOODF));
  b.add(strut([0, 97, -1.6], [0, 0.6, -30], 3, C.brownD, WOODF)); // back leg
  easel.add(mesh(box(69, 2.4, 6), C.ochre, 0, 37.6, 3.5, WOODF)); // ledge
  easel.add(mesh(box(66, 52, 2.4), C.brown, 0, 40, 2.8, WOODF)); // frame, front at z 4.0
  easel.add(mesh(box(62, 48, 0.8), '#e7e0cf', 0, 42, 4.2)); // panel, front at zP
  const zP = 4.6;
  // paper pieces glued on the panel: 0.5 thick each, stacked by layer
  const dec = (w, h, color, x, y, layer = 0) => {
    const m = mesh(box(w, h, 0.5), color, x, y, zP + 0.25 + layer * 0.5);
    easel.add(m);
    return m;
  };
  const colX = (i) => -25.87 + i * 8.533;
  const rowY = [69.6, 60.6, 51.6];
  dec(62, 6.8, C.mauve, 0, 83.2);
  dec(18, 2.2, C.ivory, -19, 85.6, 1);
  for (let i = 0; i < 7; i += 1) {
    dec(7.6, 2.4, i < 5 ? C.slate : C.rose, colX(i), 79.2);
    for (const y of rowY) dec(7.6, 8, '#f8f5ec', colX(i), y);
    dec(4.8, 4.8, '#f8f5ec', colX(i), 44.8);
  }
  // scheduled sessions: [col, row, rows spanned, colour]
  for (const [c, r, span, col] of [[0, 0, 1, C.sage], [1, 1, 1, C.ochre], [2, 0, 2, C.teal], [3, 2, 1, C.sageM], [4, 1, 1, C.mauve], [5, 0, 1, C.sand], [0, 2, 1, C.sand]]) {
    dec(7.6, 8 + (span - 1) * 9, col, colX(c), rowY[r + span - 1], 1);
  }
  // check marks
  const ticks = [];
  for (let i = 0; i < 7; i += 1) {
    const g = group(colX(i), 47.2, zP + 0.75);
    g.add(mesh(beam(-2, 0.2, -0.6, -1.4, 0.95, 0.5, 0.3), C.green));
    g.add(mesh(beam(-0.6, -1.4, 2, 1.9, 0.95, 0.5, 0.3), C.green));
    easel.add(g);
    ticks.push(g);
  }
  // red ring around one day
  const ring = mesh(new THREE.TorusGeometry(5.7, 0.5, 4, 22), C.red, colX(4) + 0.2, 73.6, zP + 1.7);
  ring.scale.set(1.04, 0.95, 1);
  ring.rotation.z = 0.3;
  easel.add(ring);
  // pinned note (hinged at the pin)
  const note = group(28, 92.4, zP + 1.3);
  note.add(mesh(box(12.6, 12.6, 0.3), C.glowSoft, 0, -11.6, 0));
  note.add(mesh(box(7.6, 1.1, 0.3), C.ochre, -0.6, -5.6, 0.3));
  note.add(mesh(box(6, 1.1, 0.3), C.ochre, -1.4, -8.4, 0.3));
  note.add(mesh(new THREE.IcosahedronGeometry(1.4, 0), C.red, 0, 0, 0.9));
  easel.add(note);

  const setTicks = (fn) => ticks.forEach((g, i) => {
    const s = fn(i);
    g.visible = s > 0.02;
    g.scale.setScalar(Math.max(s, 0.02));
  });
  const T = 7;
  rig.anims.plan = (t, dt, ctx) => {
    const c = (t + ctx.phase) % T;
    setTicks((i) => {
      const a = 0.5 + i * 0.55;
      if (c < a) return 0;
      if (c < a + 0.3) { const p = (c - a) / 0.3; return 1 + 0.35 * Math.sin(p * PI) * (1 - p) - (1 - p) ** 2; }
      if (c < 5.9) return 1;
      return Math.max(0, 1 - (c - 5.9) / 0.4);
    });
  };
  rig.anims.idle = () => setTicks((i) => (i < 5 ? 1 : 0));
  rig.anims.always = (t, dt, ctx) => {
    const f = Math.sin(t * 2.3 + ctx.phase) * 0.5 + Math.sin(t * 5.1 + ctx.phase * 2) * 0.25;
    note.rotation.x = -0.12 - (f + 0.75) * 0.07;
    note.rotation.z = -0.12 + Math.sin(t * 1.7 + ctx.phase) * 0.03;
  };
  rig.parts.note = note;
  rig.parts.ticks = ticks;
});

// ── retroTv — box television on a small stand, rabbit-ear antenna ─────────
defineModel('retroTv', (opts, rig) => {
  const b = rig.body;
  // stand
  b.add(mesh(box(64, 4, 38), C.brown, 0, 28, 0, WOODF));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.add(strut([sx * 26, 29, sz * 13], [sx * 31, 0.5, sz * 16], 3, sx < 0 ? '#8a6c47' : C.brownD, WOODF));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(mesh(box(5, 2.2, 5), C.slate, sx * 29, 32, sz * 14));
  // case + tube hump at the back
  b.add(mesh(extrude([[-36, 0], [36, 0], [36, 42.8], [32.8, 46], [-32.8, 46], [-36, 42.8]], 40), '#a98452', 0, 34, 0, WOOD));
  b.add(mesh(box(50, 32, 12), C.slate, 0, 40, -26));
  for (let i = 0; i < 4; i += 1) b.add(mesh(cbox(30, 1.2, 0.8), C.slateL, 0, 50 + i * 4, -32.2));
  // front
  b.add(mesh(cbox(67.2, 41.2, 1.2), C.cream, 0, 57, 20.6));
  const zB = 21.2;
  b.add(mesh(cbox(19.2, 41.2, 0.5), '#d3cab5', 24, 57, zB + 0.25));
  b.add(mesh(cbox(43.2, 36.4, 0.9), C.slate, -9.6, 57, zB + 0.45));
  const oct = new THREE.Shape([[-26, 40], [6.8, 40], [10.8, 44], [10.8, 70], [6.8, 74], [-26, 74], [-30, 70], [-30, 44]].map(([x, y]) => new THREE.Vector2(x, y)));
  const screenMat = lit('#8fb9b5');
  const screen = new THREE.Mesh(new THREE.ShapeGeometry(oct), screenMat);
  screen.position.z = zB + 1.4;
  b.add(screen);
  const picture = group(0, 0, zB + 1.9);
  const blocks = [];
  const addBlock = (w, h, x, y) => {
    const m = new THREE.Mesh(plate(w, h), lit('#ffffff'));
    m.position.set(x, y, 0);
    picture.add(m);
    blocks.push(m);
  };
  for (let i = 0; i < 5; i += 1) addBlock(6.56, 20, -26 + 3.28 + i * 6.56, 60);
  addBlock(12, 6, -20, 47);
  addBlock(20.8, 6, -3.6, 47);
  b.add(picture);
  const stripe = group(0, 0, zB + 1.9);
  const para = (pts, color) => new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))), lit(color));
  stripe.add(para([[-23, 44], [-15, 44], [1, 71], [-7, 71]], '#56625f'));
  stripe.visible = false;
  b.add(stripe);
  // knobs + speaker slats
  const knob = (x, y, r, color, turn) => {
    const g = group(x, y, zB + 0.5);
    g.add(mesh(new THREE.CylinderGeometry(r, r * 1.08, 2.4, 10).rotateX(PI / 2), color, 0, 0, 1.2));
    g.add(mesh(box(1.2, r * 0.82, 0.5), C.cream, 0, 0.1 * r, 2.65));
    g.rotation.z = turn;
    b.add(g);
    return g;
  };
  const knobs = [knob(24, 68, 4.4, C.slate, 0), knob(24, 55.6, 3.2, C.sageD, -0.7)];
  for (let i = 0; i < 4; i += 1) b.add(mesh(cbox(12, 1.2, 0.5), C.brown, 24, 47 - i * 2.4, zB + 0.75));
  // rabbit-ear antenna
  b.add(mesh(cyl(4.4, 5.6, 2.8, 8), C.slate, 0, 80, 0));
  const rods = [[-0.8, 0.74, 21.6, C.sageM, C.cream], [0.8, -0.8, 23.6, C.sageD, '#d6cdb8']].map(([x, rot, len, col, tip]) => {
    const g = group(x, 82.4, 0);
    g.add(mesh(cyl(0.6, 0.6, len, 5), col, 0, 0, 0, METAL));
    g.add(mesh(new THREE.IcosahedronGeometry(1.3, 0), tip, 0, len, 0));
    g.rotation.z = rot;
    g.userData.rest = rot;
    b.add(g);
    return g;
  });

  const pal = ['#f3e3b8', '#d6b386', '#a4b1a2', '#d79c92', '#a5817f', '#6fa3a0', '#ebe7d7'].map((c) => new THREE.Color(c));
  const glass = new THREE.Color('#8fb9b5');
  const dark = new THREE.Color('#2f3736');
  rig.anims.watch = (t, dt, ctx) => {
    const tt = t + ctx.phase;
    picture.visible = true;
    stripe.visible = false;
    const step = Math.floor(tt / 0.9);
    const fr = tt / 0.9 - step;
    const k = smooth(0.8, 1, fr);
    const flick = 0.94 + 0.04 * Math.sin(tt * 17) + 0.02 * Math.sin(tt * 41 + 1);
    blocks.forEach((m, i) => {
      m.material.color.copy(pal[(i + step) % pal.length]).lerp(pal[(i + step + 1) % pal.length], k).multiplyScalar(flick);
    });
    screenMat.color.copy(glass).multiplyScalar(0.92 + 0.08 * Math.sin(tt * 2.3));
    rods.forEach((g, i) => { g.rotation.z = g.userData.rest + Math.sin(tt * 11 + i * 2) * 0.012 * (0.6 + 0.4 * Math.sin(tt * 0.7 + i)); });
  };
  rig.anims.off = () => {
    picture.visible = false;
    stripe.visible = true;
    screenMat.color.copy(dark);
    rods.forEach((g) => { g.rotation.z = g.userData.rest; });
  };
  rig.parts.rods = rods;
  rig.parts.knobs = knobs;
});

// ── openBook — a big open book on a wooden lectern; a page turns ──────────
defineModel('openBook', (opts, rig) => {
  const b = rig.body;
  b.add(mesh(box(44, 4, 30), C.brown, 0, 0, -3, WOODF));
  b.add(mesh(box(30, 2, 20), C.brownD, 0, 4, -3, WOODF));
  b.add(mesh(box(8, 58, 8), C.ochre, 0, 6, -3, WOOD));
  const TILT = 0.61; // desk leans back from the vertical
  const desk = group(0, 64, 0);
  desk.rotation.x = -TILT;
  b.add(desk);
  desk.add(mesh(cbox(84, 56, 3), C.ochre, 0, 12, 0, WOOD)); // local y −16…40, z ±1.5
  desk.add(mesh(cbox(11, 16, 6), C.ochreD, 0, 0, -4.5, WOODF)); // socket on the post
  desk.add(mesh(box(84, 3.5, 3.5), C.brown, 0, -16, 3.25, WOODF)); // lip
  // the book lies on the desk: local x across, y up the slope, z out of it
  const book = group(0, 13, 1.5);
  desk.add(book);
  book.add(mesh(cbox(76, 50, 1.2), C.mauveD, 0, 0, 0.6, FABRIC));
  const SLOPE = Math.atan(2.2 / 35);
  // text lines: [y, height, d0, d1, colour] — d = distance from the spine
  const LINES = {
    1: [[13, 10, 4, 18, C.sage], [4, 1, 4, 28], [0, 1, 4, 31], [-4, 1, 4, 26], [-8, 1, 4, 30], [-12, 1, 4, 31], [-16, 1, 4, 20]],
    [-1]: [[17, 1.8, 11, 31, C.mauve], [12, 1, 4, 31], [8, 1, 6, 31], [4, 1, 3, 31], [0, 1, 13, 31], [-5, 1, 4, 31], [-9, 1, 3, 31], [-13, 1, 8, 31], [-17, 1, 18, 31]],
  };
  const TEXT = '#8d968f';
  for (const s of [-1, 1]) {
    const blockGeo = extrude([[s, 0], [s * 36, 0], [s * 36, 4.4], [s, 2.2]], 46).rotateX(PI / 2);
    book.add(mesh(blockGeo, s < 0 ? '#f4f0e5' : '#e8e1d0', 0, 0, 1.2));
    const surf = group(s, 0, 3.4);
    surf.rotation.y = -s * SLOPE;
    for (const [y, h, d0, d1, col] of LINES[s]) surf.add(mesh(cbox(d1 - d0, h, 0.4), col ?? TEXT, s * ((d0 + d1) / 2 - 1), y, 0.2));
    book.add(surf);
  }
  // the turning page: three hinged strips, text on both faces
  const hinge = group(0, 0, 4.7);
  book.add(hinge);
  const SEG = [[1, 12], [12, 23.5], [23.5, 35]];
  const joints = [];
  let parent = hinge;
  let origin = 0;
  SEG.forEach(([s0, s1], i) => {
    const j = i === 0 ? hinge : group(s0 - origin, 0, 0);
    if (i > 0) { parent.add(j); joints.push(j); }
    if (i > 0) j.add(mesh(new THREE.CylinderGeometry(0.19, 0.19, 45, 6), '#fbf8f0')); // closes the crease when the page bends
    const ox = i === 0 ? 0 : s0;
    j.add(mesh(cbox(s1 - s0 + 0.05, 45, 0.3), '#fbf8f0', (s0 + s1) / 2 - ox, 0, 0));
    for (const [face, lines] of [[1, LINES[1]], [-1, LINES[-1]]]) {
      for (const [y, h, d0, d1, col] of lines) {
        const a = Math.max(d0, s0);
        const z = Math.min(d1, s1);
        if (z - a < 0.2) continue;
        j.add(mesh(cbox(z - a, h, 0.4), col ?? TEXT, (a + z) / 2 - ox, y, face * 0.35));
      }
    }
    parent = j;
    origin = ox;
  });
  // ribbon bookmark: down the gutter, over the lip, hanging free
  book.add(mesh(cbox(1.8, 51.6, 0.3), C.red, 0, 0.3, 1.6));
  book.add(mesh(cbox(1.8, 0.4, 2.6), C.red, 0, -25.4, 2.7));
  book.add(mesh(cbox(1.8, 4.2, 0.3), C.red, 0, -27.3, 3.85));
  const ribbon = group(0, -29.3, 3.85);
  ribbon.rotation.x = TILT;
  ribbon.add(mesh(extrude([[-0.9, 0.2], [0.9, 0.2], [0.9, -12], [0, -10.4], [-0.9, -12]], 0.3), C.red));
  book.add(ribbon);

  rig.anims.read = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 3.2;
    const p = smooth(0.45, 2.45, c);
    hinge.rotation.y = -SLOPE - p * (PI - 2 * SLOPE);
    const k = Math.sin(p * PI) * 0.32;
    joints[0].rotation.y = k;
    joints[1].rotation.y = k * 1.2;
    ribbon.rotation.z = Math.sin(t * 1.3 + ctx.phase) * 0.06;
  };
  rig.anims.idle = (t, dt, ctx) => {
    // the page only stirs, as if in a draught
    const k = 0.5 + 0.5 * Math.sin(t * 0.9 + ctx.phase);
    hinge.rotation.y = -SLOPE - k * 0.1;
    joints[0].rotation.y = -k * 0.12;
    joints[1].rotation.y = -k * 0.2;
    ribbon.rotation.z = Math.sin(t * 1.3 + ctx.phase) * 0.06;
  };
  rig.parts.page = hinge;
});

// ── meetupChairs — a row of three folding chairs ──────────────────────────
function foldingChair(seatCol, backCol) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const col = s < 0 ? C.slateL : C.slate;
    g.add(strut([s * 25.5, 1.1, 17.7], [s * 25.5, 97.5, -13.5], 2.6, col, METAL, 6)); // front leg → back upright
    g.add(strut([s * 22.6, 1.2, -21.2], [s * 22.6, 48, 14], 2.6, col, METAL, 6)); // rear leg
  }
  g.add(strut([-25.5, 15, 13.3], [25.5, 15, 13.3], 2, C.slate, METAL, 6));
  g.add(strut([-22.6, 12, -13.5], [22.6, 12, -13.5], 2, C.slate, METAL, 6));
  g.add(strut([-26.8, 97.5, -13.5], [26.8, 97.5, -13.5], 2.6, C.slateL, METAL, 6));
  g.add(strut([-25.5, 46.6, 3], [25.5, 46.6, 3], 2, C.slate, METAL, 6)); // seat hinge rod
  const seat = mesh(box(48, 3.2, 38), seatCol, 0, 47.6, 3, FABRIC);
  g.add(seat);
  // backrest: two panels meeting in a shallow V (light left, dark right)
  const back = group(0, 86, -9.8);
  back.rotation.x = -0.314;
  for (const s of [-1, 1]) {
    const half = mesh(cbox(24.5, 21, 1.6), backCol, s * 12.1, 0, 0, FABRIC);
    half.rotation.y = s * 0.09;
    back.add(half);
  }
  g.add(back);
  return g;
}

defineModel('meetupChairs', (opts, rig) => {
  const b = rig.body;
  const chairs = [
    [-75, 0.1, '#8f9f8d', '#8f9f8d'],
    [5, -0.05, '#a5817f', '#a5817f'],
    [85, -0.12, '#c9a36d', '#c9a36d'],
  ].map(([x, rot, seat, back]) => {
    const c = foldingChair(seat, back);
    c.position.x = x;
    c.rotation.y = rot;
    b.add(c);
    return c;
  });
  // a jacket hung over the first chair's back
  const J = group(0, 97.5, -13.5);
  J.rotation.x = -0.314;
  const JL = '#6f8a88';
  const JD = '#5a7472';
  J.add(mesh(cbox(56, 2, 7.4), JL, 0, 0.7, 0, FABRIC));
  J.add(mesh(cbox(56, 40, 1.4), JD, 0, -19, -3, FABRIC));
  J.add(mesh(cbox(20, 17, 0.4), C.cream, 0, -8.6, 1.9)); // lining seen in the V
  for (const s of [-1, 1]) {
    J.add(mesh(extrude([[s * 28, -34], [s * 1.5, -34], [s * 1.5, -15], [s * 10, 0], [s * 28, 0]], 1.4), s < 0 ? JL : JD, 0, 0, 3, FABRIC));
    J.add(mesh(extrude([[s * 10, 0], [s * 1.5, -15], [s * 6.8, -16.5], [s * 15.5, -1.2]], 0.5), s < 0 ? '#88a3a1' : '#6b8684', 0, 0, 3.95));
    const sleeve = mesh(cbox(8, 40, 6), s < 0 ? '#7d9896' : '#4f6866', s * 32.4, -19.6, 0, FABRIC);
    sleeve.rotation.z = s * 0.07;
    J.add(sleeve);
  }
  for (const y of [-20, -26]) J.add(mesh(new THREE.CylinderGeometry(1, 1, 0.5, 8).rotateX(PI / 2), C.cream, 5, y, 3.95));
  chairs[0].add(J);
  // a tote bag on the third chair
  const tote = group(-1, 50.8, 6);
  tote.rotation.set(-0.1, 0.2, 0);
  tote.add(mesh(extrude([[-13, 0], [13, 0], [12, 23], [-12, 23]], 8), '#ebe5d6', 0, 0, 0, FABRIC));
  tote.add(mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.5, 12).rotateX(PI / 2), C.sage, 0, 11.5, 4.25));
  const diamond = mesh(cbox(4.4, 4.4, 0.5), C.sageM, 0, 11.5, 4.75);
  diamond.rotation.z = PI / 4;
  tote.add(diamond);
  for (const z of [-3, 3]) tote.add(mesh(new THREE.TorusGeometry(5.4, 0.7, 4, 10, PI).scale(1, 1.9, 1), '#c9bfa8', 0, 22.6, z));
  chairs[2].add(tote);
  rig.parts.chairs = chairs;
});

// ── projectorScreen — tripod screen showing slides ────────────────────────
defineModel('projectorScreen', (opts, rig) => {
  const b = rig.body;
  b.add(mesh(cyl(1.2, 1.2, 79, 6), C.slate, 0, 20, 0, METAL));
  b.add(mesh(new THREE.IcosahedronGeometry(1.5, 0), C.sageD, 0, 98.6, 0));
  b.add(mesh(cyl(2.4, 2.4, 4, 8), C.sageD, 0, 20.4, 0));
  [PI / 2, PI / 2 + (2 * PI) / 3, PI / 2 + (4 * PI) / 3].forEach((a, i) => {
    const fx = Math.cos(a) * 28;
    const fz = Math.sin(a) * 28;
    b.add(strut([0, 22.4, 0], [fx, 1, fz], 1.8, [C.slate, C.slateL, '#3d4745'][i], METAL, 5));
    b.add(mesh(cyl(1.5, 1.8, 1.4, 6), '#333c3a', fx, 0, fz));
  });
  // case tube, sheet, top bar
  b.add(mesh(new THREE.CylinderGeometry(2.2, 2.2, 81.6, 8).rotateZ(PI / 2), C.slateL, 0, 36.6, 3, METAL));
  for (const s of [-1, 1]) b.add(mesh(new THREE.CylinderGeometry(2.8, 2.8, 2.4, 8).rotateZ(PI / 2), '#3d4745', s * 41, 36.6, 3));
  b.add(mesh(cbox(3, 3, 3), C.sageD, 0, 36.6, 1.4));
  b.add(mesh(box(76, 54.4, 0.6), '#3a4443', 0, 37.6, 3)); // front at z 3.3
  b.add(mesh(box(78.4, 2.4, 1.8), C.slate, 0, 91.6, 3));
  b.add(mesh(cbox(1.6, 1.6, 3.4), C.sageD, 0, 94.7, 1.4));
  const screenMat = lit('#f6efdc');
  const surface = new THREE.Mesh(plate(72, 50), screenMat);
  surface.position.set(0, 65, 3.75);
  b.add(surface);
  const haloMat = lit(C.glow, 0.22);
  const halo = new THREE.Mesh(plate(84, 62), haloMat);
  halo.position.set(0, 65, 2.2);
  b.add(halo);

  // slides: flat shapes given in the sprite's pixel grid (x 0…420, y 0…500 down)
  const makeLayout = (build) => {
    const g = group(0, 0, 4.2);
    const mats = new Map();
    const m = (color) => {
      if (!mats.has(color)) mats.set(color, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
      return mats.get(color);
    };
    const px = (x, y, w, h, color) => {
      const r = new THREE.Mesh(plate(w / 5, h / 5), m(color));
      r.position.set((x + w / 2 - 210) / 5, (500 - y - h / 2) / 5, 0);
      g.add(r);
    };
    const pie = (x, y, r, color, from = 0, len = PI * 2, lift = 0) => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(r / 5, 20, from, len), m(color));
      c.position.set((x - 210) / 5, (500 - y) / 5, lift);
      g.add(c);
    };
    build(px, pie);
    b.add(g);
    return { g, mats: [...mats.values()] };
  };
  const SOFT = '#c9c2b0';
  const layouts = [
    makeLayout((px) => { // title + code + small chart
      px(50, 68, 180, 22, C.mauve);
      px(50, 108, 90, 10, C.sageM); px(70, 128, 130, 10, C.ochre); px(70, 148, 60, 10, C.teal); px(136, 148, 50, 10, C.grey);
      px(90, 168, 110, 10, C.grey); px(70, 188, 80, 10, C.ochre); px(50, 208, 40, 10, C.sageM);
      px(50, 244, 150, 8, SOFT); px(50, 262, 110, 8, SOFT);
      px(270, 278, 100, 4, C.slate);
      px(276, 238, 18, 40, C.sage); px(300, 214, 18, 64, C.teal); px(324, 226, 18, 52, C.sand); px(348, 186, 18, 92, C.red);
    }),
    makeLayout((px) => { // big chart + bullets
      px(50, 68, 130, 22, C.sageM);
      px(56, 272, 190, 4, C.slate);
      [40, 70, 95, 125, 152].forEach((h, i) => px(66 + i * 36, 272 - h, 24, h, [C.sage, C.sand, C.teal, C.mauve, C.red][i]));
      [80, 60, 72, 50].forEach((w, i) => { px(272, 122 + i * 34, 10, 10, C.ochre); px(290, 122 + i * 34, w, 10, C.grey); });
    }),
    makeLayout((px, pie) => { // pie + code
      px(120, 68, 180, 22, C.ochre);
      pie(120, 192, 62, C.teal);
      pie(120, 192, 62, C.mauve, 0.4, 1.7, 0.45);
      pie(120, 192, 62, C.sand, 2.1, 0.9, 0.45);
      px(222, 130, 140, 10, C.sageM); px(242, 150, 100, 10, C.grey); px(242, 170, 124, 10, C.ochre); px(242, 190, 70, 10, C.teal);
      px(222, 210, 90, 10, C.sageM); px(222, 250, 140, 8, SOFT); px(222, 268, 96, 8, SOFT);
    }),
  ];
  const paper = new THREE.Color('#f6efdc');
  const show = (idx, alpha, dx) => layouts.forEach((L, i) => {
    L.g.visible = i === idx;
    if (i !== idx) return;
    L.g.position.x = dx;
    for (const mt of L.mats) mt.opacity = alpha;
  });
  const glow = (tt) => {
    const k = Math.sin(tt * 1.3);
    haloMat.opacity = 0.2 + 0.06 * k;
    screenMat.color.copy(paper).multiplyScalar(0.965 + 0.035 * k);
  };
  rig.anims.slides = (t, dt, ctx) => {
    const tt = t + ctx.phase;
    const c = tt % 4;
    const fin = smooth(0, 0.35, c);
    const fout = smooth(3.65, 4, c);
    show(Math.floor(tt / 4) % 3, fin * (1 - fout), (1 - fin) * 3 - fout * 3);
    glow(tt);
  };
  rig.anims.idle = (t, dt, ctx) => { show(0, 1, 0); glow(t + ctx.phase); };
  rig.parts.layouts = layouts.map((L) => L.g);
});

// ── floorLamp — arched reading lamp, fabric shade, soft light cone ────────
defineModel('floorLamp', (opts, rig) => {
  const b = rig.body;
  const BX = -25; // base
  const SX = 13; // shade
  b.add(mesh(cyl(11.5, 12.5, 3.2, 10), C.slate, BX, 0, 0, METAL));
  b.add(mesh(cyl(2.4, 3.6, 2.4, 8), C.slateL, BX, 3.2, 0, METAL));
  const V = (x, y) => new THREE.Vector3(x, y, 0);
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(V(BX, 3), V(BX, 70)));
  path.add(new THREE.QuadraticBezierCurve3(V(BX, 70), V(BX, 98.4), V(BX + 20, 98.4)));
  path.add(new THREE.QuadraticBezierCurve3(V(BX + 20, 98.4), V(SX, 99.4), V(SX, 78)));
  b.add(mesh(new THREE.TubeGeometry(path, 44, 1.15, 5, false), C.slate, 0, 0, 0, METAL));
  // shade
  b.add(mesh(new THREE.CylinderGeometry(9, 17, 22, 10, 1, true).translate(0, 11, 0), C.sand, SX, 56, 0, { side: THREE.DoubleSide, ...FABRIC }));
  b.add(mesh(cyl(9.4, 9.4, 1.3, 10), C.ochreD, SX, 77.2, 0));
  b.add(mesh(new THREE.CylinderGeometry(17.2, 17.7, 1.5, 10, 1, true).translate(0, 0.75, 0), C.ochreD, SX, 55.8, 0, { side: THREE.DoubleSide }));
  b.add(mesh(cyl(1.6, 1.6, 12, 6), C.slateL, SX, 65.4, 0));
  const bulbMat = lit(C.glow);
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 1), bulbMat);
  bulb.position.set(SX, 57.2, 0);
  b.add(bulb);
  const coneMat = lit(C.glow, 0.16, THREE.DoubleSide);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(15.4, 24.6, 39.6, 14, 1, true).translate(0, 19.8, 0), coneMat);
  cone.position.set(SX, 16, 0);
  b.add(cone);
  const warm = new THREE.Color(C.glow);
  rig.anims.idle = (t, dt, ctx) => {
    const k = Math.sin(t * 1.2 + ctx.phase);
    coneMat.opacity = 0.15 + 0.05 * k;
    bulbMat.color.copy(warm).multiplyScalar(0.94 + 0.06 * k);
    bulb.scale.setScalar(1 + 0.05 * k);
  };
  rig.parts.cone = cone;
  rig.parts.bulb = bulb;
});

// ── bookTower — a leaning tower of books with a mug on top ────────────────
defineModel('bookTower', (opts, rig) => {
  const b = rig.body;
  // [height, width, depth, dx from the book below, turn (0 = spine to the front), colour]
  const BOOKS = [
    [10, 46, 32, -2, 0.08, C.mauve], [9, 40, 28, 1, PI - 0.2, C.sage], [11, 44, 30, -1.5, -0.12, C.ochre],
    [9, 36, 26, 2.5, 0.3, C.slate], [10, 42, 28, 1, PI + 0.1, C.sand], [9, 34, 24, -0.5, -0.25, '#c98f86'],
    [10, 38, 26, 2, 0.15, C.sageD], [10, 32, 24, 1, PI - 0.15, C.brown], [9, 30, 22, 1.5, 0.1, C.teal],
  ];
  const LEAN = -0.006;
  const joints = [];
  let parent = b;
  let y = 0;
  BOOKS.forEach(([h, w, d, dx, turn, col], i) => {
    const j = group(dx, y, 0);
    j.rotation.z = i ? LEAN : 0;
    parent.add(j);
    joints.push(j);
    const bk = group(0, 0, 0);
    bk.rotation.y = turn;
    bk.add(mesh(box(w, 1.1, d), col, 0, 0, 0, FABRIC));
    bk.add(mesh(box(w, 1.1, d), col, 0, h - 1.1, 0, FABRIC));
    bk.add(mesh(box(w, h - 2.2, 1.1), col, 0, 1.1, d / 2 - 0.55, FABRIC)); // spine
    bk.add(mesh(box(w - 1.8, h - 2.2, d - 2), i % 2 ? '#f2ede2' : '#e9e2d1', 0, 1.1, -0.45)); // pages
    bk.add(mesh(box(1.6, h - 0.6, 0.5), C.ivory, -w / 2 + w * 0.14, 0.3, d / 2 + 0.2));
    bk.add(mesh(box(0.8, h - 0.6, 0.5), C.ivory, -w / 2 + w * 0.14 + 2.8, 0.3, d / 2 + 0.2));
    bk.add(mesh(box(w * 0.3, h * 0.4, 0.5), C.ivory, w * 0.15, h * 0.3, d / 2 + 0.2));
    j.add(bk);
    parent = j;
    y = h;
  });
  // mug
  const mug = group(1, y, 0);
  mug.add(mesh(cyl(5.6, 4.8, 12.5, 10), C.ivory));
  mug.add(mesh(new THREE.CylinderGeometry(5.82, 5.62, 2.6, 10, 1, true).translate(0, 7.5, 0), C.mauve, 0, 0, 0, { side: THREE.DoubleSide }));
  mug.add(mesh(cyl(4.7, 4.7, 0.6, 10), '#5f4d37', 0, 12.4, 0));
  mug.add(mesh(new THREE.TorusGeometry(3.1, 0.9, 5, 8, PI).rotateZ(-PI / 2), '#d9d1bd', 5.3, 6.4, 0));
  mug.rotation.y = -0.3;
  parent.add(mug);

  rig.anims.idle = (t, dt, ctx) => {
    const tt = t + ctx.phase;
    joints.forEach((j, i) => {
      if (!i) return;
      const w = Math.sin(tt * 0.9 - i * 0.14) + 0.35 * Math.sin(tt * 2.3 - i * 0.3);
      j.rotation.z = LEAN + w * 0.0034;
    });
    mug.position.x = 1 - Math.sin(tt * 0.9 - 1.6) * 0.3;
  };
  rig.parts.joints = joints;
  rig.parts.mug = mug;
});

// ── learnerCat — studious cat with round glasses, notebook on its knees ───
defineModel('learnerCat', (opts, rig) => {
  const b = rig.body;
  const FURL = '#e0c498';
  const FURD = '#cfb084';
  // stool
  b.add(mesh(cyl(15, 13.5, 4, 8), C.brown, 0, 20, -4, WOODF));
  [PI / 2, PI / 2 + (2 * PI) / 3, PI / 2 + (4 * PI) / 3].forEach((a, i) => {
    b.add(strut([Math.cos(a) * 9, 21, -4 + Math.sin(a) * 9], [Math.cos(a) * 16, 0.9, -4 + Math.sin(a) * 16], 2.6, [C.brown, '#8f7654', C.brownD][i], WOODF));
  });
  // legs: thighs on the stool, shins down, paws on the floor
  for (const s of [-1, 1]) {
    const col = s < 0 ? FURL : FURD;
    b.add(mesh(cbox(7.6, 7, 21), col, s * 6.6, 27.5, 7.5, FUR));
    b.add(mesh(box(6.6, 22.5, 6.6), col, s * 6.6, 3, 15, FUR));
    b.add(mesh(box(7.6, 4, 10.5), s < 0 ? C.ivory : '#ddd5c2', s * 6.6, 0, 16.5));
  }
  // torso (sweater)
  const torso = group(0, 24, -4);
  b.add(torso);
  // six-sided gem with a corner to the front: light left half, dark right half
  const gem = (profile) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 6).scale(1, 1, 0.72);
  torso.add(mesh(gem([[0.001, 0], [12.5, 0], [14.5, 6], [11, 30], [0.001, 30]]), '#7f8e7d', 0, 0, 0, FABRIC));
  torso.add(mesh(gem([[10.6, 26.4], [11.9, 27], [11.6, 30.6], [0.001, 30.6]]), C.sage, 0, 0, 0, FABRIC));
  // tail
  const tail = group(7, 26.6, -9.5);
  const tailPts = [[0, 0, 0], [9, -0.4, 1], [16, 2, 3], [18.5, 9, 4], [16, 15, 4]].map((p) => new THREE.Vector3(...p));
  tail.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPts), 12, 2.3, 5), C.ochre, 0, 0, 0, FUR));
  tail.add(mesh(new THREE.IcosahedronGeometry(2.7, 0), C.ivory, 16, 15.4, 4));
  b.add(tail);
  // notebook on the knees
  const nb = group(0, 32.6, 15.5);
  nb.rotation.x = 0.3;
  nb.add(mesh(cbox(35, 1, 15.5), C.mauveD));
  for (const s of [-1, 1]) nb.add(mesh(cbox(16, 0.9, 14), s < 0 ? '#f4f0e5' : '#e6dfce', s * 8.7, 0.9, 0));
  nb.add(mesh(cbox(1.3, 1.7, 14.6), C.slate, 0, 0.9, 0));
  const scribble = (x0, len, z) => nb.add(mesh(cbox(len, 0.5, 0.6), '#7c8784', x0 + len / 2, 1.55, z));
  [[11, 5], [12, 2.6], [9, 0.2], [12.4, -2.2], [7, -4.6]].forEach(([len, z]) => scribble(-15, len, z));
  scribble(2.4, 11, 5);
  scribble(2.4, 6, 2.6);
  b.add(nb);
  // arms: shoulder pivots, sleeves reaching down to the notebook
  const arms = [[-1, 18.6, -0.76, 0.02], [1, 16.2, -0.82, -0.02]].map(([s, len, rx, rz]) => {
    const a = group(s * 10, 25.5, 3);
    a.add(mesh(new THREE.CylinderGeometry(3.3, 2.8, len - 3, 6).translate(0, -(len - 3) / 2, 0), s < 0 ? C.sage : C.sageD, 0, 0, 0, FABRIC));
    a.add(mesh(new THREE.IcosahedronGeometry(3.1, 0), s < 0 ? '#e6cba4' : FURL, 0, -len + 1.6, 0));
    a.rotation.set(rx, 0, rz);
    a.userData.rest = [rx, rz];
    a.userData.len = len;
    torso.add(a);
    return a;
  });
  // pencil in the writing paw
  const pencil = group(0, -arms[1].userData.len + 1.6, 1.4);
  pencil.rotation.set(0.82 - 0.3, 0, -0.5);
  pencil.add(mesh(new THREE.CylinderGeometry(0.8, 0.8, 10, 6).translate(0, 3, 0), '#cfa04a'));
  pencil.add(mesh(new THREE.ConeGeometry(0.8, 2.4, 6).rotateX(PI).translate(0, -3.2, 0), '#3a332b'));
  pencil.add(mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.5, 6).translate(0, 8.75, 0), C.rose));
  arms[1].add(pencil);

  // head
  const head = group(0, 53, -3);
  b.add(head);
  const R = { x: 23, y: 19, z: 19 };
  const HY = 20;
  const HZ = 2;
  const skull = mesh(new THREE.SphereGeometry(1, 8, 6).scale(R.x, R.y, R.z), FURL, 0, HY, HZ, FUR);
  head.add(skull);
  skull.updateMatrix();
  skull.matrixWorld.copy(skull.matrix);
  // a point ON the faceted skull (ray from the front) + that facet's normal
  const ray = new THREE.Raycaster();
  const surf = (dx, dy, lift = 0.5) => {
    ray.set(new THREE.Vector3(dx, HY + dy, 500), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(skull, false)[0];
    const n = hit.face.normal.clone().normalize();
    return { p: hit.point.clone().addScaledVector(n, lift), n };
  };
  const Z = new THREE.Vector3(0, 0, 1);
  const place = (obj, dx, dy, lift) => {
    const { p, n } = surf(dx, dy, lift);
    obj.position.copy(p);
    obj.quaternion.setFromUnitVectors(Z, n);
    head.add(obj);
    return { p, n };
  };
  // eyes (dots that squash to blink), cheeks
  const eyeList = [-1, 1].map((s) => {
    const e = inkMesh(new THREE.SphereGeometry(1.9, 12, 8).scale(1, 1, 0.45), C.ink);
    e.position.copy(surf(s * 9, 2, 0.1).p);
    head.add(e);
    return e;
  });
  for (const s of [-1, 1]) place(cheek(3.8, C.rose), s * 14.2, -5, 0.6);
  // round glasses: rims on the two front facets, bridge, temples
  const rimR = 5.7;
  const rims = [-1, 1].map((s) => {
    const rim = mesh(new THREE.TorusGeometry(rimR, 0.6, 4, 18), C.slate);
    const { p, n } = place(rim, s * 9, 2, 1.5);
    const tan = new THREE.Vector3(n.z, 0, -n.x).normalize();
    return { inner: p.clone().addScaledVector(tan, -s * rimR), outer: p.clone().addScaledVector(tan, s * rimR), s };
  });
  head.add(strut(rims[0].inner.toArray(), rims[1].inner.toArray(), 0.9, C.slate));
  for (const r of rims) {
    const mid = [r.s * 20.9, HY + 2.6, HZ + 10];
    head.add(strut(r.outer.toArray(), mid, 0.8, C.slate));
    head.add(strut(mid, [r.s * 22, HY + 3.4, HZ + 1], 0.8, C.slate));
  }
  // muzzle + nose
  const mz = surf(0, -8, 0).p;
  head.add(mesh(new THREE.SphereGeometry(1, 6, 4).rotateY(PI / 6).scale(6.6, 4.8, 3.8), C.ivory, 0, mz.y, mz.z - 0.9));
  head.add(mesh(new THREE.ConeGeometry(1.7, 1.8, 3).rotateX(PI).rotateY(PI), '#c98f86', 0, mz.y + 3.3, mz.z + 1.5));
  // tabby stripes on the forehead
  for (const dx of [-5.6, 0, 5.6]) {
    const st = mesh(cbox(1.7, dx ? 5.2 : 6.6, 2), dx > 0 ? '#96774a' : C.ochreD);
    const { n } = place(st, dx * 0.98, 13.6 - Math.abs(dx) * 0.12, -0.35);
    if (!dx) st.quaternion.setFromUnitVectors(Z, new THREE.Vector3(0, n.y, n.z).normalize());
    else st.rotateZ(-dx * 0.03);
  }
  // ears
  const ears = [-1, 1].map((s) => {
    const e = group(s * 14.5, HY + 11, HZ - 1);
    e.add(mesh(extrude([[-6.6, 0], [6.6, 0], [s * 1.5, 15.2]], 4.4), s < 0 ? '#e6cba4' : '#d3b488', 0, 0, 0, FUR));
    e.add(mesh(extrude([[-3.4, 3], [3.4, 3], [s * 1.3, 10.8]], 0.6), s < 0 ? C.rose : '#c4897f', 0, 0, 2.4));
    e.rotation.z = -s * 0.22;
    e.userData.rest = -s * 0.22;
    head.add(e);
    return e;
  });

  const blink = blinker(rig.seed + 4);
  rig.parts.head = head;
  rig.parts.arms = arms;
  rig.parts.tail = tail;
  const restArms = () => arms.forEach((a) => a.rotation.set(a.userData.rest[0], 0, a.userData.rest[1]));
  const breathe = (tt) => {
    const k = Math.sin(tt * 2.0);
    torso.scale.set(1 - k * 0.006, 1 + k * 0.012, 1 + k * 0.02);
    head.position.y = 53 + k * 0.36;
  };
  rig.anims.write = (t, dt, ctx) => {
    const tt = t + ctx.phase;
    const c = tt % 5;
    const down = 1 - smooth(3.0, 3.4, c) + smooth(4.5, 5, c); // 1 = eyes on the notebook
    breathe(tt);
    head.rotation.set(0.3 * down - 0.05 * (1 - down), Math.sin(tt * 0.6) * 0.05 * down, (1 - down) * 0.07);
    restArms();
    const line = ((c / 3.0) % 1) * 2 - 1; // the paw travels along the line
    arms[1].rotation.z += (Math.sin(tt * 15) * 0.035 - line * 0.05) * down;
    arms[1].rotation.x += Math.sin(tt * 9.5 + 1) * 0.018 * down - (1 - down) * 0.05;
  };
  rig.anims.idle = (t, dt, ctx) => {
    const tt = t + ctx.phase;
    const c = tt % 6.5;
    const up = smooth(3.4, 3.9, c) - smooth(5.6, 6.2, c);
    breathe(tt);
    head.rotation.set(0.2 - 0.3 * up, Math.sin(tt * 0.9) * 0.16 * up, Math.sin(tt * 0.5) * 0.03);
    restArms();
  };
  rig.anims.always = (t, dt, ctx) => {
    const k = blink(t);
    for (const e of eyeList) e.scale.y = Math.max(0.12, 1 - k);
    tail.rotation.y = Math.sin(t * 1.4 + ctx.phase) * 0.12;
    tail.rotation.z = Math.sin(t * 0.9 + ctx.phase) * 0.05;
    ears.forEach((e, i) => {
      const c = (t + ctx.phase + i * 2.3) % 5.5;
      e.rotation.z = e.userData.rest + (c < 0.28 ? Math.sin((c / 0.28) * PI) * 0.25 * (i ? -1 : 1) : 0);
    });
  };
});

import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, blobShadow, applyAnimation,
} from './helpers.js';

// The office pack, built from the "office.png" reference sheet: teal desk
// with a glowing monitor, round swivel chair, bookshelves with colorful
// spines, easel whiteboards with scribbles, meeting table, faceted potted
// plant, warm desk lamp, filing cabinet, steaming mug — and big-headed
// animal office workers in faceted suits.

const screenDark = new THREE.Color('#2f3433');
const screenLit = new THREE.Color('#4a5a57');

// ── desk ────────────────────────────────────────────────────────────────────
// Teal work desk with keyboard, mouse and (by default) a monitor whose
// screen subtly flickers. options: seed, color, monitor (bool),
// animation: "screenGlow"|"none". Desk top sits at y ≈ 1.05 — stack props
// (mug, paperStack) with that y.
function desk(options = {}) {
  const seed = options.seed ?? 0;
  const color = options.color ?? palette.waterTeal;
  const group = new THREE.Group();

  const top = paperMesh(new THREE.BoxGeometry(2.4, 0.12, 1.1), color, seed, 0.05);
  top.position.y = 1.0;
  group.add(top);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = paperMesh(new THREE.BoxGeometry(0.12, 1.0, 0.14), color, seed + sx + sz * 2, 0.06);
      leg.position.set(sx * 1.0, 0.5, sz * 0.4);
      leg.rotation.z = -sx * 0.06;
      group.add(leg);
    }
  }

  const kb = paperMesh(new THREE.BoxGeometry(0.6, 0.05, 0.24), palette.parchment, seed + 5, 0.04);
  kb.position.set(0.15, 1.09, 0.22);
  group.add(kb);
  const mouse = paperMesh(new THREE.BoxGeometry(0.12, 0.05, 0.16), palette.parchment, seed + 6, 0.04);
  mouse.position.set(0.65, 1.09, 0.22);
  group.add(mouse);

  let screenMat = null;
  if (options.monitor !== false) {
    const stand = paperMesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), palette.parchment, seed + 7);
    stand.position.set(-0.45, 1.2, -0.15);
    group.add(stand);
    const foot = paperMesh(new THREE.BoxGeometry(0.4, 0.05, 0.25), palette.parchment, seed + 8);
    foot.position.set(-0.45, 1.08, -0.15);
    group.add(foot);
    const frame = paperMesh(new THREE.BoxGeometry(0.95, 0.7, 0.08), palette.cream, seed + 9, 0.04);
    frame.position.set(-0.45, 1.68, -0.15);
    group.add(frame);
    screenMat = new THREE.MeshBasicMaterial({ color: screenDark.clone() });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.56), screenMat);
    screen.position.set(-0.45, 1.68, -0.1);
    group.add(screen);
  }

  group.add(blobShadow(1.2));

  const r = rng(seed + 20);
  let blip = 1 + r() * 2;
  applyAnimation(group, {
    // The screen breathes faintly and blips brighter now and then —
    // somebody is working.
    screenGlow: (t, dt, ctx) => {
      if (!screenMat) return;
      blip -= dt;
      if (blip < 0) blip = 0.8 + r() * 2.4;
      const base = 0.5 + Math.sin(t * 1.3 + ctx.phase) * 0.15;
      const k = blip < 0.12 ? 1 : base;
      screenMat.color.copy(screenDark).lerp(screenLit, k);
    },
  }, options, 'screenGlow', 'desk');

  return group;
}

// ── officeChair ─────────────────────────────────────────────────────────────
// Round swivel chair: disc base, stem, seat, circular back — per the sheet.
// options: seed, color, animation: "swivel"|"none"
function officeChair(options = {}) {
  const seed = options.seed ?? 0;
  const color = options.color ?? palette.tanBrown;
  const group = new THREE.Group();
  const swivel = new THREE.Group();

  const base = paperMesh(new THREE.CylinderGeometry(0.35, 0.4, 0.1, 9), color, seed, 0.06);
  base.position.y = 0.05;
  swivel.add(base);
  const stem = paperMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6), palette.deepBrown, seed + 1);
  stem.position.y = 0.32;
  swivel.add(stem);
  const seat = paperMesh(new THREE.CylinderGeometry(0.34, 0.3, 0.12, 9), color, seed + 2, 0.06);
  seat.position.y = 0.58;
  swivel.add(seat);
  const backStem = paperMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), palette.deepBrown, seed + 3);
  backStem.position.set(0, 0.8, -0.28);
  backStem.rotation.x = 0.2;
  swivel.add(backStem);
  const backGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12);
  backGeo.rotateX(Math.PI / 2);
  const back = paperMesh(backGeo, color, seed + 4, 0.06);
  back.position.set(0, 1.12, -0.33);
  swivel.add(back);

  group.add(swivel);
  group.add(blobShadow(0.45));

  applyAnimation(group, {
    swivel: (t, dt, ctx) => {
      swivel.rotation.y = Math.sin(t * 0.6 + ctx.phase) * 0.3;
    },
  }, options, 'none', 'officeChair');

  return group;
}

// ── bookshelf ───────────────────────────────────────────────────────────────
// Tan case with three shelves of colorful seeded book spines, some tilted.
// options: seed, color, shelves
function bookshelf(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const caseColor = options.color ?? palette.parchment;
  const shelves = options.shelves ?? 3;
  const group = new THREE.Group();

  const w = 1.5;
  const shelfH = 0.72;
  const h = shelves * shelfH + 0.12;
  const d = 0.5;

  const back = paperMesh(new THREE.BoxGeometry(w, h, 0.06), caseColor, seed, 0.05);
  back.position.set(0, h / 2, -d / 2);
  group.add(back);
  for (const sx of [-1, 1]) {
    const side = paperMesh(new THREE.BoxGeometry(0.08, h, d), caseColor, seed + sx, 0.05);
    side.position.set(sx * (w / 2 - 0.04), h / 2, 0);
    group.add(side);
  }
  const bookColors = [palette.dustyRose, palette.sage, palette.duckEggBlue,
    palette.strawGold, palette.roseMauve, palette.pine, palette.barkBrown];
  for (let s = 0; s <= shelves; s += 1) {
    const board = paperMesh(new THREE.BoxGeometry(w - 0.1, 0.08, d), caseColor, seed + 10 + s, 0.05);
    board.position.set(0, 0.04 + s * shelfH, 0);
    group.add(board);
    if (s === shelves) break;
    // a row of books, occasionally one leaning
    let bx = -w / 2 + 0.15;
    while (bx < w / 2 - 0.22) {
      const bw = 0.09 + r() * 0.08;
      const bh = shelfH * (0.55 + r() * 0.3);
      const book = paperMesh(new THREE.BoxGeometry(bw, bh, d * 0.7), bookColors[Math.floor(r() * bookColors.length)], seed + Math.floor(bx * 100), 0.05);
      const lean = r() < 0.15 ? (r() - 0.5) * 0.3 : 0;
      book.position.set(bx + bw / 2, 0.1 + s * shelfH + bh / 2, 0);
      book.rotation.z = lean;
      group.add(book);
      bx += bw + 0.02 + (r() < 0.12 ? 0.1 : 0);
    }
  }

  group.add(blobShadow(0.8));
  return group;
}

// ── whiteboard ──────────────────────────────────────────────────────────────
// Cream board on easel legs, with seeded pencil scribbles.
// options: seed
function whiteboard(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const group = new THREE.Group();

  const board = paperMesh(new THREE.BoxGeometry(1.6, 1.3, 0.06), palette.paperWhite, seed, 0.03);
  board.position.set(0, 1.55, 0);
  board.rotation.x = -0.08;
  group.add(board);

  // scribbles drawn on a small canvas
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 208;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(95, 81, 66, 0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    let x = 30 + r() * 60;
    let y = 40 + i * 55 + r() * 20;
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j += 1) {
      const nx = x + 30 + r() * 40;
      ctx.quadraticCurveTo(x + 15 + r() * 20, y + (r() - 0.5) * 50, nx, y + (r() - 0.5) * 26);
      x = nx;
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.44, 1.16),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  face.position.set(0, 1.55, 0.035);
  face.rotation.x = -0.08;
  group.add(face);

  // A-frame easel: side legs BEHIND the board (the board overlaps them,
  // per the reference sheet — only their splayed feet show below), plus a
  // rear kickstand leg; the tray sits in front carrying the board's bottom.
  for (const sx of [-1, 1]) {
    const leg = paperMesh(new THREE.BoxGeometry(0.09, 2.3, 0.09), palette.barkBrown, seed + sx, 0.05);
    leg.position.set(sx * 0.68, 1.1, -0.09);
    leg.rotation.z = -sx * 0.11;
    leg.rotation.x = -0.08; // parallel to the leaned board
    group.add(leg);
  }
  const legBack = paperMesh(new THREE.BoxGeometry(0.09, 2.15, 0.09), palette.barkBrown, seed + 5, 0.05);
  legBack.position.set(0, 1.0, -0.38);
  legBack.rotation.x = 0.3;
  group.add(legBack);
  const tray = paperMesh(new THREE.BoxGeometry(1.5, 0.07, 0.16), palette.barkBrown, seed + 6, 0.05);
  tray.position.set(0, 0.84, 0.12);
  tray.rotation.x = -0.08;
  group.add(tray);

  group.add(blobShadow(0.7));
  return group;
}

// ── meetingTable ────────────────────────────────────────────────────────────
// Long table with simple chairs around it and a tiny plant on top.
// options: seed, color, chairColor, chairs (default 4). Table top ≈ y 1.0.
function meetingTable(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const color = options.color ?? palette.barkBrown;
  const chairColor = options.chairColor ?? palette.sage;
  const chairs = options.chairs ?? 4;
  const group = new THREE.Group();

  const top = paperMesh(new THREE.BoxGeometry(3.2, 0.14, 1.3), color, seed, 0.05);
  top.position.y = 1.0;
  group.add(top);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = paperMesh(new THREE.BoxGeometry(0.14, 1.0, 0.14), color, seed + sx + sz * 2, 0.06);
      leg.position.set(sx * 1.35, 0.5, sz * 0.5);
      group.add(leg);
    }
  }

  function chair(cx, cz, facing) {
    const c = new THREE.Group();
    const seat = paperMesh(new THREE.BoxGeometry(0.42, 0.07, 0.42), chairColor, seed + cx * 10, 0.06);
    seat.position.y = 0.55;
    c.add(seat);
    const back = paperMesh(new THREE.BoxGeometry(0.42, 0.55, 0.07), chairColor, seed + cx * 10 + 1, 0.06);
    back.position.set(0, 0.9, -0.18);
    c.add(back);
    for (const lx of [-1, 1]) {
      for (const lz of [-1, 1]) {
        const leg = paperMesh(new THREE.BoxGeometry(0.06, 0.55, 0.06), palette.deepBrown, seed + lx + lz);
        leg.position.set(lx * 0.16, 0.27, lz * 0.16);
        c.add(leg);
      }
    }
    c.position.set(cx, 0, cz);
    c.rotation.y = facing;
    group.add(c);
  }
  // chairs along the front and back edges, facing the table
  const perSide = Math.ceil(chairs / 2);
  for (let i = 0; i < perSide; i += 1) {
    const cx = -1.0 + (i * 2.0) / Math.max(perSide - 1, 1);
    chair(cx + (r() - 0.5) * 0.15, 0.95, Math.PI);
    if (i + perSide < chairs + 1 && chairs > perSide) chair(cx + (r() - 0.5) * 0.15, -0.95, 0);
  }

  // tiny plant on top
  const pot = paperMesh(new THREE.CylinderGeometry(0.09, 0.12, 0.14, 6), palette.parchment, seed + 30);
  pot.position.set(1.0, 1.14, 0);
  group.add(pot);
  for (let i = 0; i < 3; i += 1) {
    const leaf = paperMesh(new THREE.ConeGeometry(0.05, 0.28, 4), palette.sage, seed + 31 + i, 0.06);
    leaf.position.set(1.0 + (i - 1) * 0.05, 1.32, (i - 1) * 0.03);
    leaf.rotation.z = (i - 1) * 0.35;
    group.add(leaf);
  }

  group.add(blobShadow(1.7));
  return group;
}

// ── officePlant ─────────────────────────────────────────────────────────────
// Faceted geometric pot with a fan of pointed leaves. options: seed, color,
// potColor, animation: "leafSway"|"none"
function officePlant(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const leafColor = options.color ?? palette.pine;
  const group = new THREE.Group();

  const potGeo = new THREE.IcosahedronGeometry(0.42, 0);
  potGeo.scale(1, 0.85, 1);
  const pot = paperMesh(potGeo, options.potColor ?? palette.slateGray, seed, 0.08);
  pot.position.y = 0.36;
  group.add(pot);

  // Blades in three rings, every blade pivoted at the pot rim: outer ring
  // leans far out, inner ring stands tall — tips fan APART like an agave.
  const leaves = new THREE.Group();
  const tint = new THREE.Color();
  const rings = [
    { n: 5, lean: 0.8, len: 0.95 },
    { n: 4, lean: 0.45, len: 1.15 },
    { n: 3, lean: 0.15, len: 1.3 },
  ];
  rings.forEach((ring, ri) => {
    for (let i = 0; i < ring.n; i += 1) {
      const ang = (i / ring.n) * Math.PI * 2 + ri * 0.7 + r() * 0.35;
      const len = ring.len * (0.85 + r() * 0.3);
      tint.set(leafColor).offsetHSL(0, (r() - 0.5) * 0.08, (r() - 0.5) * 0.09);
      const bladeGeo = new THREE.ConeGeometry(0.13, len, 4);
      bladeGeo.scale(1.35, 1, 0.35);
      bladeGeo.translate(0, len / 2, 0); // pivot at the blade base
      const blade = paperMesh(bladeGeo, `#${tint.getHexString()}`, seed + ri * 10 + i, 0.06);
      blade.rotation.z = -(ring.lean + (r() - 0.5) * 0.15);
      const pivot = new THREE.Group();
      pivot.rotation.y = ang;
      pivot.add(blade);
      leaves.add(pivot);
    }
  });
  leaves.position.y = 0.62; // pot rim
  group.add(leaves);
  group.add(blobShadow(0.45));

  applyAnimation(group, {
    leafSway: (t, dt, ctx) => {
      leaves.rotation.y = Math.sin(t * 0.7 + ctx.phase) * 0.06;
      leaves.rotation.z = Math.sin(t * 1.1 + ctx.phase) * 0.02;
    },
  }, options, 'leafSway', 'officePlant');

  return group;
}

// ── deskLamp ────────────────────────────────────────────────────────────────
// Small warm table lamp — cone shade, glowing bulb, halo. Stack it on a
// desk/table via prop y. options: seed, shadeColor, animation: "glow"|"none"
function deskLamp(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();

  const base = paperMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 8), palette.deepBrown, seed, 0.05);
  base.position.y = 0.04;
  group.add(base);
  const arm = paperMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6), palette.deepBrown, seed + 1);
  arm.position.set(0.1, 0.4, 0);
  arm.rotation.z = -0.3;
  group.add(arm);
  const shade = paperMesh(new THREE.ConeGeometry(0.24, 0.28, 8, 1, true), options.shadeColor ?? palette.strawGold, seed + 2, 0.07);
  shade.material = shade.material.clone();
  shade.material.side = THREE.DoubleSide;
  shade.position.set(0.26, 0.78, 0);
  shade.rotation.z = 0.5;
  group.add(shade);
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: palette.sunGold }));
  bulb.position.set(0.32, 0.68, 0);
  group.add(bulb);
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 12),
    new THREE.MeshBasicMaterial({ color: palette.sunGold, transparent: true, opacity: 0.25, depthWrite: false }),
  );
  halo.position.set(0.32, 0.66, 0.05);
  group.add(halo);

  applyAnimation(group, {
    glow: (t, dt, ctx) => {
      const k = 0.85 + Math.sin(t * 2.4 + ctx.phase) * 0.1 + Math.sin(t * 8.1 + ctx.phase) * 0.05;
      halo.material.opacity = 0.25 * k;
      halo.scale.setScalar(k);
    },
  }, options, 'glow', 'deskLamp');

  return group;
}

// ── filingCabinet ───────────────────────────────────────────────────────────
// Duck-egg cabinet with three drawers and dark handles. options: seed, color
function filingCabinet(options = {}) {
  const seed = options.seed ?? 0;
  const color = options.color ?? palette.duckEggBlue;
  const group = new THREE.Group();

  const body = paperMesh(new THREE.BoxGeometry(0.9, 1.9, 0.75), color, seed, 0.05);
  body.position.y = 0.95;
  group.add(body);
  for (let i = 0; i < 3; i += 1) {
    const front = paperMesh(new THREE.BoxGeometry(0.74, 0.48, 0.05), color, seed + 1 + i, 0.08);
    front.position.set(0, 0.5 + i * 0.58, 0.39);
    group.add(front);
    const handle = paperMesh(new THREE.BoxGeometry(0.26, 0.06, 0.04), palette.deepBrown, seed + 10 + i);
    handle.position.set(0, 0.62 + i * 0.58, 0.42);
    group.add(handle);
  }
  group.add(blobShadow(0.55));
  return group;
}

// ── mug ─────────────────────────────────────────────────────────────────────
// Steaming coffee mug — stack it on a desk via prop y. options: seed, color,
// animation: "steam"|"none"
function mug(options = {}) {
  const seed = options.seed ?? 0;
  const color = options.color ?? palette.parchment;
  const group = new THREE.Group();

  const cup = paperMesh(new THREE.CylinderGeometry(0.11, 0.09, 0.2, 8), color, seed, 0.05);
  cup.position.y = 0.1;
  group.add(cup);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.09, 8), new THREE.MeshBasicMaterial({ color: palette.deepBrown }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.201;
  group.add(coffee);
  const handleGeo = new THREE.TorusGeometry(0.06, 0.02, 5, 8, Math.PI);
  const handle = paperMesh(handleGeo, color, seed + 1, 0.04);
  handle.position.set(0.12, 0.1, 0);
  handle.rotation.z = -Math.PI / 2;
  group.add(handle);

  // three steam wisps rising on a loop
  const wisps = [];
  for (let i = 0; i < 3; i += 1) {
    const wisp = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.035, 0),
      new THREE.MeshBasicMaterial({ color: palette.paperWhite, transparent: true, opacity: 0 }),
    );
    wisp.userData.offset = i / 3;
    group.add(wisp);
    wisps.push(wisp);
  }

  applyAnimation(group, {
    steam: (t, dt, ctx) => {
      for (const w of wisps) {
        const k = ((t * 0.35 + ctx.phase) % 1 + w.userData.offset) % 1;
        w.position.set(Math.sin((k + ctx.phase) * 9) * 0.04, 0.26 + k * 0.4, 0);
        w.material.opacity = k < 0.15 ? k * 4 : (1 - k) * 0.6;
        w.scale.setScalar(0.7 + k);
      }
    },
  }, options, 'steam', 'mug');

  return group;
}

// ── paperStack ──────────────────────────────────────────────────────────────
function paperStack(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const group = new THREE.Group();
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i += 1) {
    const sheet = paperMesh(new THREE.BoxGeometry(0.5, 0.035, 0.65), i % 2 ? palette.paperWhite : palette.cream, seed + i, 0.03);
    sheet.position.set((r() - 0.5) * 0.06, 0.02 + i * 0.035, (r() - 0.5) * 0.06);
    sheet.rotation.y = (r() - 0.5) * 0.25;
    group.add(sheet);
  }
  return group;
}

// ── wasteBasket ─────────────────────────────────────────────────────────────
// Bin with a crumpled paper ball beside it (someone missed).
function wasteBasket(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();
  const binGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.5, 9, 1, true);
  const bin = paperMesh(binGeo, options.color ?? palette.barkBrown, seed, 0.07);
  bin.material = bin.material.clone();
  bin.material.side = THREE.DoubleSide;
  bin.position.y = 0.25;
  group.add(bin);
  const wad = paperMesh(new THREE.IcosahedronGeometry(0.09, 0), palette.strawGold, seed + 1, 0.1);
  wad.position.set(0.38, 0.09, 0.12);
  group.add(wad);
  group.add(blobShadow(0.3));
  return group;
}

// ── officeWorker ────────────────────────────────────────────────────────────
// Big-headed animal colleague in a faceted suit with a tie, per the sheet.
// options: seed, animal: "bear"|"cat"|"hamster"|"badger", suitColor,
// animation: "idle"|"none"
const WORKERS = {
  bear: { head: '#77868a', ears: 'round', earColor: '#5f5142', muzzle: palette.cream, suit: palette.tanBrown },
  cat: { head: palette.cream, ears: 'pointy', earColor: palette.wolfGrayDark, muzzle: null, cap: palette.wolfGrayDark, suit: palette.sage },
  hamster: { head: palette.cream, ears: 'round', earColor: palette.tanBrown, muzzle: null, suit: palette.duckEggBlue },
  badger: { head: palette.cream, ears: 'round', earColor: palette.barkBrown, muzzle: palette.barkBrown, suit: palette.waterTeal },
};

function officeWorker(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const animal = WORKERS[options.animal] ? options.animal : 'bear';
  const spec = WORKERS[animal];
  const group = new THREE.Group();

  // faceted diamond body (suit)
  const bodyGeo = new THREE.IcosahedronGeometry(0.52, 0);
  bodyGeo.scale(1, 1.15, 0.8);
  const body = paperMesh(bodyGeo, options.suitColor ?? spec.suit, seed, 0.07);
  body.position.y = 0.6;
  group.add(body);
  // tie
  const tie = paperMesh(new THREE.ConeGeometry(0.07, 0.3, 4), palette.deepBrown, seed + 1, 0.04);
  tie.position.set(0, 0.78, 0.42);
  tie.rotation.x = -0.15;
  group.add(tie);

  // big round head
  const head = new THREE.Group();
  const skullGeo = new THREE.IcosahedronGeometry(0.5, 1);
  skullGeo.scale(1, 1, 0.75);
  const skull = paperMesh(skullGeo, spec.head, seed + 2, 0.05);
  head.add(skull);
  if (spec.cap) {
    const capGeo = new THREE.SphereGeometry(0.51, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.42);
    capGeo.scale(1, 1, 0.75);
    const cap = paperMesh(capGeo, spec.cap, seed + 3, 0.06);
    head.add(cap);
  }
  if (spec.muzzle) {
    const muzzle = paperMesh(new THREE.ConeGeometry(0.16, 0.4, 4), spec.muzzle, seed + 4, 0.04);
    muzzle.rotation.x = Math.PI;
    muzzle.position.set(0, 0.08, 0.33);
    head.add(muzzle);
  }
  for (const side of [-1, 1]) {
    let ear;
    if (spec.ears === 'pointy') {
      ear = paperMesh(new THREE.ConeGeometry(0.13, 0.3, 4), spec.earColor, seed + 5, 0.06);
      ear.position.set(side * 0.32, 0.46, 0);
    } else {
      const earGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10);
      earGeo.rotateX(Math.PI / 2);
      ear = paperMesh(earGeo, spec.earColor, seed + 5, 0.06);
      ear.position.set(side * 0.4, 0.38, -0.02);
    }
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), new THREE.MeshBasicMaterial({ color: palette.charcoal }));
    eye.position.set(side * 0.2, 0.06, 0.38);
    head.add(eye);
    head.userData[side === -1 ? 'eyeL' : 'eyeR'] = eye;
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 8),
      new THREE.MeshBasicMaterial({ color: palette.cheekPink, transparent: true, opacity: 0.85 }),
    );
    cheek.position.set(side * 0.33, -0.08, 0.36);
    head.add(cheek);
  }
  const nose = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), new THREE.MeshBasicMaterial({ color: palette.charcoal }));
  nose.position.set(0, -0.04, 0.395);
  head.add(nose);

  const headRestY = 1.55;
  head.position.y = headRestY;
  group.add(head);
  group.add(blobShadow(0.5));

  let nextBlink = 1.5 + r() * 3;
  applyAnimation(group, {
    idle: (t, dt, ctx) => {
      body.scale.setScalar(1 + Math.sin(t * 1.6 + ctx.phase) * 0.015);
      head.position.y = headRestY + Math.sin(t * 1.6 + ctx.phase) * 0.03;
      head.rotation.z = Math.sin(t * 0.45 + ctx.phase) * 0.05;
      head.rotation.y = Math.sin(t * 0.3 + ctx.phase * 1.7) * 0.12;
      nextBlink -= dt;
      if (nextBlink < 0) nextBlink = 2 + r() * 3.5;
      const s = nextBlink < 0.1 ? 0.12 : 1;
      head.userData.eyeL.scale.y = s;
      head.userData.eyeR.scale.y = s;
    },
  }, options, 'idle', 'officeWorker');

  return group;
}

register('desk', desk);
register('officeChair', officeChair);
register('bookshelf', bookshelf);
register('whiteboard', whiteboard);
register('meetingTable', meetingTable);
register('officePlant', officePlant);
register('deskLamp', deskLamp);
register('filingCabinet', filingCabinet);
register('mug', mug);
register('paperStack', paperStack);
register('wasteBasket', wasteBasket);
register('officeWorker', officeWorker);

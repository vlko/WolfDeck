import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, box, cbox, beam, fold, group, smoke, eyes, cheek, blinker, mat, PI,
} from './kit.js';

// Models for the pieces on office.png: furniture with real depth and the
// big-headed animal colleagues in suits (rigged: heads turn and tilt, ears
// flick, eyes blink, and the small arms the sheet hides wave and type).
// Coordinates come off the 10 × 10 grid over each sprite (gx across, gy
// down); 1 unit = 1 % of the sprite's height.

function grid(aspect) {
  return {
    X: (gx) => (gx / 10 - 0.5) * aspect,
    Y: (gy) => 100 - gy * 10,
    S: (g) => (g / 10) * aspect,
  };
}

const WOOD = { tex: 'wood' };
const WOOD_FINE = { tex: 'woodFine' };
const FABRIC = { tex: 'fabric' };
const METAL = { tex: 'metal' };
const FUR = { tex: 'fur' };
const LEAF = { tex: 'leaf', texScale: 0.6 };

const shade = (c, l) => new THREE.Color(c).offsetHSL(0, 0, l).getStyle();

// ── shared furniture parts ────────────────────────────────────────────────

// Simple office chair facing +z: seat, back at −z, four legs.
function chair({ w, seatY, backH, d, color, legColor = shade(color, -0.12) }) {
  const g = new THREE.Group();
  g.add(mesh(box(w, 3, d), color, 0, seatY - 3, 0, FABRIC));
  g.add(mesh(box(w, backH, 3), shade(color, 0.03), 0, seatY, -d / 2 + 1.5, FABRIC));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(mesh(box(2.4, seatY - 3, 2.4), legColor, sx * (w / 2 - 1.6), 0, sz * (d / 2 - 1.6), WOOD_FINE));
    }
  }
  return g;
}

// Table: top slab + four legs.
function table({ w, h, d, top, leg, thick = 5, legW = 5 }) {
  const g = new THREE.Group();
  g.add(mesh(box(w, thick, d), top, 0, h - thick, 0, WOOD_FINE));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(mesh(box(legW, h - thick, legW), leg, sx * (w / 2 - legW), 0, sz * (d / 2 - legW), WOOD_FINE));
    }
  }
  return g;
}

// Potted plant: faceted pot + lance leaves on pivots (sway).
function pottedPlant(parent, { x, y, z, potR, potH, potColor, leaves, leafLen, leafW, leafColors, spread = 0.95 }) {
  const pot = mesh(new THREE.CylinderGeometry(potR, potR * 0.75, potH, 7).translate(0, potH / 2, 0), potColor, x, y, z);
  parent.add(pot);
  const pivots = [];
  for (let i = 0; i < leaves; i += 1) {
    const a = -spread + (2 * spread * i) / Math.max(1, leaves - 1);
    const p = group(x, y + potH - 1, z + (i % 2 ? 2 : -2));
    p.rotation.z = -a * 0.75;
    p.rotation.x = (i % 3 - 1) * 0.25;
    const L = leafLen * (1 - Math.abs(a) * 0.25);
    const leaf = fold([[0, 0], [leafW / 2, L * 0.45], [0, L], [-leafW / 2, L * 0.45]], 1.2, 1.5, { cx: 0 });
    p.add(mesh(leaf, leafColors[i % leafColors.length], 0, 0, 0, LEAF));
    parent.add(p);
    pivots.push(p);
  }
  return pivots;
}

function swayLeaves(pivots, t, phase) {
  pivots.forEach((p, i) => {
    if (p.userData.base === undefined) p.userData.base = p.rotation.z;
    p.rotation.z = p.userData.base + Math.sin(t * 1.3 + phase + i * 0.7) * 0.05;
  });
}

// ── desk — teal desk with a cream monitor, keyboard and mouse ──────────────
defineModel('desk', (opts, rig) => {
  const { X, Y, S } = grid(100);
  const topY = Y(5.9);
  const D = 42;
  rig.body.add(table({ w: S(8.6), h: topY, d: D, top: '#a9c0b5', leg: '#5f7b70', thick: 6, legW: 6 }));
  // monitor at the back
  const mon = group(X(3.6), topY, -D / 2 + 10);
  mon.add(mesh(box(S(1.6), 3, 10), '#d8cdb3', 0, 0, 0));
  mon.add(mesh(box(4, Y(4.0) - topY, 4), '#cdbf9f', 0, 3, 0));
  const frameW = S(5.6);
  const frameH = Y(0.2) - Y(3.6);
  mon.add(mesh(box(frameW, frameH, 5), '#e2d8c2', 0, Y(3.6) - topY, 0));
  const screenMat = new THREE.MeshBasicMaterial({ color: '#2b2d2d' });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(frameW - 6, frameH - 6), screenMat);
  screen.position.set(0, Y(3.6) - topY + frameH / 2, 2.6);
  mon.add(screen);
  rig.body.add(mon);
  // keyboard + mouse in front
  const kb = mesh(box(S(3.4), 2, 10), '#c4b089', X(5.6), topY, 4);
  kb.rotation.y = 0.12;
  rig.body.add(kb);
  rig.body.add(mesh(new THREE.SphereGeometry(2.6, 8, 6).scale(1, 0.6, 1.4), '#ece6da', X(7.8), topY + 1, 2));
  // the screen breathes a soft glow, with an occasional flicker
  rig.anims.always = (t, dt, ctx) => {
    const k = 0.5 + 0.5 * Math.sin(t * 0.8 + ctx.phase);
    const flick = Math.sin(t * 23 + ctx.phase) > 0.97 ? 0.08 : 0;
    screenMat.color.setRGB(0.17 + k * 0.05 + flick, 0.18 + k * 0.06 + flick, 0.19 + k * 0.07 + flick, THREE.SRGBColorSpace);
  };
});

// ── officeChair — round-backed swivel chair ────────────────────────────────
defineModel('officeChair', (opts, rig) => {
  const { X, Y, S } = grid(61.4);
  const cream = '#d6ceb9';
  // base disc + column (fixed)
  rig.body.add(mesh(new THREE.CylinderGeometry(S(4.4), S(4.6), 7, 14).translate(0, 3.5, 0), cream, X(4.9), 0, 0));
  rig.body.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, Y(6.2) - 7, 8).translate(0, 7 + (Y(6.2) - 7) / 2, 0), '#3c2c1a', X(4.9), 0, 0));
  // swivelling top: seat + back + lever
  const top = group(X(4.9), Y(6.2), 0);
  top.add(mesh(new THREE.CylinderGeometry(S(4.3), S(4.3), 7, 14), cream, 0, 0, 0));
  const back = group(0, 3, -S(2.6));
  const post = mesh(beam(0, 0, 4, Y(4.1) - Y(6.2), 4, 4), '#6a5137', 0, 0, 0, WOOD_FINE);
  back.add(post);
  const disk = mesh(new THREE.CylinderGeometry(22, 22, 7, 16).rotateX(PI / 2), '#ddd4bf', 6, Y(2.1) - Y(6.2), 0, FABRIC);
  disk.rotation.y = 0.12;
  back.add(disk);
  top.add(back);
  const lever = mesh(beam(0, 0, -15, -6, 2.2, 2.2), '#3c2c1a', -S(2.5), -3, 6);
  top.add(lever);
  rig.body.add(top);
  rig.parts.top = top;
  rig.anims.idle = (t, dt, ctx) => { top.rotation.y = Math.sin(t * 0.3 + ctx.phase) * 0.18; };
  rig.anims.swivel = (t, dt, ctx) => { top.rotation.y = Math.sin(t * 0.6 + ctx.phase) * 0.9; };
});

// ── bookshelves — cream case, individual books (some leaning) ──────────────
function shelfModel(name, aspect, caseW, rows) {
  defineModel(name, (opts, rig) => {
    const { X, Y, S } = grid(aspect);
    const W = S(caseW);
    const D = 30;
    const cx = X(caseW / 2);
    const cream = '#dcd1b8';
    const g = group(cx, 0, 0);
    rig.body.add(g);
    const t = 3.4;
    g.add(mesh(box(W, t, D), cream, 0, 0, 0, WOOD_FINE));
    g.add(mesh(box(W, t, D), cream, 0, 100 - t, 0, WOOD_FINE));
    for (const s of [-1, 1]) g.add(mesh(box(t, 100, D), cream, s * (W / 2 - t / 2), 0, 0, WOOD_FINE));
    g.add(mesh(box(W, 100, 2), '#a99a7c', 0, 0, -D / 2 + 1, WOOD_FINE));
    // rows: [gyShelfTop, gyShelfBottom, books[[gx0, gx1, color, lean]]]
    const tilted = [];
    rows.forEach(([gyTop, gyBot, books]) => {
      const yb = Y(gyBot);
      g.add(mesh(box(W, t, D), cream, 0, yb - t, 0, WOOD_FINE));
      for (const [g0, g1, color, lean, hk = 0.92] of books) {
        const bw = S(g1 - g0);
        const bh = (Y(gyTop) - yb) * hk;
        const b = group(X(g0) - cx + bw / 2, yb, 2);
        b.add(mesh(box(bw - 0.5, bh, D * 0.72), color));
        b.add(mesh(box(bw - 0.3, 1.6, D * 0.72 + 0.3), shade(color, 0.12), 0, bh * 0.78, 0));
        if (lean) b.rotation.z = lean;
        g.add(b);
        if (lean) tilted.push(b);
      }
    });
    // now and then a leaning book settles a little
    rig.anims.always = (t2, dt, ctx) => {
      tilted.forEach((b, i) => {
        if (b.userData.base === undefined) b.userData.base = b.rotation.z;
        const c = (t2 + ctx.phase + i * 3) % 8;
        b.rotation.z = b.userData.base + (c < 0.5 ? Math.sin((c / 0.5) * PI) * 0.06 : 0);
      });
    };
  });
}

shelfModel('bookshelf', 73.2, 8.2, [
  [1.2, 3.6, [[1.0, 2.0, '#b0582c'], [2.0, 2.8, '#6e2416'], [3.0, 3.9, '#cbc272'], [3.9, 4.6, '#5a6a2c'], [4.9, 6.4, '#3d4f78', -0.45], [6.6, 7.6, '#5d8a63']]],
  [4.3, 6.6, [[1.0, 1.9, '#d4a03c'], [2.0, 3.0, '#7c6aa0'], [3.2, 4.0, '#2c4a52'], [4.0, 5.6, '#2f6f6f', 0.35], [5.8, 6.6, '#1f3037'], [6.7, 7.6, '#8fbfc6']]],
  [7.4, 9.6, [[1.0, 2.0, '#717336'], [2.0, 2.8, '#2b2b20'], [3.6, 4.6, '#c0582e'], [4.6, 5.3, '#5a1e16'], [5.8, 6.8, '#b23a3a'], [6.8, 7.4, '#4a1414']]],
]);
shelfModel('bookshelfTall', 56.9, 7.8, [
  [1.2, 3.6, [[1.0, 2.3, '#c0602e'], [2.3, 4.6, '#6e2a16'], [5.0, 6.3, '#e9d27a'], [6.3, 7.0, '#5a5422']]],
  [4.3, 6.6, [[1.0, 2.5, '#c0628e'], [2.5, 3.5, '#5a2442'], [3.9, 5.2, '#4f8a86'], [5.2, 7.0, '#1f3a37']]],
  [7.4, 9.6, [[1.0, 2.4, '#9b80b0'], [2.4, 3.3, '#4c3a5c'], [3.9, 5.3, '#4f8a86'], [5.3, 7.0, '#1d3330']]],
]);

// ── flipchart — paper pad on an easel; a page flips over now and then ──────
function scribbleTexture(seed = 1) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 200;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ece6d6';
  ctx.fillRect(0, 0, 256, 200);
  ctx.strokeStyle = 'rgba(90,82,70,0.75)';
  ctx.lineWidth = 2.2;
  let s = seed * 7919;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let k = 0; k < 3; k += 1) {
    ctx.beginPath();
    ctx.ellipse(70 + r() * 110, 70 + r() * 70, 30 + r() * 40, 14 + r() * 20, -0.6 + r(), 0, PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(150, 20);
  ctx.bezierCurveTo(120, 80, 160, 120, 90, 170);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

defineModel('flipchart', (opts, rig) => {
  const { X, Y, S } = grid(54.9);
  const boardTop = Y(0.3);
  const boardBot = Y(5.9);
  const W = S(8.7);
  const cx = X(4.6);
  const wood = '#5a4632';
  // easel: two front legs splayed, one back leg
  for (const [x0, x1] of [[2.4, 1.2], [6.8, 8.6]]) {
    rig.body.add(mesh(beam(X(x0), boardBot, X(x1), 0, 3, 3), wood, 0, 0, 3, WOOD));
  }
  const backLeg = group(X(5.6), boardBot, -1);
  backLeg.add(mesh(box(3.4, boardBot / Math.cos(0.35), 3.4).translate(0, -boardBot / Math.cos(0.35), 0), '#7a5e3e', 0, 0, 0, WOOD));
  backLeg.rotation.x = 0.35;
  rig.body.add(backLeg);
  // board + tray + top clamp
  rig.body.add(mesh(box(W, boardTop - boardBot, 2), '#dad4c4', cx, boardBot, 0));
  rig.body.add(mesh(box(W + 2, 3.5, 7), '#5c5a57', cx, boardBot - 3, 2, METAL));
  rig.body.add(mesh(box(W + 3, 4, 6), '#4d4b49', cx, boardTop - 1, 0.5, METAL));
  // pages: the visible one carries scribbles; one more hangs ready to flip
  const pageGeo = new THREE.PlaneGeometry(W - 2, boardTop - boardBot - 4).translate(0, -(boardTop - boardBot - 4) / 2, 0);
  const page = new THREE.Mesh(pageGeo, new THREE.MeshLambertMaterial({ map: scribbleTexture(rig.seed + 1), side: THREE.DoubleSide }));
  page.position.set(cx, boardTop - 1, 1.4);
  rig.body.add(page);
  const flip = group(cx, boardTop - 1, 2.2);
  const flipPage = new THREE.Mesh(pageGeo, new THREE.MeshLambertMaterial({ map: scribbleTexture(rig.seed + 5), side: THREE.DoubleSide }));
  flip.add(flipPage);
  rig.body.add(flip);
  // two clamp rings
  for (const gx of [1.5, 7.5]) rig.body.add(inkMesh(new THREE.CircleGeometry(1.8, 10), '#6d6a64', X(gx), Y(0.8), 2.4));
  rig.anims.always = (t, dt, ctx) => {
    const c = (t + ctx.phase * 2) % 10;
    // lift the page up and over the top bar, then let it fall back
    const k = c < 1.6 ? Math.sin((c / 1.6) * PI) : 0;
    flip.rotation.x = -k * 2.6;
  };
});

// ── filingCabinet — three drawers; one slides out and back now and then ────
defineModel('filingCabinet', (opts, rig) => {
  const { X, Y, S } = grid(61.7);
  const W = S(8.4);
  const D = 46;
  const cx = X(4.2);
  const body = '#b7c5be';
  rig.body.add(mesh(box(W, 100, D), body, cx, 0, -1, METAL));
  const drawers = [];
  for (const [g0, g1] of [[0.6, 3.6], [3.8, 6.7], [6.9, 9.8]]) {
    const h = Y(g0) - Y(g1);
    const dr = group(cx, Y(g1), D / 2 - 1);
    // a real drawer: front panel + a box running back into the cabinet, so a
    // pulled drawer shows its sides instead of a floating plate
    dr.add(mesh(box(W - 6, h - 2, 6), '#a9b9b2', 0, 1, -2, METAL));
    dr.add(mesh(box(W - 9, h - 6, D - 10), '#9fafa8', 0, 2, -5 - (D - 10) / 2, METAL));
    dr.add(mesh(box(S(3.0), 3.4, 1), '#e2e8e4', 0, h * 0.62, 1.4));
    dr.add(mesh(box(S(3.4), 2.4, 3), '#3f4d48', 0, h * 0.3, 2));
    rig.body.add(dr);
    drawers.push(dr);
  }
  rig.anims.always = (t, dt, ctx) => {
    const c = (t + ctx.phase * 2) % 9;
    const k = c < 2.2 ? Math.min(1, c / 0.4, (2.2 - c) / 0.4) : 0;
    drawers[1].position.z = D / 2 - 1 + k * 18;
  };
});

// ── papers — a fanned stack of sheets ──────────────────────────────────────
defineModel('papers', (opts, rig) => {
  const { X, Y, S } = grid(89.8);
  const sheets = [];
  for (let i = 0; i < 5; i += 1) {
    const p = group(X(1.0 + i * 0.6), 0, -i * 2);
    p.add(mesh(box(S(6.3), Y(0.4 + i * 0.25), 1.2), i % 2 ? '#e8e1cf' : '#efe9dc', S(3.1), 0, 0));
    p.rotation.z = 0.12 - i * 0.03;
    rig.body.add(p);
    sheets.push(p);
  }
  rig.anims.always = (t, dt, ctx) => {
    sheets[0].rotation.z = 0.12 + Math.max(0, Math.sin(t * 1.1 + ctx.phase)) * 0.04;
  };
});

// ── mug — cream mug with two handles, coffee, rising steam ─────────────────
defineModel('mug', (opts, rig) => {
  const { X, Y, S } = grid(88.4);
  const R = S(2.9);
  const top = Y(3.9);
  rig.body.add(mesh(new THREE.CylinderGeometry(R, R * 0.96, top - 8, 14).translate(0, 8 + (top - 8) / 2, 0), '#d4ccb3', X(4.3), 0, 0));
  rig.body.add(mesh(new THREE.CylinderGeometry(R * 0.96, R * 0.94, 8, 14).translate(0, 4, 0), '#8a5a3a', X(4.3), 0, 0));
  rig.body.add(inkMesh(new THREE.CircleGeometry(R - 2, 14).rotateX(-PI / 2), '#3a2416', X(4.3), top - 2.5, 0));
  rig.body.add(mesh(new THREE.TorusGeometry(R - 1, 1.6, 4, 14).rotateX(PI / 2), '#ddd5bd', X(4.3), top, 0));
  for (const s of [-1, 1]) {
    const h = mesh(new THREE.TorusGeometry(S(0.95), 3.2, 6, 10), '#cfc6ad', X(4.3) + s * (R + S(0.55)), Y(6.9), 0);
    h.scale.z = 0.6;
    rig.body.add(h);
  }
  const st = smoke(X(4.3), top + 2, 0, { size: 3.2, rise: 32, count: 3, drift: 2 });
  st.group.children.forEach((m) => { m.material.color.set('#e9dfcf'); });
  rig.body.add(st.group);
  rig.anims.always = (t) => st.update(t * 1.2);
});

// ── plant — faceted slate pot, lance leaves that sway ──────────────────────
defineModel('plant', (opts, rig) => {
  const { X, Y, S } = grid(75.0);
  const pot = new THREE.IcosahedronGeometry(1, 0).scale(S(3.2), 19, S(3.0)).translate(0, 17, 0);
  rig.body.add(mesh(pot, '#6c8180', X(4.6), 0, 0));
  rig.body.add(inkMesh(new THREE.CircleGeometry(S(2.6), 10).rotateX(-PI / 2), '#3e3326', X(4.6), Y(6.3) - 2, 0));
  const leaves = pottedPlant(rig.body, {
    x: X(4.6), y: Y(6.3) - 7, z: 0, potR: 0.01, potH: 0.01, potColor: '#6c8180',
    leaves: 9, leafLen: Y(0.1) - Y(6.0), leafW: S(2.0), spread: 1.35, leafColors: ['#8c9a50', '#51684b', '#6f8a4a', '#47604a', '#98a45f'],
  });
  rig.anims.sway = (t, dt, ctx) => swayLeaves(leaves, t, ctx.phase);
});

// ── gemTan — a faceted paper gem (desk ornament) that turns slowly ─────────
defineModel('gemTan', (opts, rig) => {
  const { S } = grid(97.1);
  const r = 47;
  // an octagonal paper gem lying on its edge, crown facing the viewer
  const crown = new THREE.ConeGeometry(r, 26, 8).rotateX(PI / 2).translate(0, 0, 13);
  const back = new THREE.ConeGeometry(r, 18, 8).rotateX(-PI / 2).translate(0, 0, -9);
  const gem = group(0, r * 0.98, 0);
  gem.add(mesh(crown, '#d8bb8e'));
  gem.add(mesh(back, '#b8945f'));
  rig.body.add(gem);
  rig.anims.always = (t, dt, ctx) => { gem.rotation.z = Math.sin(t * 0.4 + ctx.phase) * 0.2; gem.rotation.y = Math.sin(t * 0.3 + ctx.phase) * 0.25; };
});

// ── bookStack — two closed books lying flat ────────────────────────────────
defineModel('bookStack', (opts, rig) => {
  const { X, Y, S } = grid(173.5);
  const D = 60;
  const b1 = mesh(box(S(8.4), Y(7.5), D), '#e2dccc', X(4.5), 0, 0);
  const b2 = mesh(box(S(8.2), Y(4.4) - Y(7.4), D * 0.95), '#d8d0bc', X(4.6), Y(7.5), -2);
  b2.rotation.y = 0.06;
  rig.body.add(b1, b2);
  // spines
  rig.body.add(mesh(box(S(8.4), Y(7.5) - 2, 2), '#b5a77e', X(4.5), 1, -D / 2));
  rig.body.add(mesh(box(S(8.2), Y(4.4) - Y(7.4) - 2, 2), '#a8996f', X(4.6), Y(7.5) + 1, -D / 2 * 0.95 - 2));
});

// ── clock — ochre-rimmed clock whose hands really turn ─────────────────────
defineModel('clock', (opts, rig) => {
  const { X, S } = grid(103.2);
  const R = 48;
  const cx = X(4.6);
  rig.body.add(mesh(new THREE.CylinderGeometry(R, R, 14, 24).rotateX(PI / 2), '#c99a5a', cx, 50, -4, WOOD_FINE));
  rig.body.add(mesh(new THREE.CylinderGeometry(R - 6, R - 6, 2, 24).rotateX(PI / 2), '#ece2c9', cx, 50, 3.2));
  // little feet so it stands
  // (tall enough to reach the ring: at x = ±22 its rim is ~7.3 up)
  for (const s of [-1, 1]) rig.body.add(mesh(box(6, 9.5, 8), '#b0864c', cx + s * 22, 0, -4, WOOD_FINE));
  const hourP = group(cx, 50, 5);
  hourP.add(mesh(box(4, 22, 1.2).translate(0, -2, 0), '#253331'));
  const minP = group(cx, 50, 6.2);
  minP.add(mesh(box(3.4, 32, 1.2).translate(0, -3, 0), '#1b2d2c'));
  rig.body.add(hourP, minP, inkMesh(new THREE.CircleGeometry(3, 10), '#1b2d2c', cx, 50, 7));
  rig.anims.always = (t, dt, ctx) => {
    const m = t * 0.5 + ctx.phase;
    minP.rotation.z = -m;
    hourP.rotation.z = -m / 12 - 0.6;
  };
});

// ── wasteBasket — tapered open bin with slots ─────────────────────────────
defineModel('wasteBasket', (opts, rig) => {
  const { X, S } = grid(94.6);
  const R = S(4.3);
  const r = S(3.4);
  rig.body.add(mesh(new THREE.CylinderGeometry(R, r, 96, 14, 1, true).translate(0, 48, 0), '#aca189', X(5), 0, 0, { ...METAL, side: THREE.DoubleSide }));
  rig.body.add(new THREE.Mesh(new THREE.CircleGeometry(r, 14).rotateX(-PI / 2).translate(X(5), 1, 0), mat('#5a5040')));
  rig.body.add(mesh(new THREE.TorusGeometry(R, 2, 4, 14).rotateX(PI / 2), '#9a8f78', X(5), 96, 0));
  const tilt = Math.atan2(R - r, 96);
  const rMid = r + (R - r) * (46 / 96) + 0.5;
  for (let i = 0; i < 5; i += 1) {
    const a = -0.9 + i * 0.45;
    const sl = mesh(cbox(5, 60, 1), '#6e6450', X(5) + Math.sin(a) * rMid, 46, Math.cos(a) * rMid);
    sl.rotation.order = 'YXZ';
    sl.rotation.y = a;
    sl.rotation.x = tilt;
    rig.body.add(sl);
  }
  // a crumpled paper ball, tossed in now and then
  const ball = mesh(new THREE.IcosahedronGeometry(7, 0), '#ece6da', X(5), 100, 0);
  rig.body.add(ball);
  rig.anims.always = (t, dt, ctx) => {
    const c = (t + ctx.phase * 3) % 7;
    const k = Math.min(1, c / 1.2);
    ball.position.set(X(5) + (1 - k) * 60, 96 + Math.sin(k * PI) * 40 - k * 30, 0);
    ball.visible = c < 1.25;
    ball.rotation.set(k * 5, k * 3, 0);
  };
});

// ── meeting tables ─────────────────────────────────────────────────────────
defineModel('meetingTable', (opts, rig) => {
  const { X, Y, S } = grid(227.0);
  const topY = Y(4.4);
  const D = 70;
  rig.body.add(table({ w: S(9.0), h: topY, d: D, top: '#a3958f', leg: '#6c5a50', thick: 7, legW: 7 }));
  const seatY = Y(6.8);
  const cw = S(1.35);
  // two chairs behind (facing us), two in front (backs to us)
  for (const [gx, col] of [[3.2, '#788776'], [6.3, '#576150']]) {
    const c = chair({ w: cw, seatY, backH: 40, d: 26, color: col });
    c.position.set(X(gx), 0, -D / 2 - 4);
    rig.body.add(c);
  }
  for (const [gx, col] of [[2.4, '#5a614e'], [5.6, '#8ea08f']]) {
    const c = chair({ w: cw, seatY, backH: 32, d: 26, color: col });
    c.rotation.y = PI;
    c.position.set(X(gx), 0, D / 2 + 4);
    rig.body.add(c);
  }
  const leaves = pottedPlant(rig.body, {
    x: X(8.2), y: topY, z: -6, potR: 8, potH: 14, potColor: '#a86a45', leaves: 6, leafLen: 22, leafW: 6,
    leafColors: ['#8c9a50', '#6f8a4a', '#98a45f'],
  });
  rig.anims.sway = (t, dt, ctx) => swayLeaves(leaves, t, ctx.phase);
});

defineModel('longTable', (opts, rig) => {
  const { X, Y, S } = grid(152.2);
  const topY = Y(5.6);
  const D = 60;
  rig.body.add(table({ w: S(9.6), h: topY, d: D, top: '#a5b6ac', leg: '#667a68', thick: 6, legW: 6 }));
  const seatY = Y(7.5);
  const cw = S(1.4);
  for (const [gx, col] of [[3.9, '#b07a3d'], [6.3, '#584834']]) {
    const c = chair({ w: cw, seatY, backH: 32, d: 24, color: col });
    c.position.set(X(gx), 0, -D / 2 - 4);
    rig.body.add(c);
  }
  for (const [gx, col] of [[2.7, '#c08e55'], [5.3, '#8f7a64']]) {
    const c = chair({ w: cw, seatY, backH: 26, d: 24, color: col });
    c.rotation.y = PI;
    c.position.set(X(gx), 0, D / 2 + 4);
    rig.body.add(c);
  }
  for (const [gx, col, rot] of [[0.6, '#3a2a1e', PI / 2], [9.3, '#9c8673', -PI / 2]]) {
    const c = chair({ w: cw, seatY, backH: 30, d: 24, color: col });
    c.rotation.y = rot;
    c.position.set(X(gx), 0, 0);
    rig.body.add(c);
  }
  // desk lamp on the right end
  const lx = X(8.6);
  rig.body.add(mesh(new THREE.CylinderGeometry(7, 8, 3, 12).translate(0, 1.5, 0), '#4a3a2c', lx, topY, -8, METAL));
  rig.body.add(mesh(beam(0, 0, 0, Y(1.8) - topY, 2.4, 2.4), '#4a3a2c', lx + 4, topY, -8, METAL));
  rig.body.add(mesh(beam(4, Y(1.8) - topY, -9, Y(1.0) - topY, 2.4, 2.4), '#4a3a2c', lx, topY, -8, METAL));
  const shadeG = group(lx - 12, Y(1.2), -8);
  shadeG.add(mesh(new THREE.ConeGeometry(11, 13, 8, 1, true).translate(0, -6, 0), '#c8743a', 0, 0, 0, { ...FABRIC, side: THREE.DoubleSide }));
  shadeG.rotation.z = 0.5;
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffe3a0' });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(3.6, 10, 8), bulbMat);
  bulb.position.set(0, -10, 0);
  shadeG.add(bulb);
  rig.body.add(shadeG);
  rig.anims.always = (t, dt, ctx) => {
    const k = 0.92 + Math.sin(t * 3.1 + ctx.phase) * 0.04 + (Math.sin(t * 17 + ctx.phase) > 0.98 ? -0.15 : 0);
    bulbMat.color.setRGB(1 * k, 0.89 * k, 0.63 * k);
  };
});

// A strip of paper laid ON the head (rows [y, halfWidth] top → bottom,
// centered at x = cx): every vertex sits on the head surface + lift, so a
// facial stripe hugs the skull instead of standing off it like a crest.
function headStrip(surfZ, cx, rows, color, lift = 0.5) {
  const COLS = 6;
  const pos = [];
  const idx = [];
  rows.forEach(([y, hw], r) => {
    for (let c = 0; c <= COLS; c += 1) {
      const x = cx - hw + (2 * hw * c) / COLS;
      pos.push(x, y, surfZ(x, y) + lift);
    }
    if (r > 0) {
      const a = (r - 1) * (COLS + 1);
      const b = r * (COLS + 1);
      for (let c = 0; c < COLS; c += 1) idx.push(a + c, b + c, a + c + 1, b + c, b + c + 1, a + c + 1);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return mesh(g, color, 0, 0, 0, { side: THREE.DoubleSide, jitter: 0.02 });
}

// ── the animal colleagues ──────────────────────────────────────────────────
// A shared rig: a faceted suit body (gem-like, vertex to the front) with
// lapels and a tie, little arms on shoulder pivots, and a big round head on
// a neck pivot carrying ears, a protruding muzzle, blinking eyes, cheeks.
function colleague(rig, spec) {
  const { X, Y, S } = grid(spec.aspect);
  const cx = X(spec.cx ?? 5);
  const neckY = Y(spec.neckGy);
  const shY = Y(spec.shoulderGy);
  const rSh = S(spec.shoulderHw);
  const rNeck = S(spec.neckHw);

  // body: neck ring → shoulders → down to a point at the feet
  const bodyG = group(cx, 0, 0);
  rig.body.add(bodyG);
  const upper = new THREE.CylinderGeometry(rNeck, rSh, neckY - shY, 6).translate(0, shY + (neckY - shY) / 2, 0);
  // the suit hangs straight a little below the shoulders, then folds to a point
  const midY = shY * 0.62;
  const mid = new THREE.CylinderGeometry(rSh, rSh * 0.94, shY - midY, 6).translate(0, midY + (shY - midY) / 2, 0);
  const lower = new THREE.CylinderGeometry(rSh * 0.94, rSh * 0.12, midY, 6).translate(0, midY / 2, 0);
  bodyG.add(mesh(upper, spec.suitLight, 0, 0, 0, FABRIC));
  bodyG.add(mesh(mid, spec.suit, 0, 0, 0, FABRIC));
  bodyG.add(mesh(lower, shade(spec.suit, -0.03), 0, 0, 0, FABRIC));
  // lapels + tie lie ON the chest. The body is a hexagonal solid with a
  // vertex at the front, so its front surface is exactly
  //   z(x, y) = R(y) − tan30°·|x|
  // with R(y) piecewise-linear between neck, shoulders, mid and foot. A patch
  // is built row by row (rows added at every body breakpoint, columns split
  // at x = 0 where the fold is) and every vertex is set onto that surface,
  // `lift` proud — so it follows each facet without ever being cut by one.
  const R = (y) => {
    if (y >= shY) return rNeck + ((rSh - rNeck) * (neckY - y)) / (neckY - shY);
    if (y >= midY) return rSh - ((rSh - rSh * 0.94) * (shY - y)) / (shY - midY);
    return rSh * 0.12 + ((rSh * 0.94 - rSh * 0.12) * y) / midY;
  };
  const TAN30 = Math.tan(PI / 6);
  const zFront = (x, y) => R(y) - TAN30 * Math.abs(x);
  // rows: [[y, xLeft, xRight], …] top → bottom
  const chestPatch = (rows, lift, color) => {
    const all = [];
    for (let i = 0; i < rows.length; i += 1) {
      all.push(rows[i]);
      if (i + 1 < rows.length) {
        const [y0, a0, b0] = rows[i];
        const [y1, a1, b1] = rows[i + 1];
        for (const yb of [shY, midY]) {
          if (yb < y0 && yb > y1) {
            const k = (y0 - yb) / (y0 - y1);
            all.push([yb, a0 + (a1 - a0) * k, b0 + (b1 - b0) * k]);
          }
        }
      }
    }
    const cols = (xa, xb) => (xa < 0 && xb > 0 ? [xa, 0, xb] : [xa, (xa + xb) / 2, xb]);
    const pos = [];
    const idx = [];
    all.forEach(([y, xa, xb], r) => {
      for (const x of cols(xa, xb)) pos.push(x, y, zFront(x, y) + lift);
      if (r > 0) {
        const p0 = (r - 1) * 3;
        const p1 = r * 3;
        for (let c = 0; c < 2; c += 1) idx.push(p0 + c, p1 + c, p0 + c + 1, p1 + c, p1 + c + 1, p0 + c + 1);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return mesh(g, color, 0, 0, 0, { side: THREE.DoubleSide, jitter: 0.02 });
  };
  // everything on the chest starts just under the chin, never in front of it
  const headBottom = neckY - 2 + (Y(spec.headGy) - (neckY - 2)) - spec.headRy;
  const top = Math.min(neckY - 1, headBottom + 2);
  const lapW = Math.min(rNeck * 0.9, R(top) * 0.75);
  const lapBot = Math.max(midY + 2, shY - 12);
  for (const s of [-1, 1]) {
    // a V: wide at the collar, folding to a point toward the button line
    const rows = [[top, 0.6, lapW], [shY, 1.2, lapW * 0.75], [lapBot, 3.2, 3.6]];
    bodyG.add(chestPatch(rows.map(([y, a, b2]) => (s < 0 ? [y, -b2, -a] : [y, a, b2])), 0.5, spec.lapel));
  }
  if (spec.tie) {
    const knot = top - 4;
    bodyG.add(chestPatch([[top, -2.4, 2.4], [knot, -1.7, 1.7]], 1.3, shade(spec.tie, 0.04)));
    bodyG.add(chestPatch([[knot, -1.7, 1.7], [lapBot + 1, -3.3, 3.3], [lapBot - 4, 0, 0.01]], 1.0, spec.tie));
  }
  // arms: tapered paper sleeves on shoulder pivots, paws at the ends
  const arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * rSh * 0.8, shY + 3, 0);
    const sleeve = new THREE.CylinderGeometry(6.2, 4.4, 15, 5).translate(0, -7.5, 0);
    a.add(mesh(sleeve, spec.suit, 0, 0, 0, FABRIC));
    a.add(mesh(new THREE.SphereGeometry(3.8, 8, 6).translate(0, -16, 0), spec.paw));
    a.rotation.z = s * 0.8;
    bodyG.add(a);
    arms.push(a);
  }

  // head on the neck pivot
  const head = group(0, neckY - 2, 0);
  bodyG.add(head);
  const hcY = Y(spec.headGy) - (neckY - 2);
  const rx = S(spec.headHw);
  const ry = spec.headRy;
  const rz = rx * 0.78;
  head.add(mesh(new THREE.SphereGeometry(1, 16, 12).scale(rx, ry, rz), spec.fur, 0, hcY, 0, FUR));
  const surfZ = (x, y) => rz * Math.sqrt(Math.max(0.02, 1 - (x / rx) ** 2 - ((y - hcY) / ry) ** 2));
  const hx = (gx) => X(gx) - cx;
  const hy = (gy) => Y(gy) - (neckY - 2);

  // ears on pivots (flick)
  const ears = [];
  for (const [i, s] of [[0, -1], [1, 1]]) {
    const e = spec.ears;
    const ear = group(s * S(e.dx), hy(e.gy), -rz * 0.2);
    if (e.kind === 'round') {
      ear.add(mesh(new THREE.CylinderGeometry(S(e.r), S(e.r), 6, 14).rotateX(PI / 2), e.colors[i], 0, 0, 0, FUR));
      ear.add(mesh(new THREE.CylinderGeometry(S(e.r) * 0.55, S(e.r) * 0.55, 1, 12).rotateX(PI / 2), shade(e.colors[i], -0.06), 0, -1, 3.2));
    } else if (e.kind === 'point') {
      ear.add(mesh(new THREE.ConeGeometry(S(e.r), S(e.h), 4).translate(0, S(e.h) / 2, 0).scale(1, 1, 0.45), e.colors[i], 0, 0, 0, FUR));
      ear.rotation.z = -s * 0.35;
    } else {
      ear.add(mesh(box(S(e.r) * 2, S(e.r) * 1.8, 5), e.colors[i], 0, 0, 0, FUR));
      ear.rotation.z = -s * 0.2;
    }
    head.add(ear);
    ears.push(ear);
  }

  // muzzle / stripe / nose
  spec.muzzle?.({ head, hx, hy, surfZ, S, rx, ry, rz, hcY });

  // eyes + cheeks follow the head's curve
  const eyY = hy(spec.eyeGy);
  const ex = Math.abs(hx(spec.eyeGx));
  const ey = eyes(ex, spec.eyeR ?? 1.9);
  ey.group.children.forEach((e) => {
    e.position.z = surfZ(e.position.x, eyY) + 0.4;
    e.rotation.y = Math.asin(e.position.x / rx) * 0.9;
  });
  ey.group.position.y = eyY;
  head.add(ey.group);
  for (const s of [-1, 1]) {
    const c = cheek(S(spec.cheekR), spec.cheekColor ?? '#e2a3a0');
    // keep the whole disc inside the head's silhouette, lying on its curve
    const x = s * Math.min(Math.abs(hx(spec.cheekGx)), rx * 0.74 - S(spec.cheekR) * 0.4);
    const y = hy(spec.cheekGy);
    const z = surfZ(x, y);
    const n = new THREE.Vector3(x / (rx * rx), (y - hcY) / (ry * ry), z / (rz * rz)).normalize();
    c.position.set(x, y, z).addScaledVector(n, 0.5);
    c.lookAt(c.position.clone().add(n));
    head.add(c);
  }

  // animations
  const blink = blinker(rig.seed + spec.aspect);
  rig.anims.always = (t) => {
    ey.blink(blink(t));
    const c = (t + rig.seed * 1.7) % 6.1;
    ears[0].rotation.x = c < 0.3 ? -Math.sin((c / 0.3) * PI) * 0.3 : 0;
    const c2 = (t + rig.seed * 1.7 + 2.6) % 7.3;
    ears[1].rotation.x = c2 < 0.3 ? -Math.sin((c2 / 0.3) * PI) * 0.3 : 0;
  };
  const restArm = (a, s) => { a.rotation.set(0, 0, s * 0.8); };
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2 + ctx.phase);
    bodyG.scale.set(1 - b * 0.006, 1 + b * 0.012, 1);
    head.rotation.z = Math.sin(t * 0.6 + ctx.phase) * 0.06;
    head.rotation.y = Math.sin(t * 0.35 + ctx.phase) * 0.25;
    // every few seconds: a friendly wave with the right paw
    const c = (t + ctx.phase * 3) % 9;
    restArm(arms[0], -1);
    if (c < 2) {
      const k = Math.min(1, c / 0.35, (2 - c) / 0.35);
      arms[1].rotation.z = 0.8 + k * 1.9;
      arms[1].rotation.x = Math.sin(t * 12) * 0.25 * k;
    } else {
      restArm(arms[1], 1);
    }
  };
  // presenting: open-palm gestures with both arms, head nods
  rig.anims.gesture = (t, dt, ctx) => {
    const k = Math.sin(t * 1.6 + ctx.phase);
    arms[0].rotation.z = -0.55 - (0.6 + 0.4 * k);
    arms[1].rotation.z = 0.55 + (0.6 - 0.4 * k);
    arms[0].rotation.x = -0.6;
    arms[1].rotation.x = -0.6;
    head.rotation.x = Math.max(0, Math.sin(t * 2.4 + ctx.phase)) * 0.12;
    head.rotation.y = k * 0.15;
  };
  // typing: forearms forward, paws pattering
  rig.anims.type = (t, dt, ctx) => {
    arms.forEach((a, i) => {
      a.rotation.z = (i ? 1 : -1) * 0.25;
      a.rotation.x = -1.2 + Math.sin(t * 14 + i * PI + ctx.phase) * 0.12;
    });
    head.rotation.x = 0.12;
    head.rotation.y = Math.sin(t * 0.4 + ctx.phase) * 0.1;
  };
}

defineModel('bearBoss', (opts, rig) => colleague(rig, {
  aspect: 70.9, neckGy: 5.7, shoulderGy: 7.4, shoulderHw: 4.3, neckHw: 2.5,
  suit: '#b8926a', suitLight: '#d6bb92', lapel: '#e2cba5', paw: '#7d8c8e',
  fur: '#7f8f91', headGy: 3.3, headHw: 4.6, headRy: 26,
  ears: { kind: 'round', dx: 3.9, gy: 1.0, r: 1.35, colors: ['#5d493d', '#5d493d'] },
  eyeGx: 2.7, eyeGy: 3.35, cheekGx: 1.6, cheekGy: 4.15, cheekR: 1.05,
  muzzle({ head, hx, hy, surfZ, S }) {
    const y = hy(3.9);
    // a soft, low muzzle dome (not a horn) with the nose button on its front
    const my = hy(4.0);
    const m = mesh(new THREE.SphereGeometry(1, 14, 10).scale(S(1.55), 13, 7), '#e4dfcd', hx(5.2), my, surfZ(0, my) - 2.5);
    head.add(m);
    head.add(inkMesh(new THREE.SphereGeometry(1, 12, 8).scale(S(0.7), 4.2, 2.6), '#2c1d10', hx(5.2), hy(3.85), surfZ(0, my) + 4.2));
  },
}));

defineModel('catWorker', (opts, rig) => colleague(rig, {
  aspect: 62.0, cx: 4.7, neckGy: 6.0, shoulderGy: 7.3, shoulderHw: 4.3, neckHw: 2.4, tie: '#504434',
  suit: '#8fa594', suitLight: '#b6c5b9', lapel: '#c7d3c8', paw: '#ddd5c3',
  fur: '#e2dac8', headGy: 3.4, headHw: 4.4, headRy: 27,
  ears: { kind: 'point', dx: 2.9, gy: 1.5, r: 1.25, h: 2.4, colors: ['#b5a07a', '#9a9a92'] },
  eyeGx: 1.85, eyeGy: 3.7, cheekGx: 0.95, cheekGy: 4.45, cheekR: 1.0,
  muzzle({ head, hx, hy, surfZ, S }) {
    // the dark stripe from the brow down to the nose: a raised ridge
    const y = hy(2.55);
    // the dark stripe from the brow down to the nose, lying on the skull
    const rows = [];
    for (let gy = 1.2; gy <= 4.05; gy += 0.25) rows.push([hy(gy), S(gy < 2 ? 0.55 + (gy - 1.2) * 0.4 : 0.85)]);
    head.add(headStrip(surfZ, hx(4.6), rows, '#7e7364', 0.5));
    // a small soft snout pad with the nose button on it
    const ny = hy(4.3);
    head.add(mesh(new THREE.SphereGeometry(1, 12, 8).scale(6.5, 5, 3.5), '#8a7f70', hx(4.6), ny, surfZ(0, ny) - 0.8));
    head.add(inkMesh(new THREE.SphereGeometry(1, 10, 8).scale(3.4, 2.5, 2), '#2b231b', hx(4.6), ny + 0.6, surfZ(0, ny) + 2.4));
    for (const s of [-1, 1]) head.add(mesh(box(1.8, 3.4, 1), '#f3eee2', hx(4.6) + s * 1.3, hy(4.95), surfZ(0, hy(4.95)) + 0.2));
  },
}));

defineModel('koalaWorker', (opts, rig) => colleague(rig, {
  aspect: 66.8, neckGy: 6.0, shoulderGy: 7.0, shoulderHw: 4.5, neckHw: 2.6, tie: '#9e8d78',
  suit: '#8e9fa1', suitLight: '#b0bcba', lapel: '#c4cdcb', paw: '#e3dccb',
  fur: '#e6dfcd', headGy: 3.4, headHw: 4.7, headRy: 28,
  ears: { kind: 'square', dx: 3.3, gy: 1.35, r: 0.75, colors: ['#9b8461', '#9b8461'] },
  eyeGx: 2.25, eyeGy: 3.2, cheekGx: 1.4, cheekGy: 4.2, cheekR: 1.1,
  muzzle({ head, hx, hy, surfZ, S }) {
    const y = hy(3.85);
    head.add(inkMesh(new THREE.SphereGeometry(1, 14, 10).scale(S(0.9), 6.2, 4.5), '#1d1712', hx(5.2), y, surfZ(0, y) + 1));
  },
}));

defineModel('bearWorker', (opts, rig) => colleague(rig, {
  aspect: 64.5, neckGy: 5.9, shoulderGy: 7.6, shoulderHw: 4.3, neckHw: 2.5, tie: '#2d4939',
  suit: '#90ab98', suitLight: '#cbd5c5', lapel: '#d8e0d4', paw: '#e5dfce',
  fur: '#e6e0cf', headGy: 3.4, headHw: 4.5, headRy: 27,
  ears: { kind: 'round', dx: 3.8, gy: 0.9, r: 1.15, colors: ['#986f51', '#7a5236'] },
  eyeGx: 2.5, eyeGy: 3.3, cheekGx: 1.4, cheekGy: 4.2, cheekR: 1.05,
  muzzle({ head, hx, hy, surfZ, S }) {
    // long brown snout running from the brow to the nose
    // the brown stripe as low relief on the face, ending in a soft round
    // muzzle with the nose button — cute, not a long horn
    const rows = [];
    for (let gy = 1.0; gy <= 4.2; gy += 0.25) rows.push([hy(gy), S(gy < 1.6 ? 0.9 + (gy - 1.0) * 0.6 : 1.25)]);
    head.add(headStrip(surfZ, hx(4.9), rows, '#936b4b', 0.5));
    const my = hy(4.3);
    head.add(mesh(new THREE.SphereGeometry(1, 14, 10).scale(S(1.6), 11, 6.5), '#936b4b', hx(4.9), my, surfZ(0, my) - 2.2));
    head.add(inkMesh(new THREE.SphereGeometry(1, 12, 8).scale(S(0.65), 3.8, 2.4), '#241811', hx(4.9), hy(4.2), surfZ(0, my) + 4.2));
  },
}));

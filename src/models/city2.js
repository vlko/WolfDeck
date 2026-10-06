import * as THREE from 'three';
import { defineModel, buildModel } from './registry.js';
import { tieredTree } from './trees.js';
import {
  mesh, inkMesh, box, cbox, beam, gable, fold, foldPanel, group, smoke, eyes, cheek, blinker, facet, mat, ink, PI,
} from './kit.js';

// Models for the pieces on the "city 2" sheet. Same conventions as the
// other packs: sprite-percent units, a 10 × 10 grid read off the sprite,
// origami fold-light, rigged moving parts.

function grid(aspect) {
  return {
    X: (gx) => (gx / 10 - 0.5) * aspect,
    Y: (gy) => 100 - gy * 10,
    S: (g) => (g / 10) * aspect,
  };
}

const WOOD = { tex: 'wood' };
const WOOD_FINE = { tex: 'woodFine' };
const BOARDS = { tex: 'boards' };
const PLANKS = { tex: 'planks' };
const PLASTER = { tex: 'plaster' };
const ASHLAR = { tex: 'ashlar' };
const RUBBLE = { tex: 'rubble' };
const PAVING = { tex: 'paving' };
const SHINGLE = { tex: 'shingle' };
const ROOF_TILE = { tex: 'roofTile' };
const BRICK = { tex: 'brick' };
const FABRIC = { tex: 'fabric' };
const METAL = { tex: 'metal' };
const FUR = { tex: 'fur' };
const LEAF = { tex: 'leaf' };
const BARK = { tex: 'bark' };

const GLOW = '#f3dfae';
const DARK_PANE = '#26332d';

// A window pane (flat, unlit so lit panes glow) at (x, y) bottom-left
// corner in units, w × h, at depth z; returns the mesh.
function pane(x, y, w, h, z, color, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x + w / 2, y + h / 2, z);
  m.rotation.y = rotY;
  return m;
}

// Panes on a folded facade: laid onto the fold's half-planes (split at the
// crease), so the ridge never pokes through a window that straddles it.
function facadePane(geo, cx, ridge, halfW, x, y, w, h, color, lift = 0.25) {
  return new THREE.Mesh(foldPanel(geo, x, x + w, y, y + h, lift), new THREE.MeshBasicMaterial({ color }));
}

// Lit windows that now and then flick on or off — the city breathes.
function windowFlicker(rig, panes, seed = 0) {
  let next = 1.5 + (seed % 2);
  let s = seed * 7 + 3;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  rig.anims.windowGlow = (t) => {
    if (t < next) return;
    next = t + 1.2 + rnd() * 2.5;
    const p = panes[Math.floor(rnd() * panes.length)];
    const lit = p.material.color.getHexString() === new THREE.Color(GLOW).getHexString();
    p.material.color.set(lit ? DARK_PANE : GLOW);
  };
}

// Mullion cross over a window (x, y bottom-left, w × h) at depth z.
function mullions(x, y, w, h, z, color, bar = 1.2) {
  const g = new THREE.Group();
  g.add(mesh(cbox(bar, h, 0.8), color, x + w / 2, y + h / 2, z));
  g.add(mesh(cbox(w, bar, 0.8), color, x + w / 2, y + h / 2, z));
  return g;
}

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

// Roof seen end-on, apex/eaves = outer edge — one continuous solid.
function roof(apexX, apexY, halfSpan, eaveY, t, d, color) {
  return mesh(roofSolid(apexX, apexY, halfSpan, eaveY, t, d), color);
}

function door(x, w, h, z, color, tex = WOOD_FINE, knob = true) {
  const g = group(x, 0, z);
  g.add(mesh(box(w, h, 1.6), color, 0, 0, 0, tex));
  if (knob) g.add(inkMesh(new THREE.SphereGeometry(Math.max(1, w * 0.07), 8, 6), '#1c1a17', w * 0.3, h * 0.42, 1.2));
  return g;
}

// ── towerSlate — tall slate-green faceted block, five rows of windows ───────
defineModel('towerSlate', (opts, rig) => {
  const { X, Y, S } = grid(37.2);
  const D = 30;
  const ridge = 4;
  const top = fold([[X(0), Y(7.2)], [X(10), Y(7.2)], [X(10), Y(0)], [X(0), Y(0)]], D, ridge, { cx: 0 });
  rig.body.add(mesh(top, '#7b8e82', 0, 0, 0, PLASTER));
  const base = fold([[X(0), Y(10)], [X(10), Y(10)], [X(10), Y(7.2)], [X(0), Y(7.2)]], D + 1, ridge + 0.5, { cx: 0 });
  rig.body.add(mesh(base, '#68756f', 0, 0, 0, ASHLAR));
  rig.body.add(mesh(box(S(10) + 1, 2, D + 2), '#5c6863', 0, 100 - 2, 0));
  const pattern = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [1, 0, 1], [0, 0, 1], [1, 1, 0]];
  const cols = [[0.8, 2.6], [4.0, 5.8], [7.1, 8.9]];
  const panes = [];
  pattern.forEach((row, r) => {
    const gy0 = 0.35 + r * 1.2;
    row.forEach((lit, c) => {
      const [g0, g1] = cols[c];
      const p = facadePane(top, 0, ridge, S(5), X(g0), Y(gy0 + 0.9), S(g1 - g0), 9, lit ? GLOW : DARK_PANE);
      rig.body.add(p);
      panes.push(p);
    });
  });
  rig.body.add(facadePane(base, 0, ridge + 0.5, S(5), X(3.4), 0, S(3.4), Y(8.5), '#1f2b26', 0.3));
  windowFlicker(rig, panes, rig.seed + 1);
});

// ── towerIvory — ivory block under a sage pyramid cap ───────────────────────
defineModel('towerIvory', (opts, rig) => {
  const { X, Y, S } = grid(36.1);
  const D = 32;
  const ridge = 4;
  const body = fold([[X(0.2), 0], [X(9.8), 0], [X(9.8), Y(1.9)], [X(0.2), Y(1.9)]], D, ridge, { cx: 0 });
  rig.body.add(mesh(body, '#efe9db', 0, 0, 0, PLASTER));
  const cap = new THREE.ConeGeometry(S(4.9) * Math.SQRT2 * 0.72, Y(0) - Y(1.9), 4, 1).translate(0, Y(1.9) + (Y(0) - Y(1.9)) / 2, 0);
  cap.scale(1, 1, (D / 2 + ridge) / (S(4.9)));
  rig.body.add(mesh(cap, '#a9b8a9', 0, 0, 0, SHINGLE));
  const lit = [[1, 0, 1], [1, 0, 0], [0, 1, 0], [1, 0, 0]];
  const cols = [[1.0, 2.7], [4.0, 5.7], [7.0, 8.7]];
  const panes = [];
  lit.forEach((row, r) => {
    const gy0 = 2.3 + r * 1.25;
    row.forEach((l, c) => {
      const [g0, g1] = cols[c];
      const p = facadePane(body, 0, ridge, S(4.8), X(g0), Y(gy0 + 0.85), S(g1 - g0), 8.5, l ? GLOW : DARK_PANE);
      rig.body.add(p);
      panes.push(p);
    });
  });
  rig.body.add(facadePane(body, 0, ridge, S(4.8), X(3.6), 0, S(2.7), Y(8.4), '#212e26', 0.3));
  windowFlicker(rig, panes, rig.seed + 2);
});

// ── townhouseRose — cream townhouse, rose awning, red door ──────────────────
defineModel('townhouseRose', (opts, rig) => {
  const { X, Y, S } = grid(47.7);
  const D = 34;
  const front = D / 2;
  rig.body.add(mesh(box(S(9.2), Y(1.9), D), '#ece4d2', 0, 0, 0, PLASTER));
  rig.body.add(mesh(gable(S(9.2), Y(0.3) - Y(1.9), D).translate(0, Y(1.9), 0), '#efe8d8', 0, 0, 0, PLASTER));
  rig.body.add(mesh(roofOver(0, S(4.6), Y(1.9), Y(0.3), S(0.5), 3.5, D + 6), '#b98576', 0, 0, 0, ROOF_TILE));
  rig.body.add(mesh(box(S(1.0), 16, 6), '#7d5534', X(7.9), Y(1.6), -8, BRICK));
  // upper windows: dark panes with cream cross mullions
  for (const g0 of [1.2, 5.5]) {
    rig.body.add(pane(X(g0), Y(4.4), S(1.6), Y(2.7) - Y(4.4), front + 0.5, '#4b2f22'));
    rig.body.add(mullions(X(g0), Y(4.4), S(1.6), Y(2.7) - Y(4.4), front + 0.9, '#e9e1cf'));
  }
  // awning: a rose slab sloping out over the ground floor
  const aw = group(0, Y(5.0), front);
  const slab = mesh(cbox(S(10.2), 2.5, 20), '#c48f81', 0, -7, 7.5, FABRIC);
  slab.rotation.x = 0.8;
  aw.add(slab);
  rig.body.add(aw);
  rig.body.add(pane(X(1.0), Y(8.9), S(1.6), Y(7.3) - Y(8.9), front + 0.5, GLOW));
  rig.body.add(mullions(X(1.0), Y(8.9), S(1.6), Y(7.3) - Y(8.9), front + 0.9, '#d9c9a4'));
  rig.body.add(door(X(5.7), S(1.8), Y(7.3), front, '#9e4636'));
  // the awning flutters in the breeze
  rig.anims.always = (t, dt, ctx) => { aw.rotation.x = Math.sin(t * 1.6 + ctx.phase) * 0.025; };
});

// ── cabin — board-and-batten duck-egg cabin, timber gable ───────────────────
defineModel('cabin', (opts, rig) => {
  const { X, Y, S } = grid(70.9);
  const D = 46;
  const front = D / 2;
  const timber = '#a9926c';
  rig.body.add(mesh(box(S(8.8), Y(4.6), D), '#9fb4a5', 0, 0, 0, BOARDS));
  for (let g = 1.3; g < 9.2; g += 0.9) rig.body.add(mesh(box(0.9, Y(4.6) - 4, 0.8), '#8ea494', X(g), 3, front + 0.4));
  for (const g of [0.55, 9.45]) rig.body.add(mesh(box(S(0.5), Y(4.5), 4), timber, X(g), 0, front - 1, WOOD));
  rig.body.add(mesh(box(S(9.4), 3, 4), '#bcb099', 0, 0, front, PAVING));
  rig.body.add(mesh(box(S(9.4), 3, 4), timber, 0, Y(4.6), front, WOOD));
  rig.body.add(mesh(gable(S(8.8), Y(0.4) - Y(4.6), D).translate(0, Y(4.6), 0), '#8aa38f', 0, 0, 0, BOARDS));
  rig.body.add(mesh(beam(0, Y(4.6), 0, Y(0.6), 2.4, 2.5), timber, 0, 0, front, WOOD));
  rig.body.add(mesh(beam(0, Y(4.0), X(2.9), Y(2.4), 2.2, 2.5), timber, 0, 0, front, WOOD));
  rig.body.add(mesh(beam(0, Y(4.0), X(7.1), Y(2.4), 2.2, 2.5), timber, 0, 0, front, WOOD));
  rig.body.add(mesh(roofOver(0, S(4.4), Y(4.6), Y(0.4), S(0.6), 4, D + 6), '#8e7550', 0, 0, 0, SHINGLE));
  rig.body.add(pane(X(1.9), Y(8.4), S(2.2), Y(6.2) - Y(8.4), front + 1.1, GLOW));
  rig.body.add(mullions(X(1.9), Y(8.4), S(2.2), Y(6.2) - Y(8.4), front + 1.5, '#d8c8a2'));
  rig.body.add(door(X(5.6), S(2.3), Y(6.2), front + 0.4, '#25322b', BOARDS));
});

// ── cottageRose — cream cottage, rose roof, folded gable ────────────────────
defineModel('cottageRose', (opts, rig) => {
  const { X, Y, S } = grid(67.1);
  const D = 46;
  const front = D / 2;
  rig.body.add(mesh(box(S(8.8), Y(5.0), D), '#e8e0c9', 0, 0, 0, PLASTER));
  rig.body.add(mesh(box(S(8.9), Y(9.3), D + 0.6), '#c08d7c', 0, 0, 0, RUBBLE));
  const gab = fold([[X(0.6), Y(5.0)], [X(9.4), Y(5.0)], [0, Y(0.4)]], D, 5, { cx: 0 });
  rig.body.add(mesh(gab, '#ebe3cc', 0, 0, 0, PLASTER));
  rig.body.add(mesh(roofOver(0, S(4.4), Y(5.0), Y(0.4), S(0.7), 3.6, D + 6), '#b07a69', 0, 0, 0, ROOF_TILE));
  rig.body.add(mesh(box(S(1.0), 24, 6), '#846637', X(2.8), Y(2.4), -10, BRICK));
  rig.body.add(pane(X(1.9), Y(8.2), S(1.7), Y(6.3) - Y(8.2), front + 0.5, GLOW));
  rig.body.add(mullions(X(1.9), Y(8.2), S(1.7), Y(6.3) - Y(8.2), front + 0.9, '#d9c7a0'));
  const d = door(X(6.7), S(1.7), Y(6.0) - Y(9.4), front + 0.4, '#7a4a3c', BOARDS);
  d.position.y = Y(9.4);
  rig.body.add(d);
  rig.body.add(mesh(box(S(3.3), Y(9.4), 8), '#c79a89', X(7.45), 0, front + 4, PAVING));
  const sm = smoke(X(2.8), Y(0) + 2, -10, { size: 2.2, rise: 22, drift: 6 });
  rig.body.add(sm.group);
  rig.anims.always = (t) => sm.update(t);
});

// ── vehicles ────────────────────────────────────────────────────────────
// Drawn in side profile on the sheet, so the profile polygon is extruded
// across a real width. Wheels are groups whose local z is the axle; the
// catalog spins them (rig.parts.wheels / wheelRadius) and U-turns the body.

// Profile polygon (grid points) → extruded body of width wz, centered.
function profile(G, pts, wz, color, bevel = 0) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([gx, gy]) => new THREE.Vector2(G.X(gx), G.Y(gy)))), {
    depth: wz, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 8,
  }).translate(0, 0, -wz / 2);
  return mesh(geo, color);
}

// Dark windows as a thin extrusion slightly wider than the cabin, so they
// show on both flanks.
function glass(G, pts, wz) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([gx, gy]) => new THREE.Vector2(G.X(gx), G.Y(gy)))), {
    depth: wz, bevelEnabled: false, curveSegments: 8,
  }).translate(0, 0, -wz / 2);
  return new THREE.Mesh(geo, ink('#29302c'));
}


function wheel(r, hubR, z, tire = '#2b2c2a', hub = '#e6dcc8') {
  const w = new THREE.Group();
  w.position.z = z;
  w.add(mesh(new THREE.CylinderGeometry(r, r, 7, 12).rotateX(PI / 2), tire));
  const h = mesh(new THREE.CylinderGeometry(hubR, hubR, 7.6, 10).rotateX(PI / 2), hub);
  w.add(h);
  // a bolt off-center, so the turning shows
  w.add(inkMesh(new THREE.CylinderGeometry(hubR * 0.22, hubR * 0.22, 8.2, 6).rotateX(PI / 2), '#8c8170'));
  w.children[2].position.x = hubR * 0.45;
  return w;
}

function wheels(rig, G, xs, cy, r, hubR, halfW) {
  const list = [];
  for (const gx of xs) {
    for (const s of [-1, 1]) {
      const w = wheel(r, hubR, s * halfW);
      w.position.x = G.X(gx);
      w.position.y = cy;
      rig.body.add(w);
      list.push(w);
    }
  }
  rig.parts.wheels = list;
  rig.parts.wheelRadius = r;
}





// ── shed — sage shed under a tan mono-pitch plank roof ─────────────────────
defineModel('shed', (opts, rig) => {
  const { X, Y, S } = grid(93.8);
  const D = 50;
  const front = D / 2;
  rig.body.add(mesh(box(S(8.4), Y(3.7), D), '#94a698', X(4.8), 0, 0, PLANKS));
  // roof: one slope, high at the back, overhanging the front
  const rise = Y(0) - Y(3.7);
  const len = Math.hypot(D + 10, rise);
  const planks = 6;
  for (let i = 0; i < planks; i += 1) {
    const w = (S(10.2)) / planks;
    const p = mesh(cbox(w - 0.4, 3, len), i % 2 ? '#c4b796' : '#b8a985', X(-0.1) + w * (i + 0.5), Y(3.7) + rise / 2, 0, { tex: 'wood', texRotate: true });
    p.rotation.x = Math.atan2(rise, D + 10);
    rig.body.add(p);
  }
  // back wall up to the high eave
  rig.body.add(mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-front, 0), new THREE.Vector2(front, 0), new THREE.Vector2(front, rise - 4)]), { depth: S(8.4), bevelEnabled: false }).rotateY(PI / 2).translate(-S(4.2), 0, 0), '#8a9c8e', X(4.8), Y(3.7), 0, PLANKS));
  rig.body.add(pane(X(1.8), Y(7.8), S(2.2), Y(5.0) - Y(7.8), front + 0.5, '#2c3a2c'));
  rig.body.add(mesh(cbox(1.3, Y(5.0) - Y(7.8), 0.8), '#94a698', X(2.9), (Y(5.0) + Y(7.8)) / 2, front + 0.9));
  rig.body.add(door(X(5.7), S(2.3), Y(5.0), front + 0.4, '#2a3324', BOARDS));
});

// ── trees ────────────────────────────────────────────────────────────────
tieredTree('stackTreeTiers', { aspect: 55.9, seg: 6, trunk: [3.9, 6.0, '#5a3d22'], tiers: [
  [0, 0, 1.6, 3.6, '#a8b7ab'], [1.6, 3.6, 3.0, 3.3, '#8a9b8e'], [3.0, 3.0, 3.7, 3.0, '#4f6553'],
  [3.7, 3.0, 4.6, 3.6, '#7f9483'], [4.6, 3.6, 5.6, 3.3, '#647a68'], [5.6, 3.0, 6.1, 3.0, '#4f6553'],
  [6.1, 3.0, 8.4, 5.0, '#5b745f']] });
// stackTree has seven stacked tiers: the shared per-joint bend compounds into
// a visible kink, so it sways the same tiers with a gentler, even bend.
defineModel('stackTree', (opts, rig) => {
  const { group: inner } = buildModel('stackTreeTiers', { height: 100, seed: opts.seed });
  rig.body.add(inner);
  const r = inner.userData.sprite.rig;
  rig.anims.sway = (t, dt, ctx) => {
    const base = Math.sin(t * 0.9 + ctx.phase) * 0.006 + Math.sin(t * 2.3 + ctx.phase) * 0.002;
    for (const j of r.parts.tiers) { j.rotation.z = base; j.rotation.x = 0; }
  };
});
tieredTree('pineSlate', { aspect: 57.1, trunk: [4.2, 5.8, '#3d2a17'], tiers: [
  [0, 0, 3.0, 2.6, '#7d8b93'], [2.6, 1.4, 5.6, 3.6, '#68757d'], [5.2, 2.0, 8.4, 4.8, '#5b6870']] });
tieredTree('coneTreeTall', { aspect: 48.4, seg: 6, trunk: [3.6, 5.6, '#3a2a14'], tiers: [
  [0, 0, 8.2, 4.6, '#8c9c91']] });

// A crown on a trunk: the crown hangs on a pivot at the trunk top and sways.
function crownSway(rig, crown, amp = 0.025) {
  rig.anims.sway = (t, dt, ctx) => {
    crown.rotation.z = Math.sin(t * 0.9 + ctx.phase) * amp + Math.sin(t * 2.3 + ctx.phase) * amp * 0.3;
    crown.rotation.x = Math.sin(t * 0.7 + ctx.phase) * amp * 0.4;
  };
}

// Terracotta pot: rim + tapered body, pot top at gy `top`.
function pot(G, g0, g1, top, color = '#c8a87e') {
  const g = new THREE.Group();
  const rTop = G.S((g1 - g0) / 2) * 0.92;
  const h = G.Y(top + 0.6);
  g.add(mesh(new THREE.CylinderGeometry(rTop, rTop * 0.78, h, 8).translate(0, h / 2, 0), color));
  g.add(mesh(new THREE.CylinderGeometry(G.S((g1 - g0) / 2), G.S((g1 - g0) / 2), G.Y(top) - h, 8).translate(0, h + (G.Y(top) - h) / 2, 0), new THREE.Color(color).offsetHSL(0, 0, 0.04).getStyle()));
  g.add(inkMesh(new THREE.CircleGeometry(rTop * 0.92, 8).rotateX(-PI / 2), '#5b4430', 0, G.Y(top) - 0.3, 0));
  return g;
}

defineModel('roundTree', (opts, rig) => {
  const G = grid(79.9);
  rig.body.add(mesh(box(G.S(1.1), G.Y(7.0), G.S(1.0)), '#4f3416', 0, 0, 0, BARK));
  const crown = group(0, G.Y(7.4), 0);
  crown.add(mesh(new THREE.IcosahedronGeometry(1, 1).scale(G.S(5.0), 38, 36), '#a1b2a5', 0, G.Y(3.8) - G.Y(7.4), 0, LEAF));
  rig.body.add(crown);
  crownSway(rig, crown);
});

defineModel('goldTree', (opts, rig) => {
  const G = grid(56.9);
  const bark = '#5d3214';
  rig.body.add(mesh(box(2.6, G.Y(6.2), 2.6), bark, 0, 0, 0, BARK));
  const crown = group(0, G.Y(6.2), 0);
  for (const s of [-1, 1]) crown.add(mesh(beam(0, 0, s * G.S(1.5), G.Y(5.0) - G.Y(6.2), 2.2, 2.2), bark, 0, 0, 0, BARK));
  crown.add(mesh(new THREE.IcosahedronGeometry(1, 1).scale(G.S(5.0), 27, 27), '#d4ad6a', 0, G.Y(2.6) - G.Y(6.2), 0, LEAF));
  rig.body.add(crown);
  crownSway(rig, crown);
});

defineModel('potRound', (opts, rig) => {
  const G = grid(54.1);
  rig.body.add(pot(G, 2.6, 7.6, 7.4, '#bba07a'));
  const bark = '#5b3a1c';
  rig.body.add(mesh(box(2.4, G.Y(5.6) - G.Y(7.4), 2.4), bark, 0, G.Y(7.4), 0, BARK));
  const crown = group(0, G.Y(5.6), 0);
  crown.add(mesh(box(2.2, 12, 2.2), bark, 0, 0, 0, BARK));
  for (const s of [-1, 1]) crown.add(mesh(beam(0, 0, s * G.S(2.4), G.Y(4.4) - G.Y(5.6), 2.2, 2.2), bark, 0, 0, 0, BARK));
  crown.add(mesh(new THREE.IcosahedronGeometry(1, 1).scale(G.S(4.75), 27, 26), '#a3b3a7', 0, G.Y(2.6) - G.Y(5.6), 0, LEAF));
  rig.body.add(crown);
  crownSway(rig, crown, 0.02);
});

// Teardrop topiary in a pot (two variants).
function potCone(name, aspect) {
  defineModel(name, (opts, rig) => {
    const G = grid(aspect);
    rig.body.add(pot(G, 1.7, 7.7, 7.4));
    rig.body.add(mesh(box(2.2, G.Y(6.8) - G.Y(7.4) + 1, 2.2), '#5b3a1c', 0, G.Y(7.4) - 1, 0, BARK));
    const crown = group(0, G.Y(6.8), 0);
    const prof = [[0.01, 0], [G.S(2.6), 3], [G.S(4.2), 8], [G.S(4.6), G.Y(5.0) - G.Y(6.8)], [0.01, G.Y(0) - G.Y(6.8)]];
    crown.add(mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 8), '#a3b0a6', 0, 0, 0, LEAF));
    rig.body.add(crown);
    crownSway(rig, crown, 0.02);
  });
}
potCone('potCone', 46.7);
potCone('potCone2', 46.4);

// ── kit — the little fox kid in a cream smock ───────────────────────────────
defineModel('kit', (opts, rig) => {
  const { X, Y, S } = grid(51.6);
  const fur = '#c79446';
  const furDark = '#a77735';
  const smock = '#efe6cf';
  const body = group(0, 0, 0);
  rig.body.add(body);
  // legs
  const legs = [];
  for (const g of [3.4, 6.6]) {
    const l = group(X(g), Y(8.2) + 2, 0);
    l.add(mesh(box(S(1.3), Y(8.2) + 2, 8).translate(0, -Y(8.2) - 2, 0), furDark, 0, 0, 0, FUR));
    body.add(l);
    legs.push(l);
  }
  // smock body (folded front)
  const torso = fold([[X(1.8), Y(8.2)], [X(8.2), Y(8.2)], [X(8.0), Y(4.8)], [X(2.0), Y(4.8)]], 20, 3, { cx: 0 });
  body.add(mesh(torso, smock, 0, 0, 0, FABRIC));
  // arms: tan wedges hanging from the shoulders — pivots for waving
  const arms = [];
  for (const s of [-1, 1]) {
    // short rounded arms, shoulders sunk into the smock's sides
    const a = group(s * (S(3.1) - 0.5), Y(5.3), 1);
    a.add(mesh(new THREE.CapsuleGeometry(3.2, 7, 3, 8).translate(s * 2.2, -6.5, 0), fur, 0, 0, 0, FUR));
    body.add(a);
    arms.push(a);
  }
  // tail: a bushy cone out the back with a cream tip
  const tail = group(0, Y(7.6), -9);
  tail.rotation.order = 'YXZ';
  tail.add(mesh(new THREE.ConeGeometry(5, 18, 5).translate(0, 9, 0).rotateX(-PI / 2 - 0.5), fur, 0, 0, 0, FUR));
  tail.add(mesh(new THREE.ConeGeometry(3, 7, 5).translate(0, 21, 0).rotateX(-PI / 2 - 0.5), '#f2e8d6'));
  body.add(tail);
  // head on a neck pivot
  const head = group(0, Y(4.8), 1);
  body.add(head);
  const hy = (gy) => Y(gy) - Y(4.8);
  const hgeo = fold([[X(1.2), hy(4.8)], [X(8.8), hy(4.8)], [X(8.8), hy(1.4)], [X(1.2), hy(1.4)]], 26, 4, { cx: 0 });
  head.add(mesh(hgeo, fur, 0, 0, 0, FUR));
  const fz = hgeo.userData.zAt;
  for (const [apex, b0, b1] of [[2.5, 1.3, 3.6], [7.5, 6.4, 8.7]]) {
    const ear = new THREE.Shape([new THREE.Vector2(X(b0), hy(1.6)), new THREE.Vector2(X(b1), hy(1.6)), new THREE.Vector2(X(apex), hy(0))]);
    head.add(mesh(new THREE.ExtrudeGeometry(ear, { depth: 4, bevelEnabled: false }).translate(0, 0, -2), furDark, 0, 0, 0, FUR));
  }
  const ey = eyes(S(2.05), 2.1);
  ey.group.position.set(0, hy(3.6), fz(S(2)) + 0.6);
  head.add(ey.group);
  const mouth = inkMesh(new THREE.SphereGeometry(1, 10, 6).scale(S(0.75), 1.6, 0.6), '#2a1d12', 0, hy(4.35), fz(0) + 0.3);
  head.add(mouth);
  for (const s of [-1, 1]) {
    // rosy cheeks ON the face, under the eyes
    const cx2 = s * S(2.9);
    const c = cheek(S(0.85), '#d79a8e');
    c.position.set(cx2, hy(4.15), fz(cx2) + 0.35);
    c.rotation.y = s * Math.atan2(4, S(3.8));
    head.add(c);
  }
  const blink = blinker(rig.seed + 0.3);
  rig.anims.always = (t, dt, ctx) => {
    ey.blink(blink(t));
    tail.rotation.y = Math.sin(t * 3 + ctx.phase) * 0.35;
  };
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2.2 + ctx.phase);
    body.scale.set(1 - b * 0.008, 1 + b * 0.015, 1);
    head.rotation.z = Math.sin(t * 0.8 + ctx.phase) * 0.08;
    // a wave every few seconds with the right arm
    const c = (t + ctx.phase * 2) % 6;
    const wave = c < 1.6 ? Math.sin((c / 1.6) * PI) : 0;
    arms[1].rotation.z = wave * 2.2 + wave * Math.sin(t * 14) * 0.25;
    arms[0].rotation.z = Math.sin(t * 1.3 + ctx.phase) * 0.05;
    legs[0].rotation.x = 0; legs[1].rotation.x = 0;
  };
});

// ── panda — the big round panda mascot ──────────────────────────────────────
defineModel('panda', (opts, rig) => {
  const { X, Y, S } = grid(104.3);
  const gray = '#7c868b';
  const cream = '#efe9d7';
  const body = group(0, 0, 0);
  rig.body.add(body);
  // the dome-shaped body: a folded silhouette
  const outline = [];
  for (let i = 0; i <= 10; i += 1) {
    const a = PI - (i / 10) * PI;
    outline.push([Math.cos(a) * S(4.0), Y(3.2) + Math.sin(a) * (Y(0.8) - Y(3.2))]);
  }
  outline.push([S(5.0), Y(7.8)], [S(4.6), Y(9.3)], [-S(4.6), Y(9.3)], [-S(5.0), Y(7.8)]);
  const dome = fold(outline.reverse(), 54, 9, { cx: 0 });
  body.add(mesh(dome.translate(0, 0, 0), gray, 0, 0, 0, FUR));
  body.position.y = 0;
  const fz = dome.userData.zAt;
  // feet
  for (const g of [1.5, 8.0]) body.add(mesh(box(S(1.1), Y(9.3) + 2, 14), '#2d3236', X(g), 0, 14));
  // cream mask: two folded lobes either side of the gray stripe
  for (const [g0, g1] of [[0.9, 4.3], [5.7, 9.1]]) {
    const pts = [];
    const cx = (g0 + g1) / 2;
    for (let i = 0; i <= 12; i += 1) {
      const a = (i / 12) * PI * 2;
      pts.push([X(cx) + Math.cos(a) * S((g1 - g0) / 2), Y(5.05) + Math.sin(a) * (Y(2.8) - Y(5.05))]);
    }
    // flatten the inner edge (the stripe side)
    const inner = g0 < 5 ? X(4.3) : X(5.7);
    const lobe = pts.map(([x, y]) => [g0 < 5 ? Math.min(x, inner) : Math.max(x, inner), y]);
    const shape = new THREE.Shape(lobe.map(([x, y]) => new THREE.Vector2(x - X(cx), y)));
    const m = mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false }), cream, X(cx), 0, fz(X(cx)) + 0.4);
    m.rotation.y = Math.sign(X(cx)) * Math.atan2(9, S(5));
    body.add(m);
  }
  const ey = eyes(S(1.5), 3.4);
  ey.group.position.set(0, Y(4.7), fz(S(1.5)) + 2.6);
  body.add(ey.group);
  for (const s of [-1, 1]) {
    const c = cheek(S(1.35), '#d39a90');
    c.position.set(s * S(2.7), Y(5.8), fz(S(2.7)) + 2.2);
    c.rotation.y = s * 0.17;
    body.add(c);
  }
  const nose = inkMesh(new THREE.CircleGeometry(4.2, 3), '#1d1a17', 0, Y(6.75), fz(0) + 0.4);
  nose.rotation.z = -PI / 2;
  body.add(nose);
  // ears on pivots
  const ears = [];
  for (const s of [-1, 1]) {
    const e = group(s * S(3.7), Y(1.2), -6);
    e.add(mesh(new THREE.SphereGeometry(1, 12, 8).scale(S(1.05), 11, 6), '#6f797e', 0, 0, 0, FUR));
    body.add(e);
    ears.push(e);
  }
  // little arms (the sheet hides them; a mascot needs to wave)
  const arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * S(4.7), Y(6.2), 4);
    a.add(mesh(new THREE.CapsuleGeometry(5, 12, 2, 6).translate(0, -10, 0), '#6c757a', 0, 0, 0, FUR));
    a.rotation.z = s * 0.5;
    body.add(a);
    arms.push(a);
  }
  const blink = blinker(rig.seed + 1.1);
  rig.anims.always = (t, dt, ctx) => {
    ey.blink(blink(t));
    const c = (t + ctx.phase) % 4.4;
    ears[0].rotation.z = c < 0.3 ? Math.sin((c / 0.3) * PI) * 0.3 : 0;
    ears[1].rotation.z = c > 2 && c < 2.3 ? -Math.sin(((c - 2) / 0.3) * PI) * 0.3 : 0;
  };
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 1.8 + ctx.phase);
    body.scale.set(1 + b * 0.012, 1 - b * 0.012, 1);
    body.rotation.z = Math.sin(t * 0.7 + ctx.phase) * 0.03;
    const c = (t + ctx.phase * 2) % 7;
    const wave = c < 1.8 ? Math.sin((c / 1.8) * PI) : 0;
    arms[0].rotation.z = -0.5 - wave * 1.9 - wave * Math.sin(t * 12) * 0.25;
    arms[1].rotation.z = 0.5 + Math.sin(t * 1.4) * 0.05;
  };
});

// ── street furniture ──────────────────────────────────────────────────────
defineModel('bench', (opts, rig) => {
  const { X, Y, S } = grid(200);
  const slat = '#94734a';
  const leg = '#3e2a16';
  const seatY = 32;
  for (const g of [1.4, 8.7]) {
    rig.body.add(mesh(box(4, seatY, 4), leg, X(g), 0, 8, WOOD));
    rig.body.add(mesh(box(4, 100, 4), leg, X(g), 0, -16, WOOD));
    rig.body.add(mesh(box(4, 4, 28), leg, X(g), seatY - 4, -4, WOOD));
  }
  for (const [z, w] of [[10, S(10)], [1, S(9.4)], [-8, S(9.4)]]) rig.body.add(mesh(box(w, 4, 8), slat, 0, seatY, z, WOOD_FINE));
  for (const gy of [0.8, 3.35]) rig.body.add(mesh(cbox(S(8.9), Y(0) - Y(1.6), 3), slat, X(5.05), Y(gy), -13, WOOD_FINE));
});

defineModel('lantern', (opts, rig) => {
  const { X, Y, S } = grid(24.1);
  const iron = '#3a3a2a';
  rig.body.add(mesh(new THREE.CylinderGeometry(S(4.0), S(4.2), 2.5, 8), iron, 0, 1.2, 0, METAL));
  rig.body.add(mesh(new THREE.CylinderGeometry(S(1.6), S(2.4), 4, 8).translate(0, 4.5, 0), iron, 0, 0, 0, METAL));
  rig.body.add(mesh(new THREE.CylinderGeometry(S(0.6), S(0.65), Y(3.0) - 6, 6).translate(0, 6 + (Y(3.0) - 6) / 2, 0), iron, 0, 0, 0, METAL));
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8).scale(S(4.2), (Y(1.3) - Y(3.0)) / 2, S(4.2)), ink('#f6eebc'));
  globe.position.y = (Y(1.3) + Y(3.0)) / 2;
  rig.body.add(globe);
  rig.body.add(mesh(new THREE.ConeGeometry(S(5.2), Y(0.4) - Y(1.4), 8).translate(0, Y(1.4) + (Y(0.4) - Y(1.4)) / 2, 0), iron, 0, 0, 0, METAL));
  rig.body.add(mesh(new THREE.SphereGeometry(1.2, 6, 4), iron, 0, Y(0.3), 0));
});

defineModel('trafficLight', (opts, rig) => {
  const { X, Y, S } = grid(19.8);
  const dark = '#2f3e43';
  rig.body.add(mesh(box(S(9.4), 2.5, S(6)), '#3a4549', 0, 0, 0, METAL));
  rig.body.add(mesh(box(S(3.8), Y(7.3) - 2.5, S(3.5)), dark, 0, 2.5, 0, METAL));
  rig.body.add(mesh(box(S(1.3), Y(4.6) - Y(7.3), S(1.3)), dark, 0, Y(7.3), 0, METAL));
  rig.body.add(mesh(box(S(7.2), Y(0.2) - Y(4.6), S(4.5)), dark, 0, Y(4.6), 0, METAL));
  const front = S(2.25);
  for (const [f, c] of [[0.88, '#c98a7a'], [0.74, '#e3b46e'], [0.62, '#8f9b80']]) {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(S(2.7), 14), ink(c));
    lamp.position.set(0, f * 100, front + 0.3);
    rig.body.add(lamp);
    // a little visor over each lamp
    rig.body.add(mesh(new THREE.CylinderGeometry(S(3), S(3), 3, 10, 1, true, -PI / 2, PI).rotateX(PI / 2).translate(0, f * 100, front + 1.5), dark, 0, 0, 0, { side: THREE.DoubleSide }));
  }
});

defineModel('stripedPost', (opts, rig) => {
  const { X, Y, S } = grid(14.1);
  rig.body.add(mesh(box(S(6), Y(7.9), S(6)), '#2f3b40', 0, 0, 0, METAL));
  rig.body.add(mesh(new THREE.CylinderGeometry(S(1), S(1), Y(4.3) - Y(7.9), 6).translate(0, Y(7.9) + (Y(4.3) - Y(7.9)) / 2, 0), '#33434a'));
  const n = 7;
  const h = (Y(0) - Y(4.3)) / n;
  for (let i = 0; i < n; i += 1) {
    rig.body.add(mesh(new THREE.CylinderGeometry(S(4.2), S(4.2), h, 8).translate(0, Y(4.3) + h * (i + 0.5), 0), i % 2 ? '#ddd3bf' : '#303d43'));
  }
});

defineModel('postbox', (opts, rig) => {
  const { X, Y, S } = grid(19.9);
  rig.body.add(mesh(box(S(1.6), Y(2.5), S(1.6)), '#2d3b3c', 0, 0, 0, METAL));
  rig.body.add(mesh(box(S(9), Y(0) - Y(2.5), S(3)), '#3a4a48', 0, Y(2.5), 0, METAL));
  for (const s of [-1, 1]) {
    rig.body.add(mesh(cbox(S(7), Y(0.4) - Y(2.3), 0.6), '#d8ccad', 0, (Y(0.4) + Y(2.3)) / 2, s * (S(1.5) + 0.3)));
    rig.body.add(inkMesh(new THREE.PlaneGeometry(S(5), 1.4).rotateY(s < 0 ? PI : 0), '#3a4a48', 0, Y(0.8), s * (S(1.5) + 0.7)));
  }
});

defineModel('hydrantRed', (opts, rig) => {
  const { X, Y, S } = grid(70.5);
  const red = '#b06b59';
  rig.body.add(mesh(new THREE.CylinderGeometry(S(3.4), S(3.4), Y(9.0), 8), red, 0, Y(9.0) / 2, 0, METAL));
  rig.body.add(mesh(new THREE.CylinderGeometry(S(2.4), S(2.4), Y(3.6) - Y(9.0), 8).translate(0, Y(9.0) + (Y(3.6) - Y(9.0)) / 2, 0), red, 0, 0, 0, METAL));
  rig.body.add(mesh(new THREE.CylinderGeometry(S(3.0), S(3.0), Y(2.9) - Y(3.6), 8).translate(0, Y(3.6) + (Y(2.9) - Y(3.6)) / 2, 0), '#a5604f', 0, 0, 0, METAL));
  rig.body.add(mesh(new THREE.SphereGeometry(S(2.4), 10, 6, 0, PI * 2, 0, PI / 2).translate(0, Y(2.9), 0), red, 0, 0, 0, METAL));
  rig.body.add(mesh(cbox(S(0.7), 6, S(0.7)), '#9a5747', 0, Y(2.9) + S(2.4) + 1.5, 0)); // cap nub, sitting ON the dome
  for (const s of [-1, 1]) rig.body.add(mesh(new THREE.CylinderGeometry(S(0.6), S(0.6), S(1.8), 8).rotateZ(PI / 2), '#a5604f', s * S(3.25), Y(5.75), 0));
  rig.body.add(mesh(new THREE.CylinderGeometry(S(0.9), S(0.9), 3, 10).rotateX(PI / 2), '#8b4637', 0, Y(5.8), S(2.4)));
});

defineModel('bin', (opts, rig) => {
  const { X, Y, S } = grid(69.4);
  rig.body.add(mesh(new THREE.CylinderGeometry(S(3.7), S(3.5), Y(2.9), 10), '#313c38', 0, Y(2.9) / 2, 0, METAL));
  const lid = group(0, Y(2.9), -S(4));
  lid.add(mesh(new THREE.CylinderGeometry(S(5), S(5), Y(0) - Y(2.9), 10).translate(0, (Y(0) - Y(2.9)) / 2, S(4)), '#7b715a', 0, 0, 0, METAL));
  rig.body.add(lid);
  // every now and then the lid lifts and drops back (someone's in there…)
  rig.anims.always = (t, dt, ctx) => {
    const c = (t + ctx.phase * 3) % 8;
    lid.rotation.x = c < 0.6 ? -Math.sin((c / 0.6) * PI) * 0.35 : 0;
  };
});

// ── gems & coins — faceted paper jewels that spin slowly ───────────────────
function jewel(name, aspect, color, kind) {
  defineModel(name, (opts, rig) => {
    const { S } = grid(aspect);
    const g = group(0, 50, 0);
    if (kind === 'octa') {
      // one clean faceted gem (8-sided bipyramid), no stray second shell
      g.add(mesh(new THREE.CylinderGeometry(0, 1, 1, 8).translate(0, 0.5, 0).scale(S(4.6), 34, S(4.6)), color));
      g.add(mesh(new THREE.CylinderGeometry(1, 0, 1, 8).translate(0, -0.5, 0).scale(S(4.6), 46, S(4.6)), new THREE.Color(color).offsetHSL(0, 0, -0.05).getStyle()));
    } else {
      // the sheet's eight-pointed paper star: a square and a 45°-turned
      // square, both bevelled slabs, sharing one centre
      const sq = (r) => new THREE.Shape([[-r, -r], [r, -r], [r, r], [-r, r]].map(([x, y]) => new THREE.Vector2(x, y)));
      const r = 34;
      for (const [rot, tone] of [[0, 0], [PI / 4, -0.05]]) {
        const geo = new THREE.ExtrudeGeometry(sq(r), { depth: 18, bevelEnabled: true, bevelSize: 4, bevelThickness: 5, bevelSegments: 1 }).translate(0, 0, -9);
        const m = mesh(geo, new THREE.Color(color).offsetHSL(0, 0, tone).getStyle());
        m.rotation.z = rot;
        g.add(m);
      }
    }
    rig.body.add(g);
    rig.anims.idle = (t, dt, ctx) => {
      g.rotation.y = t * 0.6 + ctx.phase;
      g.position.y = 50 + Math.sin(t * 1.5 + ctx.phase) * 3;
    };
  });
}
jewel('coinGold', 90.7, '#dcb671', 'octa');
jewel('gemRose', 73.6, '#c48d7d', 'star');
jewel('gemSlate', 74.8, '#5e6b6e', 'star');

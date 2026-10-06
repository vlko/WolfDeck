import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, fold, beam, box, cbox, group, cheek, blinker, facet, mat, ink, PI,
} from './kit.js';

// Models for the pieces on school.png: the bell-tower schoolhouse, the
// kindergarten, chalkboard, slide, pupil's desk, canteen counter, music
// stand, piano, the school bus and the class — bunny, bear and cat pupils
// with backpacks and their fox teacher. Measured off a 10 × 10 grid over each
// sprite (gx across, gy down); units are percent of the sprite's height.

const WOOD = { tex: 'wood' };
const WOOD_V = { tex: 'wood', texRotate: true }; // grain up a post / along a slanted leg
const WOOD_FINE = { tex: 'woodFine' };
const WOOD_FINE_V = { tex: 'woodFine', texRotate: true };
const PLANKS = { tex: 'planks' };
const BOARDS = { tex: 'boards' };
const ASHLAR = { tex: 'ashlar' };
const ROUGHCAST = { tex: 'roughcast' };
const PLASTER = { tex: 'plaster' };
const SHINGLE = { tex: 'shingle' };
const FABRIC = { tex: 'fabric' };
const FUR = { tex: 'fur' };

function grid(aspect) {
  return {
    X: (gx) => (gx / 10 - 0.5) * aspect,
    Y: (gy) => 100 - gy * 10,
    S: (g) => (g / 10) * aspect,
  };
}

// A shape (xy points) extruded through depth d, centered in z.
function slab(points, d) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
}

// Gabled roof seen end-on as ONE continuous solid (⋀ cross-section with a
// thickness t square to the slope), extruded through depth d.
function roofSolid(apexX, apexY, halfSpan, eaveY, t, d) {
  const drop = t / Math.cos(Math.atan2(apexY - eaveY, halfSpan));
  return slab([
    [apexX - halfSpan, eaveY], [apexX, apexY], [apexX + halfSpan, eaveY],
    [apexX + halfSpan, eaveY - drop], [apexX, apexY - drop], [apexX - halfSpan, eaveY - drop],
  ], d);
}

// Front gable wall (triangle) of width w, rise h, depth d, base at y = 0.
function gableWall(w, h, d) {
  return slab([[-w / 2, 0], [w / 2, 0], [0, h]], d);
}

// Recessed dark window with a cream frame, standing on a wall face at z.
function windowPane(x0, x1, y0, y1, z, frame = '#f2eedf', glass = '#203b37', cross = true) {
  const g = new THREE.Group();
  const w = x1 - x0;
  const h = y1 - y0;
  const cx = (x0 + x1) / 2;
  g.add(mesh(cbox(w + 2.4, h + 2.4, 1.2), frame, cx, (y0 + y1) / 2, z + 0.4));
  g.add(mesh(cbox(w, h, 1.2), glass, cx, (y0 + y1) / 2, z + 0.9));
  if (cross) {
    g.add(mesh(cbox(1.1, h, 0.8), frame, cx, (y0 + y1) / 2, z + 1.7));
    g.add(mesh(cbox(w, 1.1, 0.8), frame, cx, (y0 + y1) / 2, z + 1.7));
  }
  g.add(mesh(cbox(w + 4, 1.6, 3), frame, cx, y0 - 1.6, z + 1.2)); // sill
  return g;
}

// Wheel: chunky faceted tyre + pale hub, axle along local z.
function wheel(r, w, tyre = '#2b3634', hub = '#9aa29c') {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(r, r, w, 12).rotateX(PI / 2), tyre));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, w + 0.8, 10).rotateX(PI / 2), hub));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 1.4, 8).rotateX(PI / 2), '#4c5653'));
  return g;
}

// ── schoolhouse — cream school, big front gable, porch, bell tower ────────
defineModel('schoolhouse', (opts, rig) => {
  const { X, Y, S } = grid(88.0);
  const D = 54;
  const front = D / 2;
  const cream = '#ebe6d2';
  const trim = '#f4f1e4';
  const eaveY = Y(6.8);
  // walls + base plinth
  rig.body.add(mesh(box(S(9.0), eaveY, D), cream, 0, 0, 0, PLASTER));
  rig.body.add(mesh(box(S(9.3), 3, D + 2), '#d9d4bd', 0, 0, 0, ASHLAR));
  // big front gable (cream wall) under one continuous roof running front→back
  rig.body.add(mesh(gableWall(S(9.0), Y(2.3) - eaveY, D).translate(0, eaveY, 0), cream, 0, 0, 0, PLASTER));
  rig.body.add(mesh(roofSolid(0, Y(2.1), S(5.25), Y(6.95), 3.2, D + 6), '#ddd6bb', 0, 0, 0, SHINGLE));
  // round clock window in the gable
  const clockZ = front + 0.6;
  rig.body.add(mesh(new THREE.CylinderGeometry(S(0.85), S(0.85), 1.6, 24).rotateX(PI / 2), trim, 0, Y(3.4), clockZ));
  rig.body.add(mesh(new THREE.CylinderGeometry(S(0.7), S(0.7), 1.6, 24).rotateX(PI / 2), '#5b8074', 0, Y(3.4), clockZ + 0.6));
  const hands = group(0, Y(3.4), clockZ + 1.6);
  const hourH = group(0, 0, 0, mesh(cbox(1.2, S(0.42), 0.6).translate(0, S(0.21), 0), '#e9e4d2'));
  const minH = group(0, 0, 0.4, mesh(cbox(0.9, S(0.6), 0.6).translate(0, S(0.3), 0), '#e9e4d2'));
  hands.add(hourH, minH);
  rig.body.add(hands);
  // porch: a small gabled entrance standing proud of the front
  const pd = 12;
  const pz = front + pd / 2 - 1;
  rig.body.add(mesh(box(S(4.2), Y(7.0), pd), cream, 0, 0, pz, PLASTER));
  rig.body.add(mesh(gableWall(S(4.2), Y(5.05) - Y(7.0), pd).translate(0, Y(7.0), 0), cream, 0, 0, pz, PLASTER));
  rig.body.add(mesh(roofSolid(0, Y(4.85), S(2.45), Y(7.15), 2.6, pd + 3), trim, 0, 0, pz + 1, SHINGLE));
  // door (a dark recess with a frame)
  const doorZ = pz + pd / 2;
  rig.body.add(mesh(box(S(1.15) * 2 + 3, Y(7.5) + 1.5, 1.2), trim, 0, 0, doorZ + 0.3));
  rig.body.add(mesh(box(S(1.15) * 2, Y(7.5), 1.2), '#4a3424', 0, 0, doorZ + 0.9, BOARDS));
  // windows either side
  for (const [g0, g1] of [[0.95, 2.4], [6.6, 8.05]]) {
    rig.body.add(windowPane(X(g0), X(g1), Y(9.0), Y(7.5), front));
  }
  // bell tower on the ridge, near the front: posts, pyramid cap, the bell
  const tz = front - 12;
  const ridgeY = Y(2.1);
  const towerBase = ridgeY - 8;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      rig.body.add(mesh(box(2.6, Y(1.05) - towerBase, 2.6), '#e9e4cf', sx * S(0.8), towerBase, tz + sz * 5.5));
    }
  }
  rig.body.add(mesh(box(S(2.3), 3, 15), '#e4dec7', 0, Y(1.05) - 1.5, tz));
  rig.body.add(mesh(new THREE.ConeGeometry(S(1.85), Y(0) - Y(1.05), 4).rotateY(PI / 4).translate(0, (Y(0) - Y(1.05)) / 2, 0), '#dcd5b8', 0, Y(1.05) + 1.5, tz, SHINGLE));
  const bell = group(0, Y(1.1), tz);
  bell.add(mesh(cbox(0.8, 3, 0.8).translate(0, -1.5, 0), '#5d4228'));
  bell.add(mesh(new THREE.CylinderGeometry(2.2, 4.6, 6.5, 8).translate(0, -6.2, 0), '#6b4a2a'));
  bell.add(mesh(new THREE.SphereGeometry(1.2, 8, 6).translate(0, -9.6, 0), '#4a3420'));
  rig.body.add(bell);
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t + ctx.phase * 2) % 9;
    bell.rotation.z = c < 2.4 ? Math.sin(c * 8) * 0.55 * (1 - c / 2.4) : 0;
    minH.rotation.z = -t * 0.35;
    hourH.rotation.z = -t * 0.03 - 1.2;
  };
});

// ── kindergarten — flat-roofed block + gabled colorful house ──────────────
defineModel('kindergarten', (opts, rig) => {
  const { X, Y, S } = grid(192.2);
  const D = 48;
  const front = D / 2;
  // left block: cream, flat roof, three windows, big glass door
  const lx0 = X(0);
  const lx1 = X(4.1);
  const lcx = (lx0 + lx1) / 2;
  rig.body.add(mesh(box(lx1 - lx0, 100, D), '#ece6d6', lcx, 0, 0, PLASTER));
  rig.body.add(mesh(box(lx1 - lx0 + 2, 2.5, D + 2), '#e2dbc6', lcx, 99, 0));
  for (const [g0, g1] of [[0.55, 1.35], [1.65, 2.45], [2.75, 3.55]]) {
    rig.body.add(windowPane(X(g0), X(g1), Y(3.6), Y(1.5), front, '#f3efe3', '#0f2b28', false));
  }
  rig.body.add(mesh(box(S(1.75), Y(5.2), 1.2), '#3c5a5c', X(2.05), 0, front + 0.6));
  rig.body.add(mesh(box(0.8, Y(5.2), 1.4), '#2a4344', X(2.05), 0, front + 1.1));
  // right house: walls + ONE hip roof (a single solid, colored by panel)
  const rx0 = X(4.1);
  const rx1 = X(10);
  const rcx = (rx0 + rx1) / 2;
  const wallTop = Y(4.3);
  rig.body.add(mesh(box(rx1 - rx0, wallTop, D - 4), '#f0eadc', rcx, 0, -2, PLASTER));
  const over = 3;
  const ry = Y(1.7);
  const bx0 = rx0 - over;
  const bx1 = rx1 + over;
  const bz = (D - 4) / 2 + over;
  const kx0 = X(5.6);
  const kx1 = X(8.4);
  // vertices: base corners FL, FR, BR, BL; ridge ends RL, RR
  const FL = [bx0, wallTop, bz - 2];
  const FR = [bx1, wallTop, bz - 2];
  const BR = [bx1, wallTop, -bz - 2];
  const BL = [bx0, wallTop, -bz - 2];
  const RL = [kx0, ry, -2];
  const RR = [kx1, ry, -2];
  const RM = [(kx0 + kx1) / 2, ry, -2];
  const FM = [(kx0 + kx1) / 2, wallTop, bz - 2];
  // front face split into the sheet's four colored panels
  const tris = [
    [FL, FM, RL, '#355f50'], [RL, FM, RM, '#c79b9e'], [RM, FM, RR, '#2f6576'], [FM, FR, RR, '#86a8a0'],
    [BR, BL, RL, '#7d998f'], [BR, RL, RR, '#7d998f'], // back slope
    [BL, FL, RL, '#2e5446'], [FR, BR, RR, '#7a9c95'], // hip ends
    [FL, BL, BR, '#d9d2bf'], [FL, BR, FR, '#d9d2bf'], // underside (closes the solid)
  ];
  const pos = [];
  const col = [];
  for (const [a, b, c, color] of tris) {
    pos.push(...a, ...b, ...c);
    const cc = new THREE.Color(color);
    for (let i = 0; i < 3; i += 1) col.push(cc.r, cc.g, cc.b);
  }
  const hip = new THREE.BufferGeometry();
  hip.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  hip.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  hip.computeVertexNormals();
  rig.body.add(new THREE.Mesh(hip, mat('#ffffff', { side: THREE.DoubleSide, tex: 'shingle' })));
  // chimney through the roof, rising from inside the house
  rig.body.add(mesh(box(S(0.75), Y(0.35) - 30, 9), '#d8ccad', X(5.55), 30, -8, { tex: 'brick', texScale: 0.7 }));
  rig.body.add(mesh(box(S(0.95), 2.5, 11), '#e6dcc1', X(5.55), Y(0.35) - 2.5, -8));
  // windows
  for (const [g0, g1] of [[4.75, 5.5], [5.65, 6.4], [7.6, 8.3], [8.5, 9.25]]) {
    rig.body.add(windowPane(X(g0), X(g1), Y(8.0), Y(5.8), front - 4, '#f3efe3', '#0c2522', false));
  }
  // colorful base panels along the front, a little proud of the walls
  const panels = [[0, 1.2, '#5f8790'], [1.2, 2.9, '#3c5a5c'], [2.9, 4.1, '#5f8790'], [4.1, 5.6, '#8a5558'],
    [5.6, 7.0, '#d8afaf'], [7.0, 8.5, '#dcac64'], [8.5, 10, '#f2cfae']];
  for (const [g0, g1, c] of panels) {
    const isDoor = g0 === 1.2;
    if (isDoor) continue;
    const z = g0 < 4.1 ? front + 1 : front - 3;
    rig.body.add(mesh(box(X(g1) - X(g0) - 0.3, Y(8), 2), c, (X(g0) + X(g1)) / 2, 0, z, ROUGHCAST));
  }
});

// ── blackboard — chalkboard on an A-frame easel with sums ─────────────────
function chalkTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4b6656';
  ctx.fillRect(0, 0, 512, 320);
  // the fold shading of the sheet: the right half a touch darker
  ctx.fillStyle = 'rgba(20,40,30,0.18)';
  ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(512, 0); ctx.lineTo(512, 320); ctx.lineTo(160, 320); ctx.fill();
  ctx.strokeStyle = '#eef1ea';
  ctx.fillStyle = '#eef1ea';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.font = "700 62px 'Nunito', 'Comic Sans MS', sans-serif";
  ctx.fillText('3 2 = 5 + 7', 130, 92);
  ctx.fillText('4 7 = 7 + 7', 110, 178);
  ctx.fillText('1 × 4', 300, 262);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
let chalkTex = null;

defineModel('blackboard', (opts, rig) => {
  const { X, Y, S } = grid(79.3);
  const wood = '#6b4a30';
  // A-frame easel: two front legs splayed, one back leg, crossbar, ledge
  for (const [x0, x1] of [[X(2.6), X(1.4)], [X(7.4), X(8.6)]]) {
    rig.body.add(mesh(beam(x0, Y(5.4), x1, 0, 2.8, 2.8), wood, 0, 0, 2, WOOD_V));
  }
  // back leg hinged at the top of the front legs, its foot planted behind
  const lean = 0.34;
  const legL = Y(5.4) / Math.cos(lean);
  const back = group(0, Y(5.4), 1, mesh(box(2.8, legL, 2.8).translate(0, -legL, 0), wood, 0, 0, 0, WOOD_V));
  back.rotation.x = lean;
  rig.body.add(back);
  rig.body.add(mesh(cbox(S(6.5), 2.4, 2.4), wood, 0, Y(7.3), 2, WOOD));
  rig.body.add(mesh(cbox(S(7.8), 2.2, 5), '#5e4128', 0, Y(5.7), 4, WOOD_FINE));
  // the board: a frame with the chalk face
  const bw = S(9.8);
  const bh = Y(0.05) - Y(5.5);
  const bcy = (Y(0.05) + Y(5.5)) / 2;
  rig.body.add(mesh(cbox(bw, bh, 3), '#3a5146', 0, bcy, 4));
  chalkTex ??= chalkTexture();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(bw - 3, bh - 3),
    new THREE.MeshLambertMaterial({ map: chalkTex }));
  face.position.set(0, bcy, 5.9); // clear of the board's front (no z-fight)
  rig.body.add(face);
  // a chalk stick that wobbles on the ledge now and then
  const chalk = group(S(2.5), Y(5.7) + 1.7, 5.4, mesh(cbox(4, 1.2, 1.2), '#f2f2ea'));
  rig.body.add(chalk);
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 6;
    chalk.rotation.z = c < 0.6 ? Math.sin(c * 30) * 0.2 * (1 - c / 0.6) : 0;
  };
});

// ── slide — ladder tower + a zig-zag chute of colored folded segments ─────
defineModel('slide', (opts, rig) => {
  const { X, Y, S } = grid(100.5);
  const W = 16; // chute width (z)
  const post = '#4f7178';
  // ladder tower at the left: two rails, rungs, top platform with a rail
  for (const z of [-W / 2, W / 2]) {
    rig.body.add(mesh(box(2.6, Y(0.4), 2.6), post, X(0.25), 0, z));
    rig.body.add(mesh(box(2.6, Y(0.75), 2.6), post, X(1.9), 0, z)); // back posts under the platform
  }
  for (let y = 8; y < Y(0.8); y += 10) rig.body.add(mesh(cbox(2, 2, W), '#6a8a90', X(0.25), y, 0)); // rungs span the two rails
  rig.body.add(mesh(box(S(1.9), 2.5, W + 3), '#a8d2c9', X(1.0), Y(0.75), 0));
  // chute: segments between control points (x, y), each a folded trough
  const pts = [
    [X(0.6), Y(0.75), '#2f6d5e'], [X(4.3), Y(2.3), '#e6b2b8'], [X(6.8), Y(3.0), '#b84a3e'],
    [X(9.6), Y(4.6), '#c9a24c'], [X(6.0), Y(7.0), '#d9b052'], [X(2.4), Y(9.62), '#d9b052'],
  ];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0, c] = pts[i];
    const [x1, y1] = pts[i + 1];
    const zA = 0; // one straight lane, so the walls line up segment to segment
    // floor + two side walls along the segment (one connected trough)
    const seg = new THREE.Group();
    seg.add(mesh(beam(x0, y0, x1, y1, 2.4, W, 1.2), c));
    seg.add(mesh(beam(x0, y0 + 3, x1, y1 + 3, 6, 2, 1.2), c, 0, 0, W / 2 - 1));
    seg.add(mesh(beam(x0, y0 + 3, x1, y1 + 3, 6, 2, 1.2), c, 0, 0, -W / 2 + 1));
    seg.position.z = zA;
    rig.body.add(seg);
  }
  // the bend at the right is a rounded corner block, so the chute is one path
  rig.body.add(mesh(new THREE.CylinderGeometry(W / 2 + 1, W / 2 + 1, 8, 10).translate(0, 0, 0), '#b84a3e', X(9.6) - 2, Y(4.6) - 2, 0));
  // run-out at the bottom and a support leg under the bend
  rig.body.add(mesh(box(3, Y(4.6) - 4, 3), post, X(9.3), 0, 0));
  rig.body.add(mesh(box(3, Y(7.0) - 2, 3), post, X(6.0), 0, 0));
  rig.body.add(mesh(box(S(2.2), 3, W + 2), '#d9b052', X(1.6), 0, 0));
});

// ── schoolDesk — pupil's table + bench ────────────────────────────────────
defineModel('schoolDesk', (opts, rig) => {
  const { X, Y, S } = grid(185.8);
  const dark = '#6b4a26';
  const mid = '#8b6f50';
  // table behind
  rig.body.add(mesh(box(S(8.6), 5, 34), dark, 0, Y(0.8), -10, WOOD_FINE));
  rig.body.add(mesh(box(S(7.4), Y(1.6) - Y(2.4), 2), mid, 0, Y(2.4), 4, WOOD_FINE));
  for (const gx of [1.55, 8.4]) {
    for (const z of [4, -24]) rig.body.add(mesh(box(S(0.55), Y(0.8), 4), dark, X(gx), 0, z - 10 + 10, WOOD_V));
  }
  // bench in front
  rig.body.add(mesh(box(S(10), 6, 20), '#8c7154', 0, Y(6.1), 16, PLANKS));
  for (const gx of [0.6, 9.3]) {
    for (const z of [10, 22]) rig.body.add(mesh(box(S(0.5), Y(6.1), 3.5), '#6a5032', X(gx), 0, z, WOOD_V));
  }
});

// ── canteenCounter — serving counter with trays and lidded dishes ─────────
defineModel('canteenCounter', (opts, rig) => {
  const { X, Y, S } = grid(207.4);
  const D = 58; // a real counter depth, so it reads as a counter from the side
  // mint body with paper stripes (fold light splits it in halves)
  const body = fold([[X(0.4), 0], [X(9.6), 0], [X(9.6), Y(2.6)], [X(0.4), Y(2.6)]], D, 3);
  rig.body.add(mesh(body, '#8fa99f'));
  // stripes follow the fold of the front (a flat bar would hover off the
  // sides and stick out as spikes from the side)
  const hw = X(9.6);
  for (let y = 8; y < Y(2.6) - 4; y += 12) {
    const g = new THREE.BoxGeometry(S(9.0), 3, 1, 2, 1, 1).translate(0, 1.5, 0).toNonIndexed(); // a vertex at the crease
    const pp = g.attributes.position;
    for (let i = 0; i < pp.count; i += 1) pp.setZ(i, pp.getZ(i) + 3 * Math.max(0, 1 - Math.abs(pp.getX(i)) / hw));
    rig.body.add(mesh(g, '#a8c2b8', 0, y, D / 2 + 0.4));
  }
  rig.body.add(mesh(box(S(10), 4.5, D + 6), '#bcd6cd', 0, Y(2.6), 0));
  // two lidded dishes and a flat tray; the lids lift now and then
  const lids = [];
  for (const [g0, g1, lidded] of [[1.3, 3.4, true], [3.9, 6.0, true], [6.6, 8.6, false]]) {
    const cx = (X(g0) + X(g1)) / 2;
    const w = X(g1) - X(g0);
    rig.body.add(mesh(box(w, 2.4, 26), '#c4dcd4', cx, Y(2.6) + 4.5, 0));
    if (!lidded) continue;
    const lid = group(cx - w / 2, Y(2.6) + 6.9, -10); // hinged at the dish's back edge
    lid.add(mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.68, 17, 4).rotateY(PI / 4).scale(1, 1, 0.42).translate(w / 2, 8.5, 10), '#cfe3dd'));
    lid.add(mesh(cbox(4, 2.4, 4).translate(w / 2, 18, 10), '#a9c4bb'));
    rig.body.add(lid);
    lids.push(lid);
  }
  rig.anims.idle = (t, dt, ctx) => {
    lids.forEach((lid, i) => {
      const c = (t + ctx.phase + i * 3.1) % 7;
      lid.rotation.x = c < 1.2 ? -Math.sin((c / 1.2) * PI) * 0.6 : 0;
    });
  };
});

// ── musicStand — tripod with a folded sheet plate ─────────────────────────
defineModel('musicStand', (opts, rig) => {
  const { X, Y, S } = grid(48.2);
  const wood = '#6b542f';
  rig.body.add(mesh(box(2.6, Y(2.7) - Y(8.6), 2.6), wood, 0, Y(8.6), 0, WOOD_V));
  for (const a of [0, 2.1, 4.2]) {
    const leg = mesh(beam(0, Y(8.6) + 1, S(4.5), 0, 2.4, 2.4), wood, 0, 0, 0, WOOD_V);
    leg.rotation.y = a + PI / 2;
    rig.body.add(leg);
  }
  const plate = group(0, Y(2.7), 1);
  plate.add(mesh(fold([[-S(4.5), 0], [S(4.5), 0], [S(4.5), Y(0) - Y(2.7)], [-S(4.5), Y(0) - Y(2.7)]], 2, 1.5), '#b4a08c', 0, 0, 0, { tex: 'woodFine', texScale: 0.6 }));
  plate.add(mesh(cbox(S(9.4), 2, 5), '#957d63', 0, 0, 1.5, WOOD_FINE));
  plate.rotation.x = -0.25;
  rig.body.add(plate);
  rig.anims.idle = (t, dt, ctx) => { plate.rotation.z = Math.sin(t * 0.8 + ctx.phase) * 0.015; };
});

// ── piano — upright piano with a bench; the keys play ─────────────────────
defineModel('piano', (opts, rig) => {
  const { X, Y, S } = grid(117.0);
  const D = 26;
  const teal = '#2e4e4d';
  // cabinet (fold front), lid, legs
  rig.body.add(mesh(fold([[X(0.3), Y(6.0)], [X(9.7), Y(6.0)], [X(9.7), Y(0.4)], [X(0.3), Y(0.4)]], D, 2.5), teal, 0, 0, -6, WOOD_FINE));
  rig.body.add(mesh(box(S(10), 3, D + 4), '#26403f', 0, Y(0.4), -6, WOOD_FINE));
  // lower cabinet down to the floor (recessed under the key bed), so the
  // piano is one solid body from the side — not a top box on a thin panel
  rig.body.add(mesh(box(S(9.6), Y(6.0) + 1, 22), '#284544', 0, 0, -8, WOOD_FINE));
  for (const gx of [0.5, 9.5]) rig.body.add(mesh(box(S(0.55), Y(6.0), 5), '#223a39', X(gx), 0, 6, WOOD_FINE_V));
  rig.body.add(mesh(box(S(9.4), 3, 14), '#223a39', 0, 0, -4, WOOD_FINE));
  rig.body.add(mesh(fold([[X(0.9), 3], [X(9.1), 3], [X(9.1), Y(4.6)], [X(0.9), Y(4.6)]], 3, 1.5), '#203635', 0, 0, 4.6, WOOD_FINE_V));
  // key bed sticking out with white keys and black keys
  const keyY = Y(4.5);
  rig.body.add(mesh(box(S(9.4), 5, 14), '#26403f', 0, keyY - 5, 10, WOOD_FINE));
  const keys = [];
  const n = 26;
  const kw = S(8.4) / n;
  for (let i = 0; i < n; i += 1) {
    const k = group(X(0.8) + kw * (i + 0.5), keyY, 4, mesh(box(kw - 0.4, 1.6, 12).translate(0, 0, 6), '#efe9d8'));
    rig.body.add(k);
    keys.push(k);
    if (i % 7 !== 2 && i % 7 !== 6 && i < n - 1) {
      rig.body.add(mesh(box(kw * 0.55, 1.6, 7), '#141f1f', X(0.8) + kw * (i + 1), keyY + 1.2, 6));
    }
  }
  // music sheet
  rig.body.add(mesh(cbox(S(2.2), Y(1.0) - Y(2.9), 1), '#ebe3cc', 0, (Y(1.0) + Y(2.9)) / 2, D / 2 - 6 + 4).rotateX(-0.12));
  rig.body.add(mesh(box(S(2.6), 2, 5), '#26403f', 0, Y(2.9) - 2, D / 2 - 2));
  // bench + gold pedals
  rig.body.add(mesh(box(S(4.0), 3, 14), '#46696a', 0, Y(6.5), 26, FABRIC));
  for (const gx of [3.3, 6.7]) for (const z of [21, 31]) rig.body.add(mesh(box(2.2, Y(6.5), 2.2), '#36575a', X(gx), 0, z, WOOD_FINE_V));
  for (const gx of [4.6, 5.0, 5.4]) rig.body.add(mesh(box(2, 1.6, 6), '#d8c27e', X(gx), 4, 7));
  rig.anims.idle = (t, dt, ctx) => {
    keys.forEach((k, i) => {
      const v = Math.sin(t * 7 + i * 1.7 + ctx.phase) * Math.sin(t * 2.3 + i * 0.6);
      k.rotation.x = v > 0.75 ? 0.08 : 0;
    });
  };
});


// ── the class: pupils with backpacks and the fox teacher ──────────────────
// A cute big-headed body: head (ellipsoid) on a folded dress/jacket, short
// legs sunk into the hem, little arms on shoulder pivots, a backpack with
// straps. Face decals (eyes, cheeks, nose, mouth) sit ON the head surface.
function classmate(name, aspect, o) {
  defineModel(name, (opts, rig) => {
    const { X, Y, S } = grid(aspect);
    const root = group(0, 0, 0);
    rig.body.add(root);

    // legs
    const legTop = Y(o.hem) + 3;
    for (const gx of o.legs) root.add(mesh(box(S(0.62), legTop, 6), o.legColor, X(gx), 0, 0, o.legTex ?? FABRIC));
    if (o.shoes) for (const gx of o.legs) root.add(mesh(box(S(0.75), 3, 8), o.shoes, X(gx), 0, 1));

    // body: folded trapezoid, two-toned halves
    const bodyTop = Y(o.neck);
    const bodyBot = Y(o.hem);
    const bd = o.bodyDepth ?? 22;
    const bodyGeo = fold([[-S(o.hemW / 2), bodyBot], [S(o.hemW / 2), bodyBot], [S(o.neckW / 2), bodyTop], [-S(o.neckW / 2), bodyTop]], bd, 3);
    const torso = group(0, 0, 0, mesh(bodyGeo, o.body, 0, 0, 0, FABRIC));
    root.add(torso);
    const bz = bodyGeo.userData.zAt;
    if (o.collar) torso.add(mesh(fold([[-S(o.neckW / 2), bodyTop - 7], [S(o.neckW / 2), bodyTop - 7], [S(o.neckW / 2), bodyTop], [-S(o.neckW / 2), bodyTop]], bd + 1, 3.4), o.collar, 0, 0, 0, FABRIC));

    // backpack + straps
    if (o.pack) {
      const ph = (bodyTop - bodyBot) * 0.95;
      // wider than the body, so its sides peek out from the front like the sheet
      const pack = mesh(new THREE.BoxGeometry(S(o.hemW * 1.18), ph, 12, 2, 2, 2), o.pack, 0, bodyBot + ph / 2 + 1, -bd / 2 - 4, FABRIC);
      torso.add(pack);
      torso.add(mesh(cbox(S(o.hemW * 0.7), ph * 0.35, 3), new THREE.Color(o.pack).offsetHSL(0, 0, 0.05).getStyle(), 0, bodyBot + ph * 0.3, -bd / 2 - 11.5, FABRIC));
      for (const s of [-1, 1]) {
        const x = s * S(o.neckW * 0.32);
        torso.add(mesh(cbox(2.6, bodyTop - bodyBot - 4, 1.2), o.pack, x, (bodyTop + bodyBot) / 2 + 2, bz(x) + 0.7));
      }
    }

    // arms on shoulder pivots, held out and down like the sheet
    const arms = [-1, 1].map((s) => {
      const sh = group(s * S(o.neckW / 2) * 0.92, bodyTop - 5, 1);
      const len = o.armLen ?? 22;
      const arm = mesh(new THREE.CapsuleGeometry(3.4, len - 6, 3, 6).translate(0, -len / 2, 0), o.arm, 0, 0, 0, o.armTex ?? FABRIC);
      sh.add(arm);
      sh.rotation.z = s * (o.armOut ?? 0.9);
      torso.add(sh);
      sh.userData.side = s;
      sh.userData.len = len;
      return sh;
    });

    // head
    const R = { x: S(o.head[2]), y: S(o.head[3] ?? o.head[2]) * (o.headSquash ?? 1), z: S(o.head[2]) * 0.82 };
    // the head must sit ON the body — sunk a little into the collar, never
    // hovering above it with a gap
    const hc = { x: 0, y: Math.min(Y(o.head[1]), bodyTop + R.y - 4), z: 2 };
    const head = group(0, bodyTop - 2, 0);
    root.add(head);
    const hy0 = hc.y - (bodyTop - 2);
    const headMeshes = [];
    if (o.headRight) {
      // two-tone head (the cat): two half-shells of ONE ellipsoid, left and
      // right — no overlapping mask shell that could flicker
      for (const [phi, col] of [[-PI / 2, o.headColor], [PI / 2, o.headRight]]) {
        headMeshes.push(mesh(new THREE.SphereGeometry(1, 14, 10, phi, PI).scale(R.x, R.y, R.z), col, 0, hy0, hc.z, FUR));
      }
    } else {
      const headGeo = o.headGeo ? o.headGeo(R) : new THREE.SphereGeometry(1, 14, 10).scale(R.x, R.y, R.z);
      headMeshes.push(mesh(headGeo, o.headColor, 0, hy0, hc.z, FUR));
    }
    for (const m of headMeshes) { head.add(m); m.updateMatrix(); m.matrixWorld.copy(m.matrix); }
    // surface point + normal ON the real (faceted) head — a ray from the
    // front; the ideal ellipsoid is only the fallback near the silhouette
    const ray = new THREE.Raycaster();
    const surf = (dx, dy, lift = 0.4) => {
      ray.set(new THREE.Vector3(dx, hy0 + dy, 500), new THREE.Vector3(0, 0, -1));
      const hit = ray.intersectObjects(headMeshes, false)[0];
      if (hit && hit.face) {
        const n = hit.face.normal.clone().normalize();
        return { p: hit.point.clone().addScaledVector(n, lift), n };
      }
      const k = 1 - (dx / R.x) ** 2 - (dy / R.y) ** 2;
      const dz = R.z * Math.sqrt(Math.max(k, 0.02));
      const n = new THREE.Vector3(dx / R.x ** 2, dy / R.y ** 2, dz / R.z ** 2).normalize();
      return { p: new THREE.Vector3(dx, hy0 + dy, hc.z + dz).addScaledVector(n, lift), n };
    };
    const place = (m, dx, dy, lift) => {
      const { p, n } = surf(dx, dy, lift);
      m.position.copy(p);
      m.lookAt(p.clone().add(n));
      head.add(m);
      return m;
    };
    if (o.mask) o.mask({ head, place, surf, R, hy0, S });
    // eyes (blinking), cheeks, nose, mouth
    const eyeList = [];
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(S(o.eye[1]), 10, 8), ink('#1b1a17'));
      e.scale.z = 0.45;
      place(e, s * S(o.eye[0]), S(o.eye[2] ?? 0.4), 0.2);
      eyeList.push(e);
      place(cheek(S(o.cheek[0]), '#df9c98'), s * S(o.cheek[1]), -S(o.cheek[2]), 0.35);
    }
    if (o.muzzle && o.snout) {
      // short, soft fox snout: a low 4-sided cream pyramid, rounded nose tip
      // a soft, slightly pointed muzzle: a flattened half-ellipsoid
      const sn = new THREE.Mesh(facet(new THREE.SphereGeometry(1, 12, 8, 0, PI * 2, 0, PI / 2).rotateX(PI / 2)
        .scale(S(o.muzzle[0]), S(o.muzzle[1]), 6.5)), mat(o.muzzleColor));
      place(sn, 0, -S(o.muzzle[2]), -1.2);
    } else if (o.muzzle) {
      const mz = new THREE.Mesh(facet(new THREE.SphereGeometry(1, 12, 8).scale(S(o.muzzle[0]), S(o.muzzle[1]), 4)), mat(o.muzzleColor));
      place(mz, 0, -S(o.muzzle[2]), 0.6);
    }
    const noseM = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(S(o.nose[0]), S(o.nose[0]) * 0.72, 1.6), ink('#1b1a17'));
    place(noseM, 0, -S(o.nose[1]), o.snout ? 5.6 : o.muzzle ? 3.2 : 0.8);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(S(o.nose[0]) * 0.9, 0.45, 4, 12, PI), ink('#1b1a17'));
    place(smile, 0, -S(o.nose[1]) - S(o.nose[0]) * 1.3, o.snout ? 4.2 : o.muzzle ? 2.9 : 0.6);
    smile.rotateZ(PI);
    smile.visible = !o.snout; // the fox's snout tip carries the nose only

    // ears on pivots
    const ears = o.ears({ head, surf, R, hy0, S, X, Y });
    // tail on the rump
    let tail = null;
    if (o.tail) {
      tail = group(0, bodyBot + 8, -bd / 2 - (o.pack ? 2 : 0));
      tail.add(o.tail(S));
      torso.add(tail);
    }
    // props in hands (teacher's books)
    if (o.hold) o.hold(arms, S);

    const blink = blinker(rig.seed + aspect * 0.01);
    rig.anims.always = (t, dt, ctx) => {
      const k = blink(t);
      for (const e of eyeList) e.scale.y = Math.max(0.12, 1 - k);
      ears.forEach((e, i) => {
        const c = (t + ctx.phase + i * 2.3) % 5.1;
        const f = c < 0.3 ? Math.sin((c / 0.3) * PI) : 0;
        e.rotation.z = e.userData.rest + f * (e.userData.flick ?? 0.3) * (i ? -1 : 1);
      });
      if (tail) tail.rotation.y = Math.sin(t * 3 + ctx.phase) * 0.35;
    };
    rig.anims.idle = (t, dt, ctx) => {
      const b = Math.sin(t * 2 + ctx.phase);
      torso.scale.set(1 + b * 0.01, 1 + b * 0.015, 1);
      head.rotation.z = Math.sin(t * 0.7 + ctx.phase) * 0.07;
      head.rotation.y = Math.sin(t * 0.33 + ctx.phase) * 0.18;
      // one arm waves (pupils) or lifts the book (teacher) every few seconds
      const c = (t + ctx.phase * 2) % 7;
      const w = c < 2 ? Math.sin((c / 2) * PI) : 0;
      const [l, r] = arms;
      l.rotation.z = -(o.armOut ?? 0.9);
      r.rotation.z = (o.armOut ?? 0.9) + w * (o.hold ? 0.5 : 1.7);
      r.rotation.x = o.hold ? -w * 0.5 : Math.sin(t * 14) * w * 0.25;
      // a tiny happy hop now and then
      const hc2 = (t + ctx.phase * 3) % 9;
      root.position.y = hc2 < 0.4 ? Math.sin((hc2 / 0.4) * PI) * 4 : 0;
    };
  });
}

// ears: long floppy bunny ears
function bunnyEars({ head, surf, S }) {
  return [-1, 1].map((s) => {
    const { p } = surf(s * S(1.6), S(2.9), -3);
    const e = group(p.x, p.y, p.z - 2);
    e.add(mesh(new THREE.CapsuleGeometry(S(0.75), S(2.2), 3, 6).scale(1, 1, 0.45).translate(0, S(1.6), 0), '#d8bfa2', 0, 0, 0, FUR));
    e.add(mesh(new THREE.CapsuleGeometry(S(0.38), S(1.8), 3, 6).scale(1, 1, 0.3).translate(0, S(1.6), 1.6), '#e6c4b4'));
    e.userData.rest = s * -0.12;
    e.userData.flick = 0.35;
    head.add(e);
    return e;
  });
}
// round bear/cat ears (disc with an inner)
function roundEars(color, inner, size = 1.0) {
  return ({ head, surf, S }) => [-1, 1].map((s) => {
    const { p } = surf(s * S(2.8), S(2.6), -3.5);
    const e = group(p.x, p.y, p.z - 1);
    e.add(mesh(new THREE.CylinderGeometry(S(0.9 * size), S(0.9 * size), 6, 14).rotateX(PI / 2), color, 0, 0, 0, FUR));
    e.add(mesh(new THREE.CylinderGeometry(S(0.5 * size), S(0.5 * size), 1, 12).rotateX(PI / 2), inner, 0, 0, 3.2));
    e.userData.rest = 0;
    e.userData.flick = 0.25;
    head.add(e);
    return e;
  });
}
// pointed fox ears
function foxEars({ head, surf, S }) {
  return [-1, 1].map((s) => {
    const { p } = surf(s * S(2.6), S(2.5), -4);
    const e = group(p.x, p.y, p.z - 1);
    e.add(mesh(fold([[-S(1.2), 0], [S(1.2), 0], [s * S(0.5), S(2.4)]], 6, 1.8), '#7c6a5c', 0, 0, 0, FUR));
    e.add(mesh(fold([[-S(0.6), 1], [S(0.6), 1], [s * S(0.3), S(1.7)]], 1, 1), '#4d3c31', 0, 0, 3.6));
    e.userData.rest = s * -0.18;
    head.add(e);
    return e;
  });
}

classmate('bunnyPupil', 62.7, {
  headColor: '#d8c1a5', head: [5, 4.3, 3.4, 3.2], neck: 6.6, neckW: 3.6, hem: 9.0, hemW: 5.0, bodyDepth: 20,
  body: '#9fbdb5', collar: '#b9d2cc', pack: '#3f6458', arm: '#d4b998', armTex: FUR, armLen: 17,
  legs: [3.5, 6.1], legColor: '#b38f68', legTex: FUR,
  eye: [1.3, 0.24, 0.3], cheek: [0.75, 2.0, 0.8], nose: [0.22, 0.65],
  ears: bunnyEars,
  tail: (S) => mesh(new THREE.IcosahedronGeometry(S(0.75), 1), '#efe6da', 0, 0, 0, FUR),
});

classmate('bearPupil', 71.2, {
  headColor: '#8e7a6a', head: [5, 3.7, 3.9, 3.6], neck: 6.2, neckW: 3.8, hem: 9.3, hemW: 5.2, bodyDepth: 22,
  body: '#806b5a', pack: '#5a4232', arm: '#7a6555', armLen: 18,
  legs: [3.7, 6.3], legColor: '#4a3624',
  eye: [1.6, 0.22, 0.4], cheek: [0.8, 2.3, 0.9], nose: [0.36, 0.75],
  muzzle: [1.05, 0.85, 0.9], muzzleColor: '#d4c3aa',
  ears: roundEars('#7a6656', '#5c4636'),
  tail: (S) => mesh(new THREE.IcosahedronGeometry(S(0.55), 1), '#7a6555', 0, 0, 0, FUR),
});

classmate('catPupil', 73.7, {
  headColor: '#e2ddd0', head: [5, 3.8, 3.7, 3.4], neck: 6.4, neckW: 3.6, hem: 8.7, hemW: 5.0, bodyDepth: 20,
  body: '#9ab6ad', collar: '#cfddd8', pack: '#4b7065', arm: '#d9d4c5', armTex: FUR, armLen: 17,
  legs: [3.7, 6.2], legColor: '#4f7272', shoes: '#e3d9c6',
  eye: [1.55, 0.22, 0.4], cheek: [0.8, 2.25, 0.8], nose: [0.22, 0.65],
  // the right half of the face is teal, like the sheet
  headRight: '#7fa39a',
  ears: roundEars('#7fa39a', '#cfe0dc', 0.8),
  tail: (S) => {
    const t = new THREE.Group();
    t.add(mesh(new THREE.CapsuleGeometry(S(0.28), S(1.6), 3, 6).rotateX(-1.1).translate(0, S(0.6), -S(0.8)), '#d9d4c5', 0, 0, 0, FUR));
    return t;
  },
});

classmate('foxTeacher', 78.8, {
  headColor: '#8c7969', head: [5, 3.8, 4.5, 3.0], neck: 6.6, neckW: 3.6, hem: 9.4, hemW: 4.6, bodyDepth: 22,
  body: '#6f8f86', collar: '#d6cfbd', arm: '#7a9797', armLen: 22, armOut: 0.35,
  legs: [4.1, 5.9], legColor: '#1d1813',
  eye: [1.6, 0.22, 0.5], cheek: [0.75, 2.6, 0.5], nose: [0.34, 1.0],
  muzzle: [1.7, 1.15, 1.0], muzzleColor: '#ddcdbd', snout: true,
  // an angular folded head with pointed cheek tufts (vertices at ±x on the
  // equator), like the printed fox — not a round ball
  headGeo: (R) => new THREE.SphereGeometry(1, 6, 4).scale(R.x * 1.08, R.y, R.z),
  ears: foxEars,
  tail: (S) => {
    const t = new THREE.Group();
    // a big bushy tail out of the rump: it sweeps back and up behind the
    // coat and curls toward her right side (as printed), cream tip last
    const bush = new THREE.Group();
    bush.add(mesh(new THREE.SphereGeometry(1, 8, 6).scale(S(0.85), S(0.75), S(1.5)).translate(0, 0, -S(1.3)), '#7c6a5c', 0, 0, 0, FUR));
    bush.add(mesh(new THREE.SphereGeometry(1, 8, 6).scale(S(0.5), S(0.45), S(0.7)).translate(0, 0, -S(2.65)), '#efe5d4', 0, 0, 0, FUR));
    bush.rotation.set(-0.55, 0.65, 0);
    t.add(bush);
    return t;
  },
  hold: ([l, r], S) => {
    // a dark book under the left arm, a light one in the right hand
    l.add(mesh(cbox(S(1.6), S(2.0), 5), '#3f6b66', -2, -20, 5));
    r.add(mesh(cbox(S(1.8), S(1.4), 5), '#cfe0dc', 2, -20, 5));
  },
});

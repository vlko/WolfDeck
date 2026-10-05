import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, fold, beam, box, cbox, group, cheek, eyes, blinker, facet, mat, smoke, PI,
} from './kit.js';

// Models for the pieces on namestovo.png: the town church with its onion
// spire, Orava lake with the island chapel, pier and rowing boat, the cute
// face house, a stone cottage, the flower-bed island and the roundabout, the
// cycle-route signpost, an apartment block, the tangled signpost and the
// mountain chalet.
//
// Measured straight off the sheet: every model is given its rectangle on the
// sheet's 2000-px preview (foot = the ground line, top = its highest point),
// and S(px)/X(px)/Y(py) convert preview pixels to sprite-percent units
// (x centered on the rect, y up from the foot, 100 = full height).

function sheet(x0, x1, top, foot) {
  const k = 100 / (foot - top);
  const cx = (x0 + x1) / 2;
  return {
    k,
    X: (px) => (px - cx) * k,
    Y: (py) => (foot - py) * k,
    S: (px) => px * k,
  };
}

// A shape (xy points) extruded through depth d, centered in z.
function slab(points, d) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
}

// Gabled roof as ONE continuous solid: the ⋀ cross-section (outer edge apex
// → eaves, thickness t square to the slope) extruded front→back through d.
function roofSolid(apexX, apexY, halfSpan, eaveY, t, d) {
  const drop = t / Math.cos(Math.atan2(apexY - eaveY, halfSpan));
  return slab([
    [apexX - halfSpan, eaveY], [apexX, apexY], [apexX + halfSpan, eaveY],
    [apexX + halfSpan, eaveY - drop], [apexX, apexY - drop], [apexX - halfSpan, eaveY - drop],
  ], d);
}

// The same ⋀ profile, but the ridge runs left→right (x) and the slopes face
// front and back — a roof seen from its long side. width w, ridge height h
// above the eaves, depth d (eave to eave), thickness t.
function sideRoof(w, h, d, t) {
  const drop = t / Math.cos(Math.atan2(h, d / 2));
  const s = new THREE.Shape([
    [-d / 2, 0], [0, h], [d / 2, 0], [d / 2, -drop], [0, h - drop], [-d / 2, -drop],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false })
    .translate(0, 0, -w / 2).rotateY(-PI / 2);
}

// Front gable wall (triangle) of width w, rise h, depth d, base at y = 0.
function gableWall(w, h, d) {
  return slab([[-w / 2, 0], [w / 2, 0], [0, h]], d);
}

// Recessed window: frame plate + dark glass, standing proud of a wall at z.
function windowPane(x0, x1, y0, y1, z, { frame = '#f2eedf', glass = '#2c4744', cross = false, sill = true } = {}) {
  const g = new THREE.Group();
  const w = x1 - x0;
  const h = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  g.add(mesh(cbox(w + 1.6, h + 1.6, 1), frame, cx, cy, z + 0.5));
  g.add(mesh(cbox(w, h, 1), glass, cx, cy, z + 0.9));
  if (cross) {
    g.add(mesh(cbox(0.8, h, 0.6), frame, cx, cy, z + 1.6));
    g.add(mesh(cbox(w, 0.8, 0.6), frame, cx, cy, z + 1.6));
  }
  if (sill) g.add(mesh(cbox(w + 2.6, 1.1, 2.4), frame, cx, y0 - 0.9, z + 1.1));
  return g;
}

// Arched opening (door / church window): a rect with a half-round top, as a
// thin dark slab on a wall face at z.
function arch(cx, w, y0, y1, z, color = '#3a2716', depth = 1.2) {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(cx - r, y0);
  s.lineTo(cx + r, y0);
  s.lineTo(cx + r, y1 - r);
  s.absarc(cx, y1 - r, r, 0, PI, false);
  s.lineTo(cx - r, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
  return mesh(g, color, 0, 0, z);
}

// A little flower on a stem: sways from the ground. Returns the pivot.
function flower(x, y, z, h, color, head = 2.6) {
  const p = group(x, y, z);
  p.add(mesh(cbox(head * 0.35, h, head * 0.35).translate(0, h / 2, 0), '#6f8a4e'));
  p.add(mesh(new THREE.IcosahedronGeometry(head, 1), color, 0, h + head * 0.6, 0));
  p.add(mesh(new THREE.ConeGeometry(head * 0.6, head * 1.2, 4).rotateZ(-0.9), '#7d9a58', head * 0.45, h * 0.5, 0));
  return p;
}

function swayFlowers(rig, flowers) {
  const prev = rig.anims.always;
  rig.anims.always = (t, dt, ctx) => {
    prev?.(t, dt, ctx);
    flowers.forEach((f, i) => {
      f.rotation.z = Math.sin(t * 1.6 + i * 1.3 + (ctx?.phase ?? 0)) * 0.12;
      f.rotation.x = Math.sin(t * 1.1 + i) * 0.05;
    });
  };
  rig.anims.idle = rig.anims.idle ?? (() => {});
}

// A post with a flat sign: rect sign (w × h) centered at (x, signY) on the
// front of the post. Returns the group.
function postSign(x, y0, y1, z, postW, color = '#5e4632') {
  const g = new THREE.Group();
  g.add(mesh(box(postW, y1 - y0, postW), color, x, y0, z));
  return g;
}

// Wooden arrow board: tip pointing `dir` (+1 right / −1 left), body from
// x0 to x1 (tip included), centered at y, thickness d, on the post at z.
function arrowBoard(x0, x1, y, h, d, dir, color) {
  const tip = h * 0.55;
  const pts = dir > 0
    ? [[x0, y - h / 2], [x1 - tip, y - h / 2], [x1, y], [x1 - tip, y + h / 2], [x0, y + h / 2]]
    : [[x1, y - h / 2], [x0 + tip, y - h / 2], [x0, y], [x0 + tip, y + h / 2], [x1, y + h / 2]];
  return mesh(slab(pts, d), color);
}

// ── churchNamestovo — white tower + green onion spire, purple-roofed nave ──
defineModel('churchNamestovo', (opts, rig) => {
  const { X, Y, S } = sheet(125, 522, 40, 1060);
  const white = '#f1efe8';
  const whiteShade = '#dedbd1';
  const green = '#89ad9f';
  // tower: a square shaft
  const tw = S(170);
  const tx = X(215);
  const top = Y(470);
  rig.body.add(mesh(box(tw, top, tw), white, tx, 0, 0));
  rig.body.add(mesh(box(tw + 1.6, 2.2, tw + 1.6), whiteShade, tx, top - 2.2, 0)); // cornice
  const tf = tw / 2;
  // tower openings on the front face
  rig.body.add(arch(tx, S(45), Y(590), Y(505), tf + 0.1, '#3f2a1b'));
  rig.body.add(mesh(cbox(S(20), S(30), 1), '#2e2620', tx - S(5), Y(735), tf + 0.6));
  rig.body.add(inkMesh(new THREE.CircleGeometry(S(9), 12), '#2e2620', tx, Y(785), tf + 0.4));
  rig.body.add(arch(tx, S(55), Y(1060), Y(960), tf + 0.1, '#7b5634'));
  // onion spire: one lathed, faceted solid on the tower top
  const prof = [
    [S(85), Y(470)], [S(50), Y(400)], [S(70), Y(372)], [S(82), Y(345)], [S(62), Y(318)],
    [S(26), Y(292)], [S(22), Y(255)], [S(9), Y(215)], [S(5), Y(175)], [0, Y(172)],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const spire = new THREE.LatheGeometry(prof, 8).rotateY(PI / 8);
  rig.body.add(mesh(spire, green, tx, 0, 0, { jitter: 0.03 }));
  rig.body.add(mesh(new THREE.IcosahedronGeometry(S(44), 1), green, tx, Y(130), 0));
  rig.body.add(mesh(cbox(S(14), Y(40) - Y(160), S(14)).translate(0, (Y(40) - Y(160)) / 2, 0), '#6f8f82', tx, Y(160), 0));
  // nave: abuts the tower's right side, roof continuous front → back
  const nx0 = X(300);
  const nx1 = X(515);
  const nw = nx1 - nx0;
  const ncx = (nx0 + nx1) / 2;
  const nd = tw * 1.7;
  const eave = Y(905);
  rig.body.add(mesh(box(nw, eave, nd), white, ncx, 0, -tw * 0.25));
  rig.body.add(mesh(sideRoof(nw + 2, Y(745) - eave, nd + 4, 2.5), '#776a70', ncx, eave - 0.6, -tw * 0.25));
  const nf = nd / 2 - tw * 0.25;
  for (const px of [345, 405, 465]) rig.body.add(arch(X(px), S(20), Y(1005), Y(930), nf + 0.1, '#3f2a1b'));
  // the bell: hidden in the belfry window, it swings now and then
  const bell = group(tx, Y(515), 0);
  bell.add(mesh(new THREE.CylinderGeometry(S(8), S(16), S(30), 8).translate(0, -S(18), 0), '#b89a57'));
  rig.body.add(bell);
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 11;
    bell.rotation.z = c < 3 ? Math.sin(c * 6) * 0.45 * (1 - c / 3) : 0;
  };
});

// ── oravaLake — mountains, the lake, the island chapel, a pier and a boat ──
defineModel('oravaLake', (opts, rig) => {
  const { X, Y, S } = sheet(352, 1268, 62, 585);
  const D = 46; // lake depth (front → back)
  const xl = X(358);
  const xr = X(1265);
  const backY = Y(330) * 0.42; // the lake surface rises gently toward the back
  const frontY = 3;
  const surfY = (z) => frontY + (backY - frontY) * ((D / 2 - z) / D);
  // the lake: one faceted slab whose top slopes up toward the mountains
  const water = new THREE.BoxGeometry(xr - xl, 1, D, 10, 1, 6).translate((xl + xr) / 2, 0.5, 0);
  {
    const p = water.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
      if (p.getY(i) > 0.5) p.setY(i, surfY(p.getZ(i)) + Math.sin(p.getX(i) * 0.4 + p.getZ(i) * 0.7) * 0.4);
    }
    water.computeVertexNormals();
  }
  const lake = mesh(water, '#7fa6a3', 0, 0, 0, { jitter: 0.06 });
  rig.body.add(lake);
  // mountains standing on the lake's back edge: folded peaks, light/dark halves
  const mz = -D / 2 - 4;
  const base = backY - 1;
  // broad massifs (the sheet's ridges), heights measured above the shore
  const peaks = [
    [352, 445, 100, 640], [470, 640, 68, 900], [690, 780, 130, 960], [800, 960, 168, 1185],
  ];
  const shoreY = Y(330);
  peaks.forEach(([x0, px, py, x1], i) => {
    const top = base + (Y(py) - shoreY) * 1.1;
    // rooted on the ground (their foot hides behind the lake), not hovering
    const g = fold([[X(x0), 0], [X(x0) + (X(px) - X(x0)) * 0.12, base], [X(px), top], [X(x1) - (X(x1) - X(px)) * 0.12, base], [X(x1), 0]], 16, 9, { cx: X(px) });
    {
      // taper toward the summit so from the side a mountain reads as a
      // ridge, not a thick slab with a flat top
      const gp = g.attributes.position;
      for (let k = 0; k < gp.count; k += 1) {
        const f = Math.min(Math.max(gp.getY(k) / top, 0), 1);
        gp.setZ(k, gp.getZ(k) * (1 - 0.8 * f));
      }
      g.computeVertexNormals();
    }
    rig.body.add(mesh(g, ['#d6cbbb', '#cbbfae', '#d1c5b4', '#c7baa7'][i], 0, 0, mz - 8 + (i % 2) * 5));
  });
  // the island: a green mound on the water, the white chapel on top
  const iz = -6;
  const iy = surfY(iz);
  const ix = X(707);
  rig.body.add(mesh(new THREE.SphereGeometry(1, 14, 8, 0, PI * 2, 0, PI / 2).scale(S(148), S(62), 13), '#8a9a5a', ix, iy - 1, iz));
  const cy0 = iy + S(62) * 0.75;
  const cw = S(120);
  const cd = 12;
  rig.body.add(mesh(box(cw, S(75), cd), '#f4f2ec', ix, cy0, iz));
  rig.body.add(mesh(gableWall(cw, S(50), cd).translate(0, cy0 + S(75), 0), '#f4f2ec', ix, 0, iz));
  rig.body.add(mesh(roofSolid(0, cy0 + S(75) + S(52), cw / 2 + 2, cy0 + S(75) - 0.5, 1.6, cd + 3), '#5b4a47', ix, 0, iz));
  rig.body.add(mesh(box(S(28), S(40), S(28)), '#f4f2ec', ix, cy0 + S(75) + S(30), iz));
  rig.body.add(mesh(new THREE.ConeGeometry(S(22), S(45), 4).rotateY(PI / 4).translate(0, S(22), 0), '#5b4a47', ix, cy0 + S(75) + S(70), iz));
  rig.body.add(arch(ix, S(22), cy0, cy0 + S(45), iz + cd / 2 + 0.1, '#3a2716', 0.8));
  // the pier: plank deck on posts standing in the water, steps down at the end
  const pz = 13;
  const deckY = Y(470);
  const px0 = X(815);
  const px1 = X(1000);
  rig.body.add(mesh(box(px1 - px0, 2.6, 13), '#a27d4f', (px0 + px1) / 2, deckY - 2.6, pz));
  for (let x = px0 + 1; x < px1; x += (px1 - px0) / 7) {
    rig.body.add(mesh(cbox(0.4, 0.4, 13), '#7f5f3b', x, deckY + 0.05, pz)); // plank seams
  }
  for (const [x, dz] of [[px0 + 2, -5], [px0 + 2, 5], [(px0 + px1) / 2, -5], [(px0 + px1) / 2, 5], [px1 - 2, -5], [px1 - 2, 5]]) {
    rig.body.add(mesh(box(2.4, deckY - 2.6, 2.4), '#5a4024', x, 0, pz + dz));
  }
  for (let i = 0; i < 3; i += 1) {
    rig.body.add(mesh(box(4.4, 1.4, 11), '#a27d4f', px1 + 2.2 + i * 4.2, deckY - 2.6 - (i + 1) * ((deckY - 2.6 - surfY(pz)) / 4), pz));
  }
  // two mooring posts and the little pennant
  for (const x of [X(995), X(1030)]) rig.body.add(mesh(box(2.2, Y(430) - (deckY - 2.6), 2.2), '#5a4024', x, deckY - 2.6, pz - 4));
  const flagPole = group(X(1025), deckY, pz - 5);
  flagPole.add(mesh(box(0.8, S(75), 0.8), '#4e3a26'));
  const flag = group(0, S(75) - 1, 0);
  flag.add(mesh(new THREE.BoxGeometry(5, 3.4, 0.4, 3, 1, 1).translate(2.5, -1.7, 0), '#f1efe8'));
  flagPole.add(flag);
  rig.body.add(flagPole);
  // the rowing boat floating beside the pier, oar resting across it
  const boat = group(X(1130), surfY(pz + 1), pz + 1);
  {
    const L = S(255);
    const hull = slab([[-L / 2, 2.6], [-L / 2 + 6, -1.6], [L / 2 - 8, -1.6], [L / 2, 4.2], [L / 2 - 6, 2.6]], 11);
    boat.add(mesh(hull, '#6d4c28'));
    boat.add(mesh(cbox(L - 9, 0.8, 9.5), '#3e2c18', -0.5, 2.5, 0)); // the dark inside
    boat.add(mesh(cbox(2.4, 0.8, 10.6), '#8a6a44', -L * 0.12, 2.8, 0)); // thwart
    boat.add(mesh(beam(-L * 0.25, 2.8, L * 0.32, 8, 0.8, 0.8), '#8a6a44', 0, 0, 3));
  }
  rig.body.add(boat);
  rig.anims.idle = (t, dt, ctx) => {
    boat.rotation.z = Math.sin(t * 1.1 + ctx.phase) * 0.05;
    boat.rotation.x = Math.sin(t * 0.8 + ctx.phase) * 0.04;
    boat.position.y = surfY(pz + 1) + Math.sin(t * 1.3 + ctx.phase) * 0.35;
    lake.position.y = Math.sin(t * 0.9) * 0.15;
    flag.rotation.y = Math.sin(t * 3 + ctx.phase) * 0.35;
  };
});

// ── faceHouse — a cream house-shaped building with a cute face ────────────
defineModel('faceHouse', (opts, rig) => {
  const { X, Y, S } = sheet(1235, 1570, 68, 432);
  const D = 52;
  const outline = [
    [1240, 432], [1240, 200], [1298, 92], [1385, 68], [1515, 98], [1565, 200], [1565, 432],
  ].map(([x, y]) => [X(x), Y(y)]);
  const body = fold(outline, D, 7, { cx: X(1385) });
  rig.body.add(mesh(body, '#ece5d3'));
  const zf = body.userData.zAt;
  // face on the folded front
  const ey = eyes(Math.abs(X(1470) - X(1290)) / 2, S(9));
  ey.group.position.set((X(1290) + X(1470)) / 2, Y(225), Math.max(zf(X(1290)), zf(X(1470))) + 1.2);
  ey.group.children.forEach((e) => { e.position.z = zf(e.position.x + ey.group.position.x) - ey.group.position.z + 1.3; });
  rig.body.add(ey.group);
  for (const px of [1290, 1462]) {
    const c = cheek(S(38), '#ddaaa1');
    const x = X(px);
    c.position.set(x, Y(305), zf(x) + 0.6);
    c.rotation.y = Math.sign(x - X(1385)) * Math.atan2(7, (X(1565) - X(1240)) / 2) * 0.9;
    rig.body.add(c);
  }
  // a round attic window, and the arched door
  rig.body.add(inkMesh(new THREE.CircleGeometry(S(9), 14), '#2a211c', X(1382), Y(130), zf(X(1382)) + 0.4));
  const door = arch(X(1380), S(52), Y(432), Y(345), zf(X(1380)) - 0.8, '#7a5534', 2.6);
  rig.body.add(door);
  // the sides read as a house too: a little window on each side wall
  for (const [sx, side] of [[X(1240), -1], [X(1565), 1]]) {
    const hold = group(sx - side * 0.5, 0, -4); // frames nearly flush, no slivers from the front
    hold.rotation.y = side * PI / 2;
    hold.add(windowPane(-S(16), S(16), Y(300), Y(245), 0, { frame: '#f6f1e4', glass: '#5b4a3d', cross: true, sill: false }));
    rig.body.add(hold);
  }
  const blink = blinker(rig.seed + 0.4);
  rig.anims.always = (t) => ey.blink(blink(t));
  rig.anims.idle = (t, dt, ctx) => {
    // a happy little wiggle now and then
    const c = (t + ctx.phase) % 7;
    rig.body.rotation.z = c < 0.8 ? Math.sin(c * 16) * 0.025 * (1 - c / 0.8) : 0;
  };
});

// ── stoneCottage — white cottage with stone corners, dark roof, grass pad ──
defineModel('stoneCottage', (opts, rig) => {
  const { X, Y, S } = sheet(1590, 1918, 58, 342);
  const D = 46;
  const front = D / 2;
  const pad = 3;
  // grass pad (flat, on the ground)
  rig.body.add(mesh(new THREE.CylinderGeometry(1, 1, pad, 16).scale((X(1915) - X(1595)) / 2, 1, D * 0.95).translate(0, pad / 2, 0), '#a6af79'));
  const eave = Y(195);
  const w = X(1865) - X(1645);
  rig.body.add(mesh(box(w, eave - pad, D), '#ece6da', X(1755), pad, 0));
  rig.body.add(mesh(gableWall(w, Y(70) - eave, D).translate(0, eave, 0), '#ece6da', X(1755), 0, 0));
  rig.body.add(mesh(roofSolid(X(1757), Y(58), (X(1887) - X(1627)) / 2, eave - 1, 3.4, D + 6), '#3a2c2d'));
  // stone quoins: chunky grey blocks set into the corners
  const stones = [[1650, 210, 30, 26], [1648, 245, 22, 24], [1655, 278, 34, 26], [1838, 205, 28, 30], [1842, 250, 26, 26], [1835, 282, 32, 22], [1700, 290, 26, 18]];
  for (const [px, py, sw, sh] of stones) rig.body.add(mesh(cbox(S(sw), S(sh), 2), '#c9c0b2', X(px + sw / 2), Y(py + sh / 2), front + 0.6));
  rig.body.add(inkMesh(new THREE.CircleGeometry(S(13), 14), '#2a211c', X(1755), Y(175), front + 0.4));
  rig.body.add(mesh(new THREE.TorusGeometry(S(13), 0.8, 4, 14), '#d9d1c2', X(1755), Y(175), front + 0.5));
  rig.body.add(mesh(box(S(50), Y(232) - Y(305), 1.6), '#5c3c22', X(1755), pad, front + 0.2));
  // grass tufts (sway)
  const tufts = [];
  for (const [px, dz] of [[1615, 4], [1630, -6], [1880, 3], [1895, -5], [1720, 12]]) {
    const tf = group(X(px), pad, front + dz);
    for (let i = -1; i <= 1; i += 1) {
      const blade = mesh(new THREE.ConeGeometry(0.9, S(40), 3).translate(0, S(20), 0), '#7e9a52', i * 1.1, 0, 0);
      blade.rotation.z = i * 0.25;
      tf.add(blade);
    }
    rig.body.add(tf);
    tufts.push(tf);
  }
  rig.anims.idle = (t, dt, ctx) => tufts.forEach((tf, i) => { tf.rotation.z = Math.sin(t * 1.4 + i + ctx.phase) * 0.12; });
});

// ── flowerIsland — round flower bed with a paved rim and two signs ────────
defineModel('flowerIsland', (opts, rig) => {
  const { X, Y, S } = sheet(1510, 1906, 392, 590);
  const R = (X(1900) - X(1515)) / 2;
  const H = 14;
  rig.body.add(mesh(new THREE.CylinderGeometry(R, R * 1.03, H, 18).translate(0, H / 2, 0), '#8f9b5c'));
  rig.body.add(mesh(new THREE.CylinderGeometry(R * 0.96, R * 0.96, 1.2, 18).translate(0, H + 0.6, 0), '#d9d0c6'));
  const gr = R * 0.6;
  rig.body.add(mesh(new THREE.CylinderGeometry(gr, gr, 2.4, 16).translate(0, H + 1.2, 0), '#8ea25d'));
  const top = H + 2.4;
  // the signs: a square map board and a triangle, each on its own post
  rig.body.add(mesh(box(S(12), Y(445) - top, S(12)), '#5e4632', X(1637), top, -gr * 0.4));
  rig.body.add(mesh(cbox(S(55), S(52), 1.6), '#4f7471', X(1637), Y(418), -gr * 0.4 + S(6) + 0.9));
  for (const [dx, dy, r] of [[-8, 6, 4], [7, 7, 5], [-6, -6, 4], [8, -5, 3]]) {
    rig.body.add(mesh(new THREE.CircleGeometry(r * 0.5, 7), '#e8e4d8', X(1637) + dx * 0.5, Y(418) + dy * 0.5, -gr * 0.4 + S(6) + 1.8));
  }
  rig.body.add(mesh(box(S(12), Y(440) - top, S(12)), '#5e4632', X(1822), top, -gr * 0.2));
  rig.body.add(mesh(new THREE.ConeGeometry(S(26), S(38), 3).rotateZ(PI).translate(0, Y(420) - top, 0), '#355850', X(1822), top, -gr * 0.2 + S(6) + 1));
  const flowers = [];
  for (const [px, dz, c] of [[1690, 6, '#efc9b6'], [1708, -2, '#e9a8a0'], [1735, 4, '#e3b748'], [1660, -4, '#f2e6c8'], [1760, -6, '#e9a8a0']]) {
    const f = flower(X(px), top, dz, S(28), c, S(9));
    rig.body.add(f);
    flowers.push(f);
  }
  swayFlowers(rig, flowers);
  rig.anims.idle = () => {};
});

// ── roundabout — stone roundabout island, flowers, two road signs ─────────
defineModel('roundabout', (opts, rig) => {
  const { X, Y, S } = sheet(1185, 1566, 492, 722);
  const R = (X(1565) - X(1188)) / 2;
  const H = 16;
  // stone drum in two courses of blocks
  for (let c = 0; c < 2; c += 1) {
    const g = new THREE.CylinderGeometry(R, R * 1.01, H / 2 - 0.2, 20, 1).rotateY(c * (PI / 20)).translate(0, (H / 2) * c + H / 4, 0);
    rig.body.add(mesh(g, c ? '#b9b3ab' : '#a49e96', 0, 0, 0, { jitter: 0.09 }));
  }
  rig.body.add(mesh(new THREE.CylinderGeometry(R * 0.98, R * 0.98, 1.2, 20).translate(0, H + 0.6, 0), '#d6d0c7'));
  const gr = R * 0.58;
  rig.body.add(mesh(new THREE.CylinderGeometry(gr, gr, 2.2, 18).translate(0, H + 1.1, 0), '#8ea25d'));
  const top = H + 2.2;
  // round blue sign (bent arrow) + white info board
  rig.body.add(mesh(box(S(14), Y(555) - top, S(14)), '#5e4632', X(1325), top, -gr * 0.35));
  const sz = -gr * 0.35 + S(7) + 0.8;
  rig.body.add(mesh(new THREE.CylinderGeometry(S(30), S(30), 1.4, 18).rotateX(PI / 2), '#5f8a90', X(1325), Y(525), sz));
  rig.body.add(mesh(beam(X(1305), Y(540), X(1330), Y(515), 2.4, 0.6), '#f0ede4', 0, 0, sz + 1.1));
  rig.body.add(mesh(beam(X(1328), Y(515), X(1350), Y(530), 2.4, 0.6), '#f0ede4', 0, 0, sz + 1.1));
  rig.body.add(mesh(box(S(14), Y(575) - top, S(14)), '#5e4632', X(1425), top, -gr * 0.2));
  const bz = -gr * 0.2 + S(7) + 0.8;
  rig.body.add(mesh(cbox(S(40), S(85), 1.4), '#ece8dd', X(1425), Y(532), bz));
  for (let i = 0; i < 4; i += 1) rig.body.add(mesh(cbox(S(26) - (i % 2) * 3, 1.1, 0.4), '#3a3530', X(1425), Y(505) - i * S(17), bz + 0.9));
  const flowers = [];
  for (const [px, dz, c] of [[1300, 4, '#f0c9c4'], [1355, 7, '#e8efe0'], [1395, 2, '#e48f95'], [1460, 6, '#f0c9c4'], [1270, -3, '#e3b748']]) {
    const f = flower(X(px), top, dz, S(24), c, S(10));
    rig.body.add(f);
    flowers.push(f);
  }
  swayFlowers(rig, flowers);
  rig.anims.idle = () => {};
});

// ── cycleSign — cycle-route board and two arrows on a post, stone base ────
defineModel('cycleSign', (opts, rig) => {
  const { X, Y, S } = sheet(578, 750, 620, 1060);
  const px = X(668);
  rig.body.add(mesh(box(S(55), Y(945), S(55)), '#c9c2b6', X(667), 0, 0, { jitter: 0.08 }));
  for (const y of [980, 1015]) rig.body.add(mesh(cbox(S(56), 0.6, S(56)), '#a8a196', X(667), Y(y), 0));
  const postTop = Y(632);
  rig.body.add(mesh(box(S(16), postTop - Y(945), S(16)), '#4f3a26', px, Y(945), 0));
  const fz = S(8) + 1.2;
  // blue board with a white bicycle
  rig.body.add(mesh(cbox(S(70), S(82), 1.6), '#4f8a90', X(665), Y(676), fz));
  const bike = (cy) => {
    const g = new THREE.Group();
    for (const dx of [-S(14), S(14)]) g.add(mesh(new THREE.TorusGeometry(S(9), 0.45, 4, 12), '#f1efe8', dx, 0, 0));
    g.add(mesh(beam(-S(14), 0, 0, S(10), 0.7, 0.4), '#f1efe8'));
    g.add(mesh(beam(0, S(10), S(14), 0, 0.7, 0.4), '#f1efe8'));
    g.add(mesh(beam(-S(5), 0, S(4), S(10), 0.7, 0.4), '#f1efe8'));
    g.position.set(X(665), cy, fz + 1.1);
    return g;
  };
  rig.body.add(bike(Y(655)));
  rig.body.add(bike(Y(697)));
  // arrows — boards nailed across the post (they pass behind it)
  rig.body.add(arrowBoard(X(605), X(745), Y(759), S(38), 2.6, 1, '#a07a50').translateZ(fz + 0.2));
  rig.body.add(arrowBoard(X(583), X(728), Y(816), S(37), 2.6, -1, '#8f6b44').translateZ(fz + 0.2));
  for (const y of [759, 816]) rig.body.add(inkMesh(new THREE.CircleGeometry(0.7, 8), '#3a2c1c', px, Y(y), fz + 1.6));
});

// ── apartmentBlock — four storeys with balconies + a low annex ────────────
defineModel('apartmentBlock', (opts, rig) => {
  const { X, Y, S } = sheet(805, 1252, 677, 1060);
  const D = 50;
  const front = D / 2;
  const mx0 = X(808);
  const mx1 = X(1118);
  const mcx = (mx0 + mx1) / 2;
  const mw = mx1 - mx0;
  rig.body.add(mesh(box(mw, Y(712), D), '#d6c7b0', mcx, 0, 0));
  rig.body.add(mesh(box(mw + 0.4, Y(995), D + 0.4), '#a7aaa3', mcx, 0, 0)); // plinth
  rig.body.add(mesh(box(mw + 3, Y(677) - Y(712), D + 3), '#6b5b51', mcx, Y(712), 0)); // cornice
  const cols = [[850, 895], [935, 985], [1020, 1065]];
  for (const [y0, y1] of [[730, 762], [820, 852], [910, 942], [1000, 1032]]) {
    cols.forEach(([x0, x1], i) => {
      if (y0 === 1000 && i === 2) return; // the door's place
      rig.body.add(windowPane(X(x0), X(x1), Y(y1), Y(y0), front, { frame: '#f4f1ea', glass: '#5d8a87', cross: true, sill: false }));
    });
  }
  rig.body.add(mesh(box(S(45), Y(1000), 1.4), '#55391d', X(1043), 0, front + 0.3));
  // balconies: slatted boxes hung on the facade (they touch the wall)
  for (const [y0, y1] of [[760, 797], [850, 887], [940, 977]]) {
    for (const [x0, x1] of [[820, 917], [1003, 1088]]) {
      const bx = (X(x0) + X(x1)) / 2;
      const bw = X(x1) - X(x0);
      const bh = Y(y0) - Y(y1);
      rig.body.add(mesh(box(bw, 1.4, 7), '#6e5a49', bx, Y(y1), front + 3.5));
      rig.body.add(mesh(box(bw, bh, 1), '#8a6a4c', bx, Y(y1), front + 6.6));
      for (const s of [-1, 1]) rig.body.add(mesh(box(1, bh, 7), '#7a5e44', bx + s * (bw / 2 - 0.5), Y(y1), front + 3.5));
      for (let i = 1; i < 6; i += 1) rig.body.add(mesh(cbox(0.4, bh, 0.4), '#5e4836', X(x0) + (bw * i) / 6, Y(y1) + bh / 2, front + 7.2));
    }
  }
  // the annex: lower house to the right, one continuous pitched roof
  const ax0 = X(1105);
  const ax1 = X(1250);
  const acx = (ax0 + ax1) / 2;
  const aw = ax1 - ax0;
  const ad = D * 0.8;
  const az = -D * 0.1;
  rig.body.add(mesh(box(aw, Y(900), ad), '#d9ccb6', acx, 0, az));
  rig.body.add(mesh(box(aw + 0.4, Y(1040), ad + 0.4), '#a7aaa3', acx, 0, az));
  rig.body.add(mesh(sideRoof(aw + 2, Y(850) - Y(900), ad + 4, 2.2), '#6a5a55', acx, Y(900) - 0.5, az));
  rig.body.add(mesh(box(S(12), Y(815) - Y(880), S(12)), '#c8c0b6', X(1175), Y(880), az - 4));
  const af = az + ad / 2;
  for (const [y0, y1] of [[940, 970], [1005, 1035]]) {
    for (const [x0, x1] of [[1135, 1160], [1190, 1215]]) rig.body.add(windowPane(X(x0), X(x1), Y(y1), Y(y0), af, { frame: '#f4f1ea', glass: '#5d8a87', sill: false }));
  }
  const sm = smoke(X(1175), Y(815) + 1, az - 4, { size: 2, rise: 18, drift: 5 });
  rig.body.add(sm.group);
  rig.anims.always = (t) => sm.update(t);
});

// ── signTangle — three arrow boards on a post, tied up with a ribbon ──────
defineModel('signTangle', (opts, rig) => {
  const { X, Y, S } = sheet(1320, 1536, 798, 1060);
  const px = X(1428);
  rig.body.add(mesh(box(S(16), 100, S(16)), '#5a3f26', px, 0, 0));
  const fz = S(8) + 1.3;
  const boards = [
    arrowBoard(X(1322), X(1505), Y(852), S(47), 2.6, -1, '#dcc29a'),
    arrowBoard(X(1358), X(1530), Y(928), S(45), 2.6, 1, '#d8b78a'),
    arrowBoard(X(1372), X(1480), Y(970), S(40), 2.6, -1, '#cfa774'),
  ];
  boards[2].rotation.z = 0.12;
  boards.forEach((b, i) => { b.position.z = fz + i * 0.3; rig.body.add(b); });
  for (const y of [835, 870, 912, 945]) rig.body.add(inkMesh(new THREE.CircleGeometry(0.8, 8), '#6a4228', px, Y(y), fz + 2.2));
  // the ribbon: loops wrapped round the post and the boards, a bow below
  const ribbonC = '#efe2c8';
  const loops = [];
  for (const [y, tilt, r] of [[905, 0.5, S(30)], [945, -0.4, S(26)], [1010, 0.3, S(18)]]) {
    // a flat band (wide in its own axis) wound diagonally round post and
    // boards — tipped toward the viewer so it reads as a loop, not a line
    const l = mesh(new THREE.TorusGeometry(r, 1.2, 3, 20).scale(1, 0.75, 3.2).rotateX(PI / 2), ribbonC, px, Y(y), 1.4);
    l.rotation.order = 'ZXY';
    l.rotation.z = tilt;
    l.rotation.x = -0.75;
    rig.body.add(l);
    loops.push(l);
  }
  for (const s of [-1, 1]) {
    const bow = mesh(new THREE.TorusGeometry(S(14), 1.3, 4, 12).scale(1.4, 0.8, 1), ribbonC, px + s * S(16), Y(1015), fz + 2.4);
    bow.rotation.z = s * 0.4;
    rig.body.add(bow);
    loops.push(bow);
  }
  const tails = [];
  for (const s of [-1, 1]) {
    const tail = group(px, Y(1020), fz + 2.6);
    tail.add(mesh(beam(0, 0, s * S(30), -S(40), 2.6, 0.5), ribbonC));
    rig.body.add(tail);
    tails.push(tail);
  }
  rig.anims.idle = (t, dt, ctx) => tails.forEach((tl, i) => { tl.rotation.z = Math.sin(t * 2 + i * 2 + ctx.phase) * 0.12; });
});

// ── chalet — big A-roof mountain chalet on a stone plinth ──────────────────
defineModel('chalet', (opts, rig) => {
  const { X, Y, S } = sheet(1572, 1938, 655, 1060);
  const D = 64;
  const front = D / 2;
  const x0 = X(1615);
  const x1 = X(1900);
  const cx = (x0 + x1) / 2;
  const w = x1 - x0;
  rig.body.add(mesh(box(w, Y(1000), D), '#bdb6aa', cx, 0, 0, { jitter: 0.08 })); // stone plinth
  rig.body.add(mesh(box(w, Y(895) - Y(1000), D), '#f2f0e6', cx, Y(1000), 0));
  const eave = Y(895);
  // the A roof: one continuous, thick solid running back with a deep front
  // overhang; the timber gable fills exactly the space under it
  const apexY = Y(658);
  const half = (X(1936) - X(1576)) / 2;
  const t = S(34);
  const drop = t / Math.cos(Math.atan2(apexY - Y(893), half));
  rig.body.add(mesh(roofSolid(X(1722), apexY, half, Y(893), t, D + 10), '#9e8b6f'));
  const gH = apexY - drop - eave;
  const gHalf = half * (gH / (apexY - Y(893)));
  rig.body.add(mesh(gableWall(gHalf * 2, gH, D - 4).translate(0, eave, 0), '#84613f', X(1722), 0, -2));
  for (let i = 1; i < 6; i += 1) {
    const h = (gH * i) / 6;
    rig.body.add(mesh(cbox(gHalf * 2 * (1 - h / gH) * 0.92, 0.5, 0.5), '#6a4c31', X(1722), eave + h, front - 1.7));
  }
  rig.body.add(windowPane(X(1702), X(1752), Y(778), Y(755), front - 2, { frame: '#efe8d8', glass: '#7fb3bd', sill: false }));
  for (const [a, b] of [[1660, 1692], [1750, 1782]]) rig.body.add(windowPane(X(a), X(b), Y(866), Y(830), front - 2, { frame: '#efe8d8', glass: '#7fb3bd', sill: false }));
  for (const [a, b] of [[1660, 1690], [1715, 1745], [1775, 1805]]) rig.body.add(windowPane(X(a), X(b), Y(987), Y(955), front, { frame: '#d9cfbe', glass: '#3a2416', sill: false }));
  rig.body.add(mesh(box(S(45), Y(1015), 1.6), '#6b4a2c', X(1732), 0, front + 0.3));
  // side walls get windows too (ground floor + plinth vent)
  for (const [sx, side] of [[x0, -1], [x1, 1]]) {
    const hold = group(sx - side * 0.5, 0, 0);
    hold.rotation.y = side * PI / 2;
    for (const dz of [-D * 0.22, D * 0.22]) {
      hold.add(windowPane(dz - S(15), dz + S(15), Y(987), Y(955), 0, { frame: '#d9cfbe', glass: '#3a2416', sill: false }));
    }
    rig.body.add(hold);
  }
});

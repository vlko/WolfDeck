import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, fold, beam, box, cbox, group, cheek, blinker, facet, mat, ink, PI,
} from './kit.js';

// Models for the pieces on sport-culture.png: a running-track segment with
// hurdles, a stadium stand, two football goals and a ball, the cinema, a
// small oval stadium, the wooden climbing frame, the "Maják" lighthouse play
// tower, an open-air stage, an old film camera, and two townsfolk — a panda
// runner and a fox violinist. Measured off a 10 × 10 grid over each sprite
// (gx across, gy down); units are percent of the sprite's height.

const WOOD = { tex: 'wood' };
const PLANKS = { tex: 'planks' };
const PLASTER = { tex: 'plaster' };
const STONE = { tex: 'stone' };
const STEPS = { tex: 'stone', texScale: 0.7 };
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

// A thin round bar from a to b (net cords, rails, bow, ropes).
function rod(a, b, r, color) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, 5);
  const m = mesh(g, color);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return m;
}

// Places decals on the REAL (faceted) surface of `meshes` (local to `parent`)
// by casting a ray from the front. Returns place(m, x, y, lift).
function surfacePlacer(parent, meshes) {
  for (const m of meshes) { m.updateMatrix(); m.matrixWorld.copy(m.matrix); }
  const ray = new THREE.Raycaster();
  const surf = (x, y, lift = 0.4) => {
    ray.set(new THREE.Vector3(x, y, 500), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    return { p: hit.point.clone().addScaledVector(n, lift), n };
  };
  const place = (m, x, y, lift = 0.4) => {
    const s = surf(x, y, lift);
    if (!s) return m;
    m.position.copy(s.p);
    m.lookAt(s.p.clone().add(s.n));
    parent.add(m);
    return m;
  };
  return { surf, place };
}

// ── runningTrack — a flat track segment lying on the ground: four lanes
// with white lines, sage infield edges, and two hurdles standing on it ─────
defineModel('runningTrack', (opts, rig) => {
  const W = 170; // along x
  const D = 110; // along z (the lanes run toward the viewer)
  const T = 3;
  rig.body.add(mesh(box(W, T, D), '#a6b78f')); // grass base
  const lanes = 4;
  const laneW = 26;
  const x0 = -(lanes * laneW) / 2;
  const tones = ['#9fb1a2', '#a8b8aa', '#9fb1a2', '#a8b8aa'];
  for (let i = 0; i < lanes; i += 1) {
    rig.body.add(mesh(box(laneW, 1.2, D - 4), tones[i], x0 + laneW * (i + 0.5), T, 0, { tex: 'asphalt' }));
  }
  for (let i = 0; i <= lanes; i += 1) {
    rig.body.add(mesh(box(2.4, 1.6, D - 4), '#f0f1ea', x0 + laneW * i, T, 0));
  }
  // hurdles: two white top bars on dark posts, standing on lanes 2 and 3
  for (const lane of [1, 2]) {
    const cx = x0 + laneW * (lane + 0.5);
    const h = 30;
    const hz = lane === 1 ? -14 : 6;
    for (const s of [-1, 1]) {
      rig.body.add(mesh(box(2.4, h, 2.4), '#6e675a', cx + s * (laneW / 2 - 3), T + 1.2, hz));
      rig.body.add(mesh(box(6, 1.6, 10), '#6e675a', cx + s * (laneW / 2 - 3), T + 1.2, hz));
    }
    rig.body.add(mesh(box(laneW - 2, 5, 2.6), '#f0ebdc', cx, T + 1.2 + h - 5, hz));
  }
});

// ── stadiumStand — two tiers of cream benches with steps, slate frame ─────
defineModel('stadiumStand', (opts, rig) => {
  const { S } = grid(191.3);
  const W = S(9.4);
  const D = 70;
  const frame = '#3c4644';
  const frameLight = '#545f5c';
  // stepped concrete core: two low tiers rising toward the back, so both
  // bench rows are seen over the one in front (as on the sheet)
  const tierC = '#6b7573';
  rig.body.add(mesh(box(W - 10, 14, D), tierC, 0, 26, 0, STEPS)); // lower tier
  rig.body.add(mesh(box(W - 10, 22, D * 0.5), '#626c6a', 0, 40, -D * 0.25, STEPS)); // upper tier
  // legs under the stand
  for (const x of [-W / 2 + 6, -14, 14, W / 2 - 6]) rig.body.add(mesh(box(8, 26, 8), frame, x, 0, D / 2 - 8));
  for (const x of [-W / 2 + 6, W / 2 - 6]) rig.body.add(mesh(box(8, 26, 8), frame, x, 0, -D / 2 + 8));
  // slate side walls (low in front, rising to the back) and the back wall
  for (const s of [-1, 1]) {
    rig.body.add(mesh(slab([[-D / 2, 26], [D / 2, 26], [D / 2, 44], [-D / 2 + 8, 100], [-D / 2, 100]], 5).rotateY(-PI / 2), frame, s * (W / 2 - 2.5), 0, 0));
  }
  rig.body.add(mesh(box(W, 74, 6), frame, 0, 26, -D / 2 + 3));
  rig.body.add(mesh(box(W, 4, 8), frameLight, 0, 98, -D / 2 + 3)); // coping
  // steps up the middle: lower-tier front → upper tier
  for (let i = 0; i < 4; i += 1) rig.body.add(mesh(box(22, 6 + i * 5.5, 8.75), '#7d8784', 0, 40, D / 2 - 4.4 - i * 8.75 - (i ? 0 : 0), STEPS));
  // cream benches: one pair per tier, each side of the steps
  const bench = (x, y, z) => {
    const g = group(x, y, z);
    g.add(mesh(box(W * 0.3, 4, 12), '#f3eddb', 0, 10, 0, PLANKS));
    for (const s of [-1, 1]) g.add(mesh(box(4, 10, 8), '#8f6a52', s * (W * 0.15 - 4), 0, 0, WOOD));
    rig.body.add(g);
  };
  for (const s of [-1, 1]) {
    bench(s * W * 0.25, 40, D * 0.22);
    bench(s * W * 0.25, 62, -D * 0.22);
  }
});

// goal frame + net, shared by both goals. W wide (x), H tall, D deep.
function goal(rig, { W, H, D, post, net, base, ropes }) {
  const r = 2.4;
  for (const s of [-1, 1]) {
    rig.body.add(mesh(box(r * 2, H, r * 2), post, s * W / 2, 0, D / 2));
    // side frame: from the crossbar end back down to the ground at the rear
    rig.body.add(rod([s * W / 2, H, D / 2], [s * W / 2, 0, -D / 2], r * 0.8, post));
    rig.body.add(rod([s * W / 2, 0, D / 2], [s * W / 2, 0, -D / 2], r * 0.8, base));
  }
  rig.body.add(mesh(box(W + r * 2, r * 2, r * 2), post, 0, H - r * 2, D / 2));
  rig.body.add(rod([-W / 2, 0, -D / 2], [W / 2, 0, -D / 2], r * 0.8, base));
  // net: cords on the sloped back plane (crossbar → rear ground bar) and the
  // two triangular sides — thin rods, so nothing is coplanar
  const netG = new THREE.Group();
  const cols = Math.round(W / 9);
  for (let i = 1; i < cols; i += 1) {
    const x = -W / 2 + (W * i) / cols;
    netG.add(rod([x, H - r, D / 2 - r], [x, 0.6, -D / 2], 0.45, net));
  }
  const rows = 7;
  for (let j = 1; j < rows; j += 1) {
    const k = j / rows;
    const y = (H - r) * (1 - k) + 0.6 * k;
    const z = (D / 2 - r) * (1 - k) - (D / 2) * k;
    netG.add(rod([-W / 2, y, z], [W / 2, y, z], 0.45, net));
    for (const s of [-1, 1]) netG.add(rod([s * W / 2, y, z], [s * W / 2, 0.6, z], 0.45, ropes ?? net));
  }
  rig.body.add(netG);
  return netG;
}

// ── bigGoal — gray posts, cream net, a green turf patch under it ──────────
defineModel('bigGoal', (opts, rig) => {
  const W = 190;
  rig.body.add(mesh(box(W + 20, 1.5, 70), '#aabb8e', 0, 0, 2));
  goal(rig, { W, H: 90, D: 56, post: '#9e9c99', net: '#efe7d6', base: '#86847f' });
});

// ── smallGoal — cream posts, orange rope side nets, sage base frame ───────
defineModel('smallGoal', (opts, rig) => {
  const W = 200;
  goal(rig, { W, H: 82, D: 46, post: '#cdc2a1', net: '#efe9da', base: '#879698', ropes: '#b8873f' });
});

// ── footballDark — a faceted dark paper ball; bounces gently ──────────────
defineModel('footballDark', (opts, rig) => {
  const geo = facet(new THREE.IcosahedronGeometry(48, 1), 0.06);
  const col = geo.attributes.color;
  for (let tri = 0; tri < col.count / 3; tri += 1) {
    const k = tri % 3 === 0 ? 0.78 : 1;
    for (let j = 0; j < 3; j += 1) col.setXYZ(tri * 3 + j, k, k, k);
  }
  const ball = new THREE.Mesh(geo, mat('#5f5b66'));
  const hold = group(0, 48, 0, ball);
  rig.body.add(hold);
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t * 0.8 + ctx.phase) % 1;
    hold.position.y = 48 + Math.sin(c * PI) * 26;
    const sq = c < 0.06 || c > 0.94 ? 0.9 : 1;
    hold.scale.set(2 - sq, sq, 2 - sq);
    ball.rotation.z -= dt * 1.6;
  };
});

// sign texture with raised-looking letters (canvas, paper colored)
function signTexture(text, w, h, { bg = '#ece3cc', fg = '#6b4b33' } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = `900 ${Math.round(h * 0.62)}px Nunito, 'Avenir Next', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${Math.round(h * 0.08)}px`;
  ctx.fillText(text, w / 2, h * 0.54);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ── cinema — cream gabled house with a CINEMA marquee, sage ground floor ──
defineModel('cinema', (opts, rig) => {
  const { X, Y, S } = grid(135.3);
  const W = S(8.8);
  const D = 70;
  const front = D / 2;
  // the roof first: every wall and the chimney are fitted UNDER its slope,
  // so nothing pokes through it and nothing hovers above it
  const apex = Y(0.15);
  const eaveLow = Y(3.3) - 7;
  const half = W / 2 + 12;
  const rT = 4.5;
  const drop = rT / Math.cos(Math.atan2(apex - eaveLow, half));
  const under = (x) => apex - drop - (Math.abs(x) * (apex - eaveLow)) / half; // underside y
  const eave = under(W / 2) - 0.6;
  const split = Y(5.45); // cream upper wall / sage ground floor
  // walls: brown plinth, sage ground floor, cream upper floor
  rig.body.add(mesh(box(W, 7, D), '#6f5440', 0, 0, 0, STONE));
  rig.body.add(mesh(box(W - 0.6, split - 7, D - 0.6), '#9eae9d', 0, 7, 0, PLASTER));
  rig.body.add(mesh(box(W, eave - split, D), '#e8decd', 0, split, 0, PLASTER));
  // cream gable under ONE continuous slate roof
  rig.body.add(mesh(slab([[-W / 2, 0], [W / 2, 0], [0, under(0) - 0.6 - eave]], D), '#e2dabe', 0, eave, 0, PLASTER));
  rig.body.add(mesh(roofSolid(0, apex, half, eaveLow, rT, D + 10), '#3e4148', 0, 0, 0, SHINGLE));
  // dark round window in the gable
  rig.body.add(mesh(new THREE.CylinderGeometry(S(0.42), S(0.42), 2, 18).rotateX(PI / 2), '#16130e', 0, Y(1.9), front + 0.8));
  rig.body.add(mesh(new THREE.TorusGeometry(S(0.42), 1.1, 4, 18), '#f2eadb', 0, Y(1.9), front + 1.4));
  // chimney: stands on the left roof slope, rises above it
  const chimX = X(1.3);
  const chimBase = under(chimX + S(0.21)) - 1; // sunk into the roof on its low side
  rig.body.add(mesh(box(S(0.42), Y(0.9) - chimBase, 8), '#6f4e37', chimX, chimBase, -12, { tex: 'brick', texScale: 0.7 }));
  // CINEMA marquee across the floor line, a little flower box on top
  const signW = S(4.5);
  const sTop = Y(4.55);
  const sBot = Y(5.45);
  const board = new THREE.Mesh(new THREE.BoxGeometry(signW, sTop - sBot, 4), [
    mat('#e6dcc3'), mat('#e6dcc3'), mat('#e6dcc3'), mat('#e6dcc3'),
    new THREE.MeshBasicMaterial({ map: signTexture('CINEMA', 512, 104) }), mat('#e6dcc3'),
  ]);
  board.position.set(0, (sTop + sBot) / 2, front + 4);
  rig.body.add(board);
  for (const y of [sTop + 1.4, sBot - 0.4]) rig.body.add(mesh(box(signW + 2, 1.6, 5), '#4a4a52', 0, y - 0.8, front + 4));
  rig.body.add(mesh(box(signW * 0.9, 2, 4), '#4a4a52', 0, sTop - 5, front + 1.6)); // bracket into the wall
  const bloom = group(0, sTop + 1.2, front + 4);
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * PI * 2;
    bloom.add(mesh(new THREE.SphereGeometry(2.2, 6, 4), '#c6655a', Math.cos(a) * 2.6, 2.6 + Math.sin(a) * 1.4, 0));
  }
  bloom.add(mesh(new THREE.SphereGeometry(1.6, 6, 4), '#e2b35d', 0, 2.8, 1.5));
  rig.body.add(bloom);
  // pilasters, windows and the double door
  for (const g of [3.0, 7.0]) rig.body.add(mesh(box(S(0.35), sBot - 7, 3), '#c4d0c3', X(g), 7, front + 0.6));
  for (const g of [1.4, 8.6]) {
    rig.body.add(mesh(box(S(1.0), S(1.0), 1.6), '#7e9180', X(g), Y(8.1), front + 0.5));
    rig.body.add(mesh(box(S(0.8), S(0.8), 1.4), '#5f6f62', X(g), Y(8.1) + S(0.1), front + 1.3));
  }
  rig.body.add(mesh(box(S(1.6), Y(6.6) - 7, 2), '#2d2720', 0, 7, front + 0.8, WOOD));
  rig.body.add(mesh(box(0.8, Y(6.6) - 9, 1), '#4a3e31', 0, 8, front + 2));
  for (const s2 of [-1, 1]) rig.body.add(mesh(box(1.2, 5, 1), '#d9cfb8', s2 * 2.4, Y(8.0), front + 2.2));
  // marquee bulbs under the board blink in turn
  const bulbs = [];
  for (let i = 0; i < 7; i += 1) {
    const bl = inkMesh(new THREE.SphereGeometry(1.1, 6, 4), '#f7e3a1', -signW / 2 + (signW * (i + 0.5)) / 7, sBot - 3.2, front + 4.6);
    rig.body.add(bl);
    bulbs.push(bl);
  }
  rig.anims.idle = (t) => {
    bulbs.forEach((bl, i) => { bl.material = ink(Math.floor(t * 3) % 2 === i % 2 ? '#f7e3a1' : '#b9a46e'); });
  };
});

// A vertical prism over a quad footprint (4 xz points, CCW from above),
// from y0 to y1 — one segment of the stadium's tiers.
function quadPrism(f, y0, y1) {
  const pos = [];
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const T = f.map(([x, z]) => [x, y1, z]);
  const B = f.map(([x, z]) => [x, y0, z]);
  quad(T[0], T[1], T[2], T[3]);
  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4;
    quad(B[i], B[j], T[j], T[i]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

// ── bowlStadium — a small oval stadium: stepped cream tiers round a green
// pitch, a slate outer wall; low at the front so the inside reads from the
// audience's view ─────────────────────────────────────────────────────────
defineModel('bowlStadium', (opts, rig) => {
  const RX = 84;
  const RZ = 60;
  const N = 28;
  const tiers = 4;
  // radial bands (fraction of the outer ellipse) and their top heights
  const bands = [[0.94, 1.0, 46, '#62706a']]; // outer wall
  for (let i = 0; i < tiers; i += 1) {
    const r1 = 0.94 - i * 0.1;
    bands.push([r1 - 0.1, r1, 40 - i * 8, i % 2 ? '#d4c9a8' : '#e6dcbf']);
  }
  // the front is cut very low (sin<0 is the front): from eye level the
  // audience looks over a short wall into the tiers rising behind
  const height = (th) => 0.16 + 0.84 * ((1 + Math.sin(th)) / 2) ** 1.3;
  const pt = (th, k) => [Math.cos(th) * RX * k, -Math.sin(th) * RZ * k];
  for (const [k0, k1, h, color] of bands) {
    for (let n = 0; n < N; n += 1) {
      const a = (n / N) * PI * 2;
      const b = ((n + 1) / N) * PI * 2;
      const f = height((a + b) / 2);
      // footprint CCW seen from above (y up): inner a → inner b → outer b → outer a
      const geo = quadPrism([pt(a, k0), pt(b, k0), pt(b, k1), pt(a, k1)], 0, h * f);
      rig.body.add(mesh(geo, color, 0, 0, 0, { side: THREE.DoubleSide, ...(k1 === 1.0 ? STONE : {}) }));
      if (k1 === 1.0) {
        // cream coping along the top of the outer wall
        const cap = quadPrism([pt(a, k0 - 0.005), pt(b, k0 - 0.005), pt(b, 1.005), pt(a, 1.005)], h * f, h * f + 2.2);
        rig.body.add(mesh(cap, '#e6dcbf', 0, 0, 0, { side: THREE.DoubleSide }));
      }
    }
  }
  // the pitch: green oval with a white center line and circle
  const pk = 0.94 - tiers * 0.1;
  rig.body.add(mesh(new THREE.CylinderGeometry(1, 1, 6, N).scale(RX * pk, 1, RZ * pk).translate(0, 3, 0), '#9fb284'));
  rig.body.add(mesh(box(1.6, 0.8, RZ * pk * 1.7), '#f0eee2', 0, 6, 0));
  rig.body.add(mesh(new THREE.TorusGeometry(7, 0.8, 3, 14).rotateX(PI / 2), '#f0eee2', 0, 6.6, 0));
});

// ── climbFrame — wooden climbing frame: two posts, a top beam, crossed
// diagonals, a lower rail, bolts at every joint ─────────────────────────────
defineModel('climbFrame', (opts, rig) => {
  const { X, Y, S } = grid(75.2);
  const wood = '#8d6142';
  const woodDark = '#6a4428';
  const D = 34;
  for (const z of [-D / 2, D / 2]) {
    for (const g of [1.5, 4.9]) rig.body.add(mesh(box(S(0.55), Y(0.8), S(0.55)), wood, X(g), 0, z, WOOD));
    // top beam and a lower rail on this side
    rig.body.add(mesh(box(S(9.4), S(0.32), S(0.45)), '#c79c63', 0, Y(1.5), z, WOOD));
    rig.body.add(mesh(box(S(4.0), S(0.35), S(0.45)), woodDark, X(3.2), Y(6.5), z, WOOD));
    // crossed diagonals (the big X)
    rig.body.add(mesh(beam(X(2.6), Y(0.6), X(7.5), Y(9.7), S(0.45), S(0.4)), woodDark, 0, 0, z + (z > 0 ? 3 : -3), WOOD));
    rig.body.add(mesh(beam(X(9.4), Y(0.8), X(1.0), Y(8.4), S(0.45), S(0.4)), wood, 0, 0, z + (z > 0 ? 6 : -6), WOOD));
  }
  // cross-ties between the two frames (front ↔ back), so it is one piece
  for (const g of [1.5, 4.9]) {
    rig.body.add(mesh(box(S(0.4), S(0.4), D + 6), wood, X(g), Y(1.5) - 2, 0, WOOD));
    rig.body.add(mesh(box(S(0.4), S(0.4), D + 6), woodDark, X(g), Y(6.5), 0, WOOD));
  }
  // bolts, only where two members actually cross (front frame)
  const zf = D / 2;
  for (const [gx, gy, z] of [
    [1.5, 1.5, zf + 2.4], [4.9, 1.5, zf + 2.4], [1.5, 6.5, zf + 2.4], [4.9, 6.5, zf + 2.4], // posts × beam/rail
    [4.9, 4.87, zf + 5.2], // first diagonal × post
    [4.9, 4.87, zf + 8.2], [1.5, 7.95, zf + 8.2], [8.63, 1.5, zf + 8.2], // second diagonal × post / beam
  ]) {
    rig.body.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.4, 6).rotateX(PI / 2), '#e8dcc0', X(gx), Y(gy), z));
  }
});

// ── lighthouse — "Maják": tapered cream tower, sage gallery, a lantern room
// with a turning light, pyramid roof ───────────────────────────────────────
defineModel('lighthouse', (opts, rig) => {
  const { X, Y, S } = grid(32.1);
  const base = S(9.6) / 2;
  const top = S(4.6) / 2;
  const towerTop = Y(2.5);
  // tower: an 8-sided tapered shaft, light/shaded faces
  rig.body.add(mesh(new THREE.CylinderGeometry(top, base, towerTop, 8).rotateY(PI / 8).translate(0, towerTop / 2, 0), '#d6c99b', 0, 0, 0, PLASTER));
  // little dark windows and the door on the front faces
  const zAt = (y) => {
    const r = base + (top - base) * (y / towerTop);
    return r * Math.cos(PI / 8);
  };
  for (const [gx, gy, w, h] of [[5.6, 4.1, 1.2, 0.8], [4.2, 6.5, 1.1, 0.5], [6.6, 7.6, 1.0, 0.5]]) {
    const y = Y(gy);
    const m = mesh(box(S(w), S(h) * 3.2, 1.0), '#2c2620', X(gx), y - S(h) * 1.6, zAt(y - S(h) * 1.6) - 0.1);
    m.rotation.x = -Math.atan2(base - top, towerTop);
    rig.body.add(m);
  }
  const doorH = Y(8.9);
  const door = mesh(box(S(1.9), doorH, 2), '#3e3127', 0, 0, zAt(0) - 0.5, WOOD); // tilted back with the wall from its sill
  door.rotation.x = -Math.atan2(base - top, towerTop);
  rig.body.add(door);
  // gallery (sage band) with a railing ring
  rig.body.add(mesh(new THREE.CylinderGeometry(top + 6, top + 4, 7, 8).rotateY(PI / 8).translate(0, towerTop + 3.5, 0), '#6a7874'));
  rig.body.add(mesh(new THREE.CylinderGeometry(top + 6.5, top + 6.5, 1.4, 8, 1, true).rotateY(PI / 8).translate(0, towerTop + 11, 0), '#4e4a45', 0, 0, 0, { side: THREE.DoubleSide }));
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * PI * 2 + PI / 8;
    rig.body.add(mesh(box(1, 5, 1), '#4e4a45', Math.sin(a) * (top + 6), towerTop + 7, Math.cos(a) * (top + 6)));
  }
  // lantern room: four dark posts round a glowing light
  const lanternY = towerTop + 7;
  const lanternH = Y(1.3) - lanternY;
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * PI * 2 + PI / 4;
    rig.body.add(mesh(box(2.2, lanternH, 2.2), '#4e4a45', Math.sin(a) * top * 0.85, lanternY, Math.cos(a) * top * 0.85));
  }
  const lamp = inkMesh(new THREE.OctahedronGeometry(top * 0.45, 0), '#f6e2a0', 0, lanternY + lanternH * 0.5, 0);
  rig.body.add(lamp);
  // a beam that sweeps round (a pale flat wedge)
  const beamG = group(0, lanternY + lanternH * 0.5, 0);
  const bm = new THREE.Mesh(new THREE.ConeGeometry(top * 0.6, 40, 6, 1, true).rotateZ(PI / 2).translate(20 + top * 0.5, 0, 0),
    new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  beamG.add(bm);
  rig.body.add(beamG);
  // roof: sage 8-sided pyramid with a cap ring, ONE solid
  rig.body.add(mesh(new THREE.CylinderGeometry(top + 6, top + 6, 2.5, 8).rotateY(PI / 8).translate(0, Y(1.3) + 1.25, 0), '#7f908a'));
  rig.body.add(mesh(new THREE.ConeGeometry(top + 6, Y(0) - Y(1.3) - 2.5, 8).rotateY(PI / 8).translate(0, Y(1.3) + 2.5 + (Y(0) - Y(1.3) - 2.5) / 2, 0), '#92a39a', 0, 0, 0, SHINGLE));
  rig.anims.idle = (t, dt, ctx) => {
    beamG.rotation.y = t * 1.2 + ctx.phase;
    lamp.rotation.y = t * 1.2;
  };
});

// ── stage — a small open-air stage: slate roof, cream side walls, drawn-back
// curtains over a dark backdrop, a wooden floor ───────────────────────────
defineModel('stage', (opts, rig) => {
  const { X, Y, S } = grid(174.8);
  const W = S(9.2);
  const D = 64;
  const front = D / 2;
  // floor platform
  rig.body.add(mesh(box(W, Y(8.9), D), '#6a4f39', 0, 0, 0, PLANKS));
  rig.body.add(mesh(box(W - 4, 2, D - 4), '#8a6a4d', 0, Y(8.9), 0, PLANKS));
  // side walls (cream with a brown band near the top) and the back wall
  for (const s of [-1, 1]) {
    rig.body.add(mesh(box(S(1.05), Y(1.8) - Y(8.9), D), '#cad0c5', s * (W / 2 - S(0.53)), Y(8.9), 0, PLASTER));
    rig.body.add(mesh(box(S(1.07), 8, D + 0.4), '#7a573f', s * (W / 2 - S(0.53)), Y(2.6), 0, WOOD));
  }
  rig.body.add(mesh(box(W - S(2.1), Y(1.8) - Y(8.9), 4), '#3f4b48', 0, Y(8.9), -front + 2, FABRIC));
  rig.body.add(mesh(box(W - S(2.1), 6, D), '#7a573f', 0, Y(1.8) - 6, 0, WOOD)); // lintel
  // ONE continuous low-pitched roof
  rig.body.add(mesh(roofSolid(0, Y(0), W / 2 + 6, Y(1.8), 5, D + 10), '#3e4148', 0, 0, 0, SHINGLE));
  // curtains: pale drapes swept to each side, hung on pivots at the top so
  // they can sway
  const curtains = [];
  for (const s of [-1, 1]) {
    const c = group(s * (W / 2 - S(1.05)), Y(2.0), front - 6);
    const pts = [[0, 0], [-s * S(1.9), 0], [-s * S(1.2), -S(2.5)], [-s * S(0.15), -(Y(2.0) - Y(8.8))], [0, -(Y(2.0) - Y(8.8))]];
    c.add(mesh(slab(pts, 3), '#d9d6c7', 0, 0, 0, FABRIC));
    c.add(mesh(box(3, 3, 4), '#b89a5f', -s * S(0.7), -S(2.5), 1.5)); // tie-back
    rig.body.add(c);
    curtains.push(c);
  }
  // a dark curtain valance across the top
  rig.body.add(mesh(box(W - S(2.1), 6, 3), '#3a4542', 0, Y(2.0) - 6, front - 4, FABRIC));
  rig.anims.idle = (t, dt, ctx) => {
    curtains.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + ctx.phase + i * 1.3) * 0.02; });
  };
});

// ── filmCamera — an old film camera: slate body, two reels on top that
// turn, a lens tube in front (toward −x, as printed) and cream knobs ───────
defineModel('filmCamera', (opts, rig) => {
  const { X, Y, S } = grid(134.9);
  const D = 34;
  // body
  rig.body.add(mesh(box(S(6.4), Y(4.1), D), '#3e4a48', X(5.9), 0, 0, { tex: 'metal' }));
  rig.body.add(mesh(box(S(6.0), 2, D - 6), '#556360', X(5.9), Y(4.1) - 1, 0));
  // side panel inset + knobs/levers on the front
  rig.body.add(mesh(box(S(4.6), Y(5.1) - Y(9.5), 1.2), '#4f5c5a', X(6.3), Y(9.5), D / 2 + 0.6));
  for (const [gx, gy] of [[5.2, 5.6], [6.4, 5.6]]) rig.body.add(mesh(new THREE.CylinderGeometry(1.8, 1.8, 2, 8).rotateX(PI / 2), '#e8dfc8', X(gx), Y(gy), D / 2 + 2.2));
  rig.body.add(mesh(box(3, 6, 2), '#2d3634', X(5.8), Y(6.0), D / 2 + 2.2));
  // lens tube toward −x
  rig.body.add(mesh(new THREE.CylinderGeometry(6, 6, S(1.5), 8).rotateZ(PI / 2), '#556360', X(2.05), Y(6.6), 0)); // sunk into the body
  rig.body.add(mesh(new THREE.CylinderGeometry(9, 6, S(1.1), 8).rotateZ(PI / 2), '#4a5654', X(0.85), Y(6.6), 0));
  rig.body.add(inkMesh(new THREE.CircleGeometry(7, 8).rotateY(-PI / 2), '#1b2321', X(0.3) - 0.4, Y(6.6), 0));
  // crank on the back (+x)
  rig.body.add(mesh(box(S(0.9), 3, 3), '#2d3634', X(9.4), Y(6.3), 4)); // crank stub out of the back
  // reels: two discs on a bracket rising from the body top
  const reels = [];
  for (const [gx, gy, r] of [[4.6, 2.2, 1.55], [7.9, 2.4, 1.35]]) {
    rig.body.add(mesh(box(4, Y(gy) - Y(4.1), 4), '#2d3634', X(gx), Y(4.1), 0));
    const reel = group(X(gx), Y(gy), 0);
    reel.add(mesh(new THREE.CylinderGeometry(S(r), S(r), 6, 12).rotateX(PI / 2), '#4f5c5a'));
    reel.add(mesh(new THREE.CylinderGeometry(S(r * 0.38), S(r * 0.38), 7.5, 10).rotateX(PI / 2), '#7c8a87'));
    for (let i = 0; i < 3; i += 1) {
      const sp = mesh(cbox(2.4, S(r) * 1.6, 7), '#3a4644', 0, 0, 0);
      sp.rotation.z = (i / 3) * PI;
      reel.add(sp);
    }
    rig.body.add(reel);
    reels.push(reel);
  }
  // film strip between the reels
  rig.body.add(mesh(beam(X(4.6), Y(2.2) + S(1.5), X(7.9), Y(2.4) + S(1.3), 1.2, 4), '#1f2524'));
  rig.anims.idle = (t) => { for (const r of reels) r.rotation.z = -t * 2.2; };
});

// ── townsfolk ─────────────────────────────────────────────────────────────

// ── pandaRunner — a big round panda head, striped sage shirt, mid-stride ──
defineModel('pandaRunner', (opts, rig) => {
  const { X, Y, S } = grid(64.5);
  const root = group(0, 0, 0);
  rig.body.add(root);
  const dark = '#3d3b3c';
  // legs on hip pivots (a running stride)
  const hipY = Y(8.1);
  const legs = [-1, 1].map((s) => {
    const hip = group(s * S(1.3), hipY, 0);
    hip.add(mesh(box(S(1.5), hipY - 3, S(1.4)).translate(0, -(hipY - 3), 0), '#4c4d55', 0, 0, 0, FABRIC));
    hip.add(mesh(box(S(1.7), 4, S(1.9)).translate(0, -(hipY - 1), 1.5), '#353436'));
    root.add(hip);
    return hip;
  });
  // body: striped shirt, folded, sunk over the hips
  const torso = group(0, 0, 0);
  root.add(torso);
  const bTop = Y(5.5);
  const bodyGeo = fold([[-S(2.6), hipY - 2], [S(2.6), hipY - 2], [S(2.3), bTop], [-S(2.3), bTop]], 28, 4);
  torso.add(mesh(bodyGeo, '#9cb0a6', 0, 0, 0, FABRIC));
  const bz = bodyGeo.userData.zAt;
  for (const gy of [6.2, 7.2]) {
    // stripes: thin bands just proud of the folded front
    const y = Y(gy);
    const hw = S(2.6) - (S(0.3) * (y - (hipY - 2))) / (bTop - hipY + 2) + 0.3; // follows the taper
    const band = fold([[-hw, y - 1.6], [hw, y - 1.6], [hw, y + 1.6], [-hw, y + 1.6]], 28.8, 4);
    torso.add(mesh(band, '#e8e3d2', 0, 0, 0, FABRIC));
  }
  // arms: dark, on shoulder pivots, swinging opposite to the legs
  const arms = [-1, 1].map((s) => {
    const sh = group(s * S(2.4), bTop - 4, 0);
    sh.add(mesh(new THREE.CapsuleGeometry(4.2, 14, 3, 6).translate(0, -10, 0), dark, 0, 0, 0, FUR));
    sh.rotation.z = s * 0.55;
    torso.add(sh);
    return sh;
  });
  // head: a big faceted round head resting on the shoulders
  const head = group(0, bTop - 3, 2);
  root.add(head);
  const R = { x: S(4.6), y: 24, z: S(3.5) };
  const hyc = R.y - 2; // rests on the shoulders, sunk 2 into the shirt
  const headMesh = mesh(new THREE.SphereGeometry(1, 10, 7).scale(R.x, R.y, R.z), '#efe6d2', 0, hyc, 0, FUR);
  head.add(headMesh);
  const { place } = surfacePlacer(head, [headMesh]);
  // eye patches (gray, tilted ovals), eyes inside them, cheeks, smile
  const eyes = [];
  for (const s of [-1, 1]) {
    // gray eye patch (tilted oval), black eye with a tiny highlight
    const patch = new THREE.Mesh(facet(new THREE.SphereGeometry(1, 12, 8).scale(S(1.2), S(0.85), 1.6), 0.02), mat('#6a6664'));
    place(patch, s * S(1.75), hyc + S(0.3), 0.5);
    patch.rotateZ(s * 0.45);
    const e = new THREE.Group();
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(S(0.3), 10, 8), ink('#111010'));
    pupil.scale.z = 0.5;
    e.add(pupil);
    e.add(new THREE.Mesh(new THREE.SphereGeometry(S(0.09), 6, 4), ink('#f4f0e6')).translateX(S(0.1)).translateY(S(0.1)).translateZ(1.2));
    place(e, s * S(1.6), hyc + S(0.4), 1.9);
    eyes.push(e);
    place(cheek(S(0.85), '#e2a6a1'), s * S(2.3), hyc - S(0.85), 0.35);
  }
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(S(0.5), 12, PI, PI), ink('#141313'));
  place(mouth, 0, hyc - S(0.55), 0.4);
  // ears: dark faceted balls, sunk into the top of the head
  const ears = [-1, 1].map((s) => {
    const e = group(s * S(3.1), hyc + R.y * 0.7, -3);
    e.add(mesh(new THREE.IcosahedronGeometry(S(1.3), 1), dark, 0, 0, 0, FUR));
    head.add(e);
    return e;
  });
  const blink = blinker(rig.seed + 3.1);
  rig.anims.always = (t, dt, ctx) => {
    const k = blink(t);
    for (const e of eyes) e.scale.y = Math.max(0.12, 1 - k);
    ears.forEach((e, i) => {
      const c = (t + ctx.phase + i * 2.1) % 4.9;
      e.rotation.z = c < 0.3 ? Math.sin((c / 0.3) * PI) * 0.25 * (i ? -1 : 1) : 0;
    });
  };
  // running on the spot: legs and arms swing, the body bobs
  rig.anims.idle = (t, dt, ctx) => {
    const s = Math.sin(t * 7 + ctx.phase);
    legs[0].rotation.x = s * 0.6;
    legs[1].rotation.x = -s * 0.6;
    arms[0].rotation.x = -s * 0.7;
    arms[1].rotation.x = s * 0.7;
    root.position.y = Math.abs(Math.cos(t * 7 + ctx.phase)) * 3;
    head.rotation.z = Math.sin(t * 3.5 + ctx.phase) * 0.05;
  };
  rig.anims.run = rig.anims.idle;
});

// ── foxViolinist — an origami fox playing the violin ──────────────────────
defineModel('foxViolinist', (opts, rig) => {
  const { X, Y, S } = grid(84.5);
  const root = group(0, 0, 0);
  rig.body.add(root);
  // legs: dark, tapering to the ground
  for (const s of [-1, 1]) {
    root.add(mesh(new THREE.CylinderGeometry(S(0.7), S(0.45), Y(8.6), 4).rotateY(PI / 4).translate(0, Y(8.6) / 2, 0), '#4e4c57', s * S(0.75), 0, 0, FABRIC));
  }
  // body: sage coat, folded, cream collar
  const torso = group(0, 0, 0);
  root.add(torso);
  const bTop = Y(6.3);
  const bBot = Y(8.9);
  const coat = fold([[-S(2.0), bBot], [S(2.0), bBot], [S(1.6), bTop], [-S(1.6), bTop]], 24, 3);
  torso.add(mesh(coat, '#7e8d7d', 0, 0, 0, FABRIC));
  const cz = coat.userData.zAt;
  torso.add(mesh(fold([[-S(1.0), bTop - 7], [0, bTop - 12], [S(1.0), bTop - 7], [S(1.0), bTop], [-S(1.0), bTop]], 25, 3), '#e6dcc4', 0, 0, 0, FABRIC));
  // tail from the rump, sweeping round to her right side
  // tail: a bushy rust plume out of the rump, sweeping back and up behind
  // her (cream tip) — hidden from the front, as on the sheet
  const tail = group(0, bBot + 18, -10);
  const plume = new THREE.Group();
  plume.add(mesh(new THREE.SphereGeometry(1, 8, 6).scale(S(0.75), S(0.75), S(1.5)).translate(0, S(0.2), -S(1.2)), '#a6684a', 0, 0, 0, FUR));
  plume.add(mesh(new THREE.SphereGeometry(1, 8, 6).scale(S(0.55), S(0.55), S(0.7)).translate(0, S(0.45), -S(2.6)), '#efe4cf', 0, 0, 0, FUR));
  plume.rotation.x = -0.5;
  tail.add(plume);
  torso.add(tail);
  // arms: the left (viewer's left) draws the bow, the right holds the violin
  const bowArm = group(-S(1.5), bTop - 4, 2);
  bowArm.add(mesh(new THREE.CapsuleGeometry(3, 12, 3, 6).rotateZ(PI / 2).translate(-2, -6, 6), '#dbc9a5', 0, 0, 0, FUR));
  torso.add(bowArm);
  const fidArm = group(S(1.5), bTop - 4, 2);
  fidArm.add(mesh(new THREE.CapsuleGeometry(3, 12, 3, 6).rotateZ(-0.9).translate(5, -4, 6), '#dbc9a5', 0, 0, 0, FUR));
  torso.add(fidArm);
  // violin under the chin, tilted, resting on her right shoulder
  const violin = group(S(1.9), bTop - 2, cz(S(1.6)) + 6);
  violin.rotation.z = -0.55;
  const body = new THREE.Shape();
  body.moveTo(0, -9);
  body.bezierCurveTo(6.5, -9, 6.5, -2, 4, 0);
  body.bezierCurveTo(6.5, 2, 6.5, 8, 0, 8);
  body.bezierCurveTo(-6.5, 8, -6.5, 2, -4, 0);
  body.bezierCurveTo(-6.5, -2, -6.5, -9, 0, -9);
  violin.add(mesh(new THREE.ExtrudeGeometry(body, { depth: 4, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -2).rotateZ(PI / 2), '#945f45', 0, 0, 0, { tex: 'wood', texScale: 0.5 }));
  violin.add(mesh(box(13, 2, 2), '#4b2e1d', -13, -1, 1.5));
  violin.add(mesh(box(4, 3, 2.4), '#4b2e1d', -21, -1.5, 1.5));
  for (const y of [-1.5, 1.5]) violin.add(mesh(box(1, 1.2, 1.2), '#2c1b11', y * 1.6, -1.5, 2.6));
  torso.add(violin);
  // bow: a long thin rod held by the bow arm, crossing the strings
  const bow = group(-S(2.3), bTop - 10, cz(0) + 10);
  bow.add(rod([0, 0, 0], [S(6.6), S(1.7), 0], 0.8, '#6b4430'));
  bow.add(rod([0.5, -1.2, 0], [S(6.6), S(1.7) - 1.2, 0], 0.4, '#efe7d6'));
  torso.add(bow);
  // head: a folded origami fox head (rust top, cream lower face) — two
  // folds sharing one edge, so nothing overlaps
  const head = group(0, bTop - 4, 3);
  root.add(head);
  const hx = (g) => X(g);
  const hy = (g) => Y(g) - (bTop - 4);
  const P = (pts) => pts.map(([gx, gy]) => [hx(gx), hy(gy)]);
  const split = [[0.5, 4.2], [3.4, 4.65], [5, 5.0], [6.6, 4.65], [9.5, 4.2]];
  const upper = fold(P([[1.8, 1.2], [8.2, 1.2], [9.5, 4.2], ...[...split].reverse().slice(1, -1), [0.5, 4.2]]), 26, 7, { cx: hx(5) });
  const lower = fold(P([...split, [5, 6.6]]), 26, 7, { cx: hx(5) });
  {
    // pull the cream muzzle forward toward the chin, so from the side the
    // head has a fox snout instead of a flat box front (0 at the shared
    // split edge, so the two folds still meet)
    const lp = lower.attributes.position;
    const ySplit = hy(4.2);
    const yTip = hy(6.6);
    const hw = hx(9.5) - hx(5);
    for (let i = 0; i < lp.count; i += 1) {
      if (lp.getZ(i) <= 0) continue;
      const k = Math.min(1, Math.max(0, (ySplit - lp.getY(i)) / (ySplit - yTip)));
      const c = Math.max(0, 1 - Math.abs(lp.getX(i) - hx(5)) / hw);
      lp.setZ(i, lp.getZ(i) + 10 * k * c);
    }
    lower.computeVertexNormals();
  }
  const upperM = mesh(upper, '#a46448', 0, 0, 0, FUR);
  const lowerM = mesh(lower, '#ebe2c8', 0, 0, 0, FUR);
  head.add(upperM, lowerM);
  const { place } = surfacePlacer(head, [upperM, lowerM]);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(S(0.22), 10, 8), ink('#141210'));
    e.scale.z = 0.5;
    place(e, hx(5) + s * S(2.05), hy(3.0), 0.5);
    eyes.push(e);
    place(cheek(S(0.62), '#e3a19c'), hx(5) + s * S(2.45), hy(4.0), 0.4);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(S(0.42), S(0.3), 2.2), ink('#141210'));
  place(nose, hx(5), hy(6.05), 1.2);
  // ears: tall pointed folds with dark inners, sunk into the top edge
  const ears = [-1, 1].map((s) => {
    const e = group(hx(5) + s * S(2.6), hy(1.4), -4);
    e.add(mesh(fold([[-S(1.3), 0], [S(1.3), 0], [s * S(1.2), S(1.9)]], 8, 2), '#a46448', 0, 0, 0, FUR));
    e.add(mesh(fold([[-S(0.7), 1.5], [S(0.7), 1.5], [s * S(0.8), S(1.45)]], 2, 1.2), '#5a2f15', 0, 0, 4.6));
    head.add(e);
    return e;
  });
  const blink = blinker(rig.seed + 5.3);
  rig.anims.always = (t, dt, ctx) => {
    const k = blink(t);
    for (const e of eyes) e.scale.y = Math.max(0.12, 1 - k);
    ears.forEach((e, i) => {
      const c = (t + ctx.phase + i * 2.4) % 5.5;
      e.rotation.z = c < 0.3 ? Math.sin((c / 0.3) * PI) * 0.22 * (i ? -1 : 1) : 0;
    });
    tail.rotation.y = Math.sin(t * 2 + ctx.phase) * 0.25;
  };
  // playing: the bow saws back and forth, the head sways with the music
  rig.anims.idle = (t, dt, ctx) => {
    const s = Math.sin(t * 3 + ctx.phase);
    bow.position.x = -S(2.3) + s * 7;
    bowArm.rotation.z = s * 0.18;
    head.rotation.z = -0.08 + Math.sin(t * 1.5 + ctx.phase) * 0.08;
    head.rotation.y = Math.sin(t * 0.7 + ctx.phase) * 0.1;
    torso.rotation.z = Math.sin(t * 1.5 + ctx.phase) * 0.02;
  };
  rig.anims.play = rig.anims.idle;
});

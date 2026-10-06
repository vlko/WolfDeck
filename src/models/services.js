import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, box, cbox, beam, group, smoke, cheek, blinker, ink, PI,
} from './kit.js';

// Models for the pieces on town-service.png: garbage truck, snow plough,
// ride-on mower, bucket truck fixing a street lamp, two skips, three
// recycling bins, the landfill with its bulldozer, the waste-bear mascot,
// the waste-to-energy chimney and the cemetery corner. Measured off a 10 × 10
// grid over each sprite (gx across, gy down); units are percent of the
// sprite's height. Vehicles are printed facing LEFT — they are built mirrored
// (MX) so their front points +x, as the traffic code expects.

function grid(aspect) {
  return {
    X: (gx) => (gx / 10 - 0.5) * aspect,
    MX: (gx) => (0.5 - gx / 10) * aspect,
    Y: (gy) => 100 - gy * 10,
    S: (g) => (g / 10) * aspect,
  };
}

// material textures (see assets/materialTextures.js)
const METAL = { tex: 'metal' };
const WOOD = { tex: 'wood' };
const PLANKS = { tex: 'planks' };
const CONCRETE = { tex: 'concrete' };
const ASHLAR = { tex: 'ashlar' };
const GRANITE = { tex: 'granite' };
const BARK = { tex: 'bark' };
const PLASTER = { tex: 'plaster' };
const LEAF = { tex: 'leaf' };
const FUR = { tex: 'fur' };

// A shape (xy points) extruded through depth d, centered in z.
function slab(points, d) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
}

// Box spanning x ∈ [xa, xb] and y ∈ [ya, yb] (any order), depth d, at z.
function span(xa, xb, ya, yb, d, color, z = 0) {
  const x0 = Math.min(xa, xb);
  const y0 = Math.min(ya, yb);
  return mesh(box(Math.abs(xb - xa), Math.abs(yb - ya), d), color, x0 + Math.abs(xb - xa) / 2, y0, z);
}

// Wheel: chunky faceted tyre + pale hub, axle along local z.
function wheel(r, w, tyre = '#262d2b', hub = '#e9e0c6') {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(r, r, w, 12).rotateX(PI / 2), tyre));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, w + 0.8, 10).rotateX(PI / 2), hub));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, w + 1.4, 8).rotateX(PI / 2), '#5a5f57'));
  return g;
}

// Four wheels at x positions xs, half track ±hz, radius r. Returns the list.
function wheels(body, xs, r, hz, w, opts = {}) {
  const list = [];
  for (const x of xs) {
    for (const s of [-1, 1]) {
      const wg = wheel(r, w, opts.tyre, opts.hub);
      wg.position.set(x, r, s * hz);
      body.add(wg);
      list.push(wg);
    }
  }
  return list;
}

// Window glass panel on a side face (both sides of a vehicle at ±z).
function sideGlass(body, x0, x1, y0, y1, hz, color = '#2a3533') {
  for (const s of [-1, 1]) body.add(mesh(cbox(x1 - x0, y1 - y0, 0.8), color, (x0 + x1) / 2, (y0 + y1) / 2, s * (hz + 0.8))); // 0.4 proud
}

// A cute little worker: round head with a hard hat and dark bob, pink
// cheeks, blinking eyes; navy jacket, legs. `size` = total height. The
// figure stands at its feet (y = 0) facing +z. Returns { group, head, arms,
// blink(t) } — arms are shoulder pivots (index 0 = left).
function worker(size, { seated = false, vest = false } = {}) {
  const k = size / 40;
  const g = new THREE.Group();
  const navy = '#2e3742';
  const legH = seated ? 0 : 9 * k;
  if (!seated) {
    for (const s of [-1, 1]) {
      g.add(mesh(box(3.6 * k, legH, 4 * k), '#3b3a3f', s * 2.6 * k, 0, 0));
      g.add(mesh(box(4.2 * k, 2 * k, 5.2 * k), '#1f1f22', s * 2.6 * k, 0, 0.6 * k));
    }
  }
  const torsoY = legH;
  g.add(mesh(box(11 * k, 12 * k, 8 * k), navy, 0, torsoY, 0));
  if (vest) {
    g.add(mesh(box(11.8 * k, 7 * k, 8.8 * k), '#cfd98a', 0, torsoY + 3.5 * k, 0));
    g.add(mesh(box(12.2 * k, 1.2 * k, 9.2 * k), '#eceee6', 0, torsoY + 6 * k, 0));
  }
  // arms: pivots at the shoulders, hanging down
  const arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * 6.4 * k, torsoY + 11 * k, 0);
    a.add(mesh(box(3.2 * k, 9 * k, 3.6 * k).translate(0, -9 * k, 0), navy));
    a.add(mesh(new THREE.SphereGeometry(1.9 * k, 8, 6), '#efc3a6', 0, -9.6 * k, 0));
    g.add(a);
    arms.push(a);
  }
  // head
  const R = 8 * k;
  const head = group(0, torsoY + 12 * k + R * 0.92, 0);
  g.add(head);
  head.add(mesh(new THREE.SphereGeometry(R, 14, 10), '#efc3a6'));
  // dark bob: back half-shell slightly larger
  head.add(mesh(new THREE.SphereGeometry(R * 1.05, 12, 8, PI * 0.92, PI * 1.16, 0, PI * 0.7), '#2a2523', 0, 0, -0.3 * k));
  // hard hat: dome + brim
  head.add(mesh(new THREE.SphereGeometry(R * 1.12, 12, 6, 0, PI * 2, 0, PI / 2), '#e2b85a', 0, R * 0.32, 0));
  head.add(mesh(new THREE.CylinderGeometry(R * 1.3, R * 1.3, 1.2 * k, 14), '#d8ab4b', 0, R * 0.32, 0.6 * k));
  // face features on the sphere surface (analytic: z = √(R² − x² − y²))
  const onFace = (m, x, y, lift = 0.25) => {
    const z = Math.sqrt(Math.max(R * R - x * x - y * y, 0));
    const n = new THREE.Vector3(x, y, z).normalize();
    m.position.copy(n.clone().multiplyScalar(R + lift * k));
    m.lookAt(m.position.clone().add(n));
    head.add(m);
    return m;
  };
  const eyesL = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.95 * k, 8, 6), ink('#1b1a17'));
    e.scale.z = 0.45;
    eyesL.push(onFace(e, s * 2.8 * k, -0.4 * k, 0.1));
    onFace(cheek(1.7 * k, '#e59a95'), s * 4.6 * k, -2.6 * k, 0.15);
  }
  onFace(inkMesh(new THREE.CircleGeometry(0.7 * k, 8), '#b77a68'), 0, -2 * k, 0.2);
  const bl = blinker(size * 0.13);
  return {
    group: g, head, arms,
    blink(t) { const b = bl(t); for (const e of eyesL) e.scale.y = Math.max(0.12, 1 - b); },
  };
}





// ── skips: open-top trapezoid containers with walls, a floor and a rim ───
function skipModel(name, aspect, { color, rim, straps, lugs, feet }) {
  defineModel(name, (opts, rig) => {
    const { X, Y, S } = grid(aspect);
    const D = 52;
    const top = Y(feet ? 1.0 : 1.2);
    const bot = Y(feet ? 8.6 : 9.8);
    const wTop = S(feet ? 9.4 : 9.8);
    const wBot = S(feet ? 8.0 : 7.0);
    const dTop = D;
    const dBot = D * 0.82;
    const g = rig.body;
    const lift = feet ? Y(8.6) : 0;
    // walls as thin slabs: front / back trapezoids, two end panels
    const T = 2.4;
    for (const s of [-1, 1]) {
      const wall = slab([[-wBot / 2, bot], [wBot / 2, bot], [wTop / 2, top], [-wTop / 2, top]], T);
      const z = s * ((dTop + dBot) / 4);
      const m = mesh(wall, color, 0, 0, z, METAL);
      m.rotation.x = -s * Math.atan2((dTop - dBot) / 2, top - bot);
      m.position.y = 0;
      g.add(m);
    }
    for (const s of [-1, 1]) {
      const e = slab([[-dBot / 2, bot], [dBot / 2, bot], [dTop / 2, top], [-dTop / 2, top]], T);
      const m = mesh(e, new THREE.Color(color).offsetHSL(0, 0, -0.06).getStyle(), s * ((wTop + wBot) / 4), 0, 0, METAL);
      m.rotation.y = PI / 2;
      m.rotation.x = 0;
      m.rotation.z = 0;
      // lean the end panel outward
      const pivotG = group(s * (wBot / 2), bot, 0);
      m.position.set(0, -bot, 0);
      pivotG.add(m);
      pivotG.rotation.z = -s * Math.atan2((wTop - wBot) / 2, top - bot);
      g.add(pivotG);
    }
    g.add(mesh(box(wBot, 2, dBot), new THREE.Color(color).offsetHSL(0, 0, -0.12).getStyle(), 0, bot, 0, METAL)); // floor
    // rim around the top
    g.add(mesh(cbox(wTop + 3, 2.6, 3), rim, 0, top, dTop / 2 + 0.5, METAL));
    g.add(mesh(cbox(wTop + 3, 2.6, 3), rim, 0, top, -dTop / 2 - 0.5, METAL));
    for (const s of [-1, 1]) g.add(mesh(cbox(3, 2.6, dTop + 4), rim, s * (wTop / 2 + 0.5), top, 0, METAL));
    if (straps) {
      for (const gx of straps) {
        const x = X(gx);
        const xb = x * (wBot / wTop);
        g.add(mesh(beam(xb, bot + 1, x, top - 2, 2.4, 1.2), '#d6c48c', 0, 0, (dTop + dBot) / 4 + 2.2));
      }
    }
    if (lugs) for (const s of [-1, 1]) g.add(mesh(cbox(6, 6, 6), rim, s * (wTop / 2 + 2), top - 8, 0, METAL));
    if (feet) for (const s of [-1, 1]) for (const zs of [-1, 1]) g.add(mesh(box(4, bot, 4), '#4e4232', s * (wBot / 2 - 4), 0, zs * (dBot / 2 - 4)));
    void lift;
  });
}
skipModel('skipBig', 192.7, { color: '#8a7360', rim: '#9f8d78', straps: [1.9, 3.8, 6.0, 8.2], feet: true });
skipModel('skip', 214.1, { color: '#5b6372', rim: '#6c7584', lugs: true });

// ── recycling bins: tapered box, hinged gabled lid, raised recycle mark ──
function recycleBin(name, color) {
  defineModel(name, (opts, rig) => {
    const W = 58;
    const D = 50;
    const H = 72;
    const g = rig.body;
    g.add(mesh(new THREE.CylinderGeometry(W / Math.SQRT2, (W - 6) / Math.SQRT2, H, 4).rotateY(PI / 4).scale(1, 1, D / W).translate(0, H / 2, 0), color, 0, 0, 0, METAL));
    // lid: hinged at the back top edge, a shallow gabled cap
    const lid = group(0, H, -D / 2);
    // a shallow hipped cap (four folds meeting at a short ridge), like the sheet
    const cap = new THREE.CylinderGeometry(4 / Math.SQRT2, (W + 8) / Math.SQRT2, 18, 4, 1).rotateY(PI / 4)
      .scale(1, 1, (D + 6) / (W + 8)).translate(0, 9, D / 2);
    lid.add(mesh(cap, new THREE.Color(color).offsetHSL(0, 0, -0.04).getStyle(), 0, 0, 0, METAL));
    lid.add(mesh(cbox(W + 8, 2, D + 6).translate(0, 1, D / 2), new THREE.Color(color).offsetHSL(0, 0, -0.08).getStyle(), 0, 0, 0, METAL));
    g.add(lid);
    // recycle mark: three raised arrows in a triangle on the front
    const mark = group(0, H * 0.48, D / 2 + 0.3);
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * PI * 2 + PI / 2;
      const seg = beam(Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a + 2.1) * 10, Math.sin(a + 2.1) * 10, 3.4, 1);
      mark.add(mesh(seg, '#f0efe8'));
      const tip = new THREE.ConeGeometry(3.2, 5, 3).rotateZ(-PI / 2 + a + 2.1 + PI / 2.6);
      mark.add(mesh(tip.scale(1, 1, 0.3), '#f0efe8', Math.cos(a + 2.1) * 10, Math.sin(a + 2.1) * 10, 0));
    }
    g.add(mark);
    rig.anims.idle = (t, dt, ctx) => {
      const c = (t + ctx.phase * 3) % 7;
      lid.rotation.x = c < 1.4 ? -Math.sin((c / 1.4) * PI) * 1.1 : 0;
    };
  });
}
recycleBin('recyclingBin', '#a6bcae');
recycleBin('recyclingBin2', '#d2a462');
recycleBin('recyclingBin3', '#c88b98');

// ── landfill — faceted heap with pines and crates; a bulldozer works on top
defineModel('landfill', (opts, rig) => {
  const { X, S } = grid(195.3);
  const g = rig.body;
  // heap: a low faceted frustum, flattened top
  const heap = new THREE.CylinderGeometry(S(2.0), S(4.6), 50, 9, 2);
  const p = heap.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const y = p.getY(i);
    if (y > -24) {
      // jitter keyed on the vertex's facet column + ring (not its index), so
      // the lathe's duplicated seam vertices move together (no open crack)
      const col = ((Math.round(Math.atan2(p.getX(i), p.getZ(i)) / (PI * 2 / 9)) % 9) + 9) % 9;
      const ring = Math.round(y);
      const j = Math.sin((col * 7 + ring * 13 + 1) * 12.9898) * 0.5 + 0.5;
      p.setX(i, p.getX(i) * (0.92 + j * 0.14));
      p.setZ(i, p.getZ(i) * 0.55 * (0.92 + j * 0.14));
      if (Math.abs(y) < 1) p.setY(i, y + (j - 0.5) * 6);
    } else p.setZ(i, p.getZ(i) * 0.55);
  }
  heap.computeVertexNormals();
  g.add(mesh(heap.translate(0, 25, 0), '#7d6a58', 0, 0, 0, { jitter: 0.08 }));
  // pines standing on the ground at the flanks
  for (const [gx, h, z] of [[0.6, 48, 8], [8.6, 42, -4], [9.4, 36, 10]]) {
    g.add(mesh(new THREE.ConeGeometry(h * 0.32, h, 4).rotateY(PI / 4).translate(0, h / 2 + 3, 0), '#43554c', X(gx), 0, z, LEAF));
    g.add(mesh(box(4, 5, 4), '#5b4532', X(gx), 0, z, BARK));
  }
  // crates half-buried in the slope
  g.add(mesh(cbox(10, 10, 10), '#d8b98a', X(3.2), 14, 38, WOOD));
  g.add(mesh(cbox(9, 12, 9), '#d2b07c', X(6.4), 18, 34, PLANKS));
  // bulldozer: tracks, body, cab, blade — crawls back and forth on top
  const doz = group(0, 50, 0);
  g.add(doz);
  for (const s of [-1, 1]) {
    doz.add(mesh(box(32, 9, 6), '#2a2b2a', 0, 0, s * 9));
    for (const x of [-11, 0, 11]) doz.add(mesh(new THREE.CylinderGeometry(3, 3, 6.6, 8).rotateX(PI / 2), '#cfc6a5', x, 4.5, s * 9));
  }
  doz.add(mesh(box(26, 10, 18), '#d6b46a', -2, 8, 0, METAL));
  doz.add(mesh(box(14, 14, 16), '#e2c47f', -6, 18, 0, METAL));
  sideGlass(doz, -11, -1, 22, 30, 8, '#33403d');
  doz.add(mesh(cbox(0.8, 8, 12), '#33403d', 1.4, 26, 0));
  doz.add(mesh(beam(19, 1, 22, 15, 3, 24), '#d0aa5a', 0, 0, 0, METAL));
  for (const s of [-1, 1]) doz.add(mesh(beam(10, 10, 20, 7, 2, 2), '#3b3a36', 0, 0, s * 9));
  rig.anims.idle = (t, dt, ctx) => {
    const u = Math.sin(t * 0.35 + ctx.phase);
    doz.position.x = u * S(1.4);
    doz.rotation.y = Math.cos(t * 0.35 + ctx.phase) < 0 ? PI : 0;
    doz.position.y = 50 + Math.abs(Math.sin(t * 8)) * 0.4;
  };
});

// ── wasteBear — the round slate mascot with a cream mask and blinking eyes
defineModel('wasteBear', (opts, rig) => {
  const { X, Y, S } = grid(106.1);
  const slate = '#5a6470';
  const g = rig.body;
  const torso = group(0, 0, 0);
  g.add(torso);
  // body: a bell — dome on straight-ish sides (lathe), squashed in z
  const prof = [[0, Y(9.5)], [S(4.9), Y(9.5)], [S(4.9), Y(6.3)], [S(4.5), Y(3.2)], [S(3.4), Y(1.4)], [S(1.6), Y(0.75)], [0, Y(0.7)]];
  const ZS = 0.62;
  const rAt = (y) => {
    for (let i = 0; i < prof.length - 1; i += 1) {
      const [r0, y0] = prof[i];
      const [r1, y1] = prof[i + 1];
      if ((y <= y0 && y >= y1) || (y >= y0 && y <= y1)) return r0 + ((y - y0) / (y1 - y0 || 1)) * (r1 - r0);
    }
    return 0;
  };
  const bodyMesh = mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 24).scale(1, 1, ZS), slate, 0, 0, 0, FUR);
  torso.add(bodyMesh);
  // the faceted lathe never pokes out of its analytic surface (chords lie
  // inside the circle), so decals placed on the analytic surface + a lift
  // always sit on the fur
  const za = (x, y) => ZS * Math.sqrt(Math.max(rAt(y) ** 2 - x * x, 0));
  // draped cream mask halves (the slate stripe shows between them): built
  // row by row, each row with its own x-range, so the outline is a clean
  // rounded capsule and no row ever folds back on itself
  function drape(xIn, xOut, y0, y1, color, lift) {
    const side = Math.sign(xOut - xIn);
    const cols = 16;
    const rows = 16;
    const cy = (y0 + y1) / 2;
    const hh = Math.abs(y1 - y0) / 2;
    const pos = [];
    const idx = [];
    for (let r = 0; r <= rows; r += 1) {
      const y = y0 + ((y1 - y0) * r) / rows;
      const v = (y - cy) / hh; // −1 … 1
      // rounded outer end: a semicircle of radius hh
      const outer = xOut - side * hh * (1 - Math.sqrt(Math.max(0, 1 - v * v)));
      const lim = rAt(y) * 0.93;
      const xo = side > 0 ? Math.min(outer, lim) : Math.max(outer, -lim);
      for (let c = 0; c <= cols; c += 1) {
        const x = xIn + ((xo - xIn) * c) / cols;
        pos.push(x, y, za(x, y) + lift);
      }
    }
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const a0 = r * (cols + 1) + c;
        const b0 = a0 + cols + 1;
        idx.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    return mesh(geo, color, 0, 0, 0, { side: THREE.DoubleSide, ...FUR });
  }
  torso.add(drape(X(4.3), X(0.4), Y(7.3), Y(2.9), '#efe7d6', 0.6));
  torso.add(drape(X(5.7), X(9.6), Y(7.3), Y(2.9), '#efe7d6', 0.6));
  const place = (m, x, y, lift) => {
    const z = za(x, y);
    const n = new THREE.Vector3(za(x - 1, y) - za(x + 1, y), za(x, y - 1) - za(x, y + 1), 2).normalize();
    m.position.set(x, y, z).addScaledVector(n, lift);
    m.lookAt(m.position.clone().add(n));
    torso.add(m);
    return m;
  };
  const eyeL = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(S(0.17), 10, 8), ink('#1b1a17'));
    e.scale.z = 0.45;
    eyeL.push(place(e, X(5 + s * 1.4), Y(4.65), 1.5));
    place(cheek(S(1.0), '#df9a95'), X(5 + s * 3.4), Y(5.85), 1.1);
  }
  // nose: soft dark triangle-ish pad at the stripe's foot
  place(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(S(0.42), S(0.3), 2), ink('#1b1a17')), X(5), Y(6.95), 0.8);
  // ears: round, sunk into the dome
  const ears = [];
  for (const s of [-1, 1]) {
    const e = group(X(5 + s * 3.25), Y(0.9), -2);
    e.add(mesh(new THREE.SphereGeometry(S(0.95), 12, 8).scale(1, 1, 0.55), slate, 0, 0, 0, FUR));
    torso.add(e);
    ears.push(e);
  }
  // feet
  for (const s of [-1, 1]) g.add(mesh(box(S(0.8), Y(9.5), S(0.9)), '#1d2024', X(5 + s * 2.9), 0, 6));
  const bl = blinker(rig.seed + 1.1);
  rig.anims.always = (t) => {
    const k = bl(t);
    for (const e of eyeL) e.scale.y = Math.max(0.12, 1 - k);
    const c = (t + rig.seed) % 5.1;
    ears[0].rotation.z = c < 0.3 ? Math.sin((c / 0.3) * PI) * 0.3 : 0;
  };
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 1.6 + ctx.phase);
    torso.scale.set(1 + b * 0.01, 1 + b * 0.02, 1);
    torso.rotation.z = Math.sin(t * 0.5 + ctx.phase) * 0.03; // a sleepy sway
  };
});

// ── zevoChimney — tall white tapered stack, dark cap, puffing smoke ──────
defineModel('zevoChimney', (opts, rig) => {
  const g = rig.body;
  const H = 95;
  const shaft = new THREE.CylinderGeometry(5.4 / Math.SQRT2 * 2, 10.4 / Math.SQRT2 * 2, H, 4).rotateY(PI / 4).translate(0, H / 2, 0);
  g.add(mesh(shaft, '#ece6d6', 0, 0, 0, CONCRETE));
  g.add(mesh(new THREE.ConeGeometry(6.6 / Math.SQRT2 * 2 * 0.9, 5, 4).rotateY(PI / 4).translate(0, H + 2.5, 0), '#3a4342', 0, 0, 0, METAL));
  // narrow dark slit windows on the front face (proud of the taper)
  for (const y of [22, 40]) {
    const half = 10.4 - (10.4 - 5.4) * (y / H);
    g.add(mesh(cbox(1.4, 4, 0.8), '#2a2622', 3.5, y, half + 0.5));
  }
  const sm = smoke(0, H + 6, 0, { size: 3.2, rise: 36, count: 5, drift: 10 });
  g.add(sm.group);
  rig.anims.smoke = (t) => sm.update(t);
  rig.anims.idle = rig.anims.smoke;
});

// ── cemetery — iron fence with a gate between candle pillars, a cypress,
// a little house behind and a rounded shrub ──────────────────────────────
defineModel('cemetery', (opts, rig) => {
  const { X, Y } = grid(159.1);
  const g = rig.body;
  const D = 46;
  const front = D / 2;
  // lawn base
  g.add(mesh(box(X(9.9) - X(0.1), 2, D + 10), '#6f7f71', 0, 0, 0));
  // house behind (gx 4.4–6.4)
  const hx0 = X(4.4);
  const hx1 = X(6.4);
  const hz = -8;
  g.add(mesh(box(hx1 - hx0, Y(0.4) - 2, 26), '#e7e1d1', (hx0 + hx1) / 2, 2, hz, PLASTER));
  g.add(mesh(box(hx1 - hx0 + 6, 3, 30), '#c9d3c7', (hx0 + hx1) / 2, Y(0.4), hz, CONCRETE));
  // windows + door sit proud of the wall face (hz + 13), never in it
  g.add(mesh(cbox(5, 8, 1), '#3e5a50', X(4.85), Y(2.2), hz + 13.9));
  g.add(mesh(cbox(5, 8, 1), '#e2bf62', X(5.95), Y(2.2), hz + 13.9));
  g.add(mesh(box(8, 22, 1), '#1d2522', X(5.4), 2, hz + 13.9));
  // pillars with candles at both ends of the fence
  const flames = [];
  for (const gx of [0.3, 9.7]) {
    const px = X(gx);
    g.add(mesh(box(10, Y(5.9) - 2, 10), '#ddd5c2', px, 2, front - 4, ASHLAR));
    g.add(mesh(box(12, 2.2, 12), '#3b3a36', px, Y(5.9), front - 4, GRANITE));
    g.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 8, 10), '#efe7d2', px, Y(5.9) + 6.2, front - 4));
    const f = new THREE.Mesh(new THREE.ConeGeometry(1.3, 4, 8), new THREE.MeshBasicMaterial({ color: '#f5c35a' }));
    f.position.set(px, Y(5.9) + 12.4, front - 4);
    g.add(f);
    flames.push(f);
  }
  // gate posts in the middle
  for (const gx of [3.9, 6.1]) g.add(mesh(box(5, Y(6.4) - 2, 5), '#ddd5c2', X(gx), 2, front - 2, ASHLAR));
  // iron fence: rails + bars, with a gate (arched top) between the posts
  const iron = '#22282a';
  const bars = (xa, xb, y0, y1) => {
    g.add(mesh(cbox(xb - xa, 1.2, 1.2), iron, (xa + xb) / 2, y1, front - 2));
    g.add(mesh(cbox(xb - xa, 1.2, 1.2), iron, (xa + xb) / 2, y0 + 3, front - 2));
    for (let x = xa + 2.5; x < xb - 1; x += 3.2) g.add(mesh(box(0.9, y1 - y0 + 2, 0.9), iron, x, y0, front - 2));
  };
  bars(X(0.6), X(3.85), 2, Y(7.3));
  bars(X(6.15), X(9.4), 2, Y(7.3));
  bars(X(4.0), X(6.0), 2, Y(7.6));
  g.add(mesh(new THREE.TorusGeometry((X(6.0) - X(4.0)) / 2, 0.8, 4, 14, PI), iron, X(5.0), Y(7.6), front - 2));
  // cypress tree behind the left fence + a rounded shrub on the right
  g.add(mesh(new THREE.SphereGeometry(1, 8, 10).scale(13, 34, 11).translate(0, 36, 0), '#3d5148', X(2.15), 0, front - 12, LEAF));
  g.add(mesh(box(3, 6, 3), '#4b3c2c', X(2.15), 0, front - 12, BARK));
  g.add(mesh(new THREE.SphereGeometry(1, 8, 8).scale(9, 13, 8).translate(0, 14, 0), '#43554c', X(8.3), 0, front - 10, LEAF));
  // a small stone urn on a post behind the left gate post
  g.add(mesh(box(5, 26, 5), '#cfc7b4', X(3.55), 2, front - 9, ASHLAR));
  g.add(mesh(new THREE.ConeGeometry(4, 6, 6).translate(0, 31, 0), '#a7a597', X(3.55), 0, front - 9, GRANITE));
  rig.anims.always = (t) => {
    flames.forEach((f, i) => {
      const k = 1 + Math.sin(t * 13 + i * 2) * 0.15 + Math.sin(t * 29 + i) * 0.08;
      f.scale.set(1, k, 1);
    });
  };
});

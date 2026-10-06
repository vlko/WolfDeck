import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, fold, beam, box, cbox, group, eyes, cheek, blinker, facet, mat, PI,
} from './kit.js';
import { tieredTree } from './trees.js';

// Models for the pieces on shop.png: the striped corner shop, market stall,
// produce, bread, sacks, carts, signs, shop trees and the four shopkeepers.
// Measured off a 10 × 10 grid over each sprite (gx across, gy down).

function grid(aspect) {
  return {
    X: (gx) => (gx / 10 - 0.5) * aspect,
    Y: (gy) => 100 - gy * 10,
    S: (g) => (g / 10) * aspect,
  };
}

// Faceted gem / sack / dress made by lathing a profile [[r, y], …] with few
// sides; a vertex faces the viewer, so the fold light splits it in halves.
function gem(profile, seg = 6, depth = 1) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y));
  const g = new THREE.LatheGeometry(pts, seg);
  g.scale(1, 1, depth);
  return g;
}

// A flat paper patch laid ON a folded surface: points in xy, each vertex lifted
// to zAt(x) + lift (keep a patch to one side of the crease).
function decal(points, zAt, color, lift = 0.3) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 1) p.setZ(i, zAt(p.getX(i)) + lift);
  return mesh(g, color);
}

// Low-poly ball (produce, cabbages).
function lumpy(r, detail = 1) {
  return new THREE.IcosahedronGeometry(r, detail);
}

const WOOD = { tex: 'wood' };
const PLASTER = { tex: 'plaster' };
const WOOD_FINE = { tex: 'woodFine' };
const DOOR = { tex: 'woodFine', texRotate: true }; // one door leaf: fine grain running up
const PLANKS = { tex: 'planks' };
const PAVING = { tex: 'paving' };
const ASHLAR = { tex: 'ashlar' };
const CONCRETE = { tex: 'concrete' };
const FABRIC = { tex: 'fabric' };
const METAL = { tex: 'metal' };
const FUR = { tex: 'fur' };
const LEAF = { tex: 'leaf' };
const BARK = { tex: 'bark' };
const STRAW = { tex: 'straw', texScale: 0.6 };

const shade = (c, l) => new THREE.Color(c).offsetHSL(0, 0, l).getStyle();

// ── characters ───────────────────────────────────────────────────────────
// Shared rig: dress body, legs, two small arms on shoulder pivots, a head on a
// neck pivot. spec.head(headGroup) builds the face and returns
// { blink(k), ears: [groups] }.
// resting arm angle: far enough out that the sleeve clears the dress where
// it widens toward the hem
const REST = 0.5;
function shopkeeper(rig, spec) {
  const { X, Y, S } = grid(spec.aspect);
  const torso = group();
  rig.body.add(torso);
  const D = spec.depth ?? 0.8;
  const [gyTop, gyWide, gyBot] = spec.dress;
  const [hwTop, hwWide, hwBot] = spec.dressW.map(S);
  torso.add(mesh(gem([[0, Y(gyBot)], [hwBot, Y(gyBot)], [hwWide, Y(gyWide)], [hwTop, Y(gyTop)], [0, Y(gyTop)]], 6, D), spec.dressColor, 0, 0, 0, FABRIC));
  if (spec.dressDetail) spec.dressDetail(torso, { X, Y, S });
  // legs
  const legs = [];
  for (const gx of spec.legs.at) {
    const leg = group(X(gx), Y(gyBot) + 1, 0);
    const h = Y(gyBot) + 1;
    leg.add(mesh(box(S(spec.legs.w), h, S(spec.legs.w) * 0.9).translate(0, -h, 0), spec.legs.color));
    torso.add(leg);
    legs.push(leg);
  }
  // arms — short tapered sleeves with a paw, hung from shoulder pivots that
  // sit on the dress's side face (a hexagon with a vertex to the front has its
  // flat sides at 0.866·r), so the sleeve grows out of the body
  const arms = [];
  const sideX = (r) => r * 0.866;
  for (const s of [-1, 1]) {
    const len = spec.armLen ?? 16;
    const arm = group(s * (sideX(S(spec.dressW[0])) + 2.2), Y(gyTop) - 3.5, 0);
    arm.add(mesh(new THREE.CylinderGeometry(3.4, 2.7, len, 6).translate(0, -len / 2, 0), spec.dressColor, 0, 0, 0, FABRIC));
    arm.add(mesh(new THREE.IcosahedronGeometry(3.0, 0).translate(0, -len - 1.2, 0), spec.armColor ?? shade(spec.dressColor, -0.1)));
    arm.rotation.z = s * REST;
    torso.add(arm);
    arms.push(arm);
  }
  // head
  const head = group(0, spec.neckY, spec.headZ ?? 0);
  torso.add(head);
  const face = spec.head(head, { X, Y, S, neckY: spec.neckY });
  // tail (from the rump)
  let tail = null;
  if (spec.tail) {
    tail = group(spec.tail.x ?? 0, spec.tail.y, -(spec.tail.z ?? 14));
    tail.rotation.order = 'YXZ';
    spec.tail.build(tail);
    torso.add(tail);
  }

  const blink = blinker(rig.seed + spec.aspect);
  rig.parts.head = head;
  rig.parts.arms = arms;
  rig.anims.always = (t) => {
    face.blink(blink(t));
    (face.ears ?? []).forEach((e, i) => {
      const c = (t + rig.seed + i * 2.3) % 5.5;
      e.rotation.z = c < 0.28 ? Math.sin((c / 0.28) * PI) * 0.3 * (i ? -1 : 1) : 0;
    });
    if (tail) {
      tail.rotation.y = Math.sin(t * 3) * 0.35;
      tail.rotation.x = Math.sin(t * 1.7) * 0.1;
    }
  };
  // idle: breathe, look about, and every so often beckon a customer
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2.1 + ctx.phase);
    torso.scale.set(1 - b * 0.006, 1 + b * 0.012, 1);
    head.rotation.z = Math.sin(t * 0.7 + ctx.phase) * 0.06;
    head.rotation.y = Math.sin(t * 0.33 + ctx.phase) * 0.25;
    const cyc = (t + ctx.phase * 3) % 8;
    const wave = cyc > 5.5 ? Math.sin(((cyc - 5.5) / 2.5) * PI) : 0;
    arms[1].rotation.z = REST + wave * 2.0;
    arms[1].rotation.x = wave * Math.sin(t * 12) * 0.25;
    arms[0].rotation.z = -REST - Math.sin(t * 2.1 + ctx.phase) * 0.04;
    torso.position.y = wave * Math.abs(Math.sin(t * 6)) * 0.8;
  };
  rig.anims.walk = (t) => {
    legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 8 + i * PI) * 0.45; });
    arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 8 + i * PI + PI) * 0.4; });
    torso.position.y = Math.abs(Math.sin(t * 8)) * 1.2;
  };
}

// ── wolfShopkeeper — pentagon-faced wolf in a sage dress ───────────────────
defineModel('wolfShopkeeper', (opts, rig) => shopkeeper(rig, {
  aspect: 61.6,
  dress: [6.75, 8.3, 9.25],
  dressW: [2.6, 3.7, 2.9],
  dressColor: '#b4c0b3',
  legs: { at: [3.3, 6.4], w: 0.65, color: '#6f5a44' },
  neckY: 30,
  headZ: 2,
  head(head, { X, Y, S, neckY }) {
    const hp = (pts) => pts.map(([gx, gy]) => [X(gx), Y(gy) - neckY]);
    const faceGeo = fold(hp([[1.0, 2.35], [9.0, 2.35], [9.9, 5.6], [5.0, 7.05], [0.1, 5.6]]), 22, 9, { cx: 0 });
    head.add(mesh(faceGeo, '#b8afa5', 0, 0, 0, FUR));
    const fz = faceGeo.userData.zAt;
    // cream mask on the lower face sides, the ridge stays taupe
    head.add(decal(hp([[0.15, 5.6], [0.9, 3.3], [3.9, 4.2], [4.85, 6.95]]), fz, '#e6dfd3'));
    head.add(decal(hp([[9.85, 5.6], [9.1, 3.3], [6.1, 4.2], [5.15, 6.95]]), fz, '#e6dfd3'));
    const nose = inkMesh(new THREE.SphereGeometry(3.2, 12, 8), '#2a2420', 0, Y(6.75) - neckY, fz(0) + 1);
    nose.scale.set(1.3, 0.7, 0.6);
    head.add(nose);
    const ey = eyes(S(2.75), 2.0);
    ey.group.position.set(0, Y(5.2) - neckY, fz(S(2.75)) + 0.2);
    head.add(ey.group);
    const ears = [];
    for (const [gx, s] of [[1.6, -1], [8.4, 1]]) {
      const ear = group(X(gx), Y(2.4) - neckY, -2);
      const outer = fold([[-S(0.8), 0], [S(0.8), 0], [s * S(0.4), Y(0.0) - Y(2.4)]], 4, 1.5);
      ear.add(mesh(outer, '#a2958c', 0, 0, 0, FUR));
      ear.add(mesh(fold([[-S(0.45), 1], [S(0.45), 1], [s * S(0.3), Y(0.5) - Y(2.4)]], 1, 0.5), '#6b5547', 0, 0, 2.6));
      head.add(ear);
      ears.push(ear);
    }
    return { blink: ey.blink, ears };
  },
  tail: {
    y: 14, z: 10, x: -4,
    build(t) {
      const g = new THREE.ConeGeometry(4.5, 20, 4).translate(0, 10, 0).rotateX(-PI / 2 - 0.5);
      t.add(mesh(g, '#5e4c3c', 0, 0, 0, FUR));
      t.rotation.y = 0.9;
    },
  },
}));

// ── boar — big faceted sage head, tan snout, curly tail ────────────────────
defineModel('boar', (opts, rig) => shopkeeper(rig, {
  aspect: 77.0,
  dress: [6.4, 8.0, 9.3],
  dressW: [3.4, 3.9, 3.2],
  dressColor: '#d0d6c8',
  armColor: '#c5cbbb',
  legs: { at: [3.6, 6.1], w: 0.6, color: '#2f2a24' },
  neckY: 34,
  headZ: 1,
  head(head, { X, Y, S, neckY }) {
    const hp = (pts) => pts.map(([gx, gy]) => [X(gx), Y(gy) - neckY]);
    const faceGeo = fold(hp([[1.0, 1.3], [5.0, 0.4], [8.6, 1.0], [9.3, 4.4], [8.2, 6.4], [5.0, 6.9], [1.8, 6.4], [0.6, 4.4]]), 34, 7, { cx: 0 });
    head.add(mesh(faceGeo, '#adbaae', 0, 0, 0, FUR));
    const fz = faceGeo.userData.zAt;
    // the snout: a short, soft pig snout — a low faceted dome with a round
    // dark nose disc and two nostrils, not a block
    const snout = group(X(4.4), Y(5.5) - neckY, fz(0) - 3);
    snout.add(mesh(new THREE.SphereGeometry(1, 12, 8).scale(S(1.45), 10, 9), '#cfc0a2'));
    snout.add(inkMesh(new THREE.CircleGeometry(S(0.95), 16).scale(1, 0.72, 1), '#3a352d', 0, 0, 8.6));
    for (const s of [-1, 1]) snout.add(inkMesh(new THREE.CircleGeometry(1.5, 10), '#15130f', s * 3.2, 0, 8.8));
    head.add(snout);
    const ey = eyes(S(2.25), 2.6);
    ey.group.position.set(X(4.85), Y(4.6) - neckY, fz(S(2.25)) - 0.8);
    head.add(ey.group);
    const ears = [];
    for (const [gx, gy, s] of [[1.0, 1.4, -1], [9.0, 1.2, 1]]) {
      const ear = group(X(gx), Y(gy) - neckY, -4);
      const e = mesh(new THREE.ConeGeometry(S(1.1), 13, 4).rotateZ(s * -1.1), s < 0 ? '#6c7a6b' : '#3f4d40', s * 5, 2, 0, FUR);
      ear.add(e);
      head.add(ear);
      ears.push(ear);
    }
    return { blink: ey.blink, ears };
  },
  tail: {
    y: 22, z: 21, x: 16, // on the rump, curling out to the right where the sheet shows it
    build(t) {
      // curly tail: one continuous faceted curl
      t.add(mesh(new THREE.TorusGeometry(3.6, 1.4, 5, 10, PI * 1.6).rotateY(PI / 2), '#5d6b5c', 0, 3, -2));
    },
  },
}));

// Round panda head with ears, cheek patches, dot eyes + dot nose.
function pandaHead(head, { X, Y, S, neckY }, { cy, rx, ry, ears, earR, cheekX, cheekR, eyeX }) {
  const h = mesh(new THREE.SphereGeometry(1, 14, 10).scale(rx, ry, ry * 0.62), '#f0ebde', 0, Y(cy) - neckY, 0, FUR);
  head.add(h);
  const front = ry * 0.62;
  const out = [];
  for (const [gx, gy] of ears) {
    const e = group(X(gx), Y(gy) - neckY, -4);
    e.add(mesh(new THREE.CylinderGeometry(S(earR), S(earR), 5, 14).rotateX(PI / 2), '#9a7676', 0, 0, 0, FUR));
    head.add(e);
    out.push(e);
  }
  // patches and eyes lie on the head's curve (ellipsoid normal), so its
  // facets never cut through them
  const hc = Y(cy) - neckY;
  const onHead = (x, y, lift) => {
    const z = front * Math.sqrt(Math.max(0.02, 1 - (x / rx) ** 2 - ((y - hc) / ry) ** 2));
    const n = new THREE.Vector3(x / (rx * rx), (y - hc) / (ry * ry), z / (front * front)).normalize();
    return { p: new THREE.Vector3(x, y, z).addScaledVector(n, lift), n };
  };
  const ey = eyes(S(eyeX), 1.6);
  for (const s of [-1, 1]) {
    const c = cheek(S(cheekR), '#c59585');
    c.material.opacity = 0.95;
    const { p, n } = onHead(s * S(cheekX), Y(cy + 0.75) - neckY, 1.4);
    c.position.copy(p);
    c.lookAt(p.clone().add(n));
    head.add(c);
  }
  ey.group.children.forEach((e) => {
    const { p, n } = onHead(e.position.x, Y(cy + 0.75) - neckY, 1.9);
    e.position.copy(p);
    e.lookAt(p.clone().add(n));
  });
  head.add(ey.group);
  head.add(inkMesh(new THREE.SphereGeometry(1.3, 10, 6), '#1f1d1a', 0, Y(cy + 0.75) - neckY, front + 0.3));
  return { blink: ey.blink, ears: out };
}

defineModel('pandaKid', (opts, rig) => shopkeeper(rig, {
  aspect: 74.0,
  dress: [6.6, 8.3, 9.2],
  dressW: [2.5, 3.0, 2.4],
  dressColor: '#9fad9f',
  armColor: '#ede6d6',
  armLen: 13,
  legs: { at: [3.6, 6.4], w: 0.6, color: '#5d4836' },
  neckY: 28,
  dressDetail(torso, { Y }) {
    // on the dress's front vertex (radius × depth 0.8), not buried inside it
    for (const [gy, z] of [[7.3, 16.4], [8.0, 17.6]]) torso.add(inkMesh(new THREE.SphereGeometry(1.2, 8, 6), '#3d362f', 0, Y(gy), z));
  },
  head: (head, g) => pandaHead(head, g, {
    cy: 3.7, rx: 36, ry: 33, ears: [[1.5, 1.0], [8.5, 0.9]], earR: 0.85, cheekX: 2.4, cheekR: 1.25, eyeX: 2.5,
  }),
}));

defineModel('pandaGirl', (opts, rig) => shopkeeper(rig, {
  aspect: 80.5,
  dress: [6.6, 8.4, 9.1],
  dressW: [2.2, 2.6, 1.9],
  dressColor: '#b9989a',
  armColor: '#ede6d6',
  armLen: 13,
  legs: { at: [4.0, 6.0], w: 0.45, color: '#e7e0d0' },
  neckY: 30,
  head: (head, g) => pandaHead(head, g, {
    cy: 3.9, rx: 38, ry: 31, ears: [[1.4, 1.4], [8.6, 1.2]], earR: 1.3, cheekX: 2.5, cheekR: 1.1, eyeX: 2.15,
  }),
}));

// ── shop trees ─────────────────────────────────────────────────────────────
tieredTree('coneTreeMint', { aspect: 74.7, trunk: [4.4, 5.6, '#6e5a44'], tiers: [
  [0, 0, 5.0, 2.85, '#a9b4a7'], [4.85, 2.85, 8.45, 5.0, '#9daa9c']] });
tieredTree('slimTree', { aspect: 45.1, trunk: [4.3, 5.6, '#6f5d49'], tiers: [[0, 0, 8.55, 4.85, '#a7b2a5']] });
tieredTree('slimTree2', { aspect: 45.3, trunk: [4.3, 5.6, '#6f5d49'], tiers: [[0, 0, 8.55, 4.85, '#a5b0a3']] });

// gemTree — a faceted gem of a crown on a short trunk; the crown sways
defineModel('gemTree', (opts, rig) => {
  const { Y, S } = grid(70.1);
  rig.body.add(mesh(box(S(1.2), Y(8.3), S(1.0)), '#7a6853', 0, 0, 0, BARK));
  const crown = group(0, Y(8.6), 0);
  crown.add(mesh(gem([[0, 0], [S(3.8), Y(8.2) - Y(8.6)], [S(4.95), Y(5.4) - Y(8.6)], [0, Y(0) - Y(8.6)]], 6, 0.95), '#a6b1a5', 0, 0, 0, LEAF));
  rig.body.add(crown);
  rig.anims.sway = (t, dt, ctx) => {
    crown.rotation.z = Math.sin(t * 0.9 + ctx.phase) * 0.025;
    crown.rotation.x = Math.sin(t * 0.7 + ctx.phase) * 0.012;
  };
});

// ── flowerPot — faceted pot with a mauve and a cream flower that nod ───────
defineModel('flowerPot', (opts, rig) => {
  const { X, Y, S } = grid(61.1);
  // pot: four-sided, edge to the front, plus a rim
  rig.body.add(mesh(new THREE.CylinderGeometry(S(3.8), S(2.95), Y(7.0), 4).translate(0, Y(7.0) / 2, 0).scale(1, 1, 0.8), '#a7937f'));
  rig.body.add(mesh(new THREE.CylinderGeometry(S(4.4), S(4.3), Y(6.0) - Y(7.0), 4).translate(0, Y(7.0) + (Y(6.0) - Y(7.0)) / 2, 0).scale(1, 1, 0.8), '#ad9a86'));
  const heads = [];
  for (const [gx, gy, r, petal, mid, lean] of [[2.6, 2.0, 1.9, '#9b7476', '#efe6da', -0.35], [6.75, 3.6, 1.95, '#ddd5c1', '#a59675', 0.25]]) {
    const stem = group(X(gx < 5 ? 3.8 : 5.8), Y(6.0), 0);
    const len = Y(gy) - Y(6.0);
    stem.add(mesh(box(1.4, len, 1.4), '#4f5f52'));
    // octagon flower: eight petal facets around a hole
    const f = group((X(gx) - stem.position.x), len, 3);
    f.add(mesh(new THREE.CylinderGeometry(S(r), S(r), 3, 8).rotateX(PI / 2), petal));
    f.add(mesh(new THREE.CylinderGeometry(S(r * 0.35), S(r * 0.35), 3.4, 8).rotateX(PI / 2), mid));
    stem.add(f);
    stem.rotation.z = lean;
    f.rotation.z = -lean;
    rig.body.add(stem);
    heads.push(stem);
  }
  // leaves
  for (const [x, y, rz, s] of [[-12, 50, 0.9, 1], [10, 58, -0.8, 1], [2, 68, 0.2, 0.8], [18, 82, -0.3, 0.9]]) {
    const leaf = mesh(new THREE.ConeGeometry(6 * s, 22 * s, 3).scale(1, 1, 0.3), '#5d6e60', x, y, 2, { tex: 'leaf', texScale: 0.6 });
    leaf.rotation.z = rz;
    rig.body.add(leaf);
  }
  rig.anims.sway = (t, dt, ctx) => {
    heads.forEach((h, i) => { h.rotation.x = Math.sin(t * 1.3 + i * 1.7 + ctx.phase) * 0.06; });
  };
});

// ── sacks ──────────────────────────────────────────────────────────────────
// A faceted sack: flared top, tie band, round faceted belly.
function sack(rig, aspect, { top, neck, belly, bottom, color, tie }) {
  const { Y, S } = grid(aspect);
  const body = group();
  rig.body.add(body);
  body.add(mesh(gem([[0, 0], [S(bottom), 0.1], [S(belly), Y(7.0)], [S(belly * 0.82), Y(4.3)], [S(neck), Y(2.15)], [S(neck * 0.8), Y(2.0)], [S(top), Y(0.05)], [0, Y(0.0)]], 8, 0.85), color, 0, 0, 0, FABRIC));
  if (tie) body.add(mesh(new THREE.CylinderGeometry(S(neck) + 1.4, S(neck) + 1.4, 3.2, 8).translate(0, Y(2.15), 0).scale(1, 1, 0.85), tie));
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t + ctx.phase * 2) % 6;
    body.rotation.z = c < 0.7 ? Math.sin(c * PI * 4) * 0.025 * (1 - c / 0.7) : 0;
  };
}
defineModel('moneyBag', (opts, rig) => sack(rig, 67.7, { top: 3.4, neck: 2.3, belly: 4.95, bottom: 3.6, color: '#dcb994' }));
defineModel('flourSack', (opts, rig) => sack(rig, 85.1, { top: 3.9, neck: 1.25, belly: 4.95, bottom: 4.1, color: '#ebe5d8', tie: '#5e4a36' }));

// ── scale — shop scale: pan, stem, arched body with a dial and a needle ────
defineModel('scale', (opts, rig) => {
  const { Y, S } = grid(71.2);
  const D = 30;
  rig.body.add(mesh(box(S(9.9), Y(8.7), D + 4), '#859685', 0, 0, 0, METAL));
  const arch = new THREE.Shape();
  const hw = S(4.3);
  arch.moveTo(-hw, Y(8.7));
  arch.lineTo(hw, Y(8.7));
  arch.lineTo(hw, Y(5.6));
  arch.absellipse(0, Y(5.6), hw, Y(3.2) - Y(5.6), 0, PI, false);
  arch.lineTo(-hw, Y(8.7));
  rig.body.add(mesh(new THREE.ExtrudeGeometry(arch, { depth: D, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -D / 2), '#7f907f', 0, 0, 0, METAL));
  // dial + needle + hub
  const dz = D / 2 + 0.6;
  rig.body.add(mesh(new THREE.CylinderGeometry(S(2.65), S(2.65), 1.2, 20).rotateX(PI / 2), '#f2ece1', 0, Y(5.9), dz));
  const needle = group(0, Y(5.9), dz + 1);
  needle.add(inkMesh(cbox(1.2, S(2.1), 0.4).translate(0, S(1.05), 0), '#3f3324'));
  rig.body.add(needle);
  rig.body.add(inkMesh(new THREE.CylinderGeometry(S(0.55), S(0.55), 1, 12).rotateX(PI / 2), '#41341f', 0, Y(5.9), dz + 1.3));
  // stem + pan
  rig.body.add(mesh(box(S(0.9), Y(2.2) - Y(3.3), 6), '#4a3c2a', 0, Y(3.3), 0));
  const pan = group(0, Y(2.2), 0);
  pan.add(mesh(new THREE.CylinderGeometry(S(5.0), S(2.4), Y(0.0) - Y(2.2), 8).translate(0, (Y(0.0) - Y(2.2)) / 2, 0).scale(1, 1, 0.7), '#9b8670', 0, 0, 0, METAL));
  rig.body.add(pan);
  // idle: the needle hunts and settles; now and then the pan dips (weighing)
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t + ctx.phase * 2) % 7;
    const load = c < 3.5 ? Math.min(1, c / 0.4) : Math.max(0, 1 - (c - 3.5) / 0.6);
    const settle = Math.exp(-((c % 3.5) * 1.6)) * Math.sin(c * 14) * 0.25;
    needle.rotation.z = -0.65 * load - 0.15 + settle;
    pan.position.y = Y(2.2) - load * 1.5;
  };
});

// ── shared produce pieces ──────────────────────────────────────────────────

// Slatted wooden crate (open top) with dark gaps between the boards.
function crate(w, h, d, color = '#a8957d', slats = 3) {
  const g = new THREE.Group();
  g.add(mesh(box(w, h * 0.96, d), '#3e3328'));
  const sh = h / slats;
  for (let i = 0; i < slats; i += 1) {
    for (const z of [d / 2, -d / 2]) g.add(mesh(box(w + 1, sh * 0.78, 1.4), color, 0, i * sh + sh * 0.05, z, WOOD));
    for (const x of [w / 2, -w / 2]) g.add(mesh(box(1.4, sh * 0.78, d), new THREE.Color(color).offsetHSL(0, 0, -0.05).getStyle(), x, i * sh + sh * 0.05, 0, WOOD));
  }
  for (const x of [-w / 2 + 2, w / 2 - 2]) g.add(mesh(box(3.2, h, 3.2), new THREE.Color(color).offsetHSL(0, 0, -0.08).getStyle(), x, 0, d / 2, WOOD));
  return g;
}

// Woven basket: faceted bowl with a rim band; optional arched handle.
function basket(rTop, rBot, h, { color = '#b9a585', handle = 0, seg = 8 } = {}) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, true).translate(0, h / 2, 0).scale(1, 1, 0.8), color, 0, 0, 0, { ...STRAW, side: THREE.DoubleSide }));
  g.add(mesh(new THREE.CylinderGeometry(rBot, rBot, 1, seg).translate(0, 0.5, 0).scale(1, 1, 0.8), color));
  g.add(mesh(new THREE.CylinderGeometry(rTop + 1, rTop + 0.6, h * 0.28, seg, 1, true).translate(0, h * 0.86, 0).scale(1, 1, 0.8), new THREE.Color(color).offsetHSL(0, 0, 0.04).getStyle(), 0, 0, 0, { ...STRAW, side: THREE.DoubleSide }));
  g.add(mesh(new THREE.CylinderGeometry(rTop * 0.97, rTop * 0.97, 1, seg).translate(0, h * 0.62, 0).scale(1, 1, 0.8), '#5a4a35'));
  if (handle) g.add(mesh(new THREE.TorusGeometry(rTop * 0.92, 1.3, 4, 12, PI).translate(0, h, 0), '#7a5a35'));
  return g;
}

function fruit(r, color, detail = 1) {
  return mesh(lumpy(r, detail), color);
}

// Leafy greens: flat dark slabs fanning up out of a container.
function greens(n, spread, h, colors = ['#4b564c', '#5c675d', '#3f4a40'], lw = 6.5) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i += 1) {
    const k = n > 1 ? i / (n - 1) - 0.5 : 0;
    const len = h * (0.7 + ((i * 37) % 10) / 30);
    const leaf = mesh(box(lw, len, 2.2), colors[i % colors.length], k * spread, 0, ((i % 2) - 0.5) * 6);
    leaf.rotation.z = -k * 0.9 + (((i * 13) % 5) - 2) * 0.05;
    g.add(leaf);
  }
  return g;
}

// ── shop — striped scalloped awning over a cream corner shop ───────────────
defineModel('shop', (opts, rig) => {
  const { X, Y, S } = grid(111.4);
  const D = 64;
  const front = D / 2;
  rig.body.add(mesh(box(S(8.6), Y(0.4), D), '#ece5d8', 0, 0, 0, PLASTER));
  // flat roof cap behind the awning
  rig.body.add(mesh(box(S(8.8), 3, D + 2), '#d9d1c2', 0, Y(0.4), 0, CONCRETE));
  rig.body.add(mesh(box(S(8.7), Y(8.8), D + 1.5), '#a6b1a4', 0, 0, 0, PAVING));
  // door
  // the base band stands 0.75 proud: the door sits well in front of it
  const door = group(X(3.1), 0, front + 0.7);
  door.add(mesh(box(S(2.6), Y(6.0), 1.6), '#433322', 0, 0, 0, DOOR));
  door.add(inkMesh(new THREE.SphereGeometry(1.4, 8, 6), '#7a3a2a', S(0.9), Y(8.1), 1.4));
  rig.body.add(door);
  // window: cream frame, four dark panes
  rig.body.add(mesh(box(S(2.6), Y(5.85) - Y(8.55), 1.2), '#ded5c4', X(6.9), Y(8.55), front + 0.2, WOOD_FINE));
  for (const [gx, gy] of [[6.3, 7.1], [7.5, 7.1], [6.3, 8.4], [7.5, 8.4]]) {
    rig.body.add(inkMesh(new THREE.PlaneGeometry(S(1.05), 10.5).translate(0, 5.25, 0), '#2e2620', X(gx), Y(gy), front + 1.3));
  }
  // awning: eight stripes from the wall top, sloping out and down
  const n = 8;
  const topY = Y(0.4);
  const botY = Y(3.9);
  const out = 22;
  const stripes = [];
  for (let i = 0; i < n; i += 1) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const xt0 = X(0.8) + (X(9.2) - X(0.8)) * t0;
    const xt1 = X(0.8) + (X(9.2) - X(0.8)) * t1;
    const xb0 = X(0.0) + (X(10) - X(0.0)) * t0;
    const xb1 = X(0.0) + (X(10) - X(0.0)) * t1;
    const geo = new THREE.BufferGeometry();
    const v = [xt0, topY, front - 6, xt1, topY, front - 6, xb1, botY, front + out, xt0, topY, front - 6, xb1, botY, front + out, xb0, botY, front + out];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const color = i % 2 ? '#7f948a' : '#efe9de';
    rig.body.add(mesh(geo, color, 0, 0, 0, { ...FABRIC, side: THREE.DoubleSide }));
    // scallop hanging from the stripe's lower edge
    const sc = group((xb0 + xb1) / 2, botY, front + out);
    sc.add(mesh(new THREE.CircleGeometry((xb1 - xb0) / 2, 8, PI, PI), color, 0, 0, 0, { ...FABRIC, side: THREE.DoubleSide }));
    rig.body.add(sc);
    stripes.push(sc);
  }
  // awning side cheeks
  for (const s of [-1, 1]) {
    const tri = new THREE.BufferGeometry();
    const x = s < 0 ? X(0.0) : X(10);
    const xt = s < 0 ? X(0.8) : X(9.2);
    tri.setAttribute('position', new THREE.Float32BufferAttribute([xt, topY, front - 6, x, botY, front + out, xt, botY, front - 6], 3));
    rig.body.add(mesh(tri, '#d9d1c2', 0, 0, 0, { ...FABRIC, side: THREE.DoubleSide }));
  }
  rig.anims.always = (t, dt, ctx) => {
    stripes.forEach((sc, i) => { sc.rotation.x = -Math.max(0, Math.sin(t * 1.8 + i * 0.7 + ctx.phase)) * 0.25; });
  };
});

// ── stall — canopy on posts, a counter with a basket and a cash register ───
defineModel('stall', (opts, rig) => {
  const { X, Y, S } = grid(100.0);
  const D = 46;
  const wood = '#74634e';
  // canopy
  rig.body.add(mesh(box(S(9.4), Y(0.75) - Y(2.2), D + 8), '#cbbda6', 0, Y(2.2), 0, FABRIC));
  rig.body.add(mesh(box(S(10), 3, D + 12).translate(0, 0, 0), '#ddd2c2', 0, Y(0.75), 0, FABRIC));
  // posts + braces
  for (const gx of [1.2, 8.8]) {
    // posts stand on the ground (the front pair runs down behind the counter)
    for (const z of [D / 2 - 3, -D / 2 + 3]) rig.body.add(mesh(box(S(0.6), Y(2.2), 4), wood, X(gx), 0, z, WOOD));
    const s = gx < 5 ? 1 : -1;
    rig.body.add(mesh(beam(X(gx), Y(3.3), X(gx) + s * S(1.1), Y(2.2), 2.6, 3), wood, 0, 0, D / 2 - 3, WOOD));
  }
  // counter: plank top + stone-block body (the ashlar texture draws the blocks)
  rig.body.add(mesh(box(S(9.2), 5, 30), '#776652', 0, Y(7.3), D / 2 - 15, PLANKS));
  rig.body.add(mesh(box(S(8.2), Y(7.3), 26), '#a5947c', 0, 0, D / 2 - 15, ASHLAR));
  // basket of produce on the counter
  const bk = basket(S(1.3), S(0.95), Y(4.9) - Y(6.85), { handle: 1 });
  bk.position.set(X(3.3), Y(6.85), D / 2 - 14);
  for (const [dx, dy, dz, c] of [[-6, 17, 0, '#d9a669'], [5, 19, -2, '#5f6c5f'], [8, 14, 4, '#8a5e6a'], [-1, 14, 5, '#55665a']]) bk.add(fruit(6, c, 0).translateX(dx).translateY(dy).translateZ(dz));
  rig.body.add(bk);
  // cash register with a drawer that pops out now and then
  const reg = group(X(6.85), Y(6.85), D / 2 - 14);
  reg.add(mesh(box(S(2.7), Y(6.0) - Y(6.85), 18), '#738172', 0, 0, 0, METAL));
  reg.add(mesh(box(S(2.2), Y(5.0) - Y(6.0), 14), '#ddd9c8', 0, Y(6.0) - Y(6.85), -1));
  reg.add(mesh(box(S(0.8), Y(4.2) - Y(5.0), 6), '#e3dfcf', S(0.4), Y(5.0) - Y(6.85), -1));
  reg.add(inkMesh(new THREE.PlaneGeometry(S(0.6), 2.4), '#2a2a26', S(0.4), Y(4.45) - Y(6.85) + 0.5, 2.1));
  for (const [x, y] of [[-6, 13], [-1, 13], [-6, 10], [-1, 10]]) reg.add(inkMesh(new THREE.PlaneGeometry(2.2, 1.6), '#56605a', x, y, 6.1));
  const drawer = mesh(box(S(2.3), 3, 14), '#677566', 0, 1, 2);
  reg.add(drawer);
  rig.body.add(reg);
  rig.anims.always = (t, dt, ctx) => {
    const c = (t + ctx.phase * 2) % 7;
    drawer.position.z = 2 + (c < 1.2 ? Math.sin((c / 1.2) * PI) * 8 : 0);
  };
});

// ── bread ──────────────────────────────────────────────────────────────────
function baguette(len, hw, color = '#c69b63') {
  const g = new THREE.Group();
  g.add(mesh(gem([[0, 0], [hw * 0.85, 2], [hw, len * 0.72], [hw * 0.55, len * 0.93], [0, len]], 6, 0.7), color));
  for (let i = 0; i < 3; i += 1) {
    const cut = mesh(cbox(hw * 1.1, 1.6, 0.8), '#e3c89c', 0, len * (0.3 + i * 0.22), hw * 0.72);
    cut.rotation.z = 0.6;
    g.add(cut);
  }
  return g;
}
function loaf(rx, ry, color = '#c39463') {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(1, 9, 5).scale(rx, ry, rx * 0.7), color));
  const cut = mesh(new THREE.ConeGeometry(rx * 0.25, ry * 0.7, 3).rotateZ(PI), '#ead2a8', 0, ry * 0.55, rx * 0.62);
  cut.scale.z = 0.2;
  g.add(cut);
  return g;
}

// open shelf: two compartments — baguettes upright on top, loaves below
defineModel('breadShelf', (opts, rig) => {
  const { X, Y, S } = grid(90.3);
  const D = 34;
  const fr = '#ad9c86';
  rig.body.add(mesh(box(S(9.4), Y(0.4) - 1, 2), '#3c2b1d', 0, 0, -D / 2 + 1, WOOD_FINE));
  for (const x of [X(0.25), X(9.75)]) rig.body.add(mesh(box(S(0.5), Y(0.3), D), fr, x, 0, 0, WOOD_FINE));
  for (const [gy, h] of [[0.3, 3], [5.0, 4], [10, 4]]) rig.body.add(mesh(box(S(10), h, D), fr, 0, Y(gy) - (gy === 10 ? 0 : h), 0, WOOD_FINE));
  for (const gx of [2.2, 4.6, 7.2]) {
    const b = baguette(Y(0.15) - Y(4.95), S(0.85));
    b.position.set(X(gx), Y(4.95) + 1, 2);
    rig.body.add(b);
  }
  for (const gx of [2.5, 6.0]) {
    const l = loaf(S(1.75), 13);
    l.position.set(X(gx), Y(7.75), 2);
    rig.body.add(l);
  }
});

// crate of loaves with a round loaf and two baguettes leaning on top
defineModel('breadCrate', (opts, rig) => {
  const { X, Y, S } = grid(96.1);
  const D = 34;
  // open-fronted bread box: frame + dark interior
  rig.body.add(mesh(box(S(10) - 1, Y(4.3), D - 2), '#2a1f16', 0, 0, -1));
  for (const [x, y, w, h] of [[0, 0, S(10), Y(9.6)], [0, Y(5.2), S(10), Y(4.3) - Y(5.2)], [X(0.35), 0, S(0.7), Y(4.3)], [X(9.65), 0, S(0.7), Y(4.3)]]) {
    rig.body.add(mesh(box(w, h, 3), '#b2a48b', x, y, D / 2 - 1.5, WOOD_FINE));
  }
  for (const s of [-1, 1]) rig.body.add(mesh(box(2, Y(4.3) - 0.6, D - 3.6), '#a59780', s * (S(5) - 0.6), 0.3, -1.8, WOOD_FINE));
  for (const gx of [3.0, 6.9]) {
    const l = loaf(S(2.0), 14);
    l.position.set(X(gx), Y(7.3), D / 2 - 8);
    rig.body.add(l);
  }
  const top = loaf(S(2.25), 17, '#c9a36e');
  top.position.set(X(2.35), Y(2.9), 0);
  rig.body.add(top);
  for (const [gx, lean] of [[6.3, -0.12], [8.0, -0.35]]) {
    const b = baguette(Y(0.2) - Y(4.6), S(0.8), '#c9a06a');
    b.position.set(X(gx), Y(4.4), 2);
    b.rotation.z = lean;
    rig.body.add(b);
  }
});

// ── produce, baskets, greens ───────────────────────────────────────────────
defineModel('greensCrate', (opts, rig) => {
  const { X, Y, S } = grid(118.2);
  const c = crate(S(10), Y(4.3), 40);
  rig.body.add(c);
  for (const [gx, gy, r, c, z] of [[2.6, 2.9, 2.3, '#a6b5a7', -2], [7.2, 2.5, 2.4, '#6c7b6e', -6]]) {
    const f = fruit(S(r), c);
    f.position.set(X(gx), Y(gy), z);
    f.scale.y = 0.85;
    rig.body.add(f);
  }
});

defineModel('vegBasket', (opts, rig) => {
  const { Y, S } = grid(102.8);
  const g = greens(6, S(6.5), Y(0.2) - Y(5.5), undefined, 13);
  g.position.y = Y(6.0);
  rig.body.add(g);
  rig.body.add(basket(S(4.5), S(3.6), Y(4.8)));
  rig.anims.sway = (t, dt, ctx) => { g.children.forEach((l, i) => { l.rotation.x = Math.sin(t * 1.4 + i + ctx.phase) * 0.04; }); };
});

defineModel('basket', (opts, rig) => {
  const { X, Y, S } = grid(92.5);
  rig.body.add(basket(S(4.7), S(3.6), Y(4.9), { handle: 1 }));
  rig.body.add(fruit(S(1.65), '#efc79a').translateX(X(2.95)).translateY(Y(3.95)).translateZ(4));
  rig.body.add(fruit(S(1.15), '#8a9883').translateX(X(5.7)).translateY(Y(2.4)).translateZ(-4));
  rig.body.add(fruit(S(0.95), '#a5b29d').translateX(X(7.0)).translateY(Y(3.8)).translateZ(2));
  rig.body.add(fruit(S(0.8), '#94a28d').translateX(X(5.3)).translateY(Y(4.9)).translateZ(6));
});

defineModel('produce', (opts, rig) => {
  const { X, Y, S } = grid(99.5);
  const back = crate(S(7.4), Y(2.8) - Y(8.3), 30);
  back.position.set(X(6.0), Y(8.3), -12);
  rig.body.add(mesh(box(S(7.4) - 4, Y(8.3), 26), '#8e7c63', X(6.0), 0, -12, PLANKS)); // stand under it
  rig.body.add(back);
  for (const [gx, c] of [[4.2, '#e1aa72'], [6.2, '#e3ae6c'], [8.15, '#d8996a']]) rig.body.add(fruit(S(1.0), c).translateX(X(gx)).translateY(Y(2.3)).translateZ(-12));
  const leek = greens(4, 16, Y(0.0) - Y(3.0));
  leek.position.set(X(2.0), Y(3.2), -14);
  leek.rotation.z = 0.25;
  rig.body.add(leek);
  const front = crate(S(5.0), Y(6.2), 30);
  front.position.set(X(2.5), 0, 8);
  rig.body.add(front);
  const spikes = new THREE.Group();
  for (let i = 0; i < 7; i += 1) spikes.add(mesh(new THREE.ConeGeometry(4, 10, 3), '#4b5a4c', -18 + i * 6, Y(6.2) + 4, 8 + ((i % 2) - 0.5) * 8));
  rig.body.add(spikes);
  const bk = basket(S(2.4), S(1.8), Y(7.4), { handle: 1 });
  bk.position.set(X(7.45), 0, 18);
  for (const [dx, dy, dz] of [[-8, 33, 0], [3, 35, -2], [8, 30, 5], [-2, 29, 6]]) bk.add(fruit(6.2, '#8f6b72', 0).translateX(dx).translateY(dy).translateZ(dz));
  rig.body.add(bk);
});

defineModel('cabbage', (opts, rig) => { rig.body.add(fruit(48, '#a1afa1').translateY(48)); });
defineModel('cabbage2', (opts, rig) => { const f = fruit(48, '#9cab9c').translateY(48); f.rotation.y = 0.6; rig.body.add(f); });
defineModel('plum', (opts, rig) => {
  rig.body.add(mesh(new THREE.SphereGeometry(1, 8, 4).rotateX(PI / 2).scale(52, 48, 40), '#a8848a', 0, 49, 0));
});

// ── shopping carts — wire baskets on wheels ────────────────────────────────
// side: polygon of the basket's side profile [tl, tr, br, bl] (units), depth
function wireCart(rig, { aspect, basketPts, handle, tray, wheels, wheelR }) {
  const { X, Y } = grid(aspect);
  const P = basketPts.map(([gx, gy]) => [X(gx), Y(gy)]);
  const D = 34;
  const wire = '#6a4a2e';
  const frame = '#a8977c';
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const [tl, tr, br, bl] = P;
  for (const z of [D / 2, -D / 2]) {
    // frame edges
    for (const [a, b] of [[tl, tr], [tr, br], [br, bl], [bl, tl]]) rig.body.add(mesh(beam(a[0], a[1], b[0], b[1], 1.6, 1.6), frame, 0, 0, z));
    // verticals + horizontals
    for (let k = 1; k < 6; k += 1) {
      const a = lerp(tl, tr, k / 6);
      const b = lerp(bl, br, k / 6);
      rig.body.add(mesh(beam(a[0], a[1], b[0], b[1], 1, 1), wire, 0, 0, z));
    }
    for (let k = 1; k < 4; k += 1) {
      const a = lerp(tl, bl, k / 4);
      const b = lerp(tr, br, k / 4);
      rig.body.add(mesh(beam(a[0], a[1], b[0], b[1], 1, 1), wire, 0, 0, z));
    }
  }
  // end panels + bottom: bars along z
  for (const [a, b, n] of [[tl, bl, 4], [tr, br, 4], [bl, br, 6]]) {
    for (let k = 0; k <= n; k += 1) {
      const p = lerp(a, b, k / n);
      rig.body.add(mesh(cbox(1, 1, D), wire, p[0], p[1], 0));
    }
  }
  // handle
  const H = handle.map(([gx, gy]) => [X(gx), Y(gy)]);
  for (let i = 0; i < H.length - 1; i += 1) {
    for (const z of [D / 2, -D / 2]) rig.body.add(mesh(beam(H[i][0], H[i][1], H[i + 1][0], H[i + 1][1], 2, 2), frame, 0, 0, z));
  }
  rig.body.add(mesh(cbox(2.2, 2.2, D + 4), '#5c4128', H[0][0], H[0][1], 0));
  // tray
  rig.body.add(mesh(box(X(tray[1]) - X(tray[0]), 3, D), '#3b2c20', (X(tray[0]) + X(tray[1])) / 2, Y(tray[2]) - 3, 0));
  // struts from the basket's bottom corners down to the tray, so the basket
  // stands on the chassis instead of hovering above it
  for (const c of [bl, br]) {
    for (const z of [D / 2, -D / 2]) rig.body.add(mesh(beam(c[0], c[1], c[0], Y(tray[2]), 1.6, 1.6), frame, 0, 0, z));
  }
  // wheels on short struts
  const ws = [];
  for (const gx of wheels) {
    for (const z of [D / 2 - 2, -D / 2 + 2]) {
      rig.body.add(mesh(box(2, Y(tray[2]) - 3 - (wheelR + 1), 2), frame, X(gx), wheelR + 1, z));
      const w = group(X(gx), wheelR, z);
      w.add(mesh(new THREE.CylinderGeometry(wheelR, wheelR, 3, 10).rotateX(PI / 2), '#4a3a2c'));
      w.add(mesh(new THREE.CylinderGeometry(wheelR * 0.4, wheelR * 0.4, 3.4, 8).rotateX(PI / 2), '#8a7a66'));
      rig.body.add(w);
      ws.push(w);
    }
  }
  rig.parts.wheels = ws;
  rig.parts.wheelRadius = wheelR;
}
defineModel('cart', (opts, rig) => wireCart(rig, {
  aspect: 97.8,
  basketPts: [[1.5, 1.9], [9.6, 2.25], [8.9, 6.15], [2.8, 6.15]],
  handle: [[0.45, 0.1], [1.45, 6.6], [1.9, 7.4]],
  tray: [1.6, 9.4, 7.4],
  wheels: [2.6, 8.6],
  wheelR: 8.5,
}));
defineModel('cart2', (opts, rig) => wireCart(rig, {
  aspect: 87.3,
  basketPts: [[0.3, 2.2], [8.1, 1.6], [7.6, 6.15], [1.2, 6.15]],
  handle: [[9.7, 0.1], [8.6, 6.8], [8.1, 7.3]],
  tray: [0.1, 8.7, 7.3],
  wheels: [1.1, 7.3],
  wheelR: 8,
}));

// ── signs — boards that swing on their hangers ─────────────────────────────
defineModel('signBoard', (opts, rig) => {
  const { X, Y, S } = grid(128.1);
  rig.body.add(mesh(box(S(10), Y(0.0) - Y(1.0), 8), '#8d7c66', 0, Y(1.0), 0, WOOD));
  // two posts carry the beam (it must not hang in thin air)
  for (const s of [-1, 1]) rig.body.add(mesh(box(4, Y(1.0), 4), '#7a6a56', s * (S(5) - 3), 0, -3, WOOD));
  const board = group(0, Y(1.0), 0);
  for (const gx of [3.0, 7.6]) board.add(mesh(box(1.6, Y(1.0) - Y(4.0), 1.6).translate(0, -(Y(1.0) - Y(4.0)), 0), '#2e261d', X(gx), 0, 0));
  board.add(mesh(box(S(8.0), Y(4.0) - Y(10), 4), '#a3917a', 0, Y(10) - Y(1.0), 0, WOOD_FINE));
  board.add(mesh(box(S(6.8), Y(4.6) - Y(9.4), 1), '#6c5b48', 0, Y(9.4) - Y(1.0), 2.2));
  rig.body.add(board);
  rig.anims.swing = (t, dt, ctx) => {
    board.rotation.x = Math.sin(t * 1.3 + ctx.phase) * 0.1;
    board.rotation.z = Math.sin(t * 6.5 + ctx.phase) * 0.004;
  };
});

defineModel('hangingSign', (opts, rig) => {
  const { X, Y, S } = grid(103.5);
  // wall bracket + bar with a hook
  // one continuous L: a post from the ground up, and the arm running out
  // from it (dark end cap where the arm meets the post) — no gaps
  const postW = S(0.5);
  rig.body.add(mesh(box(postW, Y(0.4), 6), '#c0ab90', X(0.25), 0, 0, WOOD));
  rig.body.add(mesh(box(postW + 0.2, 4, 6.4), '#8c7a63', X(0.25), 0, 0)); // foot
  rig.body.add(mesh(box(S(2.0), Y(0.4) - Y(1.2), 6.2), '#4a3722', X(0.0) + S(1.0), Y(1.2), 0));
  rig.body.add(mesh(box(S(8.0) + 0.2, Y(0.4) - Y(1.2), 6), '#a28c74', X(2.0) + S(4.0) - 0.1, Y(1.2), 0, WOOD));
  // the ring the chains hang from, sitting on the arm
  rig.body.add(mesh(new THREE.TorusGeometry(1.6, 0.5, 4, 10), '#231a12', X(5.2), Y(0.4) + 1.2, 0));
  const hookY = Y(0.4) + 0.4;
  const board = group(X(5.2), hookY, 0);
  const bx = (gx) => X(gx) - X(5.2);
  const by = (gy) => Y(gy) - hookY;
  for (const gx of [1.7, 8.0]) board.add(inkMesh(beam(0, 0, bx(gx), by(5.95), 0.9, 0.9), '#231a12'));
  // horizontal boards (the planks texture draws the seams)
  board.add(mesh(box(S(9.4), Y(5.2) - Y(10), 4), '#a3917a', bx(5.0), by(10), 0, { ...PLANKS, texScale: 1.5 }));
  for (const gx of [1.7, 8.0]) board.add(inkMesh(new THREE.CircleGeometry(1.2, 8), '#231a12', bx(gx), by(5.95), 2.2));
  rig.body.add(board);
  rig.anims.swing = (t, dt, ctx) => {
    board.rotation.z = Math.sin(t * 1.4 + ctx.phase) * 0.05;
    board.rotation.x = Math.sin(t * 1.1 + ctx.phase) * 0.06;
  };
});

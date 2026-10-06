import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, fold, beam, box, cbox, group, cheek, blinker, facet, mat, ink, PI,
} from './kit.js';

// Models for the pieces on money.png: the town hall with its clock tower, the
// round vault door, a piggy bank and a cracked one, the big open ledger, a
// stall umbrella over a little cash desk, coin stacks, the safety net with
// its sack, a desk calculator, the debt-brake linkage, a closed umbrella and
// the bear accountant. Measured off a 10 × 10 grid over each sprite (gx
// across, gy down); units are percent of the sprite's height.

const WOOD = { tex: 'wood' };
const WOOD_V = { tex: 'wood', texRotate: true }; // grain up a leg / post
const WOOD_FINE = { tex: 'woodFine' };
const WOOD_FINE_V = { tex: 'woodFine', texRotate: true };
const PLASTER = { tex: 'plaster' };
const ASHLAR = { tex: 'ashlar' };
const GRANITE = { tex: 'granite' };
const CONCRETE = { tex: 'concrete' };
const SHINGLE = { tex: 'shingle' };
const FABRIC = { tex: 'fabric' };
const FUR = { tex: 'fur' };
const METAL = { tex: 'metal' };

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

// Hipped (pyramid) roof: square-based 4-sided cone, base w × d, rise h,
// base at y = 0. One solid — no seams.
function hipRoof(w, h, d) {
  return new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(PI / 4).scale(w, h, d).translate(0, h / 2, 0);
}

// Places decals ON a (faceted) surface: a ray from +z finds the real point
// and normal on `targets`; the decal is lifted along the normal and faces it.
function surfacer(targets, parent) {
  const ray = new THREE.Raycaster();
  for (const m of targets) { m.updateMatrix(); m.matrixWorld.copy(m.matrix); }
  const surf = (x, y, lift = 0.4) => {
    ray.set(new THREE.Vector3(x, y, 500), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObjects(targets, false)[0];
    if (!hit) return { p: new THREE.Vector3(x, y, 0), n: new THREE.Vector3(0, 0, 1) };
    const n = hit.face.normal.clone().normalize();
    return { p: hit.point.clone().addScaledVector(n, lift), n };
  };
  const place = (m, x, y, lift = 0.4) => {
    const { p, n } = surf(x, y, lift);
    m.position.copy(p);
    m.lookAt(p.clone().add(n));
    parent.add(m);
    return m;
  };
  return { surf, place };
}

// A coin slot on top of `shell` at (x, z): a ray from above finds the real
// (faceted) top surface to sink the slot into.
function slotOn(shell, x, z, w, d) {
  shell.updateMatrix();
  shell.matrixWorld.copy(shell.matrix);
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
  const hit = ray.intersectObject(shell, false)[0];
  const y = hit ? hit.point.y : 0;
  // a short dark bar sunk into the dome: its centre stands just proud of the
  // top, its ends (where the dome falls away) stay buried in the shell
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.8, d), ink('#4a3029'));
  m.position.set(x, y - 0.6, z);
  return m;
}

function dot(r, color = '#1b1a17') {
  const e = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), ink(color));
  e.scale.z = 0.45;
  return e;
}

// Window: dark panes in a light frame with a cross, standing on a wall at z.
function window4(cx, cy, w, h, z, frame = '#cfc6ad', glass = '#3f3d33') {
  const g = new THREE.Group();
  g.add(mesh(cbox(w + 2, h + 2, 1.2), frame, cx, cy, z + 0.4));
  g.add(mesh(cbox(w, h, 1.2), glass, cx, cy, z + 0.9));
  g.add(mesh(cbox(1.2, h, 0.8), frame, cx, cy, z + 1.7));
  g.add(mesh(cbox(w, 1.2, 0.8), frame, cx, cy, z + 1.7));
  return g;
}

// ── townHall — clock tower between two hipped wings, flag on top ─────────
defineModel('townHall', (opts, rig) => {
  const { X, Y, S } = grid(83.7);
  const D = 46;
  const front = D / 2;
  const wall = '#b9ab8b';
  const wallDark = '#a39577';
  const roofC = '#5e666e';
  const towerW = S(2.8);
  const tx = X(4.75);
  // the two wings as one long block, hipped roofs over each end
  rig.body.add(mesh(box(S(9.5), Y(5.1), D), wall, 0, 0, 0, PLASTER));
  rig.body.add(mesh(box(S(9.7), 6, D + 2), wallDark, 0, 0, 0, ASHLAR));
  for (const wx of [X(1.9), X(7.85)]) {
    rig.body.add(mesh(hipRoof(S(4.0), Y(3.5) - Y(5.1), D + 8), roofC, wx, Y(5.1), 0, SHINGLE));
  }
  // tower: taller block standing proud of the front, its own hipped roof
  rig.body.add(mesh(box(towerW, Y(2.1), D * 0.7), '#cdc2a6', tx, 0, front - D * 0.35 + 3, PLASTER));
  const tz = front + 3;
  rig.body.add(mesh(hipRoof(towerW + 6, Y(0.9) - Y(2.1), D * 0.7 + 6), roofC, tx, Y(2.1), front - D * 0.35 + 3, SHINGLE));
  // clock: rim + face + two turning hands
  const cy = Y(3.6);
  const clockR = S(0.85);
  rig.body.add(mesh(new THREE.CylinderGeometry(clockR + 1.6, clockR + 1.6, 2, 20).rotateX(PI / 2), '#2f312c', tx, cy, tz + 0.6));
  rig.body.add(mesh(new THREE.CylinderGeometry(clockR, clockR, 2, 20).rotateX(PI / 2), '#efeadb', tx, cy, tz + 1.2));
  const hands = [];
  for (const [len, th] of [[clockR * 0.55, 1.5], [clockR * 0.8, 1.1]]) {
    const h = group(tx, cy, tz + 2.6);
    h.add(new THREE.Mesh(new THREE.BoxGeometry(th, len, 0.5).translate(0, len / 2, 0), ink('#232420')));
    rig.body.add(h);
    hands.push(h);
  }
  rig.body.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), ink('#232420')).translateX(tx).translateY(cy).translateZ(tz + 2.9));
  // door with a little pediment above it
  rig.body.add(mesh(box(S(1.6), Y(8.0), 1.4), '#4a3c27', tx, 0, tz + 0.6, WOOD_FINE_V));
  rig.body.add(mesh(slab([[-S(1.0), 0], [S(1.0), 0], [0, Y(7.2) - Y(8.0)]], 4), '#e2dbc6', tx, Y(8.0) + 1, tz + 0.5, GRANITE));
  rig.body.add(mesh(cbox(S(2.1), 2, 4.5), '#e2dbc6', tx, Y(8.0), tz + 0.5, GRANITE));
  // windows: 2 × 2 per wing, two over the door
  const ww = S(1.35);
  const wh = Y(5.9) - Y(6.9);
  for (const gx of [1.85, 7.95]) {
    for (const gy of [6.4, 8.4]) rig.body.add(window4(X(gx), Y(gy), ww, wh, front));
  }
  rig.body.add(window4(tx, Y(6.4), ww * 0.95, wh, tz));
  // flagpole on the tower roof's apex and a fluttering flag
  const poleTop = Y(0.0) + 2;
  rig.body.add(mesh(box(1.4, poleTop - Y(1.0), 1.4), '#4a4a44', tx, Y(1.0), front - D * 0.35 + 3));
  const flag = group(tx + 0.7, poleTop - 2, front - D * 0.35 + 3);
  const segs = [];
  for (let i = 0; i < 4; i += 1) {
    const sg = group(i === 0 ? 0 : S(0.32), 0, 0);
    sg.add(mesh(box(S(0.32), S(0.45), 0.6).translate(S(0.16), -S(0.45), 0), i % 2 ? '#7fae9e' : '#8fbcab'));
    (i === 0 ? flag : segs[i - 1]).add(sg);
    segs.push(sg);
  }
  rig.body.add(flag);
  rig.anims.always = (t, dt, ctx) => {
    hands[0].rotation.z = -(t / 60) * PI * 2 * 0.2 - 1.0;
    hands[1].rotation.z = -(t / 5) * PI * 2 * 0.2;
    segs.forEach((s, i) => { s.rotation.y = Math.sin(t * 4 - i * 0.9 + ctx.phase) * 0.35; });
  };
  rig.anims.idle = () => {};
});

// ── vault — round door in a steel frame; the wheel spins, the door opens ─
defineModel('vault', (opts, rig) => {
  const R = 44;
  const cy = 50;
  const steel = '#b6af98';
  const steelDark = '#7d775f';
  // frame: a thick block with a round recess (dark inside), on a plinth
  rig.body.add(mesh(box(100, 6, 34), '#8f8a75', 0, 0, -6, CONCRETE));
  const frameShape = new THREE.Shape([[-48, 0], [48, 0], [48, 98], [-48, 98]].map(([x, y]) => new THREE.Vector2(x, y)));
  const hole = new THREE.Path();
  hole.absarc(0, cy, R + 1, 0, PI * 2, false);
  frameShape.holes.push(hole);
  rig.body.add(mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 14, bevelEnabled: false, curveSegments: 24 }).translate(0, 0, -20), steelDark, 0, 0, 0, METAL));
  rig.body.add(new THREE.Mesh(new THREE.CircleGeometry(R + 1, 28), ink('#1f1d17')).translateY(cy).translateZ(-19.5));
  // the door, hinged on the right edge
  const hinge = group(R + 1, cy, -3);
  rig.body.add(hinge);
  const door = group(-(R + 1), 0, 0);
  hinge.add(door);
  door.add(mesh(new THREE.CylinderGeometry(R, R, 9, 28).rotateX(PI / 2), steel, 0, 0, 0, METAL));
  door.add(mesh(new THREE.TorusGeometry(R - 7, 2, 4, 28), '#cdc7b2', 0, 0, 4.8));
  // raised X spokes (folded wedges) and bolts round the rim
  for (let i = 0; i < 4; i += 1) {
    const sp = mesh(cbox(R * 1.45, 6, 2.4), i % 2 ? '#a29b80' : '#c1bba5', 0, 0, 5.4);
    sp.rotation.z = PI / 4 + (i * PI) / 2;
    if (i < 2) door.add(sp);
  }
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * PI * 2;
    door.add(mesh(new THREE.SphereGeometry(2.2, 8, 6).scale(1, 1, 0.6), '#6a644d', Math.cos(a) * (R - 3.5), Math.sin(a) * (R - 3.5), 4.6));
  }
  // the handwheel: hub + spokes, spins about the door's axis
  const wheel = group(0, 0, 7.5);
  door.add(wheel);
  wheel.add(mesh(new THREE.CylinderGeometry(11, 11, 3, 16).rotateX(PI / 2), '#ddd7c3'));
  wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 3.4, 12).rotateX(PI / 2), ink('#2e2b22')));
  for (let i = 0; i < 3; i += 1) {
    const s = mesh(cbox(3, 34, 2), '#ddd7c3', 0, 0, 0.5);
    s.rotation.z = (i * PI) / 3;
    wheel.add(s);
  }
  // hinge blocks on the frame's right side
  rig.body.add(mesh(cbox(16, 46, 12), '#6f6a55', R + 2, cy, -2, METAL));
  rig.body.add(mesh(cbox(8, 22, 14), '#8c8670', R + 2, cy, 0));
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 10;
    wheel.rotation.z = c < 2.2 ? -Math.sin((c / 2.2) * (PI / 2)) * PI * 2 : 0;
    hinge.rotation.y = c > 2.4 && c < 6.4 ? Math.sin(((c - 2.4) / 4) * PI) * 1.15 : 0;
  };
});

// ── piggies ─────────────────────────────────────────────────────────────
// A round paper pig: egg body, legs sunk into the belly, ears from the crown,
// a soft snout disc with nostrils, eyes and cheeks ON the face.
function pig(rig, { pink, pinkDark, snoutC, side = false, cracked = false }) {
  const root = group(0, 0, 0);
  rig.body.add(root);
  const body = group(0, 0, 0);
  root.add(body);
  const rx = side ? 50 : 46;
  const ry = 40;
  const rz = side ? 34 : 38;
  const cy = 50;
  const shell = mesh(new THREE.SphereGeometry(1, 18, 12).scale(rx, ry, rz), pink, 0, cy, 0);
  body.add(shell);
  // legs: four stubby trotters sunk into the belly
  const legX = side ? [-26, 26] : [-21, 21];
  const legZ = side ? [-14, 14] : [-14, 14];
  for (const x of legX) {
    for (const z of legZ) body.add(mesh(new THREE.CylinderGeometry(7, 8, 22, 6).translate(0, 11, 0), pinkDark, x, 0, z));
  }
  // facing: front pig looks at +z; side pig looks at −x (snout at the left)
  const { place, surf } = surfacer([shell], body);
  const eyes = [];
  if (!side) {
    // snout pad: a short, soft cylinder pushed out of the face
    const sn = group(0, cy - 4, 0);
    const { p } = surf(0, cy - 4, -3);
    sn.position.copy(p);
    sn.add(mesh(new THREE.CylinderGeometry(12, 12.5, 10, 14).rotateX(PI / 2), snoutC, 0, 0, 2));
    for (const s of [-1, 1]) sn.add(new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6).scale(1, 1.5, 0.4), ink('#3a2420')).translateX(s * 4.2).translateZ(7.4));
    body.add(sn);
    for (const s of [-1, 1]) {
      eyes.push(place(dot(3.3), s * 17, cy + 10, 0.3));
      place(cheek(8, '#e39f93'), s * 28, cy - 6, 0.35);
    }
    // coin slot on the back ridge: a thin dark plate laid flush on the
    // real (faceted) top of the shell, not a block poking out of it
    body.add(slotOn(shell, 0, 0, 12, 3.2));
    // curly tail on the rump
    const tail = group(0, cy + 4, -rz + 1);
    tail.add(mesh(new THREE.TorusGeometry(4, 1.4, 5, 10, PI * 1.6), pinkDark, 0, 0, -3));
    body.add(tail);
    rig.parts.tail = tail;
  } else {
    // side-on pig (snout towards −x): eyes on both flanks of the head end
    const sn = group(-rx + 2, cy - 2, 0);
    sn.add(mesh(new THREE.CylinderGeometry(12, 12, 14, 14).rotateZ(PI / 2), snoutC, -4, 0, 0));
    for (const s of [-1, 1]) sn.add(new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6).scale(0.4, 1.5, 1), ink('#3a2420')).translateX(-11.2).translateZ(s * 4.2));
    body.add(sn);
    for (const s of [-1, 1]) {
      const e = dot(3.2);
      e.position.set(-30, cy + 10, s * (Math.sqrt(Math.max(0, 1 - (30 / rx) ** 2 - (10 / ry) ** 2)) * rz + 0.3));
      e.lookAt(e.position.clone().add(new THREE.Vector3(-0.3, 0, s)));
      body.add(e);
      eyes.push(e);
      const c = cheek(8, '#e59c95');
      c.position.set(-24, cy - 8, s * (Math.sqrt(Math.max(0, 1 - (24 / rx) ** 2 - (8 / ry) ** 2)) * rz + 0.35));
      c.lookAt(c.position.clone().add(new THREE.Vector3(-0.35, -0.1, s)));
      body.add(c);
    }
    // sad little mouth under the snout, on both flanks
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.5, 4, 10, PI), ink('#3a2420'));
      m.position.set(-38, cy - 15, s * (Math.sqrt(Math.max(0, 1 - (38 / rx) ** 2 - (15 / ry) ** 2)) * rz + 0.35));
      m.lookAt(m.position.clone().add(new THREE.Vector3(-0.4, 0, s)));
      body.add(m);
    }
    body.add(slotOn(shell, 0, 0, 3.2, 12));
    const tail = group(rx - 1, cy + 4, 0);
    tail.add(mesh(new THREE.CylinderGeometry(3, 3, 12, 6).rotateZ(PI / 2), pinkDark, 5, 0, 0));
    body.add(tail);
  }
  // ears from the crown
  const ears = [];
  for (const s of [-1, 1]) {
    const ex = side ? -22 : s * 26;
    const ez = side ? s * 18 : 6;
    const { p } = surf(ex, cy + 30, -2);
    const e = group(ex, side ? cy + ry * 0.82 : p.y, side ? ez : p.z - 6);
    e.add(mesh(new THREE.ConeGeometry(10, 22, 3).translate(0, 9, 0), pinkDark));
    e.rotation.z = side ? 0.35 : -s * 0.35;
    if (side) e.rotation.x = s * 0.2;
    body.add(e);
    ears.push(e);
  }
  // cracks: raised seams on the front flank, and a shard that wobbles
  let shard = null;
  if (cracked) {
    const seam = (pts) => {
      for (let i = 0; i < pts.length - 1; i += 1) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        // short pieces, each lying on the curved shell (no floating dashes)
        const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2.5));
        for (let k = 0; k < n; k += 1) {
          const ax = x1 + ((x2 - x1) * k) / n;
          const ay = y1 + ((y2 - y1) * k) / n;
          const bx = x1 + ((x2 - x1) * (k + 1)) / n;
          const by = y1 + ((y2 - y1) * (k + 1)) / n;
          const zz = (x, y) => Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - ((y - cy) / ry) ** 2)) * rz;
          const m = new THREE.Mesh(beam(ax, ay, bx, by, 1.3, 1.2, 0.3), ink('#6c4e3a'));
          m.position.z = Math.min(zz(ax, ay), zz(bx, by)) + 0.7;
          body.add(m);
        }
      }
    };
    seam([[0, cy + ry - 2], [4, cy + 22], [-2, cy + 6], [6, cy - 10], [2, cy - 24], [8, cy - 34]]);
    seam([[6, cy - 10], [16, cy - 18], [22, cy - 30]]);
    // the shard: a curved flake standing off the flank over a dark gap
    const gx = 22;
    const gy = cy + 12;
    const gz = Math.sqrt(Math.max(0, 1 - (gx / rx) ** 2 - ((gy - cy) / ry) ** 2)) * rz;
    body.add(new THREE.Mesh(new THREE.CircleGeometry(7, 3), ink('#231a12')).translateX(gx).translateY(gy).translateZ(gz + 0.5));
    shard = group(gx - 6, gy - 6, gz + 1.2);
    shard.add(mesh(slab([[0, 0], [14, 4], [8, 18]], 1.6), pink));
    body.add(shard);
  }
  rig.parts = { ...rig.parts, root, body, eyes, ears };
  return { root, body, eyes, ears, shard, cy, ry };
}

defineModel('piggyBank', (opts, rig) => {
  const p = pig(rig, { pink: '#e8c9bf', pinkDark: '#d3a99d', snoutC: '#dcb0a2' });
  const coin = group(0, 0, 0);
  coin.add(mesh(new THREE.CylinderGeometry(7, 7, 2, 12).rotateX(PI / 2), '#cfa94f'));
  p.body.add(coin);
  const blink = blinker(rig.seed + 0.4);
  rig.anims.always = (t, dt, ctx) => {
    const k = blink(t);
    for (const e of p.eyes) e.scale.y = Math.max(0.12, 1 - k);
    rig.parts.tail.rotation.z = t * 5;
    const c = (t + ctx.phase * 2.3) % 5.3;
    p.ears.forEach((e, i) => { e.rotation.x = c < 0.3 ? Math.sin((c / 0.3) * PI) * 0.3 * (i ? 1 : -1) : 0; });
  };
  // a coin drops into the slot, then a happy wiggle
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 6;
    coin.visible = c < 1;
    coin.position.y = p.cy + p.ry + 34 - Math.min(c, 1) * 34;
    const joy = c > 1 && c < 1.9 ? Math.sin(((c - 1) / 0.9) * PI * 3) * (1 - (c - 1) / 0.9) : 0;
    p.body.rotation.z = joy * 0.07;
    p.root.position.y = Math.max(0, joy) * 3;
  };
});

defineModel('crackedPiggy', (opts, rig) => {
  const p = pig(rig, {
    pink: '#ddc3a4', pinkDark: '#c4a682', snoutC: '#cfb08c', side: true, cracked: true,
  });
  const blink = blinker(rig.seed + 1.1);
  rig.anims.always = (t) => {
    const k = blink(t);
    for (const e of p.eyes) e.scale.y = Math.max(0.12, 0.75 - k); // droopy, sad
  };
  rig.anims.idle = (t, dt, ctx) => {
    p.shard.rotation.z = Math.sin(t * 2.2 + ctx.phase) * 0.08;
    p.shard.rotation.y = Math.sin(t * 1.3 + ctx.phase) * 0.12;
    p.body.rotation.z = Math.sin(t * 0.8 + ctx.phase) * 0.015; // a sigh
  };
});

// ── ledger — big open book on a sloped wooden lectern; pages turn ────────
defineModel('ledger', (opts, rig) => {
  const W = 112;
  const Dd = 78;
  const tilt = 1.05; // the book leans back toward us like on a lectern
  rig.body.add(mesh(box(W + 6, 10, 30), '#4d3c22', 0, 0, -4, WOOD_FINE));
  rig.body.add(mesh(slab([[-8, 0], [16, 0], [16, 52]], W - 10).rotateY(PI / 2), '#5b4628', 0, 10, -14, WOOD_FINE));
  // the book lies open with its bottom edge at the front pivot and leans
  // back (pages face the viewer); local z runs from the front edge (0) back
  const book = group(0, 12, 12);
  book.rotation.x = tilt;
  rig.body.add(book);
  for (const sd of [-1, 1]) {
    const half = group(0, 0, 0);
    half.rotation.z = -sd * 0.09;
    half.add(mesh(box(W / 2, 3, Dd), '#6b5332', sd * W / 4, 0, -Dd / 2));
    // page block: stacked sheets, a little narrower each layer
    for (let i = 0; i < 4; i += 1) {
      half.add(mesh(box(W / 2 - 4 - i * 2, 2.6, Dd - 4 - i * 2), i % 2 ? '#d8cfb4' : '#e6dec7', sd * (W / 4 - 1), 3 + i * 2.6, -Dd / 2));
    }
    // ruled lines on the top page
    for (let r = 0; r < 7; r += 1) {
      half.add(new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 22, 0.6, 1.4), ink('#b7ab88')).translateX(sd * (W / 4 - 1)).translateY(13.7).translateZ(-(14 + r * 8)));
    }
    book.add(half);
  }
  // spine roll under the V
  book.add(mesh(new THREE.CylinderGeometry(4, 4, Dd, 8).rotateX(PI / 2), '#4d3c22', 0, -1, -Dd / 2));
  // the turning page
  const page = group(0, 14.6, 0);
  page.add(mesh(box(W / 2 - 8, 0.8, Dd - 8).translate(W / 4 - 2, 0, -Dd / 2), '#efe9d6'));
  book.add(page);
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 4.5;
    const k = c < 1.2 ? c / 1.2 : 1;
    page.rotation.z = k * PI * 0.97;
    page.visible = c < 1.25;
  };
});

// ── umbrellaDesk — cash desk with a register under a stall umbrella ──────
defineModel('umbrellaDesk', (opts, rig) => {
  const { X, Y, S } = grid(69.1);
  const wood = '#9a845f';
  const woodDark = '#6f5d3f';
  const topY = Y(7.85);
  const dw = S(5.2);
  const dd = 26;
  // desk: four legs and a top
  for (const x of [-dw / 2 + 3, dw / 2 - 3]) {
    for (const z of [-dd / 2 + 3, dd / 2 - 3]) rig.body.add(mesh(box(3.6, topY, 3.6), woodDark, x, 0, z, WOOD_V));
  }
  rig.body.add(mesh(box(dw + 2, 3, dd + 2), wood, 0, topY - 3, 0, WOOD_FINE));
  rig.body.add(mesh(box(dw - 4, 6, 3), woodDark, 0, topY - 9, dd / 2 - 2, WOOD_FINE));
  // register: a box with a sloped key deck facing the viewer, on the desk
  const reg = group(0, topY, 4);
  reg.add(mesh(slab([[-9, 0], [9, 0], [9, 9], [-9, 15]], S(4.4)).rotateY(-PI / 2), '#b9a77f'));
  reg.add(mesh(cbox(S(3.6), 4, 2), '#2f3a35', 0, 14.5, -7.6)); // display on the back rise
  rig.body.add(reg);
  const slope = Math.atan2(6, 18);
  const keyRow = group(0, topY, 4);
  rig.body.add(keyRow);
  const keys = [];
  for (let i = 0; i < 6; i += 1) {
    const k = mesh(cbox(S(0.55), 1.6, 4), i === 2 ? '#d7d0b8' : '#efe9d6', -S(1.8) + i * S(0.72), 0, 0);
    const kp = group(0, 10.6, 3);
    kp.rotation.x = slope;
    kp.add(k);
    keyRow.add(kp);
    keys.push(k);
  }
  // umbrella pole stands IN the desk (through the top, foot on a stand below)
  const poleX = 0;
  rig.body.add(mesh(new THREE.CylinderGeometry(4.5, 5.5, 3, 10), woodDark, poleX, 0, -9, WOOD));
  rig.body.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, Y(0.4), 8).translate(0, Y(0.4) / 2, 0), '#3f3527', poleX, 0, -9));
  // canopy: a faceted dome, two-tone panels, hinged at the pole top so it sways
  const canopy = group(poleX, Y(0.9), -9);
  rig.body.add(canopy);
  const panels = 8;
  for (let i = 0; i < panels; i += 1) {
    const g = new THREE.SphereGeometry(1, 2, 4, (i / panels) * PI * 2, (PI * 2) / panels, 0, PI / 2).scale(S(5.1), Y(0.9) - Y(4.0), S(5.1));
    canopy.add(mesh(g, i % 2 ? '#57786a' : '#6f8e80', 0, -(Y(0.9) - Y(4.0)), 0, { side: THREE.DoubleSide, ...FABRIC }));
  }
  canopy.add(mesh(new THREE.ConeGeometry(1.6, 4, 6).translate(0, 2, 0), '#3f3527'));
  rig.anims.idle = (t, dt, ctx) => {
    canopy.rotation.z = Math.sin(t * 0.9 + ctx.phase) * 0.025;
    canopy.rotation.x = Math.sin(t * 0.7 + ctx.phase) * 0.02;
    const c = (t * 3 + ctx.phase) % 6;
    keys.forEach((k, i) => { k.position.y = Math.floor(c) === i ? -1 : 0; });
  };
});

// ── coinStack — three stacks of octagonal gold coins; the top one flips ──
defineModel('coinStack', (opts, rig) => {
  const { X, S } = grid(109.9);
  const r = S(2.1);
  const h = 7.4;
  const gold = ['#c9ad62', '#b89a51'];
  const stacks = [[X(3.85), -10, 11], [X(2.3), 10, 6], [X(7.6), 10, 6]];
  let top = null;
  for (const [x, z, n] of stacks) {
    for (let i = 0; i < n; i += 1) {
      rig.body.add(mesh(new THREE.CylinderGeometry(r, r, h - 0.6, 10).translate(0, h / 2, 0), gold[i % 2], x + Math.sin(i * 2.1 + x) * 0.8, i * h, z));
    }
    if (n === 11) top = group(x, n * h, z);
  }
  top.add(mesh(new THREE.CylinderGeometry(r, r, h - 0.6, 10).translate(0, h / 2, 0), '#d8bb6c'));
  rig.body.add(top);
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 5;
    const k = c < 0.9 ? c / 0.9 : 0;
    top.position.y = 11 * h + Math.sin(k * PI) * 24;
    top.rotation.x = k * PI * 2;
  };
});

// ── safetyNet — a sack resting in a net of cords, rim on top ──────────────
defineModel('safetyNet', (opts, rig) => {
  const rx = 62;
  const ry = 44;
  const rz = 36;
  const cy = 45;
  const root = group(0, 0, 0);
  rig.body.add(root);
  const sway = group(0, 0, 0);
  root.add(sway);
  sway.add(mesh(new THREE.SphereGeometry(1, 16, 12).scale(rx, ry, rz), '#bda57d', 0, cy, 0, FABRIC));
  // tied neck of the sack poking out of the top
  // the sack's gathered, tied neck: a squashed knot with a folded flap
  sway.add(mesh(new THREE.SphereGeometry(1, 10, 8).scale(10, 6, 8), '#cbb68f', -18, cy + ry - 3, 0, FABRIC));
  const flap = mesh(slab([[0, 0], [16, 4], [6, 14]], 2), '#d6c39c', -24, cy + ry + 1, 2, FABRIC);
  flap.rotation.z = 0.5;
  sway.add(flap);
  // cords: two families of slanted rings wrapping the sack just outside it
  const cordMat = mat('#6e583a');
  for (let i = 0; i < 6; i += 1) {
    for (const s of [-1, 1]) {
      const g = new THREE.TorusGeometry(1, 0.026, 3, 40).rotateX(PI / 2).rotateZ(s * 0.75).rotateY((i / 6) * PI);
      g.scale(rx * 1.04, ry * 1.04, rz * 1.06);
      const m = new THREE.Mesh(facet(g, 0.02), cordMat);
      m.position.y = cy;
      sway.add(m);
    }
  }
  // the rim cord round the top of the net
  const rim = new THREE.TorusGeometry(1, 0.03, 3, 40).rotateX(PI / 2).scale(rx * 0.86, 1, rz * 0.9);
  sway.add(new THREE.Mesh(facet(rim, 0.02), cordMat).translateY(cy + ry * 0.55));
  rig.anims.idle = (t, dt, ctx) => {
    sway.rotation.z = Math.sin(t * 0.8 + ctx.phase) * 0.02;
    sway.rotation.x = Math.sin(t * 0.6 + ctx.phase) * 0.015;
  };
});

// ── calculator — desk calculator on a little back stand; keys press ──────
defineModel('calculator', (opts, rig) => {
  const { X, Y, S } = grid(95.5);
  const W = S(9.8);
  const H = 96;
  const T = 9;
  const lean = 0.22;
  const body = group(0, 0, 2);
  body.rotation.x = -lean;
  rig.body.add(body);
  // stand (a wedge behind it) so it really stands
  rig.body.add(mesh(slab([[2, 0], [26, 0], [17, 64]], W * 0.6).rotateY(PI / 2), '#4e6d61', 0, 0, -1));
  body.add(mesh(box(W, H, T), '#5f8172', 0, 0, 0));
  // display: a dark recessed panel inside a raised frame
  body.add(mesh(cbox(S(7.6), Y(0.9) - Y(2.3), 2), '#4b6a5e', 0, (Y(0.9) + Y(2.3)) / 2, T / 2 + 0.6));
  body.add(mesh(cbox(S(7.0), Y(1.1) - Y(2.1), 1.4), '#2f4740', 0, (Y(0.9) + Y(2.3)) / 2, T / 2 + 1.4));
  // keys: 5 columns × 4 rows (the yellow "=" spans two rows)
  const cols = [1.2, 2.85, 4.5, 6.15, 7.8];
  const rows = [3.7, 5.0, 6.3, 7.6];
  const color = (c, r) => {
    if (r === 0 && c >= 3) return '#86a85e';
    if (c === 3) return '#8c9fb5';
    if (c === 4 && r === 1) return '#c25e7a';
    return '#ece5cc';
  };
  const keys = [];
  rows.forEach((gy, r) => cols.forEach((gx, c) => {
    if (c === 4 && r === 3) return;
    const tall = c === 4 && r === 2;
    const h = tall ? (Y(6.3) - Y(8.6)) : (Y(gy) - Y(gy + 1.0));
    const k = mesh(cbox(S(1.2), h, 3), tall ? '#d9c06a' : color(c, r), X(gx + 0.6), tall ? Y(6.3) - h / 2 : Y(gy) - h / 2, T / 2 + 1.5);
    body.add(k);
    keys.push(k);
  }));
  rig.anims.idle = (t, dt, ctx) => {
    const c = Math.floor((t * 2.5 + ctx.phase) % 24);
    keys.forEach((k, i) => { k.position.z = T / 2 + 1.5 - (i === c ? 1.2 : 0); });
  };
});

// ── brakeLever — the debt brake: an X linkage, two wooden pads, a lever ──
defineModel('brakeLever', (opts, rig) => {
  const { X, Y, S } = grid(117.1);
  const D = 24; // chunky steel bars — a solid machine from the side, not a card
  const BASE = 3;
  const hub = { x: X(5.45), y: Y(4.7) - 3 };
  const wheelC = { x: X(8.8), y: 11 + BASE };
  const green = '#5e7365';
  const greenDark = '#455648';
  const woodC = '#8c6f4a';
  // a steel base plate on the ground ties the bottom pad and the wheel
  // together, so the linkage stands as one machine
  rig.body.add(mesh(box(wheelC.x + 13 - (X(2.0) - S(2.0) - 2), BASE, D + 16), '#4c5c50', (wheelC.x + 13 + X(2.0) - S(2.0) - 2) / 2, 0, 0, METAL));
  // bottom pad rests on the base; its arm runs up to the hub
  rig.body.add(mesh(box(S(4.0), Y(7.9) - Y(9.5), D + 10), woodC, X(2.0), BASE - 0.5, 0, WOOD));
  rig.body.add(mesh(beam(X(2.6), Y(7.9) - Y(9.5) - 2, hub.x, hub.y, 6, D), green, 0, 0, 0, METAL));
  // top pad + its arm swing about the hub (they clamp down)
  const jaw = group(hub.x, hub.y, 0);
  rig.body.add(jaw);
  jaw.add(mesh(cbox(S(4.0), Y(0) - Y(1.7), D + 10), woodC, X(2.0) - hub.x, (Y(0) + Y(1.7)) / 2 - 4 - hub.y, 0, WOOD));
  jaw.add(mesh(beam(X(2.6) - hub.x, Y(1.4) - 4 - hub.y, 0, 0, 6, D), greenDark, 0, 0, 0, METAL));
  // hub disc
  rig.body.add(mesh(new THREE.CylinderGeometry(S(0.8), S(0.8), D + 4, 10).rotateX(PI / 2), '#647a6c', hub.x, hub.y, 0));
  rig.body.add(new THREE.Mesh(new THREE.CylinderGeometry(S(0.3), S(0.3), D + 4.6, 8).rotateX(PI / 2), ink('#1c201c')).translateX(hub.x).translateY(hub.y));
  // the wheel on the ground at the right, and the lever post that pivots on it
  rig.body.add(mesh(new THREE.CylinderGeometry(11, 11, D + 2, 12).rotateX(PI / 2), '#5a6f60', wheelC.x, wheelC.y, 0)); // rests on the base
  rig.body.add(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, D + 2.6, 8).rotateX(PI / 2), ink('#1c201c')).translateX(wheelC.x).translateY(wheelC.y));
  const lever = group(wheelC.x, wheelC.y, -D / 2 - 3);
  rig.body.add(lever);
  const postTop = Y(0.4) - wheelC.y;
  lever.add(mesh(box(6, postTop, 6), greenDark, 0, 0, 0, METAL));
  lever.add(mesh(cbox(8, 7, 8), '#3a463c', 0, postTop, 0));
  // link from the hub up to the lever's top
  const link = mesh(beam(0, 0, wheelC.x - hub.x, postTop + wheelC.y - hub.y - 4, 5, 6), green, hub.x, hub.y, -D / 2 - 3, METAL);
  rig.body.add(link);
  rig.anims.idle = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 5;
    const k = c < 1 ? Math.sin((c / 1) * (PI / 2)) : c < 3 ? 1 : c < 3.6 ? 1 - (c - 3) / 0.6 : 0;
    jaw.rotation.z = -k * 0.12;
    lever.rotation.z = k * 0.12;
    link.rotation.z = k * 0.05;
  };
});

// ── umbrellaClosed — a furled umbrella standing on its tip ─────────────────
defineModel('umbrellaClosed', (opts, rig) => {
  const { S } = grid(29.5);
  const rod = '#4e3a24';
  rig.body.add(mesh(new THREE.CylinderGeometry(1.4, 0.8, 16, 6), rod, 0, 0, 0).translateY(8));
  rig.body.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 86, 6).translate(0, 43, 0), rod, 0, 8, 0));
  // furled canopy: an 8-folded cone, wide at the hem (bottom), narrow on top
  const g = facet(new THREE.CylinderGeometry(4, S(4.6), 64, 8, 1, true).translate(0, 32, 0), 0.03);
  const col = g.attributes.color;
  for (let tri = 0; tri < col.count / 3; tri += 1) {
    const k = Math.floor(tri / 2) % 2 ? 0.86 : 1;
    for (let j = 0; j < 3; j += 1) col.setXYZ(tri * 3 + j, k, k, k);
  }
  const canopy = new THREE.Mesh(g, mat('#6d8a74', { side: THREE.DoubleSide, ...FABRIC }));
  canopy.position.y = 16;
  rig.body.add(canopy);
  // scalloped hem points + a strap round the middle
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * PI * 2 + PI / 8;
    const p = mesh(new THREE.ConeGeometry(2, 5, 3).rotateX(PI), '#5f7c66', Math.sin(a) * S(4.6), 14, Math.cos(a) * S(4.6));
    rig.body.add(p);
  }
  rig.body.add(mesh(new THREE.CylinderGeometry(S(2.5), S(2.5), 3, 8), '#4a6150', 0, 54, 0, FABRIC));
  // hook handle on top
  rig.body.add(mesh(new THREE.TorusGeometry(5, 1.5, 5, 10, PI), rod, -5, 94, 0));
  rig.body.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 6, 6).translate(0, -3, 0), rod, -10, 94, 0));
  rig.anims.idle = (t, dt, ctx) => {
    rig.body.parent.rotation.z = Math.sin(t * 0.9 + ctx.phase) * 0.01;
  };
});

// ── accountantBear — round-headed bear in a suit, with glasses ─────────────
defineModel('accountantBear', (opts, rig) => {
  const { X, Y, S } = grid(86.4);
  const fur = '#7d6a52';
  const furDark = '#5f513e';
  const suit = '#4d6558';
  const root = group(0, 0, 0);
  rig.body.add(root);
  // legs + feet sunk into the hem
  for (const s of [-1, 1]) root.add(mesh(new THREE.SphereGeometry(1, 10, 8).scale(S(0.55), 7, 9).translate(0, 5, 3), furDark, s * S(1.15), 0, 0, FUR));
  for (const s of [-1, 1]) root.add(mesh(box(S(0.9), 12, 10), furDark, s * S(1.15), 0, 0, FUR));
  // suit body: folded jacket, white shirt V, dark tie
  const torso = group(0, 0, 0);
  root.add(torso);
  const bodyBot = Y(9.2);
  const bodyTop = Y(5.9);
  const bodyGeo = fold([[-S(3.7), bodyBot], [S(3.7), bodyBot], [S(3.0), bodyTop], [-S(3.0), bodyTop]], 30, 3.5);
  torso.add(mesh(bodyGeo, suit, 0, 0, 0, FABRIC));
  const bz = bodyGeo.userData.zAt;
  torso.add(mesh(slab([[-S(0.8), bodyTop - 1], [S(0.8), bodyTop - 1], [0, bodyTop - 13]], 1), '#ece6d6', 0, 0, bz(0) + 0.7));
  torso.add(mesh(slab([[-1.6, bodyTop - 3], [1.6, bodyTop - 3], [2.2, bodyTop - 14], [0, bodyTop - 17], [-2.2, bodyTop - 14]], 1), '#2b3530', 0, 0, bz(0) + 1.4));
  // arms on shoulder pivots, out and down; paws in fur
  const arms = [-1, 1].map((s) => {
    const sh = group(s * S(3.2), bodyTop - 6, 2);
    sh.add(mesh(new THREE.CapsuleGeometry(4.2, 12, 3, 6).translate(0, -9, 0), suit, 0, 0, 0, FABRIC));
    sh.add(mesh(new THREE.SphereGeometry(5, 8, 6), fur, 0, -17, 0, FUR));
    sh.rotation.z = s * 0.55;
    torso.add(sh);
    return sh;
  });
  // head: a big round head sitting on the collar
  const head = group(0, bodyTop - 2, 2);
  root.add(head);
  const R = { x: S(3.4), y: 31, z: S(3.4) * 0.84 };
  const hy0 = R.y - 2;
  const headM = mesh(new THREE.SphereGeometry(1, 16, 12).scale(R.x, R.y, R.z), fur, 0, hy0, 0, FUR);
  head.add(headM);
  const { place } = surfacer([headM], head);
  // soft muzzle with nose button and a little smile
  const mz = new THREE.Mesh(facet(new THREE.SphereGeometry(1, 12, 8).scale(10, 8, 6)), mat('#cbb38c'));
  place(mz, 0, hy0 - 10, -2.2);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(3.6, 2.6, 1.8), ink('#1b1a17'));
  place(nose, 0, hy0 - 6.8, 3.8);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.45, 4, 10, PI), ink('#1b1a17'));
  place(smile, 0, hy0 - 12, 3.4);
  smile.rotateZ(PI);
  // eyes, cheeks, and round glasses (thin rings ON the face, a bridge)
  const eyeList = [];
  for (const s of [-1, 1]) {
    eyeList.push(place(dot(2.3), s * 11, hy0 + 1, 0.4));
    place(cheek(7.5, '#e3a49c'), s * 20, hy0 - 6, 0.45);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.8, 5, 18), ink('#1d1c19'));
    place(ring, s * 11, hy0 + 1, 1.8);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(8, 0.9, 0.9), ink('#1d1c19'));
  place(bridge, 0, hy0 + 2.5, 2.2);
  // ears: round, on pivots, sunk into the crown
  const ears = [-1, 1].map((s) => {
    const e = group(s * R.x * 0.72, hy0 + R.y * 0.72, -3);
    e.add(mesh(new THREE.CylinderGeometry(S(0.95), S(0.95), 8, 14).rotateX(PI / 2), furDark, 0, 0, 0, FUR));
    e.add(new THREE.Mesh(new THREE.CircleGeometry(S(0.5), 12), ink('#3e3428')).translateZ(4.3));
    head.add(e);
    return e;
  });
  const blink = blinker(rig.seed + 2.2);
  rig.anims.always = (t, dt, ctx) => {
    const k = blink(t);
    for (const e of eyeList) e.scale.y = Math.max(0.12, 1 - k);
    ears.forEach((e, i) => {
      const c = (t + ctx.phase + i * 2.1) % 5.4;
      e.rotation.z = c < 0.3 ? Math.sin((c / 0.3) * PI) * 0.3 * (i ? -1 : 1) : 0;
    });
  };
  // idle: breathes, tilts his head, taps an imaginary calculator, now and
  // then waves
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2 + ctx.phase);
    torso.scale.set(1 + b * 0.01, 1 + b * 0.015, 1);
    head.rotation.z = Math.sin(t * 0.6 + ctx.phase) * 0.06;
    head.rotation.y = Math.sin(t * 0.3 + ctx.phase) * 0.15;
    const c = (t + ctx.phase * 2) % 8;
    const wave = c < 2 ? Math.sin((c / 2) * PI) : 0;
    const [l, r] = arms;
    l.rotation.z = -0.55 + (c > 3 && c < 6 ? Math.abs(Math.sin(t * 10)) * 0.15 : 0);
    l.rotation.x = c > 3 && c < 6 ? -0.5 : 0;
    r.rotation.z = 0.55 + wave * 1.9;
    r.rotation.x = Math.sin(t * 12) * wave * 0.2;
  };
});

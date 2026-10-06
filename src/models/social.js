import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, fold, beam, box, cbox, group, cheek, blinker, facet, mat, ink, PI,
} from './kit.js';

// Models for the pieces on social.png: the seniors' home with its ramp, a
// walking cane and a crutch, grandma and grandpa badger on a bench, the bunny
// nurse, a wheelchair, the bear family with their pram, a little lamb with a
// balloon, and a stair-lift. Units are percent of the sprite's height; x is
// centered, y up from the ground, z toward the viewer.

const WOOD = { tex: 'wood' };
const WOOD_V = { tex: 'wood', texRotate: true }; // grain up a post / leg
const WOOD_FINE = { tex: 'woodFine' };
const WOOD_FINE_V = { tex: 'woodFine', texRotate: true };
const BOARDS = { tex: 'boards' };
const PLASTER = { tex: 'plaster' };
const ROUGHCAST = { tex: 'roughcast' };
const PAVING = { tex: 'paving' };
const SHINGLE = { tex: 'shingle' };
const FABRIC = { tex: 'fabric' };
const FUR = { tex: 'fur' };
const WOOL = { tex: 'wool' };
const METAL = { tex: 'metal' };

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

// A rounded limb (capsule) running from point a to point b.
function limb(a, b, r, color, opts) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = mesh(new THREE.CapsuleGeometry(r, Math.max(len - r * 2, 0.1), 3, 7), color, 0, 0, 0, opts);
  m.position.copy(A).lerp(B, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

// Spoked wheel, axle along local z.
function spokedWheel(r, w, color, hub = color, spokes = 4) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(r - w * 0.35, w * 0.45, 5, 18), color));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w * 1.4, 10).rotateX(PI / 2), hub));
  for (let i = 0; i < spokes; i += 1) {
    const s = mesh(cbox(1.6, r * 1.8, 1.4), color);
    s.rotation.z = (i / spokes) * PI;
    g.add(s);
  }
  return g;
}

// ── heads ──────────────────────────────────────────────────────────────────
// A cute head: an ellipsoid (optionally two-tone, split top/bottom or
// left/right without overlapping shells) with eyes, cheeks, nose, mouth and
// an optional soft muzzle, all placed ON the real faceted surface by a ray.
// Returns { group, eyes, ears, surf, place }.
function cuteHead(o) {
  const head = new THREE.Group();
  const R = o.R;
  const parts = [];
  const T = o.tex === undefined ? FUR : o.tex; // head surface texture
  if (o.cap) {
    // cap color over the top, face color below: two bands of ONE ellipsoid
    const k = o.cap.split; // fraction of π from the top
    parts.push(mesh(new THREE.SphereGeometry(1, 16, 12, 0, PI * 2, 0, PI * k).scale(R.x, R.y, R.z), o.cap.color, 0, 0, 0, o.cap.tex ?? T));
    parts.push(mesh(new THREE.SphereGeometry(1, 16, 12, 0, PI * 2, PI * k, PI * (1 - k)).scale(R.x, R.y, R.z), o.color, 0, 0, 0, T));
  } else {
    parts.push(mesh((o.geo ? o.geo(R) : new THREE.SphereGeometry(1, 16, 12)).scale(R.x, R.y, R.z), o.color, 0, 0, 0, T));
  }
  for (const m of parts) { head.add(m); m.updateMatrix(); m.matrixWorld.copy(m.matrix); }
  const ray = new THREE.Raycaster();
  const surf = (dx, dy, lift = 0.4) => {
    ray.set(new THREE.Vector3(dx, dy, 500), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObjects(parts, false)[0];
    if (hit && hit.face) {
      const n = hit.face.normal.clone().normalize();
      return { p: hit.point.clone().addScaledVector(n, lift), n };
    }
    const k = 1 - (dx / R.x) ** 2 - (dy / R.y) ** 2;
    const dz = R.z * Math.sqrt(Math.max(k, 0.02));
    const n = new THREE.Vector3(dx / R.x ** 2, dy / R.y ** 2, dz / R.z ** 2).normalize();
    return { p: new THREE.Vector3(dx, dy, dz).addScaledVector(n, lift), n };
  };
  const place = (m, dx, dy, lift) => {
    const { p, n } = surf(dx, dy, lift);
    m.position.copy(p);
    m.lookAt(p.clone().add(n));
    head.add(m);
    return m;
  };
  if (o.mask) o.mask({ head, place, surf, R });
  const eyesL = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(o.eye[2], 10, 8), ink('#1b1a17'));
    e.scale.z = 0.45;
    place(e, s * o.eye[0], o.eye[1], 0.3);
    eyesL.push(e);
    place(cheek(o.cheek[0], o.cheekColor ?? '#df9c98'), s * o.cheek[1], o.cheek[2], 0.5);
  }
  let noseLift = 0.8;
  if (o.muzzle) {
    const [mx, my, dy, color, depth = 4.5] = o.muzzle;
    const mz = new THREE.Mesh(facet(new THREE.SphereGeometry(1, 12, 8).scale(mx, my, depth)), mat(color));
    place(mz, 0, dy, -depth * 0.35);
    noseLift = depth * 0.7;
  }
  const [nr, ndy] = o.nose;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(nr, nr * 0.75, 1.6), ink('#1b1a17'));
  place(nose, 0, ndy, noseLift);
  if (o.mouth !== false) {
    const smile = new THREE.Mesh(new THREE.TorusGeometry(nr * 0.9, 0.45, 4, 12, PI), ink('#1b1a17'));
    place(smile, 0, ndy - nr * 1.5, noseLift - 0.6);
    smile.rotateZ(PI);
  }
  const ears = o.ears ? o.ears({ head, surf, R }) : [];
  return { group: head, eyes: eyesL, ears, surf, place };
}

// ear builders — each returns pivots with userData.rest / flick
const roundEars = (color, inner, r, dx, dy) => ({ head, surf }) => [-1, 1].map((s) => {
  const { p } = surf(s * dx, dy, -r * 0.5);
  const e = group(p.x, p.y, p.z - 1);
  e.add(mesh(new THREE.CylinderGeometry(r, r, 5, 14).rotateX(PI / 2), color, 0, 0, 0, FUR));
  if (inner) e.add(mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 1, 12).rotateX(PI / 2), inner, 0, 0, 2.7));
  e.userData.rest = 0;
  e.userData.flick = 0.25;
  head.add(e);
  return e;
});
const pointyEars = (color, inner, w, h, dx, dy) => ({ head, surf }) => [-1, 1].map((s) => {
  const { p } = surf(s * dx, dy, -3);
  const e = group(p.x, p.y, p.z - 1);
  e.add(mesh(fold([[-w / 2, 0], [w / 2, 0], [s * w * 0.15, h]], 5, 1.4), color, 0, 0, 0, FUR));
  if (inner) e.add(mesh(fold([[-w * 0.25, 1.5], [w * 0.25, 1.5], [s * w * 0.1, h * 0.7]], 1, 0.8), inner, 0, 0, 3.2));
  e.userData.rest = s * -0.2;
  head.add(e);
  return e;
});
const longEars = (color, inner, len, dx, dy) => ({ head, surf }) => [-1, 1].map((s) => {
  const { p } = surf(s * dx, dy, -4);
  const e = group(p.x, p.y, p.z - 2);
  e.add(mesh(new THREE.CapsuleGeometry(5.2, len, 3, 7).scale(1, 1, 0.45).translate(0, len / 2 + 3, 0), color, 0, 0, 0, FUR));
  e.add(mesh(new THREE.CapsuleGeometry(2.6, len * 0.8, 3, 6).scale(1, 1, 0.3).translate(0, len / 2 + 3, 2.2), inner));
  e.userData.rest = s * -0.22;
  e.userData.flick = 0.35;
  head.add(e);
  return e;
});
const flapEars = (color, len, dx, dy) => ({ head, surf }) => [-1, 1].map((s) => {
  const { p } = surf(s * dx, dy, -3);
  const e = group(p.x, p.y, p.z - 1);
  const leaf = mesh(new THREE.SphereGeometry(1, 10, 6).scale(len, len * 0.42, 2.6), color, s * len * 0.8, -2, 0, FUR);
  leaf.rotation.z = s * -0.35;
  e.add(leaf);
  e.userData.rest = 0;
  e.userData.flick = 0.35;
  head.add(e);
  return e;
});

// Folded trapezoid body (two-toned halves by the scene light).
function bodyFold(wBot, wTop, y0, y1, d, color, ridge = 3) {
  return fold([[-wBot / 2, y0], [wBot / 2, y0], [wTop / 2, y1], [-wTop / 2, y1]], d, ridge);
}

// Shared "alive" behaviour: blinking + ear flicks for a list of heads.
function aliveTick(heads, seed) {
  const blinks = heads.map((h, i) => blinker(seed + i * 1.7));
  return (t, dt, ctx) => {
    heads.forEach((h, i) => {
      const k = blinks[i](t);
      for (const e of h.eyes) e.scale.y = Math.max(0.12, 1 - k);
      h.ears.forEach((e, j) => {
        const c = (t + ctx.phase + i * 1.3 + j * 2.3) % 5.3;
        const f = c < 0.3 ? Math.sin((c / 0.3) * PI) : 0;
        e.rotation.z = e.userData.rest + f * (e.userData.flick ?? 0.3) * (j ? -1 : 1);
      });
    });
  };
}

// ── seniorHome — one-storey home, porch roof, flower boxes, a ramp ─────────
defineModel('seniorHome', (opts, rig) => {
  const W = 104;
  const D = 64;
  const wallH = 46;
  const front = D / 2;
  const wall = '#ebe8de';
  const trim = '#6f5e45';
  // walls + front gable, roof as one continuous solid
  rig.body.add(mesh(box(W, wallH, D), wall, 0, 0, 0, PLASTER));
  rig.body.add(mesh(slab([[-W / 2, wallH], [W / 2, wallH], [0, wallH + 32]], D), wall, 0, 0, 0, PLASTER));
  rig.body.add(mesh(roofSolid(0, wallH + 36, W / 2 + 9, wallH - 4, 5, D + 10), '#6a5e48', 0, 0, 0, SHINGLE));
  rig.body.add(mesh(box(W + 2, 3, D + 2), '#cfc8b8', 0, 0, 0, ROUGHCAST)); // plinth
  // door on a low step, under a porch roof on two posts
  rig.body.add(mesh(box(30, 3, 12), '#b9ae9a', 0, 0, front + 6, PAVING));
  const dz = front + 0.6;
  rig.body.add(mesh(cbox(23, 30, 1.4), '#8b8272', -5.8, 3 + 15, dz, WOOD_FINE_V));
  rig.body.add(mesh(cbox(11, 30, 1.4), '#6d6555', 5.8, 3 + 15, dz + 0.1, WOOD_FINE_V));
  for (const s of [-1, 1]) rig.body.add(mesh(new THREE.SphereGeometry(1.1, 8, 6), '#ece9e0', s * 2.2, 20, dz + 1.2));
  for (const s of [-1, 1]) rig.body.add(mesh(box(3, 36, 3), trim, s * 17, 3, front + 9, WOOD_V));
  rig.body.add(mesh(cbox(42, 4, 15), trim, 0, 41, front + 6.5, WOOD)); // porch roof, resting on posts + wall
  // windows: pairs of tall panes
  for (const cx of [-34, 34]) {
    for (const s of [-1, 1]) {
      rig.body.add(mesh(cbox(8, 15, 1.4), '#8b8070', cx + s * 5.2, 29, front + 0.5));
    }
    rig.body.add(mesh(cbox(21, 2, 3), '#d8d1c2', cx, 20.5, front + 1.2)); // sill
  }
  // flower boxes on the ground under the windows, with blossoms
  const flowers = [];
  for (const cx of [-34, 34]) {
    rig.body.add(mesh(box(26, 9, 7), '#7a5f3f', cx, 0, front + 4.5, BOARDS));
    rig.body.add(mesh(box(24.5, 2.5, 5.5), '#7d8f4a', cx, 9, front + 4.5));
    [-8, 0, 8].forEach((dx, i) => {
      const f = group(cx + dx, 11.5, front + 4.5);
      f.add(mesh(cbox(0.9, 3, 0.9), '#5f6f3a', 0, 0, 0));
      f.add(mesh(new THREE.IcosahedronGeometry(3.1, 0), i === 1 ? '#c98e8e' : '#d9a77a', 0, 3.2, 0));
      rig.body.add(f);
      flowers.push(f);
    });
  }
  // the ramp: a wedge on the ground, rising from the path up to the step
  const ramp = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(34, 0), new THREE.Vector2(34, 3), new THREE.Vector2(0, 0.6)]);
  const rampGeo = new THREE.ExtrudeGeometry(ramp, { depth: 26, bevelEnabled: false }).translate(0, 0, -13).rotateY(PI / 2);
  rig.body.add(mesh(rampGeo, '#b5a890', 0, 0, front + 46, PAVING));
  rig.anims.always = (t, dt, ctx) => {
    flowers.forEach((f, i) => { f.rotation.z = Math.sin(t * 1.6 + i + ctx.phase) * 0.08; });
  };
});

// ── cane & crutch ─────────────────────────────────────────────────────────
defineModel('cane', (opts, rig) => {
  const wood = '#7a6249';
  rig.body.add(mesh(box(7, 92, 7), wood, 0, 0, 0, WOOD_V));
  rig.body.add(mesh(box(8.4, 6, 8.4), '#4a3b2b')); // rubber tip
  rig.body.add(mesh(new THREE.CapsuleGeometry(3.6, 26, 3, 6).rotateZ(PI / 2), wood, 0, 94, 0, WOOD)); // handle
});

defineModel('crutch', (opts, rig) => {
  const tube = '#c9b89a';
  rig.body.add(mesh(box(5, 52, 5), '#7a6249', 0, 0, 0, WOOD_V));
  rig.body.add(mesh(box(6.5, 5, 6.5), '#4a3b2b'));
  for (const s of [-1, 1]) rig.body.add(mesh(beam(0, 50, s * 9, 95, 3.4, 3.4), tube, 0, 0, 0, METAL));
  rig.body.add(mesh(cbox(28, 4, 6), '#7a6249', 0, 97, 0, WOOD_FINE)); // armrest
  rig.body.add(mesh(cbox(20, 3, 3.6), '#7a6249', 0, 70, 0, WOOD_FINE)); // hand grip
});

// ── wheelchair — big rear wheels, front casters, seat facing +x ────────────
defineModel('wheelchair', (opts, rig) => {
  const frame = '#c9b89a';
  const wood = '#554428';
  const seat = '#a2b2a8';
  const zW = 19;
  const R = 26;
  for (const s of [-1, 1]) {
    const w = spokedWheel(R, 5, wood, '#7a6249');
    w.position.set(-16, R, s * zW);
    rig.body.add(w);
    const c = spokedWheel(8, 4, wood, '#7a6249', 0);
    c.position.set(30, 8, s * (zW - 4));
    rig.body.add(c);
    rig.body.add(mesh(box(2.4, 34, 2.4), frame, 30, 8, s * (zW - 4), METAL)); // caster fork
    // side frame: seat rail, backrest post, push handle, armrest
    rig.body.add(mesh(beam(-16, R, 32, 40, 2.6, 2.6), frame, 0, 0, s * (zW - 5), METAL));
    rig.body.add(mesh(beam(-20, 40, -24, 92, 2.6, 2.6), frame, 0, 0, s * (zW - 5), METAL));
    rig.body.add(mesh(beam(-24, 92, -36, 92, 2.6, 2.6, 1), wood, 0, 0, s * (zW - 5), WOOD_FINE));
    rig.body.add(mesh(cbox(30, 3, 4), wood, 4, 60, s * (zW - 5), WOOD_FINE));
    rig.body.add(mesh(box(2.4, 18, 2.4), frame, 16, 42, s * (zW - 5), METAL));
  }
  // seat + backrest (sage), footrest
  rig.body.add(mesh(cbox(40, 5, (zW - 5) * 2), seat, 6, 43, 0, FABRIC));
  const back = mesh(cbox(4, 40, (zW - 5) * 2), seat, -21, 63, 0, FABRIC);
  back.rotation.z = 0.08;
  rig.body.add(back);
  rig.body.add(mesh(beam(32, 40, 40, 14, 2.4, 2.4), frame, 0, 0, 0, METAL));
  rig.body.add(mesh(cbox(12, 2, 18), frame, 42, 13, 0, METAL));
});

// ── stairLift — a staircase climbing away from the viewer, cream side walls,
// a rail along the left wall and a chair that rides it up and down ─────────
defineModel('stairLift', (opts, rig) => {
  const cream = '#e2d9c5';
  const steps = 8;
  const run = 8;
  const rise = 10;
  const SW = 40; // stair width (x)
  const zF = 26; // front edge of the first step
  const zAt = (i) => zF - run * i; // front edge of step i
  for (let i = 0; i < steps; i += 1) {
    rig.body.add(mesh(box(SW, rise * (i + 1), run), i % 2 ? '#7f9187' : '#90a199', 0, 0, zAt(i) - run / 2));
    rig.body.add(mesh(box(SW, 1.6, 2.2), cream, 0, rise * (i + 1) - 0.2, zAt(i) - 1)); // nosing
  }
  const top = steps * rise;
  const zB = zAt(steps);
  // side walls: one solid each, top edge following the stair line
  const wallShape = (pts) => slab(pts, 5).rotateY(-PI / 2); // shape x → world z
  const wallPts = [[zF + 2, 0], [zF + 2, 16], [zB - 4, top + 14], [zB - 4, 0]];
  for (const s2 of [-1, 1]) rig.body.add(mesh(wallShape(wallPts), s2 < 0 ? cream : '#d6ccb6', s2 * (SW / 2 + 2.5), 0, 0, PLASTER));
  // top landing with a guard rail
  rig.body.add(mesh(box(SW + 10, top + 2, 10), '#d6ccb6', 0, 0, zB - 5, PLASTER));
  rig.body.add(mesh(box(3, 16, 3), '#c9b89a', SW / 2 - 4, top + 2, zB - 5));
  rig.body.add(mesh(cbox(28, 3, 3), '#c9b89a', SW / 2 - 16, top + 18, zB - 5));
  // the rail on the inside of the left wall, following the stairs
  const railX = -SW / 2 + 3;
  const r0 = { z: zF - 2, y: 20 };
  const r1 = { z: zB + 4, y: top + 16 };
  const len = Math.hypot(r1.z - r0.z, r1.y - r0.y);
  const rail = mesh(new THREE.BoxGeometry(3, 3, len + 4), '#c9b89a', railX, (r0.y + r1.y) / 2, (r0.z + r1.z) / 2);
  rail.rotation.x = Math.atan2(r1.y - r0.y, r0.z - r1.z);
  rig.body.add(rail);
  // carriage + chair, facing the viewer (downhill), sideways off the rail
  const chair = new THREE.Group();
  chair.add(mesh(cbox(7, 9, 9), '#9a8f7c', 0, 0, 0)); // carriage clamped on the rail
  chair.add(mesh(cbox(8, 4, 4), '#9a8f7c', 5, -4, 0)); // arm to the seat
  chair.add(mesh(cbox(18, 4, 16), '#7f9187', 13, -4, 2, FABRIC)); // seat
  chair.add(mesh(cbox(18, 18, 3.5), '#7f9187', 13, 7, -6, FABRIC)); // backrest
  for (const s2 of [-1, 1]) chair.add(mesh(cbox(3, 3, 13), cream, 13 + s2 * 9, 3, 2)); // armrests
  for (const s2 of [-1, 1]) chair.add(mesh(cbox(2.4, 7, 2.4), cream, 13 + s2 * 9, -1, 7)); // armrest posts
  chair.add(mesh(cbox(14, 2, 8), cream, 13, -18, 10)); // footplate
  chair.add(mesh(cbox(2, 14, 2), cream, 13, -11, 7));
  rig.body.add(chair);
  const at = (k) => {
    const z = r0.z - 6 + (r1.z - r0.z + 14) * k;
    const y = r0.y + ((z - r0.z) / (r1.z - r0.z)) * (r1.y - r0.y);
    chair.position.set(railX, y + 1, z);
  };
  at(0);
  rig.anims.idle = (t, dt, ctx) => {
    // ride up, rest at the top, ride down, rest at the bottom
    const c = ((t + ctx.phase * 2) % 16) / 16;
    const k = c < 0.35 ? c / 0.35 : c < 0.5 ? 1 : c < 0.85 ? 1 - (c - 0.5) / 0.35 : 0;
    at(0.5 - Math.cos(k * PI) / 2);
  };
});

// ── standing characters (nurse, lamb, the bear family) ────────────────────
// legs, a folded body (+ apron), arms on shoulder pivots, the head on top.
function standing(parent, o) {
  const root = group(o.x ?? 0, 0, o.z ?? 0);
  parent.add(root);
  for (const s of [-1, 1]) {
    root.add(mesh(box(o.legW, o.legH + 3, o.legW), o.legColor, s * o.legGap, 0, 0, o.legTex ?? FABRIC));
    if (o.shoe) root.add(mesh(box(o.legW + 1.4, 3, o.legW + 2.4), o.shoe, s * o.legGap, 0, 1));
  }
  const y0 = o.legH;
  const y1 = y0 + o.bodyH;
  const bodyGeo = bodyFold(o.wBot, o.wTop, y0, y1, o.bodyD, o.bodyColor);
  const torso = group(0, 0, 0, mesh(bodyGeo, o.bodyColor, 0, 0, 0, o.bodyTex ?? FABRIC));
  root.add(torso);
  const bz = bodyGeo.userData.zAt;
  if (o.apron) {
    const a = o.apron;
    const ag = bodyFold(a.wBot, a.wTop, y0 + 1.5, y1 - a.below, 1.2, a.color, 0);
    // lay the apron on the folded front: shift each vertex onto the surface
    const p = ag.attributes.position;
    for (let i = 0; i < p.count; i += 1) p.setZ(i, p.getZ(i) + bz(p.getX(i)) + 0.5);
    ag.computeVertexNormals();
    torso.add(mesh(ag, a.color, 0, 0, 0, FABRIC));
    if (a.bib) torso.add(mesh(cbox(a.bib[0], a.bib[1], 1.2), a.color, 0, y1 - a.below + a.bib[1] / 2 - 1, bz(0) + 1.1, FABRIC));
  }
  const arms = [-1, 1].map((s) => {
    const sh = group(s * o.wTop * 0.46, y1 - 4, 0);
    sh.add(mesh(new THREE.CapsuleGeometry(o.armR, o.armLen - o.armR * 2, 3, 6).translate(0, -o.armLen / 2 + o.armR, 0), o.armColor, 0, 0, 0, o.armTex ?? FABRIC));
    sh.rotation.z = s * (o.armOut ?? 0.8);
    sh.userData.side = s;
    torso.add(sh);
    return sh;
  });
  const h = cuteHead(o.head);
  const hR = o.head.R;
  h.group.position.set(0, y1 + hR.y - (o.sink ?? 5), 1);
  const headPivot = group(0, 0, 0, h.group);
  root.add(headPivot);
  return { root, torso, arms, head: h, headGroup: h.group, y1 };
}

// ── bunnyNurse — long-eared bunny in a white apron, waving ─────────────────
defineModel('bunnyNurse', (opts, rig) => {
  const c = standing(rig.body, {
    legW: 7, legH: 12, legGap: 6, legColor: '#7d6a4c', legTex: FUR,
    wBot: 46, wTop: 26, bodyH: 36, bodyD: 22, bodyColor: '#736245',
    apron: { wBot: 36, wTop: 22, below: 5, color: '#ebe8e0', bib: [16, 10] },
    armR: 4, armLen: 26, armColor: '#9e8b6c', armTex: FUR, armOut: 0.75,
    head: {
      R: { x: 25, y: 22, z: 19 }, color: '#ab9a7c',
      eye: [6, 2.5, 1.6], cheek: [6.2, 15, -5], nose: [2.4, -2.5],
      ears: longEars('#a08d6f', '#5e4c33', 26, 9, 15),
    },
  });
  const tail = mesh(new THREE.IcosahedronGeometry(4.5, 1), '#efe6da', 0, 22, -12, FUR);
  c.torso.add(tail);
  rig.anims.always = aliveTick([c.head], rig.seed);
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2 + ctx.phase);
    c.torso.scale.set(1 + b * 0.01, 1 + b * 0.015, 1);
    c.headGroup.rotation.z = Math.sin(t * 0.7 + ctx.phase) * 0.07;
    // the long ears flop gently as she moves
    c.head.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 2.4 + ctx.phase + i) * 0.12; });
    const w = (t + ctx.phase * 2) % 6.5;
    const k = w < 2 ? Math.sin((w / 2) * PI) : 0;
    c.arms[1].rotation.z = 0.75 + k * 1.9;
    c.arms[1].rotation.x = Math.sin(t * 13) * k * 0.25;
  };
});

// ── lambBalloon — a little lamb holding a balloon on a string ──────────────
defineModel('lambBalloon', (opts, rig) => {
  const c = standing(rig.body, {
    legW: 6, legH: 12, legGap: 5, legColor: '#e7e0cf', legTex: WOOL, shoe: '#372918',
    wBot: 32, wTop: 20, bodyH: 26, bodyD: 18, bodyColor: '#8b9d91',
    armR: 3.4, armLen: 18, armColor: '#e7e0cf', armTex: WOOL, armOut: 0.7,
    head: {
      R: { x: 17, y: 16, z: 14 }, color: '#e7e0cf',
      eye: [4.6, 1.5, 1.2], cheek: [3.4, 9.5, -3.5], nose: [1.5, -2.6],
      muzzle: [6, 4.5, -3.2, '#ecdcc2', 3.5],
      mask: ({ head, R }) => {
        // a fluffy wool cap over the crown (part of the head, not a hat)
        head.add(mesh(new THREE.SphereGeometry(1, 14, 8, 0, PI * 2, 0, PI * 0.32).scale(R.x * 1.06, R.y * 1.06, R.z * 1.06), '#f1ebdf', 0, 0, 0, WOOL));
      },
      ears: flapEars('#d9c9a8', 9, 14, 5),
    },
  });
  // right hand holds the string
  const right = c.arms[1];
  right.rotation.z = 1.25;
  const hand = new THREE.Vector3();
  const balloon = group(0, 0, 0);
  balloon.add(mesh(new THREE.IcosahedronGeometry(13, 1).scale(1, 1.12, 1), '#b2c1b8'));
  balloon.add(mesh(new THREE.ConeGeometry(2.4, 3.2, 6), '#9fb0a7', 0, -15.5, 0));
  rig.body.add(balloon);
  const string = mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 4), '#3c3a35');
  rig.body.add(string);
  const tip = new THREE.Object3D();
  tip.position.set(0, -15, 0);
  right.add(tip);
  const STR = 34;
  rig.anims.always = aliveTick([c.head], rig.seed);
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2 + ctx.phase);
    c.torso.scale.set(1 + b * 0.01, 1 + b * 0.015, 1);
    c.headGroup.rotation.z = Math.sin(t * 0.8 + ctx.phase) * 0.08;
    right.rotation.z = 1.25 + Math.sin(t * 1.3 + ctx.phase) * 0.06;
    // the balloon floats above the hand on its string and sways
    rig.body.updateMatrixWorld(true);
    tip.getWorldPosition(hand);
    rig.body.worldToLocal(hand);
    const sway = Math.sin(t * 1.1 + ctx.phase) * 0.28;
    const bob = Math.sin(t * 1.9 + ctx.phase) * 1.5;
    const end = new THREE.Vector3(hand.x + Math.sin(sway) * STR, hand.y + Math.cos(sway) * STR + bob, hand.z + Math.sin(t * 0.7) * 3);
    balloon.position.set(end.x, end.y + 15.5, end.z);
    balloon.rotation.z = -sway * 0.6;
    string.position.copy(hand).lerp(end, 0.5);
    string.scale.y = hand.distanceTo(end);
    string.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(hand).normalize());
  };
  rig.anims.idle(0, 0, { phase: 0 });
});

// ── bearFamily — mother bear holding hands with a bear pushing a pram ──────
defineModel('bearFamily', (opts, rig) => {
  const mom = standing(rig.body, {
    x: -36, legW: 8, legH: 10, legGap: 7, legColor: '#3f3428',
    wBot: 48, wTop: 30, bodyH: 36, bodyD: 24, bodyColor: '#8fa69c',
    apron: { wBot: 40, wTop: 26, below: 4, color: '#ebe9e3' },
    armR: 4.2, armLen: 24, armColor: '#8fa69c', armOut: 0.7,
    head: {
      R: { x: 27, y: 24, z: 21 }, color: '#c6b496',
      cap: { split: 0.33, color: '#7c624a' },
      eye: [7, 2, 1.6], cheek: [7, 17, -6], nose: [2.6, -4],
      ears: roundEars('#5e4733', '#4a3726', 8, 18, 18),
    },
  });
  const dad = standing(rig.body, {
    x: 22, legW: 9, legH: 12, legGap: 8, legColor: '#5a4636',
    wBot: 46, wTop: 32, bodyH: 34, bodyD: 26, bodyColor: '#a48e72', bodyTex: FUR,
    armR: 4.6, armLen: 26, armColor: '#a48e72', armTex: FUR, armOut: 0.6,
    head: {
      R: { x: 29, y: 26, z: 22 }, color: '#b09c80',
      eye: [8, 3, 1.6], cheek: [7.5, 19, -6], nose: [3.6, -5],
      muzzle: [10, 8, -5, '#d8c9b0', 5],
      ears: roundEars('#8f7a60', '#6c5843', 8.5, 20, 19),
    },
  });
  // holding hands: mom's right arm and the bear's left arm meet at one point
  const meetY = 38;
  const meet = [-6, meetY, 8];
  mom.arms[1].visible = false;
  dad.arms[0].visible = false;
  rig.body.add(limb([-36 + 13.5, mom.y1 - 4, 2], meet, 4.2, '#8fa69c', FABRIC));
  rig.body.add(limb([22 - 14.5, dad.y1 - 4, 2], meet, 4.6, '#a48e72', FUR));
  rig.body.add(mesh(new THREE.SphereGeometry(4.6, 10, 8), '#c6b496', meet[0], meet[1], meet[2], FUR)); // clasped hands
  // the pram in front of the bear, its handle in his right paw
  const pram = group(22, 0, 40);
  rig.body.add(pram);
  // The pram is pushed toward the viewer (+z): the wheels roll along z, so
  // their axles run along x — a front and a rear axle across the pram.
  const wheels = [];
  for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    const w = spokedWheel(5.5, 3, '#2c2620', '#7a6249', 0);
    w.rotation.y = PI / 2; // axle along x
    w.position.set(x, 5.5, z);
    pram.add(w);
    wheels.push(w);
  }
  // axles across, side rails along the direction of travel, springs up to the basket
  for (const z of [-12, 12]) pram.add(mesh(cbox(24, 1.6, 1.6), '#e2d9c5', 0, 5.5, z));
  for (const x of [-10, 10]) pram.add(mesh(cbox(1.8, 1.8, 26), '#e2d9c5', x, 7, 0));
  // C-springs: from the side rails up and inward, ending a little INSIDE the
  // basket's bottom (y 18.5), so the basket visibly rests on them
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) pram.add(limb([x * 10, 7, z * 9], [x * 7, 19.5, z * 5], 0.9, '#e2d9c5'));
  }
  // cradle bars under the basket tie the four springs together
  for (const z of [-5, 5]) pram.add(mesh(cbox(15, 1.4, 1.4), '#e2d9c5', 0, 19.3, z));
  const basket = group(0, 21, 0);
  basket.add(mesh(new THREE.CylinderGeometry(15, 11, 13, 8, 1).scale(1.15, 1, 0.85).translate(0, 4, 0), '#819386', 0, 0, 0, FABRIC));
  basket.add(mesh(new THREE.TorusGeometry(15.5, 1.3, 4, 10).rotateX(PI / 2).scale(1.15, 1, 0.85), '#e2d9c5', 0, 10.5, 0));
  pram.add(basket);
  // push handle rising back to the bear's paw
  // push handle: two bars rising from the basket's back edge toward the bear
  for (const s2 of [-1, 1]) pram.add(limb([s2 * 9, 22, -9], [s2 * 9, 38, -20], 1.1, '#e2d9c5'));
  pram.add(mesh(cbox(21, 2.6, 2.6), '#e2d9c5', 0, 38, -20));
  // his right paw on the handle grip
  dad.arms[1].visible = false;
  rig.body.add(limb([22 + 14.5, dad.y1 - 4, 4], [22 + 7, 38, 20], 4.6, '#a48e72', FUR));
  rig.body.add(mesh(new THREE.SphereGeometry(4.4, 9, 7), '#8f7a60', 22 + 7, 38, 20, FUR));
  rig.anims.always = aliveTick([mom.head, dad.head], rig.seed);
  rig.anims.idle = (t, dt, ctx) => {
    const b = Math.sin(t * 2 + ctx.phase);
    for (const c of [mom, dad]) c.torso.scale.set(1 + b * 0.01, 1 + b * 0.015, 1);
    mom.headGroup.rotation.z = Math.sin(t * 0.6 + ctx.phase) * 0.07;
    dad.headGroup.rotation.z = Math.sin(t * 0.6 + ctx.phase + 2) * 0.06;
    mom.head.group.rotation.y = 0.15 + Math.sin(t * 0.3) * 0.1; // she looks at him
    // the pram rocks gently back and forth — wheels turn with it
    const rock = Math.sin(t * 1.8 + ctx.phase);
    basket.rotation.x = rock * 0.07;
    pram.position.z = 40 + rock * 1.2;
    for (const w of wheels) w.rotation.x = -(rock * 1.2) / 5.5;
  };
});

// ── grandparentsBench — grandma and grandpa badger on a wooden bench ───────
defineModel('grandparentsBench', (opts, rig) => {
  const wood = '#7c674a';
  const woodLight = '#8d7756';
  const W = 160;
  const seatY = 30;
  const seatD = 30;
  // bench: legs, seat planks, back posts + slats
  for (const x of [-62, 62]) {
    rig.body.add(mesh(box(7, seatY, 6), wood, x, 0, seatD / 2 - 4, WOOD_V));
    rig.body.add(mesh(box(7, seatY, 6), wood, x, 0, -seatD / 2 + 4, WOOD_V));
    rig.body.add(mesh(beam(x, seatY, x - 0.1, 80, 6, 5), wood, 0, 0, -seatD / 2 + 2, WOOD_V));
  }
  for (let i = 0; i < 3; i += 1) rig.body.add(mesh(box(W, 3.6, seatD / 3 - 0.8), i % 2 ? woodLight : wood, 0, seatY, -seatD / 2 + seatD / 6 + (i * seatD) / 3, WOOD));
  for (const y of [48, 60, 72]) rig.body.add(mesh(cbox(W - 4, 7, 3), woodLight, 0, y, -seatD / 2 + 1, WOOD));
  rig.body.add(mesh(cbox(W + 8, 4, seatD + 6), wood, 0, seatY - 1, 0, WOOD)); // seat frame edge
  const top = seatY + 3.6;

  // a seated body: hips on the seat, thighs forward, shins down to the floor
  function seated(o) {
    const root = group(o.x, 0, 0);
    rig.body.add(root);
    const torso = group(0, top, -2);
    root.add(torso);
    torso.add(mesh(bodyFold(o.wBot, o.wTop, 0, o.bodyH, o.bodyD, o.bodyColor), o.bodyColor, 0, 0, 0, FABRIC));
    for (const s of [-1, 1]) {
      const kx = s * o.legGap;
      // thigh along the seat, knee at the front edge, shin down to the ground
      root.add(mesh(cbox(o.legW + 2, o.legW, seatD * 0.6), o.thighColor, kx, top + o.legW / 2, seatD / 2 - seatD * 0.3, FABRIC));
      root.add(mesh(box(o.legW, top + o.legW * 0.6, o.legW), o.legColor, kx, 0, seatD / 2 + 1, FABRIC));
      root.add(mesh(box(o.legW + 1.5, 3, o.legW + 3), o.shoe, kx, 0, seatD / 2 + 2.2));
    }
    const head = cuteHead(o.head);
    head.group.position.set(0, top + o.bodyH + o.head.R.y - 6, 0);
    root.add(head.group);
    return { root, torso, head };
  }
  const gma = seated({
    x: -36, wBot: 40, wTop: 34, bodyH: 30, bodyD: 24, bodyColor: '#b1aca9',
    legGap: 7, legW: 8, thighColor: '#546252', legColor: '#7c7965', shoe: '#3c3328',
    head: {
      R: { x: 25, y: 24, z: 20 }, color: '#c5b59c',
      eye: [7.5, 4, 1.5], cheek: [6, 16, -5], nose: [3.2, -7], mouth: false,
      muzzle: [10, 7.5, -7, '#ece2d2', 5],
      ears: pointyEars('#c5b59c', '#8d7a62', 14, 16, 15, 17),
    },
  });
  // grandma's green skirt over her lap, and her hands folded on it
  gma.root.add(mesh(cbox(30, 9, seatD * 0.62), '#546252', 0, top + 4.6, seatD / 2 - seatD * 0.31, FABRIC));
  // the skirt drapes over her knees, down toward the shins
  gma.root.add(mesh(cbox(31, 15, 3), '#546252', 0, top - 2, seatD / 2 + 4.6, FABRIC));
  // arms down the sides of the cardigan, hands folded in her lap
  const pat = group(0, top + 11, seatD / 2 - 2);
  for (const s2 of [-1, 1]) pat.add(mesh(new THREE.SphereGeometry(4.8, 9, 7), '#c5b59c', s2 * 5, 0, 0, FUR));
  gma.root.add(pat);
  for (const s2 of [-1, 1]) gma.root.add(limb([s2 * 19.5, top + 26, 0], [s2 * 6.5, top + 11.5, seatD / 2 - 2.5], 4.4, '#b1aca9', FABRIC));

  const gpa = seated({
    x: 38, wBot: 50, wTop: 36, bodyH: 32, bodyD: 28, bodyColor: '#8b7c66',
    legGap: 9, legW: 9, thighColor: '#8b7c66', legColor: '#4a3c2c', shoe: '#2c241b',
    head: {
      R: { x: 25, y: 23, z: 21 }, color: '#796b54',
      eye: [8.5, 3, 1.5], cheek: [6, 15.5, -6], nose: [3.8, -8], mouth: false,
      mask: ({ place }) => {
        // the badger's white stripe: overlapping soft discs from brow to nose
        for (let i = 0; i < 7; i += 1) {
          const d = new THREE.Mesh(facet(new THREE.CircleGeometry(1, 14).scale(4.6 - i * 0.25, 4.2, 1), 0.01), mat('#e6e0d1', { side: THREE.DoubleSide }));
          place(d, 0, 20 - i * 4, 0.35 + i * 0.01);
        }
      },
      ears: roundEars('#4e4234', '#2f281f', 6.5, 17, 18),
    },
  });
  for (const s2 of [-1, 1]) {
    // arms down his round sides, paws resting on his knees
    gpa.root.add(limb([s2 * 25, top + 27, 0], [s2 * 13, top + 9, seatD / 2 - 3], 5, '#8b7c66', FABRIC));
    gpa.root.add(mesh(new THREE.SphereGeometry(5, 9, 7), '#6f604c', s2 * 13, top + 9, seatD / 2 - 3, FUR));
  }

  rig.anims.always = aliveTick([gma.head, gpa.head], rig.seed);
  rig.anims.idle = (t, dt, ctx) => {
    // grandma pats her knee and tilts her head
    gma.head.group.rotation.z = Math.sin(t * 0.6 + ctx.phase) * 0.08;
    pat.position.y = top + 11 + Math.max(0, Math.sin(t * 5 + ctx.phase)) * 2.5 * ((t + ctx.phase) % 6 < 2.5 ? 1 : 0);
    // grandpa slowly nods off… and jerks awake
    const c = (t + ctx.phase * 2) % 9;
    const nod = c < 6 ? Math.min(1, c / 6) ** 2 : Math.max(0, 1 - (c - 6) / 0.25);
    gpa.head.group.rotation.x = nod * 0.32;
    gpa.head.group.position.y = top + 32 + 23 - 6 - nod * 3;
  };
});

import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, fold, box, cbox, disc, ball, group, face, blinker, PI,
} from './kit.js';

// Models for the pieces on visual.png (meadow & village).
// Coordinates come off a 10 × 10 grid laid over each sprite: G(gx, gy)
// converts grid cells to sprite-percent units (x centered, y up).

const grid = (w) => ({
  X: (gx) => (gx / 10 - 0.5) * w,
  Y: (gy) => 100 - gy * 10,
  P: (pts) => pts.map(([gx, gy]) => [(gx / 10 - 0.5) * w, 100 - gy * 10]),
});

// ── wolf ────────────────────────────────────────────────────────────────
// The origami wolf: folded cream body with gray front legs, a big folded
// face with gray cap, a pointed gray snout, triangle ears, a two-tone tail.
// Rig: body ▸ head (ears, eyes) · legs ×4 · tail. Exposes rig.pose for the
// hero (walk / sit / hop / look) and idle anims (breathe, wag, ear flick).

const WOLF = {
  cream: '#f1ebe3', creamShade: '#ddd2c4', gray: '#b9bab4', grayDark: '#8f918a',
  earInner: '#5d5242', leg: '#a3a6a0', tailGray: '#8d8e84', tailTip: '#d9cfbf',
  cheek: '#d29a9b', ink: '#1d1b18',
};

defineModel('wolf', (opts, rig) => {
  const { X, Y, P } = grid(67.8);
  const C = WOLF;
  const lerp = (a0, a1, k) => a0 + (a1 - a0) * k;

  // ── an articulated quadruped with two postures, blended by `gait`:
  //   0 = SITTING, the printed pose: upright chest, front legs straight,
  //       haunches down behind, hind legs folded under, tail wrapped round
  //       the left flank;
  //   1 = STANDING / TROTTING: the hindquarters rise behind the chest into a
  //       level back, the hind legs unfold and stand, the chest lifts onto
  //       the front legs, the tail streams out behind.
  const root = group(0, 0, 0);
  rig.body.add(root);

  // chest (front body + front legs + head), pivot at its bottom-center
  const chest = group(0, 0, 0);
  root.add(chest);
  const chestW = X(8.0) - X(2.9);
  const chestH = Y(5.6);
  const chestGeo = fold([[-chestW / 2, 0], [chestW / 2, 0], [chestW / 2, chestH], [-chestW / 2, chestH]], 24, 3.5);
  const chestMesh = mesh(chestGeo, C.cream, 0, 0, 0);
  chest.add(chestMesh);
  const frontZ = chestGeo.userData.zAt;

  // front legs: pivots at the hip of each gray stripe
  const LEG = Y(7.3); // leg length (ground → stripe top)
  const legs = [];
  // (the chest is centered on x = 0; the sheet's wolf on gx 5.45)
  for (const [g0, g1] of [[3.6, 4.4], [6.5, 7.3]]) {
    const cx = (X(g0) + X(g1)) / 2 - X(5.45);
    const leg = group(cx, LEG, frontZ(cx) - 2.5);
    leg.add(mesh(box(X(g1) - X(g0), LEG, 6).translate(0, -LEG, 0), C.leg));
    root.add(leg);
    legs.push(leg);
  }

  // hindquarters: pivot at the rump's front-bottom
  const rump = group(0, 0, 0);
  root.add(rump);
  rump.add(mesh(cbox(chestW * 0.86, 24, 30).translate(0, 12, -15), C.creamShade));
  const hind = [];
  for (const s of [-1, 1]) {
    const h = group(s * chestW * 0.3, 2, -24);
    h.add(mesh(box(7, LEG, 7).translate(0, -LEG, 0), C.leg));
    rump.add(h);
    hind.push(h);
  }

  // tail — grows from the rump's back
  const tail = group(0, 0, 0);
  tail.rotation.order = 'YXZ';
  {
    const along = (g, from) => g.translate(0, from + g.parameters.height / 2, 0).rotateX(-PI / 2);
    const base = along(new THREE.CylinderGeometry(6.4, 4.2, 26, 4), 0);
    const tip = along(new THREE.ConeGeometry(6.4, 19, 4), 26);
    const tb = mesh(base, C.tailGray);
    const tt = mesh(tip, C.tailTip);
    for (const m of [tb, tt]) { m.scale.set(0.75, 1, 1); tail.add(m); }
  }
  rump.add(tail);

  // places every part for a posture blend k (0 sit … 1 stand) + stride
  function posture(k, stride = 0, swing = 0) {
    const sw = Math.sin(stride) * swing;
    // chest rises onto the legs and gets shallower (a long body, not a box)
    chest.position.set(0, lerp(0, LEG - 3, k), lerp(0, 8, k));
    chest.scale.set(1, lerp(1, 0.62, k), 1);
    for (const [i, l] of legs.entries()) {
      l.position.y = lerp(LEG, LEG + 0.5, k);
      l.position.z = lerp(frontZ(l.position.x) - 2.5, 10, k);
      l.rotation.x = (i ? -sw : sw) * 0.6;
    }
    // rump: sitting it squats behind the chest; standing it is the level back
    rump.position.set(0, lerp(0, LEG - 1, k), lerp(-1, -2, k));
    rump.rotation.x = lerp(0.12, 0, k);
    hind[0].rotation.x = lerp(-PI / 2, 0, k) - sw * 0.55 * k;
    hind[1].rotation.x = lerp(-PI / 2, 0, k) + sw * 0.55 * k;
    for (const h of hind) h.position.y = lerp(4, 2, k);
    // tail root: low on the left haunch (sit) → middle of the rump's back
    tail.position.set(lerp(-11, 0, k), lerp(5, 18, k), lerp(-18, -30, k));
    // head: on top of the chest, a bit forward when trotting
    head.position.set(0, lerp(neckY, LEG - 3 + chestH * 0.62 + 2, k), lerp(2, 12, k));
  }

  // head — pivot at the neck
  const neckY = Y(5.9);
  const head = group(X(5.45), neckY, 2);
  root.add(head);
  const hx = (gx) => X(gx) - X(5.45);
  const hy = (gy) => Y(gy) - neckY;
  const HP = (pts) => pts.map(([gx, gy]) => [hx(gx), hy(gy)]);

  // ONE folded head — the gray of the forehead is painted ON it (not a
  // separate cap sitting on top): a mask that covers the crown, curves
  // softly down over the brows and runs down the middle as the nose bridge
  // to the nose. Like the sheet, each half of the fold has its own tone —
  // light left, dark right — so the bridge reads two-toned.
  const faceGeo = fold(HP([
    // (crown edges inset a hair, so the crown's side walls never z-fight it)
    [2.43, 2.0], [5.45, 1.52], [8.47, 2.0], [8.97, 3.05], [9.85, 3.7], [9.8, 5.0],
    [5.45, 6.4], [1.1, 5.3], [0.95, 3.75], [1.93, 3.05],
  ]), 18, 4.5, { cx: 0 });
  head.add(mesh(faceGeo, C.cream));
  const fz = faceGeo.userData.zAt;
  // gray crown: the same fold a hair deeper, over the top, sides and back of
  // the head (its front hides under the mask below, so no ledge shows)
  head.add(mesh(fold(HP([[2.35, 1.95], [5.45, 1.45], [8.55, 1.95], [9.05, 3.0], [1.85, 3.0]]), 18.7, 4.5, { cx: 0 }), '#9fa199'));
  // the gray mask, left half (gx), mirrored for the right half
  const maskL = [
    [5.45, 1.45], [2.35, 1.95], [1.85, 3.0], [2.6, 3.12], [3.4, 3.22], [4.1, 3.45],
    [4.55, 4.0], [4.95, 5.1], [5.2, 5.5], [5.45, 5.6],
  ];
  for (const [side, color] of [[-1, '#a9aaa3'], [1, '#868980']]) {
    const pts = maskL.map(([gx, gy]) => [hx(gx) * -side, hy(gy)]);
    const shape = new THREE.Shape(pts.map(([px, py]) => new THREE.Vector2(px, py)));
    const g = new THREE.ShapeGeometry(shape);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i += 1) pos.setZ(i, fz(pos.getX(i)) + 0.65);
    head.add(mesh(g, color));
  }
  // nose: the black button at the bridge's tip, rounded and a little proud
  const nose = inkMesh(new THREE.SphereGeometry(4.0, 18, 10), C.ink, 0, hy(5.2), fz(0) + 1.2);
  nose.scale.set(1.15, 0.78, 0.55);
  head.add(nose);

  // eyes + cheeks on the folded face
  const ex = hx(7.35);
  const eyeZ = fz(ex) + 0.15;
  const fc = face({
    eyeX: ex, eyeY: hy(4.05), eyeR: 1.55, z: eyeZ, cheekX: hx(8.0), cheekY: hy(4.55), cheekR: 4.4, cheekColor: C.cheek,
  });
  // cheeks/eyes follow the fold: tilt each to its half-plane
  fc.group.children.forEach((c) => {
    const side = Math.sign(c.position.x);
    c.position.z = fz(c.position.x) + (c.material.transparent ? 0.08 : 0.16);
    c.rotation.y = side * Math.atan2(4.5, 33);
  });
  head.add(fc.group);

  // ears — mirror-symmetric triangles whose base is sunk into the gray cap
  // (they grow out of the head, not sit on it); pivots at the base so they
  // can flick
  const ears = [];
  const earOuter = [[-7.6, -3], [-1.2, 21], [8.4, -3]]; // left ear, local to its base
  const earInner = [[-3.8, 0.5], [-1.0, 16.5], [5.0, 0.5]];
  for (const s2 of [-1, 1]) {
    const ear = group(s2 * 15.2, hy(1.95), 0);
    const m = (pts) => pts.map(([px, py]) => [px * -s2, py]);
    ear.add(mesh(fold(m(earOuter), 7, 1.6), C.gray));
    ear.add(mesh(fold(m(earInner), 1, 1.0), C.earInner, 0, 0, 4.4));
    ear.rotation.z = s2 * -0.12;
    head.add(ear);
    ears.push(ear);
  }

  // ── pose (driven by core/hero.js) ──
  const blink = blinker(rig.seed);
  let wagSpeed = 2.2;
  let wagAmp = 0.12;
  let gait = 0; // posture blend, eased toward gaitTarget every tick
  let gaitTarget = 0;
  let stride = 0;
  let swing = 0;
  let breathe = 0;
  const pose = {
    head,
    rest() {
      root.position.set(0, 0, 0);
      root.scale.set(1, 1, 1);
      head.rotation.set(0, 0, 0);
      swing = 0; wagSpeed = 2.2; wagAmp = 0.12; gaitTarget = 0;
    },
    idle(t) {
      breathe = Math.sin(t * 2.2);
      root.position.y = 0;
      head.rotation.z = Math.sin(t * 0.7) * 0.05;
      head.rotation.x = Math.sin(t * 0.5) * 0.03;
      swing = 0; wagSpeed = 2.2; wagAmp = 0.12; gaitTarget = 0;
    },
    walk(s) {
      stride = s;
      swing = 1;
      // a light trot bounce once he is up on all fours
      root.position.y = Math.abs(Math.cos(s)) * 2.2 * gait;
      head.rotation.x = Math.cos(s * 2) * 0.05;
      head.rotation.z = 0;
      wagSpeed = 7; wagAmp = 0.35; gaitTarget = 1;
    },
    sit(k, t) {
      root.position.y = 0;
      breathe = Math.sin(t * 2.2);
      head.rotation.x = -k * 0.08;
      swing = 0; wagSpeed = 1.2; wagAmp = 0.06; gaitTarget = 0;
    },
    hop(k) {
      root.position.y = Math.sin(PI * k) * 40;
      const sq = k < 0.15 ? 1 - (k / 0.15) * 0.1 : k > 0.85 ? 0.9 + ((1 - k) / 0.15) * 0.1 : 1.05;
      root.scale.set(2 - sq, sq, 1);
    },
    tick(t, dt) {
      // stand up quickly when he sets off; sit back down a little slower
      const rate = gaitTarget > gait ? 7 : 3.5;
      gait += (gaitTarget - gait) * Math.min(dt * rate, 1);
      if (Math.abs(gaitTarget - gait) < 0.002) gait = gaitTarget;
      posture(gait, stride, swing * gait);
      chest.scale.y *= 1 + breathe * 0.012 * (1 - gait);
      // tail: wrapped round the left flank (sitting) → streaming behind (trot)
      const wag = Math.sin(t * wagSpeed) * wagAmp;
      tail.rotation.y = 2.15 * (1 - gait) + wag;
      tail.rotation.x = 0.8 * (1 - gait) + 0.35 * gait;
      fc.blink(blink(t));
      // an ear flick every few seconds
      const c = (t + rig.seed) % 5.3;
      ears[0].rotation.z = c < 0.3 ? Math.sin((c / 0.3) * PI) * 0.35 : 0;
      const c2 = (t + rig.seed + 2.1) % 6.7;
      ears[1].rotation.z = c2 < 0.3 ? -Math.sin((c2 / 0.3) * PI) * 0.35 : 0;
    },
  };
  posture(0);
  rig.pose = pose;
  rig.anims.always = (t, dt) => pose.tick(t, dt);
  rig.anims.idle = (t) => pose.idle(t);
  rig.anims.walk = (t) => pose.walk(t * 9);
  rig.anims.sit = (t) => pose.sit(1, t);
});

import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, blobShadow, applyAnimation,
} from './helpers.js';

// The origami gray wolf from the reference sheet: big faceted wedge head with
// gray cap over a cream face mask, triangular ears, pink cheeks, cream body
// with gray back, two-tone folded tail. Quadruped — trots between scenes.
//
// Structure (all pivots are Groups so animations can swing them):
//   group
//     body (bob/squash) ── back cape, chest
//     head (bob/tilt)   ── cap, mask, ears (twitch), eyes (blink), cheeks, nose
//     legs[4]           ── hip-pivoted
//     tail              ── sway
//
// options: seed, color, animation: "idle"|"walk"|"none"
// The hero instance is driven by core/hero.js via userData.pose helpers.

export function buildWolf(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const gray = options.color ?? palette.wolfGray;
  const grayDark = new THREE.Color(gray).offsetHSL(0, 0, -0.06);
  const cream = palette.cream;

  const group = new THREE.Group();

  const legH = 0.52;
  const bodyW = 0.95; // x (side to side when front-facing)
  const bodyH = 0.95;
  const bodyD = 0.8;
  const bodyY = legH + bodyH / 2;

  // ── body ──
  const body = new THREE.Group();
  const chestGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyD, 1, 2, 1);
  // Taper the chest slightly toward the bottom — folded-paper silhouette.
  {
    const pos = chestGeo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      if (pos.getY(i) < -bodyH * 0.4) {
        pos.setX(i, pos.getX(i) * 0.86);
        pos.setZ(i, pos.getZ(i) * 0.9);
      }
    }
  }
  const chest = paperMesh(chestGeo, cream, seed, 0.05);
  body.add(chest);

  // Gray back cape draped over the top/back.
  const capeGeo = new THREE.BoxGeometry(bodyW * 1.06, bodyH * 0.5, bodyD * 1.04);
  const cape = paperMesh(capeGeo, gray, seed + 1, 0.06);
  cape.position.set(0, bodyH * 0.28, -bodyD * 0.06);
  body.add(cape);

  // Belly stripes per the reference (two slate slots).
  for (const side of [-1, 1]) {
    const slot = paperMesh(new THREE.BoxGeometry(0.13, bodyH * 0.42, 0.03), palette.slateGray, seed + 2, 0.03);
    slot.position.set(side * bodyW * 0.18, -bodyH * 0.12, bodyD / 2 + 0.005);
    body.add(slot);
  }

  body.position.y = bodyY;
  group.add(body);

  // ── head ──
  const head = new THREE.Group();
  const headSize = 1.05;

  // Cream face mask: a flattened faceted wedge.
  const maskGeo = new THREE.CylinderGeometry(headSize * 0.62, headSize * 0.5, headSize * 0.42, 6);
  maskGeo.rotateX(Math.PI / 2);
  const mask = paperMesh(maskGeo, cream, seed + 3, 0.05);
  head.add(mask);

  // Gray cap: angular brow wedge over the top half.
  const capGeo = new THREE.CylinderGeometry(headSize * 0.66, headSize * 0.6, headSize * 0.34, 6, 1, false, 0, Math.PI);
  capGeo.rotateX(Math.PI / 2);
  const cap = paperMesh(capGeo, gray, seed + 4, 0.07);
  cap.position.set(0, headSize * 0.18, -headSize * 0.02);
  head.add(cap);

  // Muzzle + nose.
  const muzzle = paperMesh(new THREE.ConeGeometry(headSize * 0.2, headSize * 0.26, 4), cream, seed + 5, 0.04);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, -headSize * 0.12, headSize * 0.3);
  head.add(muzzle);
  const nose = new THREE.Mesh(
    new THREE.IcosahedronGeometry(headSize * 0.085, 0),
    new THREE.MeshBasicMaterial({ color: palette.charcoal }),
  );
  nose.position.set(0, -headSize * 0.1, headSize * 0.42);
  head.add(nose);

  // Ears — pivoted at the base for twitching.
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    const outer = paperMesh(new THREE.ConeGeometry(headSize * 0.24, headSize * 0.6, 4), `#${grayDark.getHexString()}`, seed + 6, 0.06);
    outer.position.y = headSize * 0.3;
    ear.add(outer);
    const inner = paperMesh(new THREE.ConeGeometry(headSize * 0.12, headSize * 0.34, 4), palette.deepBrown, seed + 7, 0.04);
    inner.position.set(0, headSize * 0.24, headSize * 0.07);
    ear.add(inner);
    ear.position.set(side * headSize * 0.4, headSize * 0.36, -headSize * 0.05);
    ear.rotation.z = side * -0.22;
    head.add(ear);
    ears.push(ear);
  }

  // Eyes.
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.CircleGeometry(headSize * 0.055, 8),
      new THREE.MeshBasicMaterial({ color: palette.charcoal }),
    );
    eye.position.set(side * headSize * 0.26, headSize * 0.02, headSize * 0.315);
    eye.scale.y = 1.3;
    head.add(eye);
    eyes.push(eye);
  }

  // Cheeks.
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(headSize * 0.11, 8),
      new THREE.MeshBasicMaterial({ color: palette.cheekPink, transparent: true, opacity: 0.85 }),
    );
    cheek.position.set(side * headSize * 0.42, -headSize * 0.14, headSize * 0.3);
    head.add(cheek);
  }

  const headRestY = bodyY + bodyH * 0.62 + headSize * 0.28;
  head.position.set(0, headRestY, bodyD * 0.38);
  group.add(head);

  // ── legs ── hip-pivoted; diagonal pairs swing in anti-phase when trotting.
  // The shin runs the full way from the hip pivot to the ground, so the paw
  // bottoms rest exactly at y = 0 — no hovering in side-on views.
  const legs = [];
  const hipY = bodyY + 0.1;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Group();
      const shin = paperMesh(new THREE.BoxGeometry(0.2, hipY, 0.2), sz > 0 ? cream : gray, seed + 8, 0.05);
      shin.position.y = -hipY / 2;
      leg.add(shin);
      const paw = paperMesh(new THREE.BoxGeometry(0.24, 0.14, 0.26), `#${grayDark.getHexString()}`, seed + 9, 0.05);
      paw.position.set(0, -hipY + 0.07, 0.03);
      leg.add(paw);
      leg.position.set(sx * bodyW * 0.3, hipY, sz * bodyD * 0.28);
      group.add(leg);
      legs.push({ pivot: leg, diag: sx * sz, front: sz > 0 }); // diag ±1 → trot pairs
    }
  }

  // ── tail ── two-tone folded wedge, pivoted at the base.
  const tail = new THREE.Group();
  const tailUpper = paperMesh(new THREE.ConeGeometry(0.26, 0.9, 4), gray, seed + 10, 0.07);
  tailUpper.position.y = 0.32;
  tailUpper.rotation.x = -0.5;
  tail.add(tailUpper);
  const tailTip = paperMesh(new THREE.ConeGeometry(0.15, 0.4, 4), palette.slateGray, seed + 11, 0.06);
  tailTip.position.set(0, 0.72, -0.24);
  tailTip.rotation.x = -0.6;
  tail.add(tailTip);
  tail.position.set(0, bodyY - bodyH * 0.38, -bodyD * 0.55);
  tail.rotation.x = 0.7;
  group.add(tail);

  group.add(blobShadow(0.85));

  // ── animation machinery ──
  let nextBlink = 2 + r() * 2;
  function blinkTick(dt) {
    nextBlink -= dt;
    if (nextBlink < 0) nextBlink = 1.8 + r() * 3.2;
    const s = nextBlink < 0.09 ? 0.1 : 1.3;
    for (const eye of eyes) eye.scale.y = s;
  }

  let nextTwitch = 3 + r() * 3;
  function twitchTick(dt) {
    nextTwitch -= dt;
    if (nextTwitch < 0) nextTwitch = 2.5 + r() * 4;
    const k = nextTwitch < 0.18 ? Math.sin((0.18 - nextTwitch) / 0.18 * Math.PI) : 0;
    ears[1].rotation.z = 0.22 - k * 0.28;
  }

  function restPose() {
    body.position.y = bodyY;
    body.scale.setScalar(1);
    head.position.y = headRestY;
    head.rotation.set(0, 0, 0);
    for (const { pivot } of legs) pivot.rotation.x = 0;
    tail.rotation.z = 0;
  }

  // Pose API used by the hero controller (and by the named animations).
  const pose = {
    idle(t, dt) {
      restPose();
      body.scale.setScalar(1 + Math.sin(t * 1.7) * 0.012);
      head.position.y = headRestY + Math.sin(t * 1.7) * 0.025;
      head.rotation.z = Math.sin(t * 0.4) * 0.05;
      tail.rotation.z = Math.sin(t * 1.1) * 0.18;
      blinkTick(dt);
      twitchTick(dt);
    },
    // k = stride phase (radians accumulate with distance), speed 0..1 blend.
    walk(strideK, t, dt) {
      for (const { pivot, diag } of legs) {
        pivot.rotation.x = Math.sin(strideK + (diag > 0 ? 0 : Math.PI)) * 0.5;
      }
      body.position.y = bodyY + Math.abs(Math.sin(strideK)) * 0.07;
      head.position.y = headRestY + Math.abs(Math.sin(strideK + 0.4)) * 0.05;
      tail.rotation.z = Math.sin(strideK) * 0.3;
      blinkTick(dt);
    },
    // Sit-back pose, k = 0..1 blend (0 = standing). Rear drops, hind legs
    // fold forward, chest and head tip up, tail wags contentedly.
    sit(k, t, dt) {
      restPose();
      body.rotation.x = -0.32 * k;
      body.position.y = bodyY - 0.17 * k;
      body.position.z = -bodyD * 0.1 * k;
      body.scale.setScalar(1 + Math.sin(t * 1.7) * 0.012 * k);
      head.position.y = headRestY + 0.06 * k;
      head.rotation.x = -0.12 * k;
      for (const { pivot, front } of legs) {
        pivot.rotation.x = front ? -0.12 * k : 1.15 * k;
      }
      tail.rotation.z = Math.sin(t * 2.2) * 0.3 * k;
      blinkTick(dt);
      twitchTick(dt);
    },
    // Squash-stretch hop, k = 0..1 through the hop. baseY = ground height.
    hop(k, baseY = 0) {
      const up = Math.sin(k * Math.PI);
      group.position.y = baseY + up * 0.9;
      const squash = k < 0.15 ? 1 - (0.15 - k) * 1.6 : 1;
      body.scale.set(1 / squash, squash, 1 / squash);
      for (const { pivot, diag } of legs) pivot.rotation.x = -up * 0.5 * diag;
      tail.rotation.z = up * 0.4;
    },
    rest: restPose,
    head, // exposed so the hero can cheat the head toward camera mid-walk
  };
  group.userData.pose = pose;

  applyAnimation(group, {
    idle: (t, dt) => pose.idle(t, dt),
    walk: (t, dt) => pose.walk(t * 7, t, dt),
    sit: (t, dt) => pose.sit(1, t, dt),
  }, options, 'idle', 'wolf');

  return group;
}

register('wolf', buildWolf);

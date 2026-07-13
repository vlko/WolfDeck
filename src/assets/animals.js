import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, blobShadow, applyAnimation,
} from './helpers.js';

// Round fluffy face with cheeks, ears and dot eyes — shared by sheep and lamb.
// Faces the camera (+z).
function fluffyFace(size, seed, { woolColor, skinColor }) {
  const face = new THREE.Group();

  // Wool halo behind the face.
  const halo = paperMesh(new THREE.CylinderGeometry(size * 1.35, size * 1.35, size * 0.5, 12), woolColor, seed, 0.05);
  halo.rotation.x = Math.PI / 2;
  face.add(halo);

  const skin = paperMesh(new THREE.CylinderGeometry(size, size * 1.02, size * 0.34, 12), skinColor, seed + 1, 0.04);
  skin.rotation.x = Math.PI / 2;
  skin.position.z = size * 0.24;
  face.add(skin);

  const fz = size * 0.42; // feature depth

  // Eyes.
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.CircleGeometry(size * 0.09, 8),
      new THREE.MeshBasicMaterial({ color: palette.charcoal }),
    );
    eye.position.set(side * size * 0.38, size * 0.12, fz);
    eye.scale.y = 1.25;
    face.add(eye);
    face.userData[side === -1 ? 'eyeL' : 'eyeR'] = eye;
  }

  // Cheeks.
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(size * 0.16, 8),
      new THREE.MeshBasicMaterial({ color: palette.cheekPink, transparent: true, opacity: 0.85 }),
    );
    cheek.position.set(side * size * 0.55, -size * 0.14, fz);
    face.add(cheek);
  }

  // Little V nose + smile drawn as tiny flat shapes.
  const nose = new THREE.Mesh(
    new THREE.CircleGeometry(size * 0.07, 3),
    new THREE.MeshBasicMaterial({ color: palette.charcoal }),
  );
  nose.rotation.z = Math.PI;
  nose.position.set(0, -size * 0.08, fz);
  face.add(nose);

  // Droopy ears.
  for (const side of [-1, 1]) {
    const ear = paperMesh(new THREE.CapsuleGeometry(size * 0.14, size * 0.3, 2, 5), skinColor, seed + 5, 0.04);
    ear.position.set(side * size * 1.28, -size * 0.1, size * 0.1);
    ear.rotation.z = side * 1.15;
    face.add(ear);
  }

  return face;
}

// Body + legs + face assembly shared by sheep and lamb.
function buildOvine({ name, scale, headRatio, seed, woolColor, skinColor, curlyCap, options }) {
  const r = rng(seed);
  const group = new THREE.Group();

  const bodyR = 0.85 * scale;
  const legH = 0.5 * scale;
  const bodyY = legH + bodyR * 0.62;

  // Fluffy faceted body.
  const bodyGeo = new THREE.IcosahedronGeometry(bodyR, 1);
  bodyGeo.scale(1.15, 0.95, 0.9);
  const body = paperMesh(bodyGeo, woolColor, seed, 0.06);
  body.position.y = bodyY;
  group.add(body);

  // Stub legs.
  const legs = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Group();
      const shin = paperMesh(
        new THREE.BoxGeometry(0.16 * scale, legH + bodyR * 0.4, 0.16 * scale),
        palette.tanBrown, seed + sx + sz * 2,
      );
      shin.position.y = -(legH + bodyR * 0.4) / 2;
      leg.add(shin);
      leg.position.set(sx * bodyR * 0.5, bodyY, sz * bodyR * 0.34);
      group.add(leg);
      legs.push(leg);
    }
  }

  // Head, front-facing, slightly above the body.
  const head = new THREE.Group();
  const faceSize = bodyR * headRatio;
  const face = fluffyFace(faceSize, seed + 9, { woolColor, skinColor });
  head.add(face);
  if (curlyCap) {
    for (let i = 0; i < 3; i += 1) {
      const curl = paperMesh(new THREE.IcosahedronGeometry(faceSize * 0.32, 0), woolColor, seed + 20 + i, 0.05);
      curl.position.set((i - 1) * faceSize * 0.5, faceSize * 1.02, faceSize * 0.1);
      head.add(curl);
    }
  }
  head.position.set(0, bodyY + bodyR * 0.75, bodyR * 0.55);
  group.add(head);

  group.add(blobShadow(bodyR * 1.1));

  // Blink helper: scales both eyes' y for 0.1 s every few seconds.
  let nextBlink = 1.5 + r() * 3;
  function blinkTick(t, dt) {
    nextBlink -= dt;
    if (nextBlink < 0) nextBlink = 2 + r() * 3.5;
    const closing = nextBlink < 0.1;
    const s = closing ? 0.12 : 1.25;
    if (face.userData.eyeL) {
      face.userData.eyeL.scale.y = s;
      face.userData.eyeR.scale.y = s;
    }
  }

  const restHeadY = head.position.y;
  const animations = {
    idle: (t, dt, ctx) => {
      body.scale.setScalar(1 + Math.sin(t * 1.6 + ctx.phase) * 0.012);
      head.position.y = restHeadY + Math.sin(t * 1.6 + ctx.phase) * 0.02 * scale;
      head.rotation.z = Math.sin(t * 0.5 + ctx.phase) * 0.04;
      blinkTick(t, dt);
    },
    graze: (t, dt, ctx) => {
      // Head dips toward the grass and back up on a slow cycle.
      const cycle = (Math.sin(t * 0.55 + ctx.phase) + 1) / 2; // 0…1
      const dip = Math.pow(cycle, 3);
      head.position.y = restHeadY - dip * bodyR * 0.7;
      head.position.z = bodyR * 0.55 + dip * bodyR * 0.5;
      head.rotation.x = dip * 0.45;
      blinkTick(t, dt);
    },
    blink: (t, dt) => blinkTick(t, dt),
  };

  applyAnimation(group, animations, options || {}, 'idle', name);
  return group;
}

// ── sheep ───────────────────────────────────────────────────────────────────
// options: seed, color (wool), animation: "idle"|"graze"|"blink"|"none"
function sheep(options = {}) {
  return buildOvine({
    name: 'sheep',
    scale: 1,
    headRatio: 0.62,
    seed: options.seed ?? 0,
    woolColor: options.color ?? palette.paperWhite,
    skinColor: palette.parchment,
    curlyCap: false,
    options,
  });
}

// ── lamb ────────────────────────────────────────────────────────────────────
// Smaller, proportionally bigger head, curly wool cap.
// options: seed, color, animation: "idle"|"graze"|"blink"|"none"
function lamb(options = {}) {
  return buildOvine({
    name: 'lamb',
    scale: 0.58,
    headRatio: 0.85,
    seed: (options.seed ?? 0) + 100,
    woolColor: options.color ?? palette.paperWhite,
    skinColor: palette.parchment,
    curlyCap: true,
    options,
  });
}

register('sheep', sheep);
register('lamb', lamb);

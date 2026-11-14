import * as THREE from 'three';
import { paperMesh, rng } from '../assets/helpers.js';
import { palette } from '../assets/palette.js';
import { getWashTexture } from '../assets/materials.js';

// The far world: a washed-paper sky, a two-tone paper sun and a band of
// faceted hills on the horizon. Everything is flat and unlit, split into a
// light and a shaded half the way every object on the reference sheets is.

// Sky: one huge plane far back, painted with a soft vertical gradient and the
// watercolor wash, so the sky reads as paper rather than a digital fill.
function skyPlane(minX, maxX) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, palette.sky);
  g.addColorStop(0.6, palette.sky);
  g.addColorStop(1, palette.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const grad = new THREE.CanvasTexture(c);
  grad.colorSpace = THREE.SRGBColorSpace;

  const width = maxX - minX + 260;
  const height = 120;
  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({ map: grad, fog: false, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((minX + maxX) / 2, 22, -70);
  mesh.renderOrder = -10;

  // wash overlay, multiplied
  const wash = getWashTexture().clone();
  wash.needsUpdate = true;
  wash.repeat.set(width / 40, height / 40);
  const over = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: wash, fog: false, transparent: true, opacity: 0.55, depthWrite: false,
    blending: THREE.MultiplyBlending, premultipliedAlpha: true,
  }));
  over.position.copy(mesh.position);
  over.position.z += 0.1;
  over.renderOrder = -9;

  const group = new THREE.Group();
  group.add(mesh, over);
  group.userData.tint = [mat];
  return group;
}

// Night sky: a scatter of small paper stars high above the hills. Invisible
// by day; the mood fades them in (opacity = mood.stars).
function starField(minX, maxX) {
  const r = rng(91);
  const n = Math.round((maxX - minX + 200) / 1.6);
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    pos[i * 3] = minX - 100 + r() * (maxX - minX + 200);
    pos[i * 3 + 1] = 9 + r() ** 0.8 * 38;
    pos[i * 3 + 2] = -68 + r() * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({
    color: '#fff6dc', size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false,
  }));
  stars.renderOrder = -8;
  stars.visible = false;
  return stars;
}

// One ridge of faceted hills: a run of overlapping triangles, each split at
// its peak into a light (left) and shaded (right) half.
function ridge({ minX, maxX, z, y, height, light, dark, seed, density = 1 }) {
  const r = rng(seed);
  const group = new THREE.Group();
  const mats = {};
  let x = minX;
  let i = 0;
  while (x < maxX) {
    const h = height * (0.55 + r() * 0.6);
    const w = h * (2.4 + r() * 1.6) / density;
    const tip = x + w * (0.4 + r() * 0.2);
    for (const [x0, col] of [[x, light], [x + w, dark]]) {
      const s = new THREE.Shape();
      s.moveTo(x0, 0);
      s.lineTo(tip, h);
      s.lineTo(tip, 0);
      s.closePath();
      const m = paperMesh(new THREE.ShapeGeometry(s), col, seed * 31 + i, 0.025, { unlit: true, side: THREE.DoubleSide });
      // own materials (one per tone), so a mood can tint the ridge
      mats[col] ??= m.material.clone();
      m.material = mats[col];
      m.position.z = z + (i % 2) * 0.05;
      group.add(m);
    }
    x += w * (0.55 + r() * 0.25);
    i += 1;
  }
  group.position.y = y;
  group.userData.tint = Object.values(mats);
  return group;
}

export function createBackdrop({ minX, maxX }) {
  const group = new THREE.Group();
  const sky = skyPlane(minX, maxX);
  const stars = starField(minX, maxX);
  group.add(sky, stars);
  const x0 = minX - 90;
  const x1 = maxX + 90;
  const ridges = [];
  const add = (r) => { ridges.push(r); group.add(r); };
  add(ridge({ minX: x0, maxX: x1, z: -50, y: -0.5, height: 10, light: '#e2e3d8', dark: '#d8dbce', seed: 3 }));
  add(ridge({ minX: x0, maxX: x1, z: -42, y: -0.5, height: 7, light: '#d0d6c7', dark: '#c3cbb9', seed: 7, density: 1.2 }));
  add(ridge({ minX: x0, maxX: x1, z: -34, y: -0.5, height: 4.5, light: '#bec7b3', dark: '#b0baa5', seed: 11, density: 1.4 }));
  // what a mood recolors (see environment/moods.js)
  group.userData.skyMats = sky.userData.tint;
  group.userData.hillMats = ridges.flatMap((r) => r.userData.tint);
  group.userData.stars = stars;
  return group;
}

// Two-tone paper sun: a faceted disc, left half warm sand, right half ochre.
export function createSun() {
  const group = new THREE.Group();
  const mats = [];
  const R = 3.2;
  const seg = 12;
  for (const [side, col] of [[-1, palette.sun], [1, '#d4b07a']]) {
    const s = new THREE.Shape();
    s.moveTo(0, -R);
    for (let k = 0; k <= seg / 2; k += 1) {
      const a = -Math.PI / 2 + (k / (seg / 2)) * Math.PI;
      s.lineTo(side * Math.cos(a) * R, Math.sin(a) * R);
    }
    s.closePath();
    const m = paperMesh(new THREE.ShapeGeometry(s), col, side + 5, 0.03, { unlit: true, side: THREE.DoubleSide });
    m.material = m.material.clone();
    m.material.fog = false;
    m.material.transparent = true;
    group.add(m);
    mats.push(m.material);
  }
  group.userData.mats = mats;
  return group;
}

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { paperMesh, rng } from '../assets/helpers.js';
import { palette } from '../assets/palette.js';

// Flat cut-paper clouds: a few low-poly lumps on a flat base, ivory on top
// and a faint shaded underside, drifting slowly in +x and wrapping around the
// deck. Deep z, so they parallax behind everything.

function lump(cx, cy, rx, ry, seg = 8) {
  const s = new THREE.Shape();
  for (let k = 0; k <= seg; k += 1) {
    const a = Math.PI * (k / seg);
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (k === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

export function createClouds({ minX, maxX, count = 7, seed = 5 }) {
  const group = new THREE.Group();
  const r = rng(seed);
  const clouds = [];

  for (let i = 0; i < count; i += 1) {
    const parts = [];
    const n = 3 + Math.floor(r() * 2);
    let x = 0;
    for (let j = 0; j < n; j += 1) {
      const rx = 0.9 + r() * 0.9;
      const ry = rx * (0.75 + r() * 0.35) * (j === 1 || j === 2 ? 1.25 : 0.85);
      parts.push(lump(x + rx, 0, rx, ry));
      x += rx * 1.35;
    }
    const top = BufferGeometryUtils.mergeGeometries(parts);
    top.translate(-x / 2, 0, 0);
    const cloud = new THREE.Group();
    const body = paperMesh(top, palette.cloud, seed + i, 0.03, { unlit: true, side: THREE.DoubleSide });
    cloud.add(body);
    // shaded flat underside strip, like the folded base of a paper cloud
    const base = paperMesh(new THREE.PlaneGeometry(x * 0.94, 0.3).translate(0, -0.15, 0.01), '#e9e4d6', seed + i + 50, 0.02, { unlit: true, side: THREE.DoubleSide });
    cloud.add(base);
    cloud.position.set(minX + r() * (maxX - minX), 11 + r() * 4, -22 - r() * 10);
    const s = 0.8 + r() * 0.6;
    cloud.scale.set(s, s, 1);
    cloud.userData.speed = 0.2 + r() * 0.3;
    group.add(cloud);
    clouds.push(cloud);
  }

  group.userData.update = (t, dt) => {
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > maxX + 18) c.position.x = minX - 18;
    }
  };

  return group;
}

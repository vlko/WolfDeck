import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { paperMesh, rng } from '../assets/helpers.js';
import { palette } from '../assets/palette.js';

// Low-poly cloud clusters drifting slowly in +x, wrapping around the deck
// extents. Placed at deep z so they parallax behind everything.
export function createClouds({ minX, maxX, count = 6, seed = 5 }) {
  const group = new THREE.Group();
  const r = rng(seed);
  const clouds = [];

  for (let i = 0; i < count; i += 1) {
    const lumps = [];
    const n = 3 + Math.floor(r() * 3);
    for (let j = 0; j < n; j += 1) {
      const s = 0.9 + r() * 1.3;
      const lump = new THREE.IcosahedronGeometry(s, 0);
      lump.scale(1.4, 0.6, 1);
      lump.translate((j - (n - 1) / 2) * s * 1.3, (r() - 0.5) * 0.5, (r() - 0.5) * 0.6);
      lumps.push(lump);
    }
    const geo = BufferGeometryUtils.mergeGeometries(lumps);
    const cloud = paperMesh(geo, palette.cloudWhite, seed + i, 0.04);
    cloud.position.set(
      minX + r() * (maxX - minX),
      10.5 + r() * 3.5,
      -20 - r() * 9,
    );
    cloud.userData.speed = 0.25 + r() * 0.35;
    group.add(cloud);
    clouds.push(cloud);
  }

  group.userData.update = (t, dt) => {
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > maxX + 14) c.position.x = minX - 14;
    }
  };

  return group;
}

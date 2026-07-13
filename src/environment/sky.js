import * as THREE from 'three';
import { paperMesh, rng } from '../assets/helpers.js';
import { palette } from '../assets/palette.js';

// Faceted paper sun with a jittered rim, hung deep behind the scenes.
export function createSun() {
  const geo = new THREE.CircleGeometry(3.2, 12);
  const r = rng(42);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    if (pos.getX(i) !== 0 || pos.getY(i) !== 0) {
      const s = 1 + (r() - 0.5) * 0.12;
      pos.setX(i, pos.getX(i) * s);
      pos.setY(i, pos.getY(i) * s);
    }
  }
  const sun = paperMesh(geo, palette.sunGold, 42, 0.06);
  sun.material.fog = false;
  return sun;
}

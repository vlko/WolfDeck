import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { paperMesh } from '../assets/helpers.js';
import { tween, ease } from '../engine/tween.js';
import { palette } from '../assets/palette.js';

// Floating 3D scene title: extruded bold letters in dusty rose — reads as
// thick die-cut paper. Scales in when the wolf arrives at the scene and back
// out when it leaves (both directions, symmetric).

const font = new FontLoader().parse(helvetikerBold);

export function createTitle(text, { color = palette.dustyRose } = {}) {
  const group = new THREE.Group();
  if (!text) return group;

  const geo = new TextGeometry(text, {
    font,
    size: 1.05,
    depth: 0.3,
    curveSegments: 4,
    bevelEnabled: false,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);

  const mesh = paperMesh(geo, color, text.length, 0.06);
  const inner = new THREE.Group();
  inner.add(mesh);
  group.add(inner);

  const state = { s: 0 };
  let shown = false;
  const phase = Math.random() * Math.PI * 2;

  function apply() {
    const s = Math.max(state.s, 0.0001);
    inner.scale.setScalar(s);
    inner.visible = state.s > 0.01;
  }
  apply();

  group.userData.setShown = (want, instant = false) => {
    if (want === shown) return;
    shown = want;
    if (instant) {
      state.s = want ? 1 : 0;
      apply();
    } else {
      tween(state, { s: want ? 1 : 0 }, 0.5, want ? ease.backOut : ease.inCubic, apply);
    }
  };

  group.userData.update = (t) => {
    if (!shown) return;
    inner.position.y = Math.sin(t * 0.7 + phase) * 0.09;
    inner.rotation.y = Math.sin(t * 0.45 + phase) * 0.035;
  };

  return group;
}

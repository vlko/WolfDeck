import * as THREE from 'three';
import { palette } from '../assets/palette.js';
import { CONTENT_LAYER } from '../core/focusMode.js';
import { addSceneLights } from './lights.js';

// Creates the WebGL renderer, root scene and lights. Returns { renderer, scene }.
export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.sky);
  scene.fog = new THREE.Fog(palette.skyLow, 60, 120);

  // Lights only touch the hand-built 3D models (everything else is unlit
  // paper); they also join the content layer for focus mode's second pass.
  addSceneLights(scene, [CONTENT_LAYER]);

  return { renderer, scene };
}

import * as THREE from 'three';
import { palette } from '../assets/palette.js';

// Creates the WebGL renderer, root scene and lights. Returns { renderer, scene }.
export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.skyCream);
  scene.fog = new THREE.Fog(palette.skyCream, 55, 110);

  // Soft storybook lighting: warm key from the upper right, cool-cream ambient dome.
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0x9aa78e, 1.05);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe9c9, 1.35);
  key.position.set(6, 14, 9);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdfe8ea, 0.35);
  fill.position.set(-8, 6, 4);
  scene.add(fill);

  return { renderer, scene };
}

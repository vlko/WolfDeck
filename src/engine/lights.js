import * as THREE from 'three';

// Scene lighting for the hand-built models, tuned so a face pointing at the
// viewer shows its paper color as printed, faces turned to the upper left
// brighten and faces turned right fall into the warm shade — the light/dark
// halves of every piece on the reference sheets. (Physically-based units:
// intensities include the factor π.)
export function addSceneLights(scene, layers = []) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xc9bda5, 2.15);
  const key = new THREE.DirectionalLight(0xfff6e8, 1.9);
  key.position.set(-9, 6, 7);
  scene.add(hemi, key);
  for (const l of [hemi, key]) for (const layer of layers) l.layers.enable(layer);
  return { hemi, key };
}

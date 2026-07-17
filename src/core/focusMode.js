import * as THREE from 'three';
import { FIT_ASPECT } from '../config.js';

// Presentation (focus) mode — toggled with P. The camera flattens to a
// straight-on ORTHOGRAPHIC view: no perspective, no downward tilt, so the
// whole diorama reads as a flat 2D illustration. Everything stays visible
// and keeps animating; the content (title + panels, everything on
// CONTENT_LAYER) is re-rendered in front of the scenery so nothing ever
// covers a slide. Press P again to return to the 3D diorama view.

export const CONTENT_LAYER = 1;

// The 2D frame is anchored to the GROUND: a thin strip of meadow at the
// bottom of the screen, all the space above it for the content.
const FOCUS_BOTTOM = -0.6; // world y at the bottom edge of the screen
const FOCUS_TOP = 12.6; // world y at the top edge (16:9 and wider)

export function createFocusMode() {
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

  // The current 2D frame in world units — the deck's focus layout reads
  // this to restack panels into the visible area.
  const frame = { halfW: 12, top: FOCUS_TOP, bottom: FOCUS_BOTTOM };

  let on = false;

  function frameOrtho(camera) {
    const aspect = camera.aspect ?? 16 / 9;
    // Narrow windows zoom out to keep the scene width (like the 3D
    // camera's back-off below FIT_ASPECT) — growing upward, so the
    // ground stays glued to the bottom edge.
    const halfH = ((FOCUS_TOP - FOCUS_BOTTOM) / 2) * Math.max(1, FIT_ASPECT / aspect);
    const halfW = halfH * aspect;
    const centerY = FOCUS_BOTTOM + halfH;
    ortho.left = -halfW;
    ortho.right = halfW;
    ortho.top = halfH;
    ortho.bottom = -halfH;
    // z 45 keeps the props inside the fog-free distance band.
    ortho.position.set(camera.position.x, centerY, 45);
    ortho.updateProjectionMatrix();
    frame.halfW = halfW;
    frame.top = centerY + halfH;
    frame.bottom = FOCUS_BOTTOM;
  }

  return {
    get active() { return on; },
    ortho, // exposed for debugging
    frame,
    toggle() { on = !on; },

    // Replaces the plain renderer.render call in the ticker.
    render(renderer, scene, camera) {
      if (!on) {
        renderer.render(scene, camera);
        return;
      }
      frameOrtho(camera);

      // Full scene, flat and front-on — everything visible, still animating.
      renderer.render(scene, ortho);

      // Then the content layer again on a fresh depth buffer, so the title
      // and panels always sit in front of the scenery. The scene background
      // must be lifted for this pass — three.js repaints it on every
      // render() call, which would wipe the scenery just drawn above.
      const auto = renderer.autoClear;
      const bg = scene.background;
      renderer.autoClear = false;
      scene.background = null;
      renderer.clearDepth();
      const mask = ortho.layers.mask;
      ortho.layers.set(CONTENT_LAYER);
      renderer.render(scene, ortho);
      ortho.layers.mask = mask;
      scene.background = bg;
      renderer.autoClear = auto;
    },
  };
}

import * as THREE from 'three';
import {
  CAMERA_TILT, CAMERA_FOV, CAMERA_TARGET_Y, FRAME_HEIGHT, FIT_ASPECT,
} from '../config.js';

// Perspective camera pitched down CAMERA_TILT, looking at (followX, CAMERA_TARGET_Y, 0).
// Distance is chosen so FRAME_HEIGHT world units are visible vertically at z = 0.
// followTarget(x) is damped, so sideways travel eases and depth rows parallax naturally.
export function createCameraRig() {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV, window.innerWidth / window.innerHeight, 0.1, 200,
  );

  const baseDist = FRAME_HEIGHT / (2 * Math.tan((CAMERA_FOV * Math.PI) / 360));
  let dist = baseDist;
  let followX = 0;
  let targetX = 0;

  // Mouse-drag orbit peek: temporary yaw/pitch offsets around the look target.
  // Targets are set while dragging and reset to 0 on release, so the diorama
  // always eases back to exactly the default framing.
  let orbitYaw = 0;
  let orbitPitch = 0;
  let orbitYawT = 0;
  let orbitPitchT = 0;
  let grabbing = false;

  function place() {
    const pitch = CAMERA_TILT + orbitPitch;
    camera.position.set(
      followX + dist * Math.sin(orbitYaw) * Math.cos(pitch),
      CAMERA_TARGET_Y + dist * Math.sin(pitch),
      dist * Math.cos(orbitYaw) * Math.cos(pitch),
    );
    camera.lookAt(followX, CAMERA_TARGET_Y, 0);
  }

  function resize() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    // Narrow windows: pull back so the scene's width still fits.
    dist = aspect < FIT_ASPECT ? baseDist * (FIT_ASPECT / aspect) : baseDist;
    camera.updateProjectionMatrix();
    place();
  }

  resize();

  return {
    camera,
    resize,
    // Jump without easing (initial placement).
    snapTo(x) {
      followX = targetX = x;
      place();
    },
    setTarget(x) {
      targetX = x;
    },
    get x() {
      return followX;
    },
    // Drag deltas in pixels (OrbitControls-style directions).
    orbitDrag(dx, dy) {
      grabbing = true;
      orbitYawT = Math.max(-0.55, Math.min(orbitYawT - dx * 0.0042, 0.55));
      orbitPitchT = Math.max(-0.24, Math.min(orbitPitchT + dy * 0.0032, 0.5));
    },
    orbitRelease() {
      grabbing = false;
      orbitYawT = 0;
      orbitPitchT = 0;
    },
    update(t, dt) {
      followX += (targetX - followX) * (1 - Math.exp(-3 * dt));
      // Snappy while grabbing, gentle glide home after release.
      const k = 1 - Math.exp(-(grabbing ? 14 : 5) * dt);
      orbitYaw += (orbitYawT - orbitYaw) * k;
      orbitPitch += (orbitPitchT - orbitPitch) * k;
      if (!grabbing && Math.abs(orbitYaw) < 0.0004 && Math.abs(orbitPitch) < 0.0004) {
        orbitYaw = 0; // guaranteed exact default position at rest
        orbitPitch = 0;
      }
      place();
    },
  };
}

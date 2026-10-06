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

  // Closeup: a slow dolly toward one important thing (a panel, a prop) and
  // back. `cu` is the framing being used (it stays while easing out), `cuP`
  // the 0…1 progress, eased with smootherstep so it starts and lands softly.
  let cu = null;
  let cuWant = false;
  let cuKey = null;
  let cuHold = 0;
  let cuP = 0;
  const CU_IN = 1.3; // seconds to move in
  const CU_OUT = 1.1; // seconds to pull back
  const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);

  // Camera distance that frames a w × h target with some air around it.
  function closeupDist(c) {
    const tanH = Math.tan((CAMERA_FOV * Math.PI) / 360);
    const visH = Math.max(c.h / 0.62, c.w / (0.7 * camera.aspect));
    const fit = visH / (2 * tanH);
    const d = c.zoom ? dist / c.zoom : fit;
    return Math.max(4, Math.min(d, dist * 0.8));
  }

  function place() {
    const pitch = CAMERA_TILT + orbitPitch;
    const e = cu ? smoother(cuP) : 0;
    const lx = followX + ((cu?.x ?? followX) - followX) * e;
    const ly = CAMERA_TARGET_Y + ((cu?.y ?? CAMERA_TARGET_Y) - CAMERA_TARGET_Y) * e;
    const lz = (cu?.z ?? 0) * e;
    const d = dist + ((cu ? closeupDist(cu) : dist) - dist) * e;
    camera.position.set(
      lx + d * Math.sin(orbitYaw) * Math.cos(pitch),
      ly + d * Math.sin(pitch),
      lz + d * Math.cos(orbitYaw) * Math.cos(pitch),
    );
    camera.lookAt(lx, ly, lz);
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
    // Ask for a closeup framing (see deck closeupFor) or null to pull back.
    // Called every frame; a new target waits its `delay` before moving in.
    setCloseup(c) {
      if (!c) { cuWant = false; cuKey = null; return; }
      if (c.key === cuKey) return;
      cuKey = c.key;
      cuWant = true;
      cuHold = cuP > 0 ? 0 : (c.delay ?? 0.6);
      cu = c;
    },
    get closeup() { return cuP; },
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
      if (cuWant) {
        if (cuHold > 0) cuHold -= dt;
        else cuP = Math.min(1, cuP + dt / CU_IN);
      } else if (cuP > 0) {
        cuP = Math.max(0, cuP - dt / CU_OUT);
        if (cuP === 0) cu = null;
      }
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

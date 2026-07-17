import * as THREE from 'three';
import { palette } from '../assets/palette.js';
import { paperMesh } from '../assets/helpers.js';
import { FONT_STACK, PX } from '../parts/card.js';

// Papercraft speech bubble over the wolf: an extruded paper-white balloon
// with a pointed tail, sitting on a slightly larger deep-brown outline plate
// — thick die-cut comic paper, matching the framework's look. announce(n)
// draws a random phrase + "#n" onto the front face; the step machine calls
// it when the wolf ARRIVES at a scene. Pops in, holds, pops back out.
// Purely presentational — Math.random is fine here (no geometry determinism).

export const PHRASES = [
  'Wuf!',
  'Hi!',
  'Almost here!',
  'Awoo~',
  'Ta-da!',
  'Here we go!',
  'Follow me!',
  'Onwards!',
  'Wuf wuf!',
  'Plot twist!',
  'Watch this!',
  'Trot trot!',
  'Sniff sniff…',
  'New scene!',
  'Right this way!',
  'Still not lost!',
  'I live here now.',
  'No sheep were harmed.',
  'Fresh paper!',
  'Best part yet!',
];

const POP = 0.3; // seconds: pop-in (backOut overshoot)
const HOLD = 1.3; // seconds: fully shown
const OUT = 0.22; // seconds: pop-out
const TAIL = 0.34; // world units: tail height below the balloon
const DEPTH = 0.14; // balloon paper thickness
const RIM = 0.06; // outline plate margin around the balloon

// Balloon silhouette: rounded rect with the tail wedge stitched into the
// bottom edge, tail tip at (0, -m). The rect sits right of the tip so the
// tail points down-left toward the wolf's head. m > 0 grows the whole
// silhouette for the outline plate.
function balloonShape(w, h, m) {
  const r = 0.26 + m;
  const x0 = -w * 0.25 - m;
  const x1 = x0 + w + m * 2;
  const y0 = TAIL - 0.02;
  const y1 = y0 + h + m * 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0);
  s.lineTo(-0.04 * w - m, y0);
  s.lineTo(0, -m); // tail tip
  s.lineTo(0.16 * w + m, y0);
  s.lineTo(x1 - r, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r);
  s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  s.closePath();
  return s;
}

// Crisp transparent text plane for the front face (same recipe as title.js).
function textPlane(phrase, label, w, h) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.canvas.width = Math.ceil(w * PX);
  ctx.canvas.height = Math.ceil(h * PX);
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.deepBrown;
  ctx.font = `800 ${0.42 * PX}px ${FONT_STACK}`;
  ctx.fillText(phrase, (w / 2) * PX, 0.52 * PX);
  ctx.fillStyle = palette.roseMauve;
  ctx.font = `700 ${0.26 * PX}px ${FONT_STACK}`;
  ctx.fillText(label, (w / 2) * PX, 0.9 * PX);

  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
}

function makeBubble(phrase, number) {
  const label = `#${number}`;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `800 ${0.42 * PX}px ${FONT_STACK}`;
  const w = Math.max(measure.measureText(phrase).width / PX + 0.55, 1.35);
  const h = 1.1;

  const bubble = new THREE.Group();

  // deep-brown die-cut outline plate behind the balloon
  const plate = paperMesh(
    new THREE.ExtrudeGeometry(balloonShape(w, h, RIM), { depth: DEPTH * 0.7, bevelEnabled: false }),
    palette.deepBrown, 11, 0.03,
  );
  plate.position.z = -DEPTH * 0.45;
  bubble.add(plate);

  // paper-white balloon body
  const body = paperMesh(
    new THREE.ExtrudeGeometry(balloonShape(w, h, 0), { depth: DEPTH, bevelEnabled: false }),
    palette.paperWhite, 12, 0.02,
  );
  bubble.add(body);

  // phrase + scene number on the front face
  const text = textPlane(phrase, label, w, h);
  text.position.set(w * 0.25, TAIL + h / 2, DEPTH + 0.012);
  bubble.add(text);

  return bubble;
}

export function createSpeechBubble(hero) {
  const group = new THREE.Group();
  let bubble = null;
  let age = 0;
  let lastPhrase = -1;

  function clear() {
    if (!bubble) return;
    group.remove(bubble);
    bubble.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      if (o.material.map) { // the text plane owns its material; paper materials are shared
        o.material.map.dispose();
        o.material.dispose();
      }
    });
    bubble = null;
  }

  return {
    group,

    // Show "random phrase + #number" (number is the 1-based scene number).
    announce(number) {
      let i = Math.floor(Math.random() * PHRASES.length);
      if (i === lastPhrase) i = (i + 1) % PHRASES.length; // no instant repeat
      lastPhrase = i;
      clear();
      bubble = makeBubble(PHRASES[i], number);
      bubble.scale.setScalar(0.001);
      group.add(bubble);
      age = 0;
    },

    update(t, dt) {
      // Anchored above and just right of the wolf's head, tail tip at the
      // group origin so the pop grows out of it. A slight yaw shows off the
      // paper thickness.
      const p = hero.group.position;
      group.position.set(p.x + 0.55, p.y + 2.75, p.z + 0.35);
      group.rotation.y = -0.14;
      if (!bubble) return;
      age += dt;
      if (age >= POP + HOLD + OUT) {
        clear();
        return;
      }
      // Paper materials are cached/shared, so no opacity games — the bubble
      // pops in with a backOut overshoot and shrinks away, all scale.
      let s = 1;
      if (age < POP) {
        const k = age / POP;
        const c = 1.70158;
        s = 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
      } else if (age > POP + HOLD) {
        const k = (age - POP - HOLD) / OUT;
        s = (1 - k) * (1 - k);
      }
      bubble.scale.setScalar(Math.max(s, 0.001));
      // a gentle paper bob while it hangs there
      bubble.position.y = Math.sin(t * 2.1) * 0.04;
    },
  };
}

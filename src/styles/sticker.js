// sticker — a comic sticker. The panel ignores perspective: it always faces the
// viewer squarely, with a thick black ink line and a white sticker border.
// A tight contact shadow plus a wider soft one make it sit ON something —
// stuck to the glass in front of the 3D world — and each sticker is pressed
// on a touch crooked.
import * as THREE from 'three';
import { roundedRect, ringShape, flat, blurRect } from './util.js';
import { env } from './env.js';

const INK = '#16181d';
const BORDER = 0.2; // white sticker border beyond the card, both sides together
const EDGE = BORDER + 0.09; // …plus the outer ink line

const q = new THREE.Quaternion();
const tiltQ = new THREE.Quaternion();
const Z = new THREE.Vector3(0, 0, 1);

export default {
  face: { fill: '#ffffff', grain: false, radius: 0.03 },
  float: false,
  // Flies down from above, held out toward the viewer and askew, and is
  // slapped onto the glass: it lands, squashes a touch under the thumb, and
  // its shadow closes up underneath.
  revealDuration: 0.7,
  reveal(content, k, ctx) {
    if (!ctx.shadows) {
      ctx.shadows = [];
      content.traverse((o) => { if (o.userData.shadow) ctx.shadows.push(o); });
      ctx.from = Math.random() < 0.5 ? -1 : 1;
      // The sticker's border must not make the panel bigger than the card
      // it replaces — decks space their panels for that footprint.
      const size = content.children[0]?.userData.cardSize;
      ctx.fit = size ? Math.min(size.w / (size.w + EDGE), size.h / (size.h + EDGE)) : 1;
    }
    const fly = Math.min(1, k / 0.72); // in the air
    const press = Math.max(0, (k - 0.72) / 0.28); // pressed on
    const lift = (1 - fly) ** 2; // 1 = far off the surface, 0 = touching
    content.position.y = 7.5 * (1 - fly) ** 2.2;
    content.position.x = ctx.from * 1.2 * lift;
    ctx.spin = ctx.from * 0.42 * lift;
    // bigger while it is nearer the viewer; a dip and a rebound as it is pressed
    const squash = press > 0 ? -0.07 * Math.sin(press * Math.PI) * (1 - press * 0.4) : 0;
    content.scale.setScalar(ctx.fit * (1 + 0.42 * lift + squash));
    for (const sh of ctx.shadows) {
      const s = sh.userData.shadow;
      sh.position.x = s.x * (1 + lift * 9);
      sh.position.y = s.y * (1 + lift * 9);
      sh.material.opacity = s.o * (1 - lift * 0.7) * (1 + 0.25 * Math.sin(press * Math.PI));
    }
  },
  // Billboard: face the camera exactly, whatever the perspective does.
  update(content, t, ctx) {
    const cam = env.camera();
    if (!cam) return;
    if (ctx.crooked == null) ctx.crooked = (Math.random() - 0.5) * 0.04; // ±1.1°
    cam.getWorldQuaternion(q);
    content.quaternion.copy(q).multiply(tiltQ.setFromAxisAngle(Z, (ctx.tilt || 0) + ctx.crooked + (ctx.spin || 0)));
  },
  backing(w, h) {
    const out = [];
    const W = w + BORDER;
    const H = h + BORDER;

    // wide, soft shadow: the sticker stands a hair off the surface
    const far = blurRect(W, H, 0.7, 0.2);
    const soft = flat(new THREE.PlaneGeometry(far.W, far.H), 0x1c1a22, -0.2, {
      map: far.texture, transparent: true, opacity: 0.26, depthWrite: false,
    });
    soft.position.set(0.1, -0.14, -0.2);
    soft.renderOrder = -2;
    soft.userData.shadow = { x: 0.1, y: -0.14, o: 0.26 };
    out.push(soft);
    // tight contact shadow hugging the edge: it is stuck down
    const near = blurRect(W + 0.06, H + 0.06, 0.3, 0.045);
    const contact = flat(new THREE.PlaneGeometry(near.W, near.H), 0x1c1a22, -0.14, {
      map: near.texture, transparent: true, opacity: 0.5, depthWrite: false,
    });
    contact.position.set(0.035, -0.05, -0.14);
    contact.renderOrder = -1;
    contact.userData.shadow = { x: 0.035, y: -0.05, o: 0.5 };
    out.push(contact);

    out.push(flat(new THREE.ShapeGeometry(roundedRect(W + 0.09, H + 0.09, 0.22)), INK, -0.1)); // outer ink
    out.push(flat(new THREE.ShapeGeometry(roundedRect(W, H, 0.18)), '#ffffff', -0.06)); // sticker border
    out.push(flat(new THREE.ShapeGeometry(ringShape(w + 0.04, h + 0.04, 0.1, w - 0.2, h - 0.2, 0.03)), INK, 0.012)); // ink line
    return out;
  },
};

// ── titles: die-cut sticker lettering ────────────────────────────────────
// The heading is cut round its letters: ink, a white sticker border, an
// outer ink line and a soft shadow that says it is stuck on. Kicker and
// subtitle are small white sticker pills with the same ink outline.
function pill(ctx, c, size, fill) {
  const { width: w, height: h } = c;
  const pad = size * 0.3;
  const r = Math.min((h - pad * 2) / 2, size * 0.5);
  ctx.save();
  ctx.shadowColor = 'rgba(28,26,34,0.42)';
  ctx.shadowBlur = size * 0.2;
  ctx.shadowOffsetX = size * 0.04;
  ctx.shadowOffsetY = size * 0.1;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, r);
  ctx.fill();
  ctx.restore();
  const b = size * 0.09;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(pad + b, pad + b, w - (pad + b) * 2, h - (pad + b) * 2, Math.max(r - b, 1));
  ctx.fill();
}

export const title = {
  kickerColor: INK,
  subtitleColor: INK,
  labelPad: 1.55,
  heading(L, { paint, size }) {
    return [{
      canvas: paint(L, INK, {
        margin: Math.round(size * 0.3),
        passes: [
          { color: INK, stroke: size * 0.155, strokeOnly: true, shadow: { color: 'rgba(28,26,34,0.45)', blur: size * 0.13, dx: size * 0.03, dy: size * 0.08 } },
          { color: '#ffffff', stroke: size * 0.085, strokeOnly: true },
          { color: INK },
        ],
      }),
    }];
  },
  label(ctx, c, { kind, size }) { pill(ctx, c, size, kind === 'kicker' ? '#fff3b0' : '#ffffff'); },
  headingSpacing: 4, // a little air, so the outlines of neighbouring letters keep apart
  // Drops in from above, askew and a size too big, and is pressed on.
  revealDuration: 0.65,
  reveal(stage, k, ctx) {
    if (ctx.from == null) ctx.from = Math.random() < 0.5 ? -1 : 1;
    const fly = Math.min(1, k / 0.72);
    const press = Math.max(0, (k - 0.72) / 0.28);
    const lift = (1 - fly) ** 2;
    stage.position.y = 6 * (1 - fly) ** 2.2;
    stage.position.x = ctx.from * 1.5 * lift;
    stage.rotation.z = ctx.from * 0.3 * lift;
    const squash = press > 0 ? -0.06 * Math.sin(press * Math.PI) * (1 - press * 0.4) : 0;
    stage.scale.setScalar(1 + 0.35 * lift + squash);
  },
};

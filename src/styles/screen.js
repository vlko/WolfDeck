// screen — a window of light. A precise, sharp cut-out with a thin graphite frame and
// a face that glows like a display: cool white, a soft halo around it, faint
// scanlines. Against the warm matt paper it reads as a screen from our world
// hung inside the storybook.
import * as THREE from 'three';
import { shadedColors } from '../assets/materials.js';
import { ringShape, roundedRect, flat, canvasTexture } from './util.js';

const FRAME = '#2a2e34';
const LINE = '#7fe3ff';

let scan = null;
function scanlines() {
  if (!scan) {
    scan = canvasTexture(4, 8, (ctx) => {
      ctx.fillStyle = 'rgba(40,90,140,0.07)';
      ctx.fillRect(0, 0, 4, 2);
    });
    scan.wrapS = scan.wrapT = THREE.RepeatWrapping;
  }
  return scan;
}

// Soft halo in the panel's own proportions.
function halo(w, h) {
  const pad = 1.5;
  const W = w + pad * 2;
  const H = h + pad * 2;
  const px = 36; // pixels per world unit — it is only a blur
  const tex = canvasTexture(Math.round(W * px), Math.round(H * px), (ctx) => {
    ctx.filter = `blur(${Math.round(px * 0.5)}px)`;
    ctx.fillStyle = '#fff';
    ctx.fillRect(pad * px, pad * px, w * px, h * px);
  });
  const m = flat(new THREE.PlaneGeometry(W, H), '#9fdcff', -0.2, {
    map: tex, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  m.renderOrder = -1;
  return m;
}

const panel = {
  face: { fill: '#f2f8ff', grain: false, radius: 0.03 },
  float: false,
  // Switches on like a display: a thin line of light spreads sideways, then
  // the picture opens up from it with a small overshoot.
  revealDuration: 0.6,
  reveal(content, k) {
    const a = Math.min(1, k / 0.42); // the line spreads
    const b = Math.max(0, (k - 0.42) / 0.58); // …and opens
    const sx = 1 - (1 - a) ** 3;
    const c1 = 1.70158;
    const open = 1 + (c1 + 1) * (b - 1) ** 3 + c1 * (b - 1) ** 2; // back-out
    content.scale.set(Math.max(sx, 0.001), Math.max(0.018 + (1 - 0.018) * open, 0.018), 1);
  },
  backing(w, h) {
    const out = [halo(w, h)];

    // the frame: a thin dark bezel standing proud of the screen
    const geo = new THREE.ExtrudeGeometry(ringShape(w + 0.16, h + 0.16, 0.1, w - 0.2, h - 0.2, 0.04), {
      depth: 0.2, bevelEnabled: false, curveSegments: 4,
    });
    geo.translate(0, 0, -0.08);
    out.push(new THREE.Mesh(shadedColors(geo, 3, 0.02), new THREE.MeshBasicMaterial({ color: FRAME, vertexColors: true })));
    // its back plate, so the screen has a body when seen from the side
    out.push(flat(new THREE.ShapeGeometry(roundedRect(w + 0.14, h + 0.14, 0.1)), '#15181c', -0.07));

    // a hairline of light where the glass meets the bezel
    out.push(flat(new THREE.ShapeGeometry(ringShape(w - 0.2, h - 0.2, 0.04, w - 0.25, h - 0.25, 0.03)), LINE, 0.012));

    // faint scanlines over the picture
    const tex = scanlines().clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, h * 14);
    const lines = flat(new THREE.PlaneGeometry(w - 0.2, h - 0.2), 0xffffff, 0.014, {
      map: tex, transparent: true, depthWrite: false,
    });
    lines.renderOrder = 1;
    out.push(lines);
    return out;
  },
};

// ── titles: slim displays ────────────────────────────────────────────────
// The heading sits on its own glowing strip of screen in a graphite bezel;
// the kicker is a small dark chip with light text, the subtitle a lighter,
// thinner strip of the same glass.
function screen(ctx, c, { pad, radius, bezel, fill, glow, line }) {
  const { width: w, height: h } = c;
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = pad * 0.9;
  ctx.fillStyle = FRAME;
  ctx.beginPath();
  ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, radius);
  ctx.fill();
  ctx.fill(); // twice: a fuller halo
  ctx.restore();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(pad + bezel, pad + bezel, w - (pad + bezel) * 2, h - (pad + bezel) * 2, Math.max(radius - bezel, 1));
  ctx.fill();
  if (line) {
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(1.5, bezel * 0.35);
    ctx.stroke();
    // faint scanlines
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(40,90,140,0.06)';
    for (let y = pad; y < h - pad; y += 6) ctx.fillRect(0, y, w, 2);
    ctx.restore();
  }
}

export const title = {
  kickerColor: '#a8ecff',
  subtitleColor: '#20252b',
  labelPad: 1.5,
  heading(L, { paint, size }) {
    const margin = Math.round(size * 0.36);
    return [{
      canvas: paint(L, '#1f242a', {
        margin,
        before: (ctx, c) => screen(ctx, c, {
          pad: size * 0.3, radius: size * 0.16, bezel: size * 0.065, fill: '#f2f8ff', glow: 'rgba(150,220,255,0.95)', line: LINE,
        }),
      }),
    }];
  },
  label(ctx, c, { kind, size }) {
    if (kind === 'kicker') {
      screen(ctx, c, { pad: size * 0.3, radius: size * 0.3, bezel: 0, fill: FRAME, glow: 'rgba(150,220,255,0.7)', line: null });
    } else {
      screen(ctx, c, { pad: size * 0.3, radius: size * 0.22, bezel: size * 0.07, fill: '#f2f8ff', glow: 'rgba(150,220,255,0.8)', line: LINE });
    }
  },
};

// The title block enters the way the panels do.
title.reveal = panel.reveal;
title.revealDuration = panel.revealDuration;

export default panel;

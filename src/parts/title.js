import * as THREE from 'three';
import { tween, ease } from '../engine/tween.js';
import { palette } from '../assets/palette.js';
import { plainColors, getGrainCanvas } from '../assets/materials.js';
import { wrapLines, FONT_STACK, PX } from './card.js';

// Floating scene title, built like the cut-paper pieces on the reference
// sheets: the heading is a die-cut paper layer in deep slate ink lifted
// above a sand-colored backing layer (a real gap in z — orbit the camera and
// the layers part). An optional kicker floats above (small uppercase mauve
// strapline), a subtitle below (wrapped body text). Scales in on arrival
// and back out on leave, both directions symmetric.

const TITLE_SIZE = 1.2; // world units (cap-height-ish)
const MAX_W = 15.5; // widest single line before the title wraps/shrinks
const LAYER_GAP = 0.09; // z gap between ink and backing layer

function makeTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function plane(canvas, w, h) {
  return new THREE.Mesh(
    plainColors(new THREE.PlaneGeometry(w, h)),
    new THREE.MeshBasicMaterial({ map: makeTexture(canvas), transparent: true, depthWrite: false }),
  );
}

// Lays out `text` in `font`, wrapping at maxW world units; returns canvas
// geometry so several layers can be painted identically.
function layout(text, { size, weight, maxW, spacing = 0, lineH = 1.18 }) {
  const ctx = document.createElement('canvas').getContext('2d');
  const font = `${weight} ${size * PX}px ${FONT_STACK}`;
  ctx.font = font;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  const lines = wrapLines(ctx, text, maxW * PX);
  const widths = lines.map((l) => ctx.measureText(l).width);
  const pad = Math.ceil(size * PX * 0.18);
  return {
    lines, font, spacing, size, lineH, pad,
    wPx: Math.ceil(Math.max(...widths, 1) + pad * 2),
    hPx: Math.ceil(lines.length * size * PX * lineH + pad * 2),
  };
}

function paint(L, color, { stroke = 0, label = null } = {}) {
  const c = document.createElement('canvas');
  c.width = L.wPx;
  c.height = L.hPx;
  const ctx = c.getContext('2d');
  if (label) {
    // a torn-paper label behind small text, so it reads over the hills
    const r = Math.min(L.hPx / 2, L.size * PX * 0.6);
    ctx.fillStyle = label;
    ctx.beginPath();
    ctx.roundRect(0, 0, c.width, c.height, r);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.5;
    const g = getGrainCanvas();
    for (let y = 0; y < c.height; y += g.height) for (let x = 0; x < c.width; x += g.width) ctx.drawImage(g, x, y);
    ctx.restore();
  }
  ctx.font = L.font;
  if (L.spacing) ctx.letterSpacing = `${L.spacing}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke;
  L.lines.forEach((line, i) => {
    const y = L.pad + L.size * PX * (0.92 + i * L.lineH);
    if (stroke) ctx.strokeText(line, c.width / 2, y);
    ctx.fillText(line, c.width / 2, y);
  });
  return c;
}

// The heading: ink layer + fattened sand backing layer behind it.
function heading(text) {
  let L = layout(text, { size: TITLE_SIZE, weight: 900, maxW: MAX_W * 1.6 });
  let fit = 1;
  if (L.wPx / PX > MAX_W) {
    // Prefer shrinking (one line keeps the panel zone free); only very long
    // headings wrap onto two lines.
    if ((MAX_W * PX) / L.wPx >= 0.6) fit = (MAX_W * PX) / L.wPx;
    else {
      L = layout(text, { size: TITLE_SIZE, weight: 900, maxW: MAX_W * 0.98 });
      fit = Math.min(1, (MAX_W * PX) / L.wPx);
    }
  }
  const w = (L.wPx / PX) * fit;
  const h = (L.hPx / PX) * fit;
  const group = new THREE.Group();
  const back = plane(paint(L, palette.sand, { stroke: TITLE_SIZE * PX * 0.06 }), w, h);
  back.position.set(0.07, -0.08, -LAYER_GAP);
  const ink = plane(paint(L, palette.slate), w, h);
  group.add(back, ink);
  group.userData.h = h - (L.pad * 2 * fit) / PX;
  return group;
}

function textLine(text, { size, weight, color, maxW = 14, spacing = 0, label = null }) {
  const L = layout(text, { size, weight, maxW, spacing, lineH: 1.35 });
  if (label) { // roomier padding for the paper label
    const extra = Math.round(size * PX * 0.7);
    L.pad += extra / 2;
    L.wPx += extra * 1.4;
    L.hPx += extra;
  }
  const mesh = plane(paint(L, color, { label }), L.wPx / PX, L.hPx / PX);
  mesh.userData.h = L.hPx / PX;
  return mesh;
}

export function createTitle(text, { kicker, subtitle } = {}) {
  const group = new THREE.Group();
  if (!text && !kicker && !subtitle) return group;

  const inner = new THREE.Group();
  let topY = 0;
  let botY = 0;

  if (text) {
    const hd = heading(String(text));
    inner.add(hd);
    topY = hd.userData.h / 2;
    botY = -hd.userData.h / 2;
  }
  const subPlanes = [];
  if (kicker) {
    const p = textLine(String(kicker).toUpperCase(), {
      size: 0.32, weight: 800, color: palette.roseMauve, spacing: 5, label: 'rgba(251,248,241,0.88)',
    });
    p.position.y = topY + 0.3 + p.userData.h / 2;
    inner.add(p);
    subPlanes.push(p);
  }
  if (subtitle) {
    const p = textLine(String(subtitle), {
      size: 0.42, weight: 700, color: palette.inkBody, maxW: 18, label: 'rgba(251,248,241,0.9)',
    });
    p.position.y = botY - 0.35 - p.userData.h / 2;
    inner.add(p);
    subPlanes.push(p);
  }
  group.add(inner);
  group.userData.hasKicker = Boolean(kicker);

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

  // Kicker + subtitle step aside once the slide starts revealing panels —
  // they occupy the same sky the panels land in. Symmetric on the way back.
  const subState = { o: 1 };
  function applySub() {
    for (const p of subPlanes) {
      p.material.opacity = subState.o;
      p.visible = subState.o > 0.02;
    }
  }
  group.userData.setSubShown = (want) => {
    if (!subPlanes.length) return;
    tween(subState, { o: want ? 1 : 0 }, 0.35, ease.outCubic, applySub);
  };

  group.userData.update = (t) => {
    if (!shown) return;
    inner.position.y = Math.sin(t * 0.7 + phase) * 0.08;
    inner.rotation.z = Math.sin(t * 0.45 + phase) * 0.008;
  };

  return group;
}

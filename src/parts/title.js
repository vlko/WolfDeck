import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { paperMesh } from '../assets/helpers.js';
import { tween, ease } from '../engine/tween.js';
import { palette } from '../assets/palette.js';
import { plainColors } from '../assets/materials.js';
import { wrapLines, FONT_STACK, PX } from './card.js';

// Floating 3D scene title: extruded bold letters in dusty rose — reads as
// thick die-cut paper. Scales in when the wolf arrives at the scene and back
// out when it leaves (both directions, symmetric). An optional kicker floats
// above it (small uppercase strapline) and a subtitle below (wrapped body
// text) — both flat canvas planes riding the same show/hide/bob.

const font = new FontLoader().parse(helvetikerBold);

// The bundled helvetiker font has no Latin-Extended glyphs (Slovak á č š ž…
// would render as "?"). We extrude the base letters and lay small papercraft
// diacritic marks over them instead — folded-paper accents.
const MARK_TYPES = {
  '́': 'acute', // á é í ý…  (ď ť ľ decompose to caron, handled below)
  '̌': 'caron', // č š ž ň…
  '̂': 'circumflex', // ô
  '̈': 'umlaut', // ä
  '̊': 'ring', // ů
};
const ASCENDERS = new Set('bdfhklt');

// Splits text into helvetiker-safe base characters + a list of marks with
// the base-string index they sit on.
function stripDiacritics(text) {
  const marks = [];
  let base = '';
  for (const ch of text.normalize('NFD')) {
    if (MARK_TYPES[ch]) {
      if (base.length) marks.push({ index: base.length - 1, type: MARK_TYPES[ch] });
    } else if (ch.charCodeAt(0) < 0x300 || ch.charCodeAt(0) > 0x36f) {
      base += ch;
    }
  }
  return { base, marks };
}

// Per-character x centers using the font's advance widths — mirrors how
// TextGeometry lays glyphs out.
function glyphCenters(base, size) {
  const scale = size / font.data.resolution;
  const centers = [];
  let x = 0;
  for (const ch of base) {
    const glyph = font.data.glyphs[ch] ?? font.data.glyphs['?'];
    const ha = (glyph?.ha ?? 600) * scale;
    centers.push(x + ha / 2);
    x += ha;
  }
  return centers;
}

// A small extruded paper accent above (cx, top). All marks share the letter
// color and depth so they read as part of the die-cut letter.
function makeMark(type, size, color, seed) {
  const g = new THREE.Group();
  const t = size * 0.085; // stroke thickness
  const wjs = size * 0.3; // mark width
  const add = (w, rot, dx = 0, dy = 0) => {
    const m = paperMesh(new THREE.BoxGeometry(w, t, 0.3), color, seed, 0.04);
    m.rotation.z = rot;
    m.position.set(dx, dy, 0);
    g.add(m);
  };
  if (type === 'acute') add(wjs, 0.7);
  if (type === 'caron') { add(wjs * 0.62, -0.7, -wjs * 0.2, t); add(wjs * 0.62, 0.7, wjs * 0.2, t); }
  if (type === 'circumflex') { add(wjs * 0.62, 0.7, -wjs * 0.2, 0); add(wjs * 0.62, -0.7, wjs * 0.2, 0); }
  if (type === 'umlaut') { add(t * 1.2, 0, -wjs * 0.24); add(t * 1.2, 0, wjs * 0.24); }
  if (type === 'ring') { add(t * 1.6, 0, 0, t * 0.8); add(t * 1.6, 0, 0, -t * 0.8); }
  return g;
}

// A crisp free-floating text plane (no card) for kicker/subtitle lines.
function textPlane(text, { size, weight = 600, color = palette.ink, maxW = 14, spacing = 0 }) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${weight} ${size * PX}px ${FONT_STACK}`;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  const lines = wrapLines(ctx, text, maxW * PX);
  const wPx = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width), 1) + 8);
  const hPx = Math.ceil(lines.length * size * PX * 1.35);
  ctx.canvas.width = wPx;
  ctx.canvas.height = hPx;
  ctx.font = `${weight} ${size * PX}px ${FONT_STACK}`;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, wPx / 2, size * PX * (0.95 + i * 1.35)));

  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(
    plainColors(new THREE.PlaneGeometry(wPx / PX, hPx / PX)),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  mesh.userData.h = hPx / PX;
  return mesh;
}

export function createTitle(text, { color = palette.dustyRose, kicker, subtitle } = {}) {
  const group = new THREE.Group();
  if (!text && !kicker && !subtitle) return group;

  const inner = new THREE.Group();
  let topY = 0;
  let botY = 0;

  if (text) {
    const size = 1.05;
    const { base, marks } = stripDiacritics(String(text));
    const geo = new TextGeometry(base, {
      font,
      size,
      depth: 0.3,
      curveSegments: 4,
      bevelEnabled: false,
    });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const dx = -(bb.max.x + bb.min.x) / 2;
    const dy = -(bb.max.y + bb.min.y) / 2;
    geo.translate(dx, dy, 0);
    inner.add(paperMesh(geo, color, base.length, 0.06));

    // Papercraft diacritics over their base glyphs (helvetiker has none).
    const centers = glyphCenters(base, size);
    marks.forEach((m, i) => {
      const ch = base[m.index];
      const tall = ch !== ch.toLowerCase() || ASCENDERS.has(ch);
      const mark = makeMark(m.type, size, color, base.length + i);
      mark.position.set(centers[m.index] + dx, (tall ? 1.02 : 0.74) * size + dy, 0.15);
      inner.add(mark);
    });

    topY = (bb.max.y - bb.min.y) / 2 + (marks.length ? 0.3 * size : 0);
    botY = -(bb.max.y - bb.min.y) / 2;
  }
  const subPlanes = [];
  if (kicker) {
    const plane = textPlane(String(kicker).toUpperCase(), {
      size: 0.34, weight: 700, color: palette.inkMuted, spacing: 4,
    });
    plane.position.y = topY + 0.55 + plane.userData.h / 2;
    inner.add(plane);
    subPlanes.push(plane);
  }
  if (subtitle) {
    const plane = textPlane(String(subtitle), {
      size: 0.42, weight: 600, color: palette.ink,
    });
    plane.position.y = botY - 0.5 - plane.userData.h / 2;
    inner.add(plane);
    subPlanes.push(plane);
  }
  group.add(inner);

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

  // Kicker + subtitle step aside once the scene starts revealing panels —
  // they occupy the same sky the panels land in. Symmetric: stepping back
  // to an empty scene brings them back.
  const subState = { o: 1 };
  function applySub() {
    for (const plane of subPlanes) {
      plane.material.opacity = subState.o;
      plane.visible = subState.o > 0.02;
    }
  }
  group.userData.setSubShown = (want) => {
    if (!subPlanes.length) return;
    tween(subState, { o: want ? 1 : 0 }, 0.35, ease.outCubic, applySub);
  };

  group.userData.update = (t) => {
    if (!shown) return;
    inner.position.y = Math.sin(t * 0.7 + phase) * 0.09;
    inner.rotation.y = Math.sin(t * 0.45 + phase) * 0.035;
  };

  return group;
}

import * as THREE from 'three';
import { paperMaterial, plainColors, facetColors } from '../assets/materials.js';
import { palette } from '../assets/palette.js';
import { tween, ease } from '../engine/tween.js';
import { REVEAL_DURATION } from '../config.js';

// Papercraft panel base shared by every in-place part: an extruded
// rounded-rect slab with a crisp CanvasTexture front face, floating in the
// diorama. Parts are hidden until their step reveals them (scale-up with
// overshoot + rise); hiding is the exact reverse; while revealed they bob on
// a gentle sine float.

export const PX = 110; // canvas pixels per world unit — text stays crisp

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

// The bare slab (no canvas face) — charts build on this too.
export function makeSlab(w, h, { color = palette.paperWhite, thickness = 0.12, radius = 0.18, seed = 1 } = {}) {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, radius), {
    depth: thickness, bevelEnabled: false, curveSegments: 4,
  });
  geo.translate(0, 0, -thickness);
  const slab = new THREE.Mesh(facetColors(geo, seed, 0.035), paperMaterial(color));
  return slab;
}

// Canvas-faced card. draw(ctx, wPx, hPx) paints the front face.
// opts: color/thickness/radius/seed (slab), bare (no slab — floating canvas
// only), accent (CSS color — papercraft strip along the top edge).
export function makeCard(w, h, draw, opts = {}) {
  const group = new THREE.Group();
  if (!opts.bare) group.add(makeSlab(w, h, opts));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * PX);
  canvas.height = Math.round(h * PX);
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const inset = opts.bare ? 0 : 0.12;
  const faceGeo = plainColors(new THREE.PlaneGeometry(w - inset, h - inset));
  const face = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({
    map: tex, transparent: true,
  }));
  face.position.z = 0.005;
  group.add(face);

  if (opts.accent && !opts.bare) {
    // border-top flourish: a thin die-cut paper strip laid over the top edge
    const strip = new THREE.Mesh(
      facetColors(new THREE.BoxGeometry(w - 0.34, 0.16, 0.08), (opts.seed ?? 1) + 7, 0.05),
      paperMaterial(opts.accent),
    );
    strip.position.set(0, h / 2 - 0.16, 0.03);
    group.add(strip);
  }

  // Redraw hook for parts that animate their canvas (e.g. stat count-up).
  group.userData.redraw = (drawFn = draw) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFn(ctx, canvas.width, canvas.height);
    tex.needsUpdate = true;
  };
  return group;
}

// Maps author-facing JSON fields to makeCard/makeSlab options — shared by
// every part builder so all panels speak the same customization dialect:
//   cardColor (slab color), card: false (no slab), accentColor (top strip)
export function cardOptsFrom(def, extra = {}) {
  const opts = { ...extra };
  if (typeof def.cardColor === 'string') opts.color = def.cardColor;
  if (def.card === false) opts.bare = true;
  if (typeof def.accentColor === 'string') opts.accent = def.accentColor;
  return opts;
}

// Shared grow-in driver: tween {k: 0→1}; apply(k) positions every element.
// Attached to a part's content group; the reveal pipeline calls it after the
// card lands (see makeFloatingPart / charts).
export function growDriver(group, apply, duration = 0.9) {
  const state = { k: 0 };
  apply(0);
  group.userData.growIn = () => tween(state, { k: 1 }, duration, ease.outCubic, () => apply(state.k)).done;
  group.userData.growInInstant = () => { state.k = 1; apply(1); };
  group.userData.resetGrow = () => { state.k = 0; apply(0); };
}

// Per-element stagger: element i of n gets progress 0..1 within global k.
export function windowK(k, i, n, overlap = 0.55) {
  const span = 1 / (n - (n - 1) * overlap || 1);
  const start = i * span * (1 - overlap);
  return Math.max(0, Math.min((k - start) / span, 1));
}

// Shared canvas text helpers ------------------------------------------------

export const FONT_STACK = "'Avenir Next', 'Trebuchet MS', Verdana, sans-serif";

export function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const attempt = line ? `${line} ${word}` : word;
      if (ctx.measureText(attempt).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = attempt;
      }
    }
    lines.push(line);
  }
  return lines;
}

// Wraps content into the floating in-place part the deck places in a scene:
//   anchor (author position) → floater (idle bob) → content (reveal tweens)
// Returns the anchor group with userData { reveal(), hide(), update() }.
export function makeFloatingPart(contentGroup, { scale = 1, tilt = 0 } = {}) {
  const anchor = new THREE.Group();
  const floater = new THREE.Group();
  const content = new THREE.Group();
  content.add(contentGroup);
  floater.add(content);
  anchor.add(floater);

  content.scale.setScalar(0.0001);
  content.visible = false;
  content.rotation.z = tilt;
  anchor.scale.setScalar(scale);

  const phase = Math.random() * Math.PI * 2;
  let revealed = false;

  const state = { s: 0, y: -0.6 };
  function applyState() {
    const s = Math.max(state.s, 0.0001);
    content.scale.setScalar(s);
    content.position.y = state.y;
    content.visible = state.s > 0.001;
  }

  anchor.userData.part = true;
  anchor.userData.reveal = () => {
    revealed = true;
    // Grow with overshoot while floating up into place.
    const grow = tween(state, { s: 1 }, REVEAL_DURATION, ease.backOut, applyState);
    tween(state, { y: 0 }, REVEAL_DURATION, ease.outCubic, applyState);
    const extra = contentGroup.userData.growIn ? grow.done.then(() => contentGroup.userData.growIn()) : grow.done;
    return extra;
  };
  anchor.userData.hide = () => {
    revealed = false;
    if (contentGroup.userData.resetGrow) contentGroup.userData.resetGrow();
    const shrink = tween(state, { s: 0 }, REVEAL_DURATION * 0.8, ease.inCubic, applyState);
    tween(state, { y: -0.6 }, REVEAL_DURATION * 0.8, ease.inCubic, applyState);
    return shrink.done;
  };
  anchor.userData.revealInstant = () => {
    revealed = true;
    state.s = 1; state.y = 0;
    applyState();
    if (contentGroup.userData.growInInstant) contentGroup.userData.growInInstant();
  };
  anchor.userData.update = (t) => {
    if (revealed) floater.position.y = Math.sin(t * 0.8 + phase) * 0.07;
  };

  return anchor;
}

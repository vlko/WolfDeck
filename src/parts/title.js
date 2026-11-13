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

// ── title style ───────────────────────────────────────────────────────────
// The look of headings and of the kicker / subtitle labels; it goes with the
// panel style (card.js setPanelStyle). The default is the cut-paper title. A
// style may give:
//   heading(L, { paint, PX, size }) → [{ canvas, x?, y?, z? }]   the layers
//   label(ctx, canvas, { kind, size })   background of a kicker / subtitle
//   kickerColor, subtitleColor, labelPad (× the default label padding)
//   headingSpacing   extra letter spacing of the heading, in canvas px
//   reveal(stage, k, ctx)   the style's own entrance for the whole title
//                    block: poses it for progress k = 0 (gone) … 1 (in
//                    place); leaving runs it backwards. revealDuration: s
const paperTitle = {
  heading: null, label: null, kickerColor: null, subtitleColor: null, labelPad: 1,
  headingSpacing: 0, reveal: null, revealDuration: 0.5,
};
// A styled title block may not reach higher above its anchor than this
// (world units): its backgrounds make it taller than the paper title, and
// a kicker over a two-line heading would leave the top of the screen.
const TOP_LIMIT = 2.05;
let titleStyle = paperTitle;
export function setTitleStyle(style) {
  titleStyle = style ? { ...paperTitle, ...style } : paperTitle;
}

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

// Paints the laid-out text. opts:
//   stroke   outline width of the (single) pass in `color`
//   passes   instead: [{ color, stroke?, dx?, dy?, composite?, shadow? }] in order
//   margin   extra canvas px on every side (room for a style's background)
//   before   (ctx, canvas) drawn under the text
//   label    background color of a kicker / subtitle label; kind names which
function paint(L, color, {
  stroke = 0, passes = null, margin = 0, before = null, label = null, kind = null,
} = {}) {
  const c = document.createElement('canvas');
  c.width = L.wPx + margin * 2;
  c.height = L.hPx + margin * 2;
  const ctx = c.getContext('2d');
  if (label && titleStyle.label) {
    ctx.save();
    titleStyle.label(ctx, c, { kind, size: L.size * PX });
    ctx.restore();
  } else if (label) {
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
  if (before) {
    ctx.save();
    before(ctx, c);
    ctx.restore();
  }
  ctx.font = L.font;
  if (L.spacing) ctx.letterSpacing = `${L.spacing}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  for (const pass of passes ?? [{ color, stroke }]) {
    ctx.save();
    ctx.fillStyle = pass.color;
    ctx.strokeStyle = pass.color;
    ctx.lineWidth = pass.stroke ?? 0;
    if (pass.composite) ctx.globalCompositeOperation = pass.composite;
    if (pass.shadow) {
      ctx.shadowColor = pass.shadow.color;
      ctx.shadowBlur = pass.shadow.blur ?? 0;
      ctx.shadowOffsetX = pass.shadow.dx ?? 0;
      ctx.shadowOffsetY = pass.shadow.dy ?? 0;
    }
    L.lines.forEach((line, i) => {
      const x = c.width / 2 + (pass.dx ?? 0);
      const y = margin + L.pad + L.size * PX * (0.92 + i * L.lineH) + (pass.dy ?? 0);
      if (pass.stroke) ctx.strokeText(line, x, y);
      if (!pass.strokeOnly) ctx.fillText(line, x, y);
    });
    ctx.restore();
  }
  return c;
}

// The heading: ink layer + fattened sand backing layer behind it.
function heading(text) {
  const spacing = titleStyle.headingSpacing;
  let L = layout(text, { size: TITLE_SIZE, weight: 900, maxW: MAX_W * 1.6, spacing });
  let fit = 1;
  if (L.wPx / PX > MAX_W) {
    // Prefer shrinking (one line keeps the panel zone free); only very long
    // headings wrap onto two lines.
    if ((MAX_W * PX) / L.wPx >= 0.6) fit = (MAX_W * PX) / L.wPx;
    else {
      L = layout(text, { size: TITLE_SIZE, weight: 900, maxW: MAX_W * 0.98, spacing });
      fit = Math.min(1, (MAX_W * PX) / L.wPx);
    }
  }
  const group = new THREE.Group();
  const layers = titleStyle.heading
    ? titleStyle.heading(L, { paint, PX, size: TITLE_SIZE * PX })
    : [
      { canvas: paint(L, palette.sand, { stroke: TITLE_SIZE * PX * 0.06 }), x: 0.07, y: -0.08, z: -LAYER_GAP },
      { canvas: paint(L, palette.slate) },
    ];
  let extra = 0; // a style's margin round the text (canvas px, both sides)
  for (const l of layers) {
    const m = plane(l.canvas, (l.canvas.width / PX) * fit, (l.canvas.height / PX) * fit);
    m.position.set(l.x ?? 0, l.y ?? 0, l.z ?? 0);
    group.add(m);
    extra = Math.max(extra, l.canvas.height - L.hPx);
  }
  // Height the kicker / subtitle stack against: the text block, plus half of
  // a style's margin (its outer half is shadow and glow, free to overlap).
  group.userData.h = ((L.hPx - L.pad * 2 + extra * 0.5) * fit) / PX;
  return group;
}

function textLine(text, { size, weight, color, maxW = 14, spacing = 0, label = null, kind = null }) {
  const L = layout(text, { size, weight, maxW, spacing, lineH: 1.35 });
  if (label) { // roomier padding for the paper label
    const extra = Math.round(size * PX * 0.7 * titleStyle.labelPad);
    L.pad += extra / 2;
    L.wPx += extra * 1.4;
    L.hPx += extra;
  }
  const mesh = plane(paint(L, color, { label, kind }), L.wPx / PX, L.hPx / PX);
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
      size: 0.32, weight: 800, color: titleStyle.kickerColor ?? palette.roseMauve, spacing: 5, label: 'rgba(251,248,241,0.88)', kind: 'kicker',
    });
    p.position.y = topY + 0.3 + p.userData.h / 2;
    inner.add(p);
    subPlanes.push(p);
    topY += 0.3 + p.userData.h;
  }
  if (subtitle) {
    const p = textLine(String(subtitle), {
      size: 0.42, weight: 700, color: titleStyle.subtitleColor ?? palette.inkBody, maxW: 18, label: 'rgba(251,248,241,0.9)', kind: 'subtitle',
    });
    p.position.y = botY - 0.35 - p.userData.h / 2;
    inner.add(p);
    subPlanes.push(p);
  }
  // group → stage (a style's entrance poses this) → inner (idle bob)
  const stage = new THREE.Group();
  stage.add(inner);
  group.add(stage);
  group.userData.hasKicker = Boolean(kicker);

  const style = titleStyle; // the style this title was built under
  const custom = style.reveal;
  const ctx = { title: true };
  // keep a styled block's top under the limit (the paper title never moves)
  const baseY = style === paperTitle ? 0 : -Math.max(0, topY - TOP_LIMIT);
  inner.position.y = baseY;

  const state = { s: 0 };
  let shown = false;
  const phase = Math.random() * Math.PI * 2;

  function apply() {
    if (custom) {
      stage.visible = state.s > 0.001;
      if (stage.visible) custom(stage, Math.min(state.s, 1), ctx);
      return;
    }
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
      const e = want ? ease.backOut : ease.inCubic;
      tween(state, { s: want ? 1 : 0 }, custom ? style.revealDuration : 0.5, custom ? ease.linear : e, apply);
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
    inner.position.y = baseY + Math.sin(t * 0.7 + phase) * 0.08;
    inner.rotation.z = Math.sin(t * 0.45 + phase) * 0.008;
  };

  return group;
}

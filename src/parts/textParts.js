import { makeCard, cardOptsFrom, wrapLines, FONT_STACK, PX } from './card.js';
import { palette } from '../assets/palette.js';

// text and bullets parts — papercraft cards with canvas-drawn typography.
// Shared customization fields (also honored by the other card parts):
//   width?, height? (override the derived height), fontScale?, align?
//   ("left"|"center"), cardColor?, accentColor?, card: false (no slab)

const measureCtx = document.createElement('canvas').getContext('2d');

const TITLE_SIZE = 0.52 * PX;
const BODY_SIZE = 0.36 * PX;
const PAD = 0.42 * PX;
const LINE = 1.42;

export function fontsFor(def) {
  const fs = typeof def.fontScale === 'number' && def.fontScale > 0 ? def.fontScale : 1;
  return {
    fs,
    titleSize: TITLE_SIZE * fs,
    bodySize: BODY_SIZE * fs,
    pad: PAD,
    titleFont: `700 ${TITLE_SIZE * fs}px ${FONT_STACK}`,
    bodyFont: `400 ${BODY_SIZE * fs}px ${FONT_STACK}`,
  };
}

// height: author override wins; otherwise the derived content height.
function cardHeight(def, derivedPx, min = 1.1) {
  if (typeof def.height === 'number' && def.height > 0) return def.height;
  return Math.max(derivedPx / PX, min);
}

// ── text ── fields: title?, body? (supports \n), width? + shared fields
export function textPart(def) {
  const w = def.width ?? 5.5;
  const { titleSize, bodySize, pad, titleFont, bodyFont } = fontsFor(def);
  const innerW = w * PX - pad * 2;
  const center = def.align === 'center';

  measureCtx.font = titleFont;
  const titleLines = def.title ? wrapLines(measureCtx, def.title, innerW) : [];
  measureCtx.font = bodyFont;
  const bodyLines = def.body ? wrapLines(measureCtx, def.body, innerW) : [];

  const hPx = pad * 2
    + titleLines.length * titleSize * LINE
    + (titleLines.length && bodyLines.length ? 0.24 * PX : 0)
    + bodyLines.length * bodySize * LINE;
  const h = cardHeight(def, hPx);

  return makeCard(w, h, (ctx, wPx) => {
    ctx.textAlign = center ? 'center' : 'left';
    const tx = center ? wPx / 2 : pad;
    let y = pad + titleSize * 0.85;
    ctx.fillStyle = palette.ink;
    ctx.font = titleFont;
    for (const line of titleLines) {
      ctx.fillText(line, tx, y);
      y += titleSize * LINE;
    }
    if (titleLines.length) {
      // dusty-rose underline flourish
      ctx.fillStyle = palette.dustyRose;
      const ux = center ? wPx / 2 - 0.55 * PX : pad;
      ctx.fillRect(ux, y - titleSize * LINE + titleSize * 0.3, 1.1 * PX, 5);
      y += 0.24 * PX;
    }
    ctx.fillStyle = palette.inkBody;
    ctx.font = bodyFont;
    for (const line of bodyLines) {
      ctx.fillText(line, tx, y);
      y += bodySize * LINE;
    }
  }, cardOptsFrom(def));
}

// ── bullets ── fields: title?, items: [string], width? + shared fields
export function bulletsPart(def) {
  const w = def.width ?? 5.5;
  const { titleSize, bodySize, pad, titleFont, bodyFont } = fontsFor(def);
  const innerW = w * PX - pad * 2 - 0.45 * PX;
  const items = Array.isArray(def.items) ? def.items : [];

  measureCtx.font = titleFont;
  const titleLines = def.title ? wrapLines(measureCtx, def.title, w * PX - pad * 2) : [];
  measureCtx.font = bodyFont;
  const wrapped = items.map((it) => wrapLines(measureCtx, String(it), innerW));

  const itemGap = 0.18 * PX;
  const hPx = pad * 2
    + titleLines.length * titleSize * LINE
    + (titleLines.length ? 0.28 * PX : 0)
    + wrapped.reduce((acc, ls) => acc + ls.length * bodySize * LINE + itemGap, 0);
  const h = cardHeight(def, hPx);

  return makeCard(w, h, (ctx) => {
    let y = pad + titleSize * 0.85;
    ctx.fillStyle = palette.ink;
    ctx.font = titleFont;
    for (const line of titleLines) {
      ctx.fillText(line, pad, y);
      y += titleSize * LINE;
    }
    if (titleLines.length) {
      ctx.fillStyle = palette.dustyRose;
      ctx.fillRect(pad, y - titleSize * LINE + titleSize * 0.3, 1.1 * PX, 5);
      y += 0.28 * PX;
    }
    ctx.font = bodyFont;
    for (const lines of wrapped) {
      // papercraft diamond marker
      ctx.fillStyle = palette.sageDark;
      ctx.save();
      ctx.translate(pad + 0.11 * PX, y - bodySize * 0.32);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-0.08 * PX, -0.08 * PX, 0.16 * PX, 0.16 * PX);
      ctx.restore();
      ctx.fillStyle = palette.inkBody;
      for (const line of lines) {
        ctx.fillText(line, pad + 0.45 * PX, y);
        y += bodySize * LINE;
      }
      y += itemGap;
    }
  }, cardOptsFrom(def));
}

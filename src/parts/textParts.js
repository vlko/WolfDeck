import { makeCard, wrapLines, FONT_STACK, PX } from './card.js';
import { palette } from '../assets/palette.js';

// text and bullets parts — papercraft cards with canvas-drawn typography.

const measureCtx = document.createElement('canvas').getContext('2d');

const TITLE_SIZE = 0.52 * PX;
const BODY_SIZE = 0.36 * PX;
const PAD = 0.42 * PX;
const LINE = 1.42;

function titleFont() { return `700 ${TITLE_SIZE}px ${FONT_STACK}`; }
function bodyFont() { return `400 ${BODY_SIZE}px ${FONT_STACK}`; }

// ── text ── fields: title?, body? (supports \n), width?
export function textPart(def) {
  const w = def.width ?? 5.5;
  const innerW = (w - 0.9) * PX;

  measureCtx.font = titleFont();
  const titleLines = def.title ? wrapLines(measureCtx, def.title, innerW) : [];
  measureCtx.font = bodyFont();
  const bodyLines = def.body ? wrapLines(measureCtx, def.body, innerW) : [];

  const hPx = PAD * 2
    + titleLines.length * TITLE_SIZE * LINE
    + (titleLines.length && bodyLines.length ? 0.24 * PX : 0)
    + bodyLines.length * BODY_SIZE * LINE;
  const h = Math.max(hPx / PX, 1.1);

  return makeCard(w, h, (ctx, wPx) => {
    let y = PAD + TITLE_SIZE * 0.85;
    ctx.fillStyle = palette.deepBrown;
    ctx.font = titleFont();
    for (const line of titleLines) {
      ctx.fillText(line, PAD, y);
      y += TITLE_SIZE * LINE;
    }
    if (titleLines.length) {
      // dusty-rose underline flourish
      ctx.fillStyle = palette.dustyRose;
      ctx.fillRect(PAD, y - TITLE_SIZE * LINE + TITLE_SIZE * 0.3, 1.1 * PX, 5);
      y += 0.24 * PX;
    }
    ctx.fillStyle = palette.charcoal;
    ctx.font = bodyFont();
    for (const line of bodyLines) {
      ctx.fillText(line, PAD, y);
      y += BODY_SIZE * LINE;
    }
  });
}

// ── bullets ── fields: title?, items: [string], width?
export function bulletsPart(def) {
  const w = def.width ?? 5.5;
  const innerW = (w - 1.35) * PX;
  const items = Array.isArray(def.items) ? def.items : [];

  measureCtx.font = titleFont();
  const titleLines = def.title ? wrapLines(measureCtx, def.title, (w - 0.9) * PX) : [];
  measureCtx.font = bodyFont();
  const wrapped = items.map((it) => wrapLines(measureCtx, String(it), innerW));

  const itemGap = 0.18 * PX;
  const hPx = PAD * 2
    + titleLines.length * TITLE_SIZE * LINE
    + (titleLines.length ? 0.28 * PX : 0)
    + wrapped.reduce((acc, ls) => acc + ls.length * BODY_SIZE * LINE + itemGap, 0);
  const h = Math.max(hPx / PX, 1.1);

  return makeCard(w, h, (ctx) => {
    let y = PAD + TITLE_SIZE * 0.85;
    ctx.fillStyle = palette.deepBrown;
    ctx.font = titleFont();
    for (const line of titleLines) {
      ctx.fillText(line, PAD, y);
      y += TITLE_SIZE * LINE;
    }
    if (titleLines.length) {
      ctx.fillStyle = palette.dustyRose;
      ctx.fillRect(PAD, y - TITLE_SIZE * LINE + TITLE_SIZE * 0.3, 1.1 * PX, 5);
      y += 0.28 * PX;
    }
    ctx.font = bodyFont();
    for (const lines of wrapped) {
      // papercraft diamond marker
      ctx.fillStyle = palette.sage;
      ctx.save();
      ctx.translate(PAD + 0.11 * PX, y - BODY_SIZE * 0.32);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-0.08 * PX, -0.08 * PX, 0.16 * PX, 0.16 * PX);
      ctx.restore();
      ctx.fillStyle = palette.charcoal;
      for (const line of lines) {
        ctx.fillText(line, PAD + 0.45 * PX, y);
        y += BODY_SIZE * LINE;
      }
      y += itemGap;
    }
  });
}

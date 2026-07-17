import { makeCard, cardOptsFrom, growDriver, windowK, wrapLines, FONT_STACK, PX } from './card.js';
import { fontsFor } from './textParts.js';
import { palette } from '../assets/palette.js';
import { ease } from '../engine/tween.js';

// Presentation info parts: stat (KPI tile), numbered (01/02/03 list),
// callout (accent banner), table (data grid). All are papercraft cards with
// canvas typography, honoring the shared fields width?, height?, fontScale?,
// cardColor?, accentColor?, card: false.

const measureCtx = document.createElement('canvas').getContext('2d');
const LINE = 1.42;

// ── stat ── fields: value, label?, note? + shared fields.
// The numeric portion of `value` counts up from 0 while the tile lands.
export function statPart(def) {
  const w = def.width ?? 3.6;
  const { fs } = fontsFor(def);
  const pad = 0.42 * PX;
  const innerW = w * PX - pad * 2;
  const valueSize = 0.62 * PX * fs;
  const labelSize = 0.27 * PX * fs;
  const noteSize = 0.26 * PX * fs;

  const value = String(def.value ?? '');
  const label = def.label ? String(def.label).toUpperCase() : '';
  const note = def.note ? String(def.note) : '';

  // Shrink the value font until the full string fits on one line.
  let vSize = valueSize;
  measureCtx.font = `800 ${vSize}px ${FONT_STACK}`;
  while (vSize > valueSize * 0.5 && measureCtx.measureText(value).width > innerW) {
    vSize *= 0.94;
    measureCtx.font = `800 ${vSize}px ${FONT_STACK}`;
  }

  measureCtx.font = `700 ${labelSize}px ${FONT_STACK}`;
  const labelLines = label ? wrapLines(measureCtx, label, innerW) : [];
  measureCtx.font = `400 ${noteSize}px ${FONT_STACK}`;
  const noteLines = note ? wrapLines(measureCtx, note, innerW) : [];

  const hPx = pad * 1.6
    + vSize * 1.1
    + (labelLines.length ? 0.16 * PX + labelLines.length * labelSize * 1.3 : 0)
    + (noteLines.length ? 0.14 * PX + noteLines.length * noteSize * LINE : 0)
    + pad * 0.9;
  const h = typeof def.height === 'number' && def.height > 0 ? def.height : Math.max(hPx / PX, 1.5);

  const anim = parseStatNumber(value);

  function draw(k) {
    return (ctx) => {
      const shown = anim ? anim.format(anim.number * ease.outCubic(k)) : value;
      let y = pad * 0.8 + 0.16 * PX + vSize * 0.82;
      ctx.textAlign = 'left';
      ctx.fillStyle = palette.deepBrown;
      ctx.font = `800 ${vSize}px ${FONT_STACK}`;
      ctx.fillText(shown, pad, y);
      y += vSize * 0.28;
      ctx.fillStyle = palette.charcoal;
      ctx.font = `700 ${labelSize}px ${FONT_STACK}`;
      for (const line of labelLines) {
        y += labelSize * 1.3;
        ctx.fillText(line, pad, y);
      }
      if (noteLines.length) y += 0.14 * PX;
      ctx.fillStyle = palette.barkBrown;
      ctx.font = `400 ${noteSize}px ${FONT_STACK}`;
      for (const line of noteLines) {
        y += noteSize * LINE;
        ctx.fillText(line, pad, y);
      }
    };
  }

  const card = makeCard(w, h, draw(1), cardOptsFrom(def, { accent: palette.dustyRose }));
  if (anim) growDriver(card, (k) => card.userData.redraw(draw(k)), 1.1);
  return card;
}

// Finds the first number in a stat value string (Slovak formats welcome:
// "16 553 897 €", "94,3 %", "+2 479 272 €", "1,45 mil. €") and returns its
// numeric value plus a formatter that writes an interpolated number back
// into the original string with the same grouping and decimals.
function parseStatNumber(value) {
  const m = /\d[\d\s  .,]*/.exec(value);
  if (!m) return null;
  const raw = m[0].replace(/[\s  .,]+$/, ''); // trim trailing separators
  const compact = raw.replace(/[\s  ]/g, '');
  // Comma is the decimal mark; dots inside numbers are treated as grouping.
  const lastComma = compact.lastIndexOf(',');
  const decimals = lastComma >= 0 ? compact.length - lastComma - 1 : 0;
  const number = Number(compact.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(number)) return null;
  const grouped = /[\s  ]/.test(raw);
  const format = (n) => {
    let s = n.toFixed(decimals);
    let [int, frac] = s.split('.');
    if (grouped) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    s = frac != null ? `${int},${frac}` : int;
    return value.slice(0, m.index) + s + value.slice(m.index + raw.length);
  };
  return { number, format };
}

// ── numbered ── fields: title?, items: [{title?, text} | string], start? +
// shared fields. Items fade in one after another as the card lands.
export function numberedPart(def) {
  const w = def.width ?? 5.5;
  const { titleSize, bodySize, pad, titleFont, bodyFont } = fontsFor(def);
  const itemTitleFont = `700 ${bodySize}px ${FONT_STACK}`;
  const items = (Array.isArray(def.items) ? def.items : []).map((it) => (
    typeof it === 'object' && it !== null
      ? { title: it.title ? String(it.title).toUpperCase() : '', text: String(it.text ?? '') }
      : { title: '', text: String(it) }
  ));
  const start = typeof def.start === 'number' ? def.start : 1;

  const badge = 0.52 * PX;
  const textX = pad + badge + 0.28 * PX;
  const innerW = w * PX - textX - pad;

  measureCtx.font = titleFont;
  const titleLines = def.title ? wrapLines(measureCtx, def.title, w * PX - pad * 2) : [];
  const wrapped = items.map((it) => {
    measureCtx.font = bodyFont;
    const text = it.text ? wrapLines(measureCtx, it.text, innerW) : [];
    return { ...it, text };
  });

  const itemGap = 0.26 * PX;
  const itemH = (it) => Math.max(
    (it.title ? bodySize * 1.35 : 0) + it.text.length * bodySize * LINE,
    badge,
  );
  const hPx = pad * 2
    + titleLines.length * titleSize * LINE
    + (titleLines.length ? 0.28 * PX : 0)
    + wrapped.reduce((acc, it) => acc + itemH(it) + itemGap, 0);
  const h = typeof def.height === 'number' && def.height > 0 ? def.height : Math.max(hPx / PX, 1.1);

  function draw(k) {
    return (ctx) => {
      ctx.textAlign = 'left';
      let y = pad + titleSize * 0.85;
      ctx.fillStyle = palette.deepBrown;
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
      y -= titleSize * 0.85; // switch to top-of-item coordinates
      wrapped.forEach((it, i) => {
        ctx.globalAlpha = ease.outCubic(windowK(k, i, wrapped.length, 0.4));
        // number badge — papercraft circle with 01/02/03
        const cx = pad + badge / 2;
        const cy = y + badge / 2;
        ctx.fillStyle = palette.roseMauve;
        ctx.beginPath();
        ctx.arc(cx, cy, badge / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = palette.paperWhite;
        ctx.font = `800 ${0.24 * PX}px ${FONT_STACK}`;
        ctx.textAlign = 'center';
        ctx.fillText(String(start + i).padStart(2, '0'), cx, cy + 0.085 * PX);
        ctx.textAlign = 'left';
        let ty = y + bodySize * 0.9;
        if (it.title) {
          ctx.fillStyle = palette.deepBrown;
          ctx.font = itemTitleFont;
          ctx.fillText(it.title, textX, ty);
          ty += bodySize * 1.35;
        }
        ctx.fillStyle = palette.charcoal;
        ctx.font = bodyFont;
        for (const line of it.text) {
          ctx.fillText(line, textX, ty);
          ty += bodySize * LINE;
        }
        y += itemH(it) + itemGap;
      });
      ctx.globalAlpha = 1;
    };
  }

  const card = makeCard(w, h, draw(1), cardOptsFrom(def));
  growDriver(card, (k) => card.userData.redraw(draw(k)), 1.0);
  return card;
}

// ── callout ── fields: text (or body), title?, tone: "info"|"positive"|
// "warning" + shared fields. An accent-edged banner with a tone icon.
const TONES = {
  info: { icon: '→', color: palette.duckEggBlue },
  positive: { icon: '✓', color: palette.sage },
  warning: { icon: '!', color: palette.strawGold },
};

export function calloutPart(def) {
  const w = def.width ?? 6;
  const { bodySize, pad } = fontsFor(def);
  const tone = TONES[def.tone] ?? TONES.info;
  const barW = 0.14 * PX;
  const iconR = 0.3 * PX;
  const textX = pad + barW + iconR * 2 + 0.24 * PX;
  const innerW = w * PX - textX - pad;

  const text = String(def.text ?? def.body ?? '');
  const titleFontStr = `700 ${bodySize}px ${FONT_STACK}`;
  const bodyFontStr = `400 ${bodySize}px ${FONT_STACK}`;

  measureCtx.font = bodyFontStr;
  const lines = text ? wrapLines(measureCtx, text, innerW) : [];
  const titleLines = def.title ? (measureCtx.font = titleFontStr, wrapLines(measureCtx, String(def.title), innerW)) : [];

  const hPx = pad * 1.7
    + titleLines.length * bodySize * LINE
    + lines.length * bodySize * LINE;
  const h = typeof def.height === 'number' && def.height > 0 ? def.height : Math.max(hPx / PX, 1.15);

  return makeCard(w, h, (ctx, wPx, hPx2) => {
    // accent edge down the left side
    ctx.fillStyle = tone.color;
    ctx.fillRect(0, 0, barW, hPx2);
    // tone icon in a paper circle
    const cx = pad + barW + iconR;
    const cy = hPx2 / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, iconR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.paperWhite;
    ctx.font = `800 ${0.34 * PX}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText(tone.icon, cx, cy + 0.12 * PX);
    // text block, vertically centered
    ctx.textAlign = 'left';
    const total = (titleLines.length + lines.length) * bodySize * LINE;
    let y = hPx2 / 2 - total / 2 + bodySize * 0.9;
    ctx.fillStyle = palette.deepBrown;
    ctx.font = titleFontStr;
    for (const line of titleLines) {
      ctx.fillText(line, textX, y);
      y += bodySize * LINE;
    }
    ctx.fillStyle = palette.charcoal;
    ctx.font = bodyFontStr;
    for (const line of lines) {
      ctx.fillText(line, textX, y);
      y += bodySize * LINE;
    }
  }, cardOptsFrom(def, { color: palette.parchment }));
}

// ── table ── fields: title?, columns: [string], rows: [[cell]], align?
// (["left"|"right", …], default: right for numeric-looking columns) + shared.
export function tablePart(def) {
  const w = def.width ?? 6.5;
  const { titleSize, pad, titleFont, fs } = fontsFor(def);
  let headSize = 0.26 * PX * fs;
  let cellSize = 0.3 * PX * fs;
  let headFont = `700 ${headSize}px ${FONT_STACK}`;
  let cellFont = `400 ${cellSize}px ${FONT_STACK}`;

  const columns = (Array.isArray(def.columns) ? def.columns : []).map((c) => String(c).toUpperCase());
  const rows = (Array.isArray(def.rows) ? def.rows : [])
    .filter(Array.isArray)
    .map((r) => r.map((c) => String(c ?? '')));
  const nCols = Math.max(columns.length, ...rows.map((r) => r.length), 1);

  const numeric = (s) => /\d/.test(s) && /^[\s  \d.,%€+\-−≈()]*$/.test(s);
  const align = Array.from({ length: nCols }, (_, c) => {
    if (Array.isArray(def.align) && def.align[c]) return def.align[c] === 'right' ? 'right' : 'left';
    const cells = rows.map((r) => r[c] ?? '').filter(Boolean);
    return cells.length && cells.every(numeric) ? 'right' : 'left';
  });

  // Column widths from measured content. If the content wants more room
  // than the card offers, shrink the fonts (columns never overlap).
  const colPad = 0.28 * PX;
  const innerW = w * PX - pad * 2;
  const measureWidths = () => Array.from({ length: nCols }, (_, c) => {
    measureCtx.font = headFont;
    let max = columns[c] ? measureCtx.measureText(columns[c]).width : 0;
    measureCtx.font = cellFont;
    for (const r of rows) max = Math.max(max, measureCtx.measureText(r[c] ?? '').width);
    return max + colPad;
  });
  let widths = measureWidths();
  const wanted = widths.reduce((a, b) => a + b, 0);
  if (wanted > innerW) {
    const factor = Math.max(innerW / wanted, 0.55);
    headSize *= factor;
    cellSize *= factor;
    headFont = `700 ${headSize}px ${FONT_STACK}`;
    cellFont = `400 ${cellSize}px ${FONT_STACK}`;
    widths = measureWidths();
  }
  const scale = Math.min(innerW / widths.reduce((a, b) => a + b, 0), 1.6);
  const cols = widths.map((cw) => cw * scale);

  measureCtx.font = titleFont;
  const titleLines = def.title ? wrapLines(measureCtx, def.title, innerW) : [];

  const rowH = cellSize * 1.85;
  const headH = columns.length ? headSize * 2.1 : 0;
  const hPx = pad * 2
    + titleLines.length * titleSize * LINE
    + (titleLines.length ? 0.28 * PX : 0)
    + headH + rows.length * rowH;
  const h = typeof def.height === 'number' && def.height > 0 ? def.height : Math.max(hPx / PX, 1.3);

  return makeCard(w, h, (ctx) => {
    let y = pad + titleSize * 0.85;
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.deepBrown;
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
    y -= titleSize * 0.85; // top-of-table coordinates
    const cellX = (c) => {
      const x0 = pad + cols.slice(0, c).reduce((a, b) => a + b, 0);
      return align[c] === 'right' ? x0 + cols[c] - colPad / 2 : x0;
    };
    if (columns.length) {
      ctx.font = headFont;
      ctx.fillStyle = palette.barkBrown;
      columns.forEach((col, c) => {
        ctx.textAlign = align[c];
        ctx.fillText(col, cellX(c), y + headSize * 1.1);
      });
      y += headH;
      ctx.fillStyle = palette.deepBrown;
      ctx.fillRect(pad, y - 4, innerW, 4); // heavy rule under the header
    }
    ctx.font = cellFont;
    rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        ctx.textAlign = align[c] ?? 'left';
        ctx.fillStyle = c === 0 ? palette.deepBrown : palette.charcoal;
        ctx.fillText(cell, cellX(c), y + rowH * 0.68);
      });
      y += rowH;
      if (r < rows.length - 1) {
        ctx.fillStyle = 'rgba(95, 81, 66, 0.22)';
        ctx.fillRect(pad, y - 1, innerW, 2);
      }
    });
    ctx.textAlign = 'left';
  }, cardOptsFrom(def));
}

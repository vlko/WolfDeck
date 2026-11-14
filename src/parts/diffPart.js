import { makeCard, cardOptsFrom, growDriver, windowK, PX } from './card.js';
import { MONO_FAMILY } from './fonts.js';

// ── diff ── a console diff: a dark terminal pane with a title bar and
// monospace lines, removed lines red, added lines green.
// fields: title? (shown as the hunk name), lines: [string] — a line starting
// with "-" is a removal, "+" an addition, "@" a hunk header, anything else
// context; before?/after? (short captions for the two sides, e.g. "pred
// rokom" / "teraz", shown in the title bar) + shared fields (width,
// fontScale, cardColor…). Lines type themselves in one after another.
const measureCtx = document.createElement('canvas').getContext('2d');
const MONO = `'${MONO_FAMILY}', ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace`;

const C = {
  pane: '#22272b',
  bar: '#30373c',
  text: '#d8dee0',
  dim: '#8b979b',
  delBg: 'rgba(214, 96, 86, 0.2)',
  delMark: '#e0766b',
  delText: '#f3b5ad',
  addBg: 'rgba(110, 190, 125, 0.2)',
  addMark: '#79c98b',
  addText: '#bfeac6',
  hunk: '#7fb6c9',
};

function wrapMono(ctx, text, maxWidth) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && line) { out.push(line); line = word; } else line = attempt;
  }
  out.push(line);
  return out;
}

export function diffPart(def) {
  const w = def.width ?? 8;
  const fs = typeof def.fontScale === 'number' && def.fontScale > 0 ? def.fontScale : 1;
  const size = 0.4 * PX * fs;
  const titleSize = 0.3 * PX * fs;
  const font = `500 ${size}px ${MONO}`;
  const boldFont = `700 ${size}px ${MONO}`;
  const pad = 0.34 * PX;
  const barH = def.title || def.before || def.after ? 0.62 * PX * fs : 0.34 * PX;
  const gutter = size * 1.5; // room for the +/- sign
  const lineH = size * 1.62;

  measureCtx.font = font;
  const rows = [];
  for (const raw of Array.isArray(def.lines) ? def.lines : []) {
    const str = String(raw);
    const kind = str[0] === '-' ? 'del' : str[0] === '+' ? 'add' : str[0] === '@' ? 'hunk' : 'ctx';
    const body = kind === 'del' || kind === 'add' ? str.slice(1).trim() : (kind === 'ctx' ? str.replace(/^ /, '') : str);
    wrapMono(measureCtx, body, w * PX - pad * 2 - gutter).forEach((text, i) => {
      rows.push({ kind, text, first: i === 0 });
    });
  }
  const hPx = barH + pad * 0.8 + rows.length * lineH + pad * 0.9;
  const h = typeof def.height === 'number' && def.height > 0 ? def.height : Math.max(hPx / PX, 1.2);

  function draw(k) {
    return (ctx, wPx, hCanvas) => {
      // title bar: three paper "lights" and the hunk name
      ctx.fillStyle = C.bar;
      ctx.fillRect(0, 0, wPx, barH);
      if (barH > 0.4 * PX) {
        const cy = barH / 2;
        ['#d6746a', '#d9b25f', '#7fb98a'].forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(pad + i * titleSize * 0.95, cy, titleSize * 0.27, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.font = `700 ${titleSize}px ${MONO}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = C.text;
        const tx = pad + titleSize * 3.3;
        if (def.title) ctx.fillText(String(def.title), tx, cy + 1);
        if (def.before || def.after) {
          ctx.textAlign = 'right';
          ctx.font = `500 ${titleSize * 0.86}px ${MONO}`;
          let rx = wPx - pad;
          if (def.after) {
            ctx.fillStyle = C.addMark;
            ctx.fillText(`+ ${def.after}`, rx, cy + 1);
            rx -= ctx.measureText(`+ ${def.after}`).width + titleSize;
          }
          if (def.before) {
            ctx.fillStyle = C.delMark;
            ctx.fillText(`- ${def.before}`, rx, cy + 1);
          }
        }
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      let y = barH + pad * 0.8;
      rows.forEach((row, i) => {
        const p = windowK(k, i, rows.length, 0.35); // this line's typing progress
        if (p <= 0) { y += lineH; return; }
        if (row.kind === 'del' || row.kind === 'add') {
          ctx.fillStyle = row.kind === 'del' ? C.delBg : C.addBg;
          ctx.fillRect(0, y, wPx, lineH);
          ctx.fillStyle = row.kind === 'del' ? C.delMark : C.addMark;
          ctx.fillRect(0, y, Math.max(4, size * 0.12), lineH);
          if (row.first) {
            ctx.font = boldFont;
            ctx.fillText(row.kind === 'del' ? '-' : '+', pad, y + lineH * 0.68);
          }
        }
        ctx.font = row.kind === 'ctx' || row.kind === 'hunk' ? font : boldFont;
        ctx.fillStyle = { del: C.delText, add: C.addText, hunk: C.hunk, ctx: C.text }[row.kind];
        const n = Math.ceil(row.text.length * Math.min(1, p * 1.15));
        const shown = row.text.slice(0, n);
        const tx = pad + gutter;
        ctx.fillText(shown, tx, y + lineH * 0.68);
        if (p < 0.995) { // the caret, while the line is still being typed
          ctx.fillStyle = C.text;
          ctx.fillRect(tx + ctx.measureText(shown).width + 3, y + lineH * 0.2, size * 0.5, lineH * 0.6);
        }
        y += lineH;
      });
      void hCanvas;
    };
  }

  const card = makeCard(w, h, draw(1), cardOptsFrom(def, { face: C.pane }));
  growDriver(card, (k) => card.userData.redraw(draw(k)), 0.5 + rows.length * 0.45);
  return card;
}

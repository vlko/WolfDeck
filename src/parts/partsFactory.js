import { makeCard, makeFloatingPart } from './card.js';
import { textPart, bulletsPart } from './textParts.js';
import { statPart, numberedPart, calloutPart, tablePart } from './infoParts.js';
import { imagePart } from './imagePart.js';
import { chartPart } from './charts.js';
import { palette } from '../assets/palette.js';
import { warn } from '../config.js';

// Builds the floating in-place part for one step definition (already
// normalized by the loader: x, y, z, scale, tilt present).
// Unknown/broken types become a magenta card — never a crash.

function magentaCard(label) {
  return makeCard(3, 1.6, (ctx, w, h) => {
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, w / 2, h / 2 + 14);
  }, { color: palette.paperWhite });
}

export function buildPart(def) {
  let content = null;
  try {
    switch (def.type) {
      case 'text': content = textPart(def); break;
      case 'bullets': content = bulletsPart(def); break;
      case 'stat': content = statPart(def); break;
      case 'numbered': content = numberedPart(def); break;
      case 'callout': content = calloutPart(def); break;
      case 'table': content = tablePart(def); break;
      case 'image': content = imagePart(def); break;
      case 'chart': content = chartPart(def); break;
      default:
        warn(`unknown part type "${def.type}" — magenta placeholder used (known: text, bullets, stat, numbered, callout, table, image, chart)`);
    }
  } catch (err) {
    warn(`part "${def.type}" failed to build:`, err);
    content = null;
  }
  if (!content) content = magentaCard(def.type);

  const part = makeFloatingPart(content, { scale: def.scale, tilt: def.tilt });
  part.position.set(def.x, def.y, def.z);
  return part;
}

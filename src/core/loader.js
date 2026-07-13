import { ROWS, SCENE_SPACING, WALK_SPEED, warn } from '../config.js';

// Fetch + leniently validate public/presentation.json.
// Only a JSON parse failure is fatal (shown in the #fatal overlay);
// everything else degrades to warnings and defaults.

export async function loadPresentation(url = 'presentation.json') {
  let raw;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    raw = await res.json();
  } catch (err) {
    const el = document.getElementById('fatal');
    el.textContent = `WolfDeck could not load ${url}\n\n${err}\n\nThe deck lives in public/presentation.json — check that it exists and is valid JSON.`;
    el.classList.add('show');
    throw err;
  }
  return normalize(raw);
}

// Resolve a row name or raw number to a z depth.
export function resolveDepth(value, fallback, context) {
  if (typeof value === 'number') return value;
  if (value == null) return fallback;
  if (value in ROWS) return ROWS[value];
  warn(`${context}: unknown layer/depth "${value}" — using default`);
  return fallback;
}

function normalize(raw) {
  const deck = typeof raw === 'object' && raw !== null ? raw : {};
  const meta = typeof deck.meta === 'object' && deck.meta !== null ? deck.meta : {};

  const out = {
    meta: {
      title: meta.title ?? 'WolfDeck',
      sceneSpacing: typeof meta.sceneSpacing === 'number' ? meta.sceneSpacing : SCENE_SPACING,
      walkSpeed: typeof meta.walkSpeed === 'number' ? meta.walkSpeed : WALK_SPEED,
      seed: typeof meta.seed === 'number' ? meta.seed : 1,
      rivers: Array.isArray(meta.rivers)
        ? meta.rivers
          .filter((r) => r && typeof r.x === 'number')
          .map((r) => ({ x: r.x, width: typeof r.width === 'number' ? r.width : 3 }))
        : [],
      roads: Array.isArray(meta.roads)
        ? meta.roads
          .filter((r) => r && typeof r.z === 'number' && typeof r.from === 'number' && typeof r.to === 'number')
          .map((r) => ({
            z: r.z, width: typeof r.width === 'number' ? r.width : 2.4, from: r.from, to: r.to,
          }))
        : [],
    },
    scenes: [],
  };

  const scenes = Array.isArray(deck.scenes) ? deck.scenes : [];
  if (!scenes.length) warn('deck has no scenes');

  scenes.forEach((s, i) => {
    const scene = typeof s === 'object' && s !== null ? s : {};
    const id = scene.id ?? `scene-${i}`;
    const props = Array.isArray(scene.props) ? scene.props : [];
    const steps = Array.isArray(scene.steps) ? scene.steps : [];

    out.scenes.push({
      id,
      title: typeof scene.title === 'string' ? scene.title : '',
      props: props.map((p, j) => normalizeProp(p, `scene "${id}" prop ${j}`)),
      steps: steps.map((st, j) => normalizeStep(st, `scene "${id}" step ${j}`)).filter(Boolean),
    });
  });

  return out;
}

function normalizeProp(p, context) {
  const prop = typeof p === 'object' && p !== null ? p : {};
  if (!prop.type) warn(`${context}: missing "type"`);
  const pos = Array.isArray(prop.position) ? prop.position : [0, 0];
  let scale = prop.scale ?? 1;
  if (typeof scale === 'number') scale = [scale, scale, scale];
  return {
    type: String(prop.type ?? 'unknown'),
    x: Number(pos[0]) || 0,
    y: Number(pos[1]) || 0,
    dz: Number(pos[2]) || 0,
    z: resolveDepth(prop.layer, ROWS.action, context),
    scale,
    rotation: (Number(prop.rotation) || 0) * (Math.PI / 180),
    options: typeof prop.options === 'object' && prop.options !== null ? prop.options : {},
  };
}

function normalizeStep(st, context) {
  const step = typeof st === 'object' && st !== null ? st : {};
  const part = step.part ?? step.popup; // "popup" accepted for old decks
  if (typeof part !== 'object' || part === null) {
    warn(`${context}: step has no "part" — skipped`);
    return null;
  }
  // position and depth are optional — steps without them are placed on the
  // default cascade (each panel in front of the previous) by the deck.
  const pos = Array.isArray(part.position) ? part.position : null;
  return {
    part: {
      ...part,
      type: String(part.type ?? 'text'),
      x: pos ? Number(pos[0]) || 0 : null,
      y: pos && pos[1] != null ? Number(pos[1]) || 0 : null,
      z: part.depth != null ? resolveDepth(part.depth, 4, context) : null,
      scale: typeof part.scale === 'number' ? part.scale : 1,
      tilt: (Number(part.tilt) || 0) * (Math.PI / 180),
    },
  };
}

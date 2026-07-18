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

  scenes.forEach((s, i) => out.scenes.push(normalizeScene(s, i)));
  return out;
}

// A scene is a diorama holding one or more virtual SLIDES (each with its own
// title + subtitle + id). A slide holds panel GROUPS (batches of ≤4 panels
// revealed one at a time). Internally we flatten to a list of `steps` (one per
// group) tagged with which slide they belong to, plus a `slides` summary that
// the menu / URL address. Every group clears the previous one.
function normalizeScene(s, i) {
  const scene = typeof s === 'object' && s !== null ? s : {};
  const id = scene.id ?? `scene-${i}`;
  const kicker = typeof scene.kicker === 'string' ? scene.kicker : '';
  const props = (Array.isArray(scene.props) ? scene.props : [])
    .map((p, j) => normalizeProp(p, `scene "${id}" prop ${j}`));

  // Accept the modern slides[] form, or fold a legacy steps[]/part scene into
  // a single implicit slide carrying the scene's own title/subtitle.
  const rawSlides = Array.isArray(scene.slides) ? scene.slides : [{
    id: `${id}-main`,
    title: typeof scene.title === 'string' ? scene.title : '',
    subtitle: typeof scene.subtitle === 'string' ? scene.subtitle : '',
    steps: Array.isArray(scene.steps) ? scene.steps : [],
    legacy: true,
  }];

  const steps = [];
  const slides = rawSlides.map((sl, si) => {
    const slide = typeof sl === 'object' && sl !== null ? sl : {};
    const sid = slide.id ?? `${id}-s${si}`;
    const ctx = `scene "${id}" slide "${sid}"`;

    // A group is a batch of parts. Modern slides list them under `groups`;
    // a folded legacy scene lists them under `steps` (each with its `clears`).
    const rawGroups = Array.isArray(slide.groups) ? slide.groups
      : (Array.isArray(slide.steps) ? slide.steps : []);
    const groups = rawGroups
      .map((g, gi) => {
        const parts = normalizeGroup(g, `${ctx} group ${gi}`);
        return parts ? { parts, legacyClears: g?.clears === true } : null;
      })
      .filter(Boolean);

    const firstStep = steps.length;
    const isFirst = si === 0 && !slide.legacy;
    // Every slide opens with its title/subtitle/kicker shown ALONE (a "title
    // beat") before its first group. The scene's first slide's title beat is
    // simply the k=0 arrival state, so it needs no step; every later slide
    // gets one empty step to land on. (Legacy single-slide scenes keep k=0.)
    if (!isFirst && !slide.legacy) {
      steps.push({ parts: [], clears: true, slideIndex: si, slideStart: true });
    }
    groups.forEach((g, gi) => {
      // New format: every group clears the previous (one at a time). Legacy:
      // honor each step's own clears. The title beat already carried the
      // title, so groups are slideStart only for the first slide's opener.
      const clears = slide.legacy ? g.legacyClears : (steps.length > 0);
      const slideStart = slide.legacy ? gi === 0 : (isFirst && gi === 0);
      steps.push({ parts: g.parts, clears, slideIndex: si, slideStart });
    });

    return {
      id: sid,
      title: typeof slide.title === 'string' ? slide.title : '',
      subtitle: typeof slide.subtitle === 'string' ? slide.subtitle : '',
      kicker: typeof slide.kicker === 'string' ? slide.kicker : kicker, // slide overrides scene
      // Jump target: the first slide is the k=0 arrival cover; every later
      // slide lands on its title beat (steps 0..firstStep, visible = beat).
      jumpK: isFirst ? 0 : firstStep + 1,
    };
  });

  return { id, kicker, props, steps, slides };
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

function normalizePart(part, context) {
  // position and depth are optional — parts without them are placed on the
  // default cascade (each panel in front of the previous) by the deck.
  const pos = Array.isArray(part.position) ? part.position : null;
  return {
    ...part,
    type: String(part.type ?? 'text'),
    x: pos ? Number(pos[0]) || 0 : null,
    y: pos && pos[1] != null ? Number(pos[1]) || 0 : null,
    z: part.depth != null ? resolveDepth(part.depth, 4, context) : null,
    scale: typeof part.scale === 'number' ? part.scale : 1,
    tilt: (Number(part.tilt) || 0) * (Math.PI / 180),
  };
}

// A group reveals a batch of panels together (staggered). Accepts a single
// "part" (legacy "popup" too) or a "parts" array. Returns the normalized parts
// array, or null when empty.
function normalizeGroup(g, context) {
  const group = typeof g === 'object' && g !== null ? g : {};
  const raw = Array.isArray(group.parts) ? group.parts : [group.part ?? group.popup];
  const parts = raw
    .filter((p) => typeof p === 'object' && p !== null)
    .map((p) => normalizePart(p, context));
  if (!parts.length) {
    warn(`${context}: no "part(s)" — skipped`);
    return null;
  }
  return parts;
}

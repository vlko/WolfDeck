// Slide styles — how a slide's panels, heading, kicker and subtitle look and
// how its panels enter. A slide picks one with "style" (see SPECIFICATION);
// "paper" is the built-in cut-paper look and needs no module. The others are
// loaded only when a deck uses them.
//
// A style module exports
//   default  the panel style  (parts/card.js setPanelStyle)
//   title    the title style  (parts/title.js setTitleStyle)
import { setPanelStyle } from '../parts/card.js';
import { setTitleStyle } from '../parts/title.js';

const loaders = {
  tear: () => import('./tear.js'), // a rip in the paper world, a white page behind
  screen: () => import('./screen.js'), // a glowing display in a graphite bezel
  cyber: () => import('./cyber.js'), // neon, cut corners, glitches
  sticker: () => import('./sticker.js'), // a comic sticker stuck on the glass
};

export const DEFAULT_STYLE = 'paper';
export const STYLE_NAMES = [DEFAULT_STYLE, ...Object.keys(loaders)];

const loaded = new Map();

// Fetch the modules of these styles (unknown names and "paper" are skipped).
export async function loadStyles(names) {
  await Promise.all([...new Set(names)].map(async (n) => {
    if (loaders[n] && !loaded.has(n)) loaded.set(n, await loaders[n]());
  }));
}

// Everything built from now on — panels and titles — takes this style.
export function useStyle(name) {
  const m = loaded.get(name);
  setPanelStyle(m?.default ?? null);
  setTitleStyle(m?.title ?? null);
}

import * as THREE from 'three';
import { palette } from '../assets/palette.js';

// Moods — the weather of a scene. A scene (or a single slide) names one with
// "mood"; the sky, hills, clouds, ground, fog and the model lights then ease
// toward it as the camera gets there, and back again as it leaves. Scenes
// without a mood keep the storybook day.
//
// Tints MULTIPLY the paper colors (white = unchanged), so every preset is the
// same world in a different light. Panels and titles are unlit and stay
// readable in any mood.
const P = (o) => ({
  sky: '#ffffff', hills: '#ffffff', ground: '#ffffff', clouds: '#ffffff',
  fog: palette.skyLow, fogNear: 60, fogFar: 120,
  hemiSky: '#ffffff', hemiGround: '#c9bda5', hemi: 2.15,
  key: '#fff6e8', keyI: 1.9,
  sun: 1, stars: 0,
  ...o,
});

export const MOODS = {
  day: P({}),
  // overcast and heavy: the fear slides
  gloom: P({
    sky: '#5e636b', hills: '#6c7279', ground: '#84898a', clouds: '#6e737b',
    fog: '#585e65', fogNear: 20, fogFar: 74,
    hemiSky: '#aab6c8', hemiGround: '#6b665c', hemi: 1.2, key: '#c4d0e4', keyI: 0.75,
    sun: 0,
  }),
  // first light after the gloom
  dawn: P({
    sky: '#ffe6cf', hills: '#eed9cc', ground: '#f3e8d6', clouds: '#fff0e0',
    fog: '#f1dcc6', fogNear: 55, fogFar: 120,
    hemiSky: '#fff3e2', hemiGround: '#d2bfa2', hemi: 2.2, key: '#ffdcae', keyI: 2.15,
    sun: 1,
  }),
  // warm evening
  dusk: P({
    sky: '#f0c0a4', hills: '#c0a09c', ground: '#d2bba6', clouds: '#f3cdb6',
    fog: '#dcb6a0', fogNear: 45, fogFar: 110,
    hemiSky: '#ffe2cc', hemiGround: '#b79c86', hemi: 1.75, key: '#ffbf8e', keyI: 1.7,
    sun: 1,
  }),
  // a stage at night: dark blue world, stars, lamps and screens glow
  night: P({
    sky: '#2c3250', hills: '#394060', ground: '#5a6072', clouds: '#464d6a',
    fog: '#272c44', fogNear: 30, fogFar: 92,
    hemiSky: '#9fb0e0', hemiGround: '#55536a', hemi: 1.3, key: '#c2ceff', keyI: 0.9,
    sun: 0, stars: 1,
  }),
};
export const MOOD_NAMES = Object.keys(MOODS);
export const DEFAULT_MOOD = 'day';

const COLORS = ['sky', 'hills', 'ground', 'clouds', 'fog', 'hemiSky', 'hemiGround', 'key'];
const NUMBERS = ['fogNear', 'fogFar', 'hemi', 'keyI', 'sun', 'stars'];

// A mutable mood state that can be mixed and eased.
export function moodState(name = DEFAULT_MOOD) {
  const src = MOODS[name] ?? MOODS.day;
  const s = {};
  for (const k of COLORS) s[k] = new THREE.Color(src[k]);
  for (const k of NUMBERS) s[k] = src[k];
  return s;
}

// out = a·(1−f) + b·f
export function mixMoods(out, a, b, f) {
  for (const k of COLORS) out[k].copy(a[k]).lerp(b[k], f);
  for (const k of NUMBERS) out[k] = a[k] + (b[k] - a[k]) * f;
  return out;
}

// Ease `current` toward `target` (frame-rate independent). Returns true while
// it is still moving.
export function easeMood(current, target, dt, rate = 2.6) {
  const k = 1 - Math.exp(-dt * rate);
  let moving = false;
  for (const key of COLORS) {
    const c = current[key];
    const t = target[key];
    if (Math.abs(c.r - t.r) + Math.abs(c.g - t.g) + Math.abs(c.b - t.b) > 0.002) { c.lerp(t, k); moving = true; } else c.copy(t);
  }
  for (const key of NUMBERS) {
    const d = target[key] - current[key];
    if (Math.abs(d) > 0.002) { current[key] += d * k; moving = true; } else current[key] = target[key];
  }
  return moving;
}

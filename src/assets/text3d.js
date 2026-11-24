import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontData from 'three/examples/fonts/optimer_bold.typeface.json';
import { register } from './registry.js';
import { contactShadow } from './sprites.js';
import { applyAnimation } from './helpers.js';

// text3d — real extruded lettering standing in the diorama (a sign, a closing
// title). Loaded only by decks that use it (see main.js).
//   options: text ("\n" starts a new row), size (cap height in world units,
//   default 1.4), depth (extrusion, default size × 0.45), color (faces),
//   sideColor, colors: [..] (cycled per letter), arc (degrees the row bends
//   over, 0 = straight), roll (degrees the whole lettering leans), glow (0…1 — how much the letters shine by
//   themselves; use it in dark moods), animation: "wave" (default) | "pop" | "none".
// The font (Optimer Bold) has no Slovak diacritics — keep to plain Latin.
const font = new FontLoader().parse(fontData);

function shade(hex, k) {
  const c = new THREE.Color(hex);
  return c.offsetHSL(0, 0, k);
}

register('text3d', (options = {}) => {
  const group = new THREE.Group();
  const text = String(options.text ?? 'WolfDeck');
  const size = options.size ?? 1.4;
  const depth = options.depth ?? size * 0.45;
  const colors = Array.isArray(options.colors) && options.colors.length ? options.colors : [options.color ?? '#bd9662'];
  const rows = text.split('\n');
  // the lettering as a whole — `roll` leans it (degrees, + = rising to the right)
  const body = new THREE.Group();
  body.rotation.z = ((options.roll ?? 0) * Math.PI) / 180;
  group.add(body);
  const lineH = size * 1.42;
  const letters = [];
  let n = 0;
  let maxW = 0;

  rows.forEach((row, ri) => {
    const rowGroup = new THREE.Group();
    const glyphs = [];
    let x = 0;
    for (const ch of row) {
      if (ch === ' ') { x += size * 0.42; continue; }
      const geo = new TextGeometry(ch, { font, size, depth, curveSegments: 3, bevelEnabled: true, bevelThickness: size * 0.03, bevelSize: size * 0.025, bevelSegments: 1 });
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      const w = bb.max.x - bb.min.x;
      // origin at the letter's foot-center, so it can hop and rock in place
      geo.translate(-bb.min.x - w / 2, 0, -depth / 2);
      const face = colors[n % colors.length];
      const side = options.sideColor ?? `#${shade(face, -0.16).getHexString()}`;
      const mesh = new THREE.Mesh(geo, [
        new THREE.MeshLambertMaterial({ color: face, flatShading: true, emissive: face, emissiveIntensity: options.glow ?? 0 }),
        new THREE.MeshLambertMaterial({ color: side, flatShading: true, emissive: side, emissiveIntensity: options.glow ?? 0 }),
      ]);
      const holder = new THREE.Group();
      holder.add(mesh);
      holder.position.x = x + w / 2;
      rowGroup.add(holder);
      glyphs.push(holder);
      letters.push({ holder, i: n, baseY: 0 });
      x += w + size * 0.09;
      n += 1;
    }
    const rowW = Math.max(x - size * 0.09, 0);
    maxW = Math.max(maxW, rowW);
    // center the row; optionally bend it over an arc
    const arc = ((options.arc ?? 0) * Math.PI) / 180;
    for (const g of glyphs) {
      const u = rowW ? (g.position.x / rowW - 0.5) : 0;
      if (arc) {
        const R = rowW / arc;
        g.position.set(Math.sin(u * arc) * R, (Math.cos(u * arc) - 1) * R, 0);
        g.rotation.z = -u * arc;
      } else g.position.x -= rowW / 2;
    }
    rowGroup.position.y = (rows.length - 1 - ri) * lineH;
    body.add(rowGroup);
  });
  for (const l of letters) l.baseY = l.holder.position.y;

  if (options.shadow !== false) group.add(contactShadow(maxW * 1.04, depth * 2.4 + 0.3, 0.2));
  group.userData.footprint3d = { w: maxW, d: depth, cx: 0, cz: 0 };

  const anims = {
    // a slow wave runs along the letters
    wave: (t) => {
      for (const l of letters) {
        const p = t * 2.2 - l.i * 0.42;
        l.holder.position.y = l.baseY + Math.max(0, Math.sin(p)) ** 2 * size * 0.22;
        l.holder.rotation.x = Math.sin(p - 0.6) * 0.07;
      }
    },
    // letters hop one after another, then rest
    pop: (t) => {
      const period = letters.length * 0.12 + 2.4;
      for (const l of letters) {
        const c = ((t - l.i * 0.12) % period + period) % period;
        const k = c < 0.5 ? Math.sin((c / 0.5) * Math.PI) : 0;
        l.holder.position.y = l.baseY + k * size * 0.4;
        l.holder.scale.set(1 - k * 0.06, 1 + k * 0.12, 1);
      }
    },
  };
  applyAnimation(group, anims, options, 'wave', 'text3d');
  return group;
});

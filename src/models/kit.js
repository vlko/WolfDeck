import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getGrainTexture } from '../assets/materials.js';
import { getMaterialTexture, TEXTURE_KINDS, texturesEnabled } from '../assets/materialTextures.js';

// Modeling kit for the hand-built 3D versions of the sheet sprites.
//
// Units: every model is built in SPRITE PERCENT space — 1 unit = 1 % of its
// reference sprite's height, x centered (−w/2 … w/2), y up from the foot
// (0 … 100), z toward the viewer. Proportions are read straight off the
// sprite with a 10 % grid; the registry scales the result to world size.
//
// Look: flat-shaded paper facets lit by the scene (hemisphere + a key from
// the upper left, like the sheets), a faint per-facet tone jitter and the
// shared paper grain — the same folded-card read as the illustrations.

const cache = new Map();

// Material textures (wood, brick, roof tiles…, see assets/materialTextures.js)
// are mapped per FACE: every paper facet is planar (facet() gives flat
// normals), so the texture is projected straight onto the facet's own plane
// — u runs horizontally along it, v up its slope — in object space scaled to
// world units. Nothing swims when a part animates, slopes don't stretch,
// and brick courses / tile rows stay level around a whole building.
// Organic, directionless materials (fur, cloth, leaves…) blend three
// projections instead (kind.tri), so the pattern runs on uninterrupted
// across the facets of a round head or a crown.
// opts.texRotate turns the pattern 90° on the facet (wood grain running down
// a roof's slope boards, vertical siding).
const TEX_VERT_PARS = `
uniform float uTexWorld;
varying vec3 vTexPos;
varying vec3 vTexNrm;
`;
const TEX_VERT = `
vTexPos = position * length(modelMatrix[0].xyz) * uTexWorld;
vTexNrm = normal;
`;
const TEX_FRAG_PARS = `
uniform sampler2D uTexMap;
uniform float uTexTile;
uniform float uTexBump;
uniform float uTexRot;
uniform float uTexTri;
varying vec3 vTexPos;
varying vec3 vTexNrm;
`;
const TEX_FRAG_MAP = `
  vec3 tN = normalize(vTexNrm);
  vec3 texC;
  if (uTexTri > 0.5) {
    // organic materials: soft triplanar blend — continuous across facets
    vec3 w = pow(abs(tN), vec3(3.0));
    w /= (w.x + w.y + w.z);
    vec3 p = vTexPos / uTexTile;
    texC = texture2D(uTexMap, p.zy).rgb * w.x + texture2D(uTexMap, p.xz).rgb * w.y + texture2D(uTexMap, p.xy).rgb * w.z;
  } else {
    vec3 tT = abs(tN.y) > 0.92 ? vec3(1.0, 0.0, 0.0) : normalize(cross(vec3(0.0, 1.0, 0.0), tN));
    vec3 tB = cross(tN, tT);
    if (tB.y < 0.0 || (abs(tN.y) > 0.92 && tB.z < 0.0)) tB = -tB;
    vec2 texUv = vec2(dot(vTexPos, tT), dot(vTexPos, tB));
    texUv = mix(texUv, vec2(texUv.y, -texUv.x), uTexRot);
    texC = texture2D(uTexMap, texUv / uTexTile).rgb;
  }
  diffuseColor.rgb *= texC;
  float texH = dot(texC, vec3(0.3333));
`;
// relief: perturb the normal by the screen-space slope of the texture
const TEX_FRAG_BUMP = `
  {
    vec3 sx = dFdx(-vViewPosition);
    vec3 sy = dFdy(-vViewPosition);
    vec3 r1 = cross(sy, normal);
    vec3 r2 = cross(normal, sx);
    float det = dot(sx, r1);
    // fade the relief out once a texture tile covers few pixels — far away
    // the finite differences turn into speckle
    float tilePx = uTexTile / max(length(dFdx(vTexPos)) + length(dFdy(vTexPos)), 1e-5);
    float fade = smoothstep(60.0, 220.0, tilePx);
    vec3 grad = sign(det) * (dFdx(texH) * r1 + dFdy(texH) * r2);
    normal = normalize(abs(det) * normal - grad * uTexBump * fade);
  }
`;

// Extra world-scale factor for the texture projection. 1 in the deck; the
// lab shows every model 100 units tall and sets it to (real height / 100)
// so textures read at their true size there too.
export const TEX_WORLD = { value: 1 };

export function mat(color, opts = {}) {
  const tex = texturesEnabled && opts.tex ? opts.tex : '';
  const key = `${color}|${opts.side ?? 0}|${opts.emissive ?? ''}|${opts.flat ?? 1}|${opts.soft ?? 0}|${tex}|${opts.texScale ?? 1}|${opts.texRotate ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshLambertMaterial({
    color,
    map: getGrainTexture(),
    flatShading: opts.flat !== false,
    vertexColors: true,
    side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? 0x000000,
  });
  // Stylized fold light: exaggerate the sideways tilt of every facet, so a
  // gently folded surface reads with the strong light/dark halves of the
  // sheets without making the geometry spiky. `soft` skips it — for
  // naturally bumpy surfaces (wool) that would otherwise get noisy.
  const fold = !opts.soft;
  const kind = tex && TEXTURE_KINDS[tex];
  if (tex && !kind) throw new Error(`unknown texture "${tex}"`);
  if (fold || kind) {
    m.onBeforeCompile = (shader) => {
      let normalChunk = '#include <normal_fragment_begin>';
      if (fold) normalChunk += '\n  normal = normalize(vec3(normal.x * 3.6, normal.y * 1.3, normal.z));';
      if (kind) {
        shader.uniforms.uTexMap = { value: getMaterialTexture(tex) };
        shader.uniforms.uTexWorld = TEX_WORLD;
        shader.uniforms.uTexTile = { value: kind.tile * (opts.texScale ?? 1) };
        shader.uniforms.uTexBump = { value: kind.bump * 0.6 };
        shader.uniforms.uTexRot = { value: opts.texRotate ? 1 : 0 };
        shader.uniforms.uTexTri = { value: kind.tri ? 1 : 0 };
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\n${TEX_VERT_PARS}`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>\n${TEX_VERT}`);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${TEX_FRAG_PARS}`)
          .replace('#include <map_fragment>', `#include <map_fragment>\n${TEX_FRAG_MAP}`);
        normalChunk += TEX_FRAG_BUMP;
      }
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', normalChunk);
    };
    m.customProgramCacheKey = () => `wolfdeck-${fold ? 'fold' : 'soft'}-${tex}`;
  }
  cache.set(key, m);
  return m;
}

// Unlit flat ink (eyes, noses, window glass, decals).
export function ink(color, opts = {}) {
  const key = `ink|${color}|${opts.side ?? 0}`;
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: opts.side ?? THREE.FrontSide });
  cache.set(key, m);
  return m;
}

function seeded(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

let jitterSeed = 1;
// Per-triangle tone jitter (vertex colors) — paper facets never match exactly.
export function facet(geo, amount = 0.04) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  const r = seeded(jitterSeed += 7);
  for (let t = 0; t < n / 3; t += 1) {
    const v = 1 - amount / 2 + r() * amount;
    for (let j = 0; j < 9; j += 1) c[t * 9 + j] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

// A paper mesh at (x, y, z).
export function mesh(geo, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(facet(geo, opts.jitter ?? 0.04), opts.material ?? mat(color, opts));
  m.position.set(x, y, z);
  return m;
}

export function inkMesh(geo, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, ink(color));
  m.position.set(x, y, z);
  return m;
}

// ── primitives (all sit on their base unless noted) ───────────────────────

// Box with its bottom at y=0.
export function box(w, h, d) {
  return new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
}

// Box centered on the origin.
export function cbox(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

// Gabled roof prism: ridge along x, base width (z depth) d, height h, length w.
export function prism(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-d / 2, 0);
  s.lineTo(d / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-w / 2, 0, 0);
  return g;
}

// Front-facing gable prism: ridge along z (the triangle faces the viewer).
// Width w (x), height h, depth d (z), centered in z.
export function gable(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
}

// Two sloped roof slabs over a front-facing gable (eaves overhang): span w
// (x), rise h, depth d (z), slab thickness t.
export function gableRoof(w, h, d, t) {
  const g = new THREE.Group();
  const half = w / 2;
  const len = Math.hypot(half, h);
  const ang = Math.atan2(h, half);
  for (const side of [-1, 1]) {
    const slab = new THREE.BoxGeometry(len, t, d);
    slab.translate(side * len / 2, t / 2, 0);
    slab.rotateZ(side * ang);
    slab.translate(-side * half, 0, 0);
    g.add(new THREE.Mesh(slab));
  }
  return g;
}

export function cone(r, h, seg = 8, open = false) {
  return new THREE.ConeGeometry(r, h, seg, 1, open).translate(0, h / 2, 0);
}

export function cyl(rTop, rBot, h, seg = 10) {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg).translate(0, h / 2, 0);
}

// Faceted ball (centered).
export function ball(r, detail = 1) {
  return new THREE.IcosahedronGeometry(r, detail);
}

// Extrude a 2D outline [[x,y],…] by depth d, centered in z.
export function extrude(points, d, bevel = 0) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 6,
  });
  return g.translate(0, 0, -d / 2);
}

// Lathe from a profile [[r,y],…].
export function lathe(points, seg = 12) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

// Flat disc facing +z (decals: eyes, cheeks, windows).
export function disc(r, seg = 16) {
  return new THREE.CircleGeometry(r, seg);
}

export function plate(w, h) {
  return new THREE.PlaneGeometry(w, h);
}

// Group helper with position.
export function group(x = 0, y = 0, z = 0, ...children) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  for (const c of children) g.add(c);
  return g;
}

// Pivot: a group placed at (x,y,z) whose children are offset so the pivot
// point is the rotation center. Returns the pivot group.
export function pivot(x, y, z, ...children) {
  return group(x, y, z, ...children);
}

// Two dot eyes + optional cheeks on a face plane at depth z. Returns
// { group, blink(k) } — k 0 open … 1 shut (eyes squash to a line).
export function face({ eyeX, eyeY, eyeR, z, cheekX, cheekY, cheekR, cheekColor = '#d99a96', eyeColor = '#1f1d1a' }) {
  const g = new THREE.Group();
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = inkMesh(disc(eyeR, 14), eyeColor, s * eyeX, eyeY, z);
    g.add(e);
    eyes.push(e);
    if (cheekR) {
      const c = new THREE.Mesh(disc(cheekR, 18), new THREE.MeshBasicMaterial({ color: cheekColor, transparent: true, opacity: 0.85 }));
      c.position.set(s * cheekX, cheekY, z - 0.05);
      g.add(c);
    }
  }
  return {
    group: g,
    blink(k) { for (const e of eyes) e.scale.y = Math.max(0.12, 1 - k); },
  };
}

// Blink scheduler: returns k(t) — mostly 0, a quick 0→1→0 every few seconds.
export function blinker(phase = 0) {
  let next = 1.5 + (phase % 3);
  let start = -1;
  return (t) => {
    if (start < 0 && t > next) start = t;
    if (start >= 0) {
      const p = (t - start) / 0.16;
      if (p >= 1) { start = -1; next = t + 2.5 + Math.random() * 3.5; return 0; }
      return Math.sin(p * Math.PI);
    }
    return 0;
  };
}

// Clip a polygon to x <= cx (keep = -1) or x >= cx (keep = 1).
function clipX(points, cx, keep) {
  const out = [];
  const inside = (p) => (keep < 0 ? p[0] <= cx : p[0] >= cx);
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const ia = inside(a);
    const ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const t = (cx - a[0]) / (b[0] - a[0]);
      out.push([cx, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

// ORIGAMI SLAB — the signature shape of the sheets: a silhouette extruded to
// depth d whose front (and optionally back) face is folded along a vertical
// crease at x = cx, the crease standing `ridge` proud. Each half is a plane,
// so the scene light shades the left half bright and the right half dark,
// exactly like the printed pieces.
// Returns the geometry; geometry.userData.zAt(x) gives the front surface z.
export function fold(points, d, ridge = 0, opts = {}) {
  const xs = points.map((p) => p[0]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const cx = opts.cx ?? (minX + maxX) / 2;
  const hwL = Math.max(cx - minX, 1e-6);
  const hwR = Math.max(maxX - cx, 1e-6);
  const back = opts.back ?? true;
  const parts = [];
  for (const side of [-1, 1]) {
    const half = clipX(points, cx, side);
    if (half.length < 3) continue;
    const g = extrude(half, d);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const k = 1 - Math.abs(x - cx) / (side < 0 ? hwL : hwR);
      if (z > 1e-6) pos.setZ(i, z + ridge * k);
      else if (back && z < -1e-6) pos.setZ(i, z - ridge * k);
    }
    parts.push(g.index ? g.toNonIndexed() : g);
  }
  const geo = BufferGeometryUtils.mergeGeometries(parts.map((g) => { g.clearGroups(); return g; }));
  geo.userData.zAt = (x) => d / 2 + ridge * Math.max(0, 1 - Math.abs(x - cx) / (x < cx ? hwL : hwR));
  geo.userData.cx = cx;
  return geo;
}

// A flat panel (window, door, decal) laid ON a folded front: the rectangle
// x0…x1 × y0…y1 is split at the fold's crease and each part lies `lift`
// proud of its own half-plane — so a window straddling the crease bends
// with the wall instead of the wall's ridge poking through the glass.
// foldGeo is a fold() geometry; returns a geometry in the same space.
export function foldPanel(foldGeo, x0, x1, y0, y1, lift = 0.3) {
  const { zAt, cx } = foldGeo.userData;
  const xs = x0 < cx && cx < x1 ? [x0, cx, x1] : [x0, x1];
  const pos = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    const a = xs[i];
    const b = xs[i + 1];
    const za = zAt(a) + lift;
    const zb = zAt(b) + lift;
    pos.push(a, y0, za, b, y0, zb, b, y1, zb, a, y0, za, b, y1, zb, a, y1, za);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Folded faceted cone / pyramid — trees, ears, roofs. seg sides.
export function pyramid(r, h, seg = 4, rot = PI / 4) {
  return new THREE.ConeGeometry(r, h, seg, 1).rotateY(rot).translate(0, h / 2, 0);
}

export const PI = Math.PI;

// A box spanning (x1,y1) → (x2,y2) in the xy plane: struts, rafters, roof
// slabs. `thick` across the line, `d` deep (z), `ext` extends both ends.
// The box's face is offset to one side by `side` (−1/0/1) of the line.
export function beam(x1, y1, x2, y2, thick, d, ext = 0, side = 0) {
  const len = Math.hypot(x2 - x1, y2 - y1) + ext * 2;
  const g = new THREE.BoxGeometry(len, thick, d);
  g.translate(0, (side * thick) / 2, 0);
  g.rotateZ(Math.atan2(y2 - y1, x2 - x1));
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, 0);
  return g;
}

// Paper smoke: a few ivory puffs rising from (x, y, z), drifting and
// shrinking away. Returns { group, update(t) }.
export function smoke(x, y, z, { size = 3, rise = 30, count = 4, drift = 8 } = {}) {
  const g = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < count; i += 1) {
    const m = new THREE.Mesh(
      facet(new THREE.IcosahedronGeometry(size, 0), 0.06),
      new THREE.MeshLambertMaterial({ color: '#f4f0e6', vertexColors: true, flatShading: true, transparent: true }),
    );
    g.add(m);
    puffs.push(m);
  }
  g.position.set(x, y, z);
  return {
    group: g,
    update(t) {
      puffs.forEach((p, i) => {
        const k = (t * 0.25 + i / count) % 1;
        p.position.set(Math.sin(k * 4 + i) * 1.5 + k * drift, k * rise, 0);
        p.scale.setScalar(0.6 + k * 1.4);
        p.rotation.set(k * 2 + i, k * 3, 0);
        p.material.opacity = Math.min(1, (1 - k) * 2) * 0.9;
      });
    },
  };
}

// Two dark dot eyes with lids — the blink squashes them. Positioned by the
// caller; returns { group, blink(k) }.
export function eyes(dx, r, color = '#1f1d1a') {
  const g = new THREE.Group();
  const list = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), ink(color));
    e.scale.z = 0.45;
    e.position.x = s * dx;
    g.add(e);
    list.push(e);
  }
  return { group: g, blink(k) { for (const e of list) e.scale.y = Math.max(0.12, 1 - k); } };
}

// Soft pink cheek disc (slightly transparent paper).
export function cheek(r, color = '#d99a96') {
  return new THREE.Mesh(disc(r, 18), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
}

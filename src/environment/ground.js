import * as THREE from 'three';
import { getWashTexture } from '../assets/materials.js';
import { palette } from '../assets/palette.js';
import { rng } from '../assets/helpers.js';

// One continuous paper meadow under the whole deck: gently faceted sage
// terrain washed with the watercolor texture, a layered-cardboard front edge
// (the diorama slab), and optional river / road inlays.
//
// heightAt(x, z) exposes the same noise the vertices use, so the deck can
// stand props (and the wolf) exactly on the surface.

const GROUND_DEPTH = 16; // z extent: -GROUND_DEPTH/2-2 (far) … +GROUND_DEPTH/2 (near)
const SEG = 1.2; // target segment size
const NOISE_AMP = 0.4;
const FAR_FIELD = '#b4bea6'; // meadow at the horizon

function makeNoise(seed) {
  // Value noise on a coarse lattice, smoothly interpolated.
  const r = rng(seed);
  const lattice = new Map();
  const cell = 3.4;
  function latticeVal(ix, iz) {
    const key = `${ix},${iz}`;
    if (!lattice.has(key)) {
      // Hash-based so it's deterministic regardless of query order.
      const h = Math.sin(ix * 127.1 + iz * 311.7 + seed * 74.7) * 43758.5453;
      lattice.set(key, h - Math.floor(h));
    }
    return lattice.get(key);
  }
  return (x, z) => {
    const gx = x / cell;
    const gz = z / cell;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const sx = fx * fx * (3 - 2 * fx);
    const sz = fz * fz * (3 - 2 * fz);
    const a = latticeVal(ix, iz);
    const b = latticeVal(ix + 1, iz);
    const c = latticeVal(ix, iz + 1);
    const d = latticeVal(ix + 1, iz + 1);
    return (a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz) - 0.5;
  };
}

// Ground kinds — what a scene stands on ("ground" on a scene). The meadow is
// the default; the others repaint (and mostly level) the terrain under that
// scene, with a ragged paper edge where two kinds meet.
//   color(ix, iz, r) → facet color of grid cell (ix, iz); flat: how much the bumps are
//   ironed out (0…1); far: the tone the ground fades to at the horizon; lip:
//   the front edge strip.
const tone = (hex) => new THREE.Color(hex);
export const GROUNDS = {
  meadow: { flat: 0, far: tone(FAR_FIELD), lip: tone(palette.sageDeep), color: null },
  // a paddock / car park: warm paper asphalt
  asphalt: {
    flat: 0.96, far: tone('#a6a89c'), lip: tone('#7f8179'),
    color: (ix, iz, r) => tone('#a2a498').offsetHSL(0, 0, (r() - 0.5) * 0.03),
  },
  // an indoor floor: large two-tone tiles
  floor: {
    flat: 1, far: tone('#d5cdb9'), lip: tone('#a89b83'),
    color: (ix, iz) => tone((Math.floor(ix / 2) + Math.floor(iz / 2)) % 2 ? '#ddd5c3' : '#cfc6b1'),
  },
  // dried-out, cracked earth
  barren: {
    flat: -0.35, far: tone('#a69a87'), lip: tone('#7a6f60'),
    color: (ix, iz, r) => tone(r() < 0.16 ? '#8f8373' : '#a89c88').offsetHSL(0, 0, (r() - 0.5) * 0.07),
  },
  // stage boards running along the front edge
  stage: {
    flat: 1, far: tone('#b28f68'), lip: tone('#6e563c'),
    color: (ix, iz) => {
      const row = iz;
      const plank = Math.floor((ix + row * 3) / 5);
      return tone(['#b8946a', '#ad8960', '#c09c72', '#a8845c'][((row * 3 + plank) % 4 + 4) % 4]);
    },
  },
};
export const GROUND_NAMES = Object.keys(GROUNDS);

// rivers: [{ x, width }] — a band crossing the ground near world-x, running in z.
// roads:  [{ z, width, from, to }] — an asphalt band running along x in a
//         world-x range, flattened into the terrain.
// zones: [{ x0, x1, kind }] — stretches of another ground kind (see GROUNDS).
export function createGround({ minX, maxX, seed = 1, rivers = [], roads = [], zones = [] }) {
  const noise = makeNoise(seed);

  // How strongly zone kind `k` applies at world x: 1 inside, easing to 0
  // over EDGE units beyond its ends.
  const EDGE = 4;
  const smooth = (v) => { const c = Math.min(Math.max(v, 0), 1); return c * c * (3 - 2 * c); };
  function zoneWeights(x) {
    const out = [];
    for (const zn of zones) {
      const w = smooth(Math.min(x - zn.x0, zn.x1 - x) / EDGE + 0.5);
      if (w > 0) out.push([GROUNDS[zn.kind] ?? GROUNDS.meadow, w]);
    }
    return out;
  }
  // The kind a facet at x takes: a seeded dither across the seam, so two
  // grounds meet in a torn, patchy edge instead of a ruled line.
  function kindAt(x, dice) {
    let pick = GROUNDS.meadow;
    let best = 0;
    for (const [kind, w] of zoneWeights(x)) {
      const score = w > dice ? w : 0;
      if (score > best) { best = score; pick = kind; }
    }
    return pick;
  }
  function flatAt(x) {
    let f = 0;
    for (const [kind, w] of zoneWeights(x)) f += kind.flat * w;
    return Math.max(-1, Math.min(1, f));
  }

  function riverFactor(x, z) {
    // 0 = dry land, 1 = river center. Rivers wind slightly with z.
    let f = 0;
    for (const rv of rivers) {
      const center = rv.x + Math.sin(z * 0.55 + rv.x) * 1.1;
      const d = Math.abs(x - center) / (rv.width / 2);
      if (d < 1) f = Math.max(f, 1 - d * d);
    }
    return f;
  }

  function roadFactor(x, z) {
    let f = 0;
    for (const rd of roads) {
      const d = Math.abs(z - rd.z) / (rd.width / 2);
      if (d >= 1) continue;
      // soften the ends so the asphalt fades into the meadow
      const endFade = Math.min(
        Math.max((x - rd.from) / 1.5, 0),
        Math.max((rd.to - x) / 1.5, 0),
        1,
      );
      f = Math.max(f, (1 - d * d) * Math.max(endFade, 0));
    }
    return f;
  }

  function heightAt(x, z) {
    // Damp bumps in a strip around the action row so the walk path is level.
    const damp = 0.12 + 0.88 * Math.min(Math.abs(z) / 5.5, 1);
    let h = noise(x, z) * NOISE_AMP * 2 * damp;
    h -= riverFactor(x, z) * 0.3; // river bed dips
    h *= 1 - roadFactor(x, z) * 0.9; // roads are graded flat
    if (zones.length) h *= 1 - flatAt(x) * 0.94; // floors and tarmac are level, barren land rougher
    return h;
  }

  const group = new THREE.Group();

  const width = maxX - minX;
  const cols = Math.ceil(width / SEG);
  const rows = Math.ceil((GROUND_DEPTH + 2) / SEG);
  const geo = new THREE.PlaneGeometry(width, GROUND_DEPTH + 2, cols, rows);
  geo.rotateX(-Math.PI / 2);
  geo.translate(minX + width / 2, 0, -1); // near edge at z = +GROUND_DEPTH/2

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();

  // Per-facet coloring: a calm, light sage meadow. The terrain is unlit
  // like the sprites; each facet gets a gentle baked shade from its normal
  // (light from the upper left, as on the sheets) so the folds read as
  // paper, plus a small seeded jitter. Far rows fade toward the hills.
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();
  const fpos = flat.attributes.position;
  const fnorm = flat.attributes.normal;
  const colors = new Float32Array(fpos.count * 3);
  const base = new THREE.Color(palette.meadow);
  const far = new THREE.Color(FAR_FIELD);
  const water = new THREE.Color(palette.water);
  const tarmac = new THREE.Color(palette.asphalt);
  const lightDir = new THREE.Vector3(-0.5, 1, 0.35).normalize();
  const n = new THREE.Vector3();
  const r = rng(seed + 7);
  const tmp = new THREE.Color();
  for (let tri = 0; tri < fpos.count / 3; tri += 1) {
    let cx = 0;
    let cz = 0;
    for (let j = 0; j < 3; j += 1) {
      cx += fpos.getX(tri * 3 + j) / 3;
      cz += fpos.getZ(tri * 3 + j) / 3;
    }
    n.set(fnorm.getX(tri * 3), fnorm.getY(tri * 3), fnorm.getZ(tri * 3));
    const shade = Math.max(-0.12, (n.dot(lightDir) - lightDir.y) * 1.6) + (r() - 0.5) * 0.035;
    const rdf = roadFactor(cx, cz);
    const rf = riverFactor(cx, cz);
    const kind = zones.length ? kindAt(cx, 0.15 + r() * 0.7) : GROUNDS.meadow;
    if (rdf > 0.7) tmp.copy(tarmac);
    else if (rf > 0.55) tmp.copy(water);
    else {
      // the two triangles of a grid cell share its color (tiles, planks)
      if (kind.color) tmp.copy(kind.color(Math.floor((cx - minX) / (width / cols)), Math.floor((cz + GROUND_DEPTH / 2 + 2) / ((GROUND_DEPTH + 2) / rows)), r));
      else tmp.copy(base);
      // fade toward the horizon: z −1 … −10
      tmp.lerp(kind.far, Math.min(Math.max((-cz - 1) / 9, 0), 1) * 0.55);
    }
    tmp.offsetHSL(0, 0, shade * 0.5);
    for (let j = 0; j < 3; j += 1) {
      colors.set([tmp.r, tmp.g, tmp.b], (tri * 3 + j) * 3);
    }
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // World-scaled watercolor wash (one tile ≈ 14 units).
  const wash = getWashTexture(0.55).clone();
  wash.needsUpdate = true;
  wash.repeat.set(width / 14, (GROUND_DEPTH + 2) / 14);
  const terrain = new THREE.Mesh(flat, new THREE.MeshBasicMaterial({ map: wash, vertexColors: true }));
  group.add(terrain);
  const tintMats = [terrain.material]; // what a mood recolors

  // Rivers and roads get their own smooth paper ribbons laid over the
  // terrain (the facet coloring underneath is only a fallback where the
  // ribbon's sparse samples dip below the surface).
  const ribbonMat = (color, strength) => {
    const t = getWashTexture(strength).clone();
    t.needsUpdate = true;
    t.repeat.set(0.25, 0.25);
    const m = new THREE.MeshBasicMaterial({ color, map: t, side: THREE.DoubleSide });
    tintMats.push(m);
    return m;
  };
  // A strip through centerline points [x, z] with half-width hw (per point).
  function ribbon(points, hw, lift, material) {
    const pos = [];
    const uv = [];
    const idx = [];
    const ACROSS = 6;
    points.forEach(([cx, cz, nx, nz], i) => {
      for (let j = 0; j <= ACROSS; j += 1) {
        const u = j / ACROSS - 0.5;
        const x = cx + nx * u * 2 * hw;
        const z = cz + nz * u * 2 * hw;
        pos.push(x, heightAt(x, z) + lift, z);
        uv.push(x * 0.1, z * 0.1);
      }
      if (i > 0) {
        for (let j = 0; j < ACROSS; j += 1) {
          const a = (i - 1) * (ACROSS + 1) + j;
          const b = a + ACROSS + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return new THREE.Mesh(g, material);
  }
  const zNear = GROUND_DEPTH / 2 - 1;
  const zFar = -GROUND_DEPTH / 2 - 2;
  for (const rv of rivers) {
    const pts = [];
    for (let z = zFar; z <= zNear + 1e-6; z += 0.25) {
      const cx = rv.x + Math.sin(z * 0.55 + rv.x) * 1.1;
      const dxdz = Math.cos(z * 0.55 + rv.x) * 0.605;
      const len = Math.hypot(1, dxdz);
      pts.push([cx, z, 1 / len, -dxdz / len]);
    }
    group.add(ribbon(pts, rv.width * 0.4, 0.1, ribbonMat(palette.water, 0.8)));
  }
  for (const rd of roads) {
    const pts = [];
    for (let x = rd.from; x <= rd.to + 1e-6; x += 0.5) pts.push([x, rd.z, 0, 1]);
    group.add(ribbon(pts, rd.width * 0.5, 0.04, ribbonMat(palette.asphalt, 0.6)));
  }

  // Far field: a flat meadow from the terrain's back edge to the hills, so
  // the ground runs all the way to the horizon.
  const farZ0 = -GROUND_DEPTH / 2 - 2;
  const farW = width + 240;
  const farGeo = new THREE.PlaneGeometry(farW, 60, Math.ceil(farW / 3), 1).rotateX(-Math.PI / 2);
  // …in each stretch's own far tone
  const farCol = new Float32Array(farGeo.attributes.position.count * 3);
  const farX0 = minX + width / 2;
  for (let i = 0; i < farGeo.attributes.position.count; i += 1) {
    const wx = farGeo.attributes.position.getX(i) + farX0;
    tmp.copy(GROUNDS.meadow.far);
    for (const [kind, w] of zoneWeights(wx)) tmp.lerp(kind.far, w);
    farCol.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  farGeo.setAttribute('color', new THREE.BufferAttribute(farCol, 3));
  const farMesh = new THREE.Mesh(farGeo, new THREE.MeshBasicMaterial({ map: wash, vertexColors: true }));
  farMesh.position.set(farX0, -0.25, farZ0 - 30 + 0.4);
  group.add(farMesh);
  tintMats.push(farMesh.material);

  // Front edge: the cut face of the diorama slab, built like layered card —
  // a thin sage lip, a kraft core line, then cream board down to y = −2.5.
  const nearZ = GROUND_DEPTH / 2 - 1;
  const edgeGeo = (yTopFn, yBot) => {
    const g = new THREE.PlaneGeometry(width, 1, cols, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i) + minX + width / 2;
      p.setY(i, p.getY(i) > 0 ? yTopFn(x) : yBot(x));
      p.setX(i, x);
    }
    return g;
  };
  const top = (x) => heightAt(x, nearZ);
  const layers = [
    [top, (x) => top(x) - 0.14, palette.sageDeep],
    [(x) => top(x) - 0.14, (x) => top(x) - 0.3, palette.sand],
    [(x) => top(x) - 0.3, () => -2.5, palette.cream],
  ];
  const edgeWash = getWashTexture().clone();
  edgeWash.needsUpdate = true;
  edgeWash.repeat.set(width / 10, 0.3);
  layers.forEach(([a, b, col], li) => {
    const g = edgeGeo(a, b);
    const mat = new THREE.MeshBasicMaterial({ color: col, map: edgeWash, side: THREE.DoubleSide });
    if (li === 0 && zones.length) {
      // the lip is the ground's own top layer: it takes each stretch's tone
      const lipCol = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < g.attributes.position.count; i += 1) {
        tmp.copy(GROUNDS.meadow.lip);
        for (const [kind, w] of zoneWeights(g.attributes.position.getX(i))) tmp.lerp(kind.lip, w);
        lipCol.set([tmp.r, tmp.g, tmp.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(lipCol, 3));
      mat.color.set('#ffffff');
      mat.vertexColors = true;
    }
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.z = nearZ;
    group.add(mesh);
    tintMats.push(mat);
  });

  return { group, heightAt, tintMats };
}

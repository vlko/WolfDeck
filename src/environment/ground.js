import * as THREE from 'three';
import { paperMaterial } from '../assets/materials.js';
import { palette } from '../assets/palette.js';
import { rng } from '../assets/helpers.js';

// One continuous low-poly terrain ribbon under the whole deck, with a cream
// front skirt (the diorama slab edge) and optional river inlays.
//
// heightAt(x, z) exposes the same noise the vertices use, so the deck can
// stand props (and the wolf) exactly on the surface.

const GROUND_DEPTH = 16; // z extent: -GROUND_DEPTH/2-2 (far) … +GROUND_DEPTH/2 (near)
const SEG = 1.2; // target segment size
const NOISE_AMP = 0.4;

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

// rivers: [{ x, width }] — a band crossing the ground near world-x, running in z.
// roads:  [{ z, width, from, to }] — an asphalt band running along x in a
//         world-x range, flattened into the terrain.
export function createGround({ minX, maxX, seed = 1, rivers = [], roads = [] }) {
  const noise = makeNoise(seed);

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
    h -= riverFactor(x, z) * 0.55; // river bed dips
    h *= 1 - roadFactor(x, z) * 0.9; // roads are graded flat
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

  // Per-facet coloring: sage meadow with variation; river cells teal.
  const flat = geo.toNonIndexed();
  const fpos = flat.attributes.position;
  const colors = new Float32Array(fpos.count * 3);
  const base = new THREE.Color(palette.meadow);
  const light = new THREE.Color(palette.sageLight);
  const dark = new THREE.Color(palette.sage);
  const water = new THREE.Color(palette.waterTeal);
  const tarmac = new THREE.Color(palette.asphalt);
  const r = rng(seed + 7);
  const tmp = new THREE.Color();
  for (let tri = 0; tri < fpos.count / 3; tri += 1) {
    // Triangle centroid decides the color.
    let cx = 0;
    let cz = 0;
    for (let j = 0; j < 3; j += 1) {
      cx += fpos.getX(tri * 3 + j) / 3;
      cz += fpos.getZ(tri * 3 + j) / 3;
    }
    const rdf = roadFactor(cx, cz);
    const rf = riverFactor(cx, cz);
    if (rdf > 0.3) {
      tmp.copy(tarmac).offsetHSL(0, 0, (r() - 0.5) * 0.035);
    } else if (rf > 0.25) {
      tmp.copy(water).offsetHSL(0, 0, (r() - 0.5) * 0.03);
    } else {
      const mixed = r();
      tmp.copy(base).lerp(mixed < 0.5 ? light : dark, Math.abs(mixed - 0.5) * 0.9);
      tmp.offsetHSL(0, 0, (r() - 0.5) * 0.04);
    }
    for (let j = 0; j < 3; j += 1) {
      colors.set([tmp.r, tmp.g, tmp.b], (tri * 3 + j) * 3);
    }
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const terrain = new THREE.Mesh(flat, paperMaterial('#ffffff'));
  group.add(terrain);

  // Front skirt: vertical strip along the near edge, dropping to y = -2.5 —
  // the cut face of the diorama slab.
  const nearZ = GROUND_DEPTH / 2 - 1;
  const skirtGeo = new THREE.PlaneGeometry(width, 1, cols, 1);
  const spos = skirtGeo.attributes.position;
  for (let i = 0; i < spos.count; i += 1) {
    const x = spos.getX(i) + minX + width / 2;
    if (spos.getY(i) > 0) {
      spos.setY(i, heightAt(x, nearZ));
    } else {
      spos.setY(i, -2.5);
    }
    spos.setX(i, x);
  }
  skirtGeo.translate(0, 0, 0);
  skirtGeo.computeVertexNormals();
  const skirtFlat = skirtGeo.toNonIndexed();
  const scount = skirtFlat.attributes.position.count;
  const scolors = new Float32Array(scount * 3);
  const skirtCol = new THREE.Color(palette.parchment);
  const r2 = rng(seed + 13);
  for (let tri = 0; tri < scount / 3; tri += 1) {
    tmp.copy(skirtCol).offsetHSL(0, 0, (r2() - 0.5) * 0.05);
    for (let j = 0; j < 3; j += 1) scolors.set([tmp.r, tmp.g, tmp.b], (tri * 3 + j) * 3);
  }
  skirtFlat.setAttribute('color', new THREE.BufferAttribute(scolors, 3));
  const skirt = new THREE.Mesh(skirtFlat, paperMaterial('#ffffff', { side: THREE.DoubleSide }));
  skirt.position.z = nearZ;
  group.add(skirt);

  return { group, heightAt };
}

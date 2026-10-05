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
    h -= riverFactor(x, z) * 0.3; // river bed dips
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
    if (rdf > 0.7) tmp.copy(tarmac);
    else if (rf > 0.55) tmp.copy(water);
    else {
      tmp.copy(base);
      // fade toward the horizon: z −1 … −10
      tmp.lerp(far, Math.min(Math.max((-cz - 1) / 9, 0), 1) * 0.55);
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

  // Rivers and roads get their own smooth paper ribbons laid over the
  // terrain (the facet coloring underneath is only a fallback where the
  // ribbon's sparse samples dip below the surface).
  const ribbonMat = (color, strength) => {
    const t = getWashTexture(strength).clone();
    t.needsUpdate = true;
    t.repeat.set(0.25, 0.25);
    return new THREE.MeshBasicMaterial({ color, map: t, side: THREE.DoubleSide });
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
  const farGeo = new THREE.PlaneGeometry(width + 240, 60, 1, 1).rotateX(-Math.PI / 2);
  const farMesh = new THREE.Mesh(farGeo, new THREE.MeshBasicMaterial({ color: FAR_FIELD, map: wash }));
  farMesh.position.set(minX + width / 2, -0.25, farZ0 - 30 + 0.4);
  group.add(farMesh);

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
  for (const [a, b, col] of layers) {
    const mesh = new THREE.Mesh(edgeGeo(a, b), new THREE.MeshBasicMaterial({ color: col, map: edgeWash, side: THREE.DoubleSide }));
    mesh.position.z = nearZ;
    group.add(mesh);
  }

  return { group, heightAt };
}

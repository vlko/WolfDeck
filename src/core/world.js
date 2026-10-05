// The shared physical world of the diorama: what stands where, so moving
// things don't pass through each other.
//
//   • static obstacles — every prop's footprint on the ground (an oriented
//     rectangle in world x/z), registered by the deck as it builds scenes;
//   • agents — moving things that others must respect (the wolf);
//   • findPath — grid A* around the obstacles (inflated by the walker's
//     radius), string-pulled into a short polyline, so the wolf walks
//     around a sheep instead of through it and never gets stuck;
//   • traffic — vehicles on two-lane roads (see core/traffic.js).
//
// One deck per page, so this is a module singleton.

const CELL = 0.25; // A* grid resolution (world units)
const BIN = 4; // spatial hash bin along x

const obstacles = [];
const bins = new Map();
const agents = new Set();

function binKeys(x0, x1) {
  const keys = [];
  for (let b = Math.floor(x0 / BIN); b <= Math.floor(x1 / BIN); b += 1) keys.push(b);
  return keys;
}

// o: { x, z, hw, hd, rot } — center, half-extents along its local x/z, yaw.
export function addObstacle(o) {
  const ob = { ...o, cos: Math.cos(o.rot ?? 0), sin: Math.sin(o.rot ?? 0) };
  ob.reach = Math.hypot(ob.hw, ob.hd);
  obstacles.push(ob);
  for (const k of binKeys(ob.x - ob.reach, ob.x + ob.reach)) {
    if (!bins.has(k)) bins.set(k, []);
    bins.get(k).push(ob);
  }
  return ob;
}

export function allObstacles() { return obstacles; }

export function clearObstacles() {
  obstacles.length = 0;
  bins.clear();
}

// Is a disc of radius r at (x, z) overlapping any obstacle?
export function blocked(x, z, r = 0) {
  const list = bins.get(Math.floor(x / BIN));
  if (!list) return false;
  for (const o of list) {
    const dx = x - o.x;
    const dz = z - o.z;
    if (Math.abs(dx) > o.reach + r || Math.abs(dz) > o.reach + r) continue;
    // into the obstacle's frame (yaw rot: local x → (cos, −sin) in world xz)
    const lx = dx * o.cos - dz * o.sin;
    const lz = dx * o.sin + dz * o.cos;
    const ex = Math.max(Math.abs(lx) - o.hw, 0);
    const ez = Math.max(Math.abs(lz) - o.hd, 0);
    if (ex * ex + ez * ez < r * r || (ex === 0 && ez === 0)) return true;
  }
  return false;
}

// Straight segment clear for a disc of radius r?
export function segmentClear(a, b, r) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(1, Math.ceil(len / (CELL * 0.5)));
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    if (blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, r)) return false;
  }
  return true;
}

// Nearest free point to p within `maxR` (spiral search on the grid).
export function nearestFree(p, r, bounds, maxR = 4) {
  if (!blocked(p.x, p.z, r)) return { ...p };
  for (let d = CELL; d <= maxR; d += CELL) {
    for (let a = 0; a < 16; a += 1) {
      const x = p.x + Math.cos((a / 16) * Math.PI * 2) * d;
      const z = p.z + Math.sin((a / 16) * Math.PI * 2) * d;
      if (bounds && (z < bounds.z0 || z > bounds.z1)) continue;
      if (!blocked(x, z, r)) return { x, z };
    }
  }
  return null;
}

// Binary heap keyed by f.
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(n) {
    const a = this.a;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

// A* from `from` to `to` for a walker of radius r, inside bounds
// { x0, x1, z0, z1 }. Returns a string-pulled polyline [{x, z}, …] that
// starts after `from` and ends exactly at `to` — or null if unreachable.
export function findPath(from, to, r, bounds) {
  if (segmentClear(from, to, r)) return [{ ...to }];
  const goal = nearestFree(to, r, bounds) ?? to;
  const x0 = bounds.x0;
  const z0 = bounds.z0;
  const W = Math.ceil((bounds.x1 - bounds.x0) / CELL) + 1;
  const H = Math.ceil((bounds.z1 - bounds.z0) / CELL) + 1;
  const idx = (i, j) => j * W + i;
  const cellOf = (p) => [
    Math.min(W - 1, Math.max(0, Math.round((p.x - x0) / CELL))),
    Math.min(H - 1, Math.max(0, Math.round((p.z - z0) / CELL))),
  ];
  const free = new Int8Array(W * H).fill(-1); // −1 unknown, 0 blocked, 1 free
  const isFree = (i, j) => {
    const k = idx(i, j);
    if (free[k] < 0) free[k] = blocked(x0 + i * CELL, z0 + j * CELL, r) ? 0 : 1;
    return free[k] === 1;
  };
  const [si, sj] = cellOf(from);
  const [gi, gj] = cellOf(goal);
  const g = new Float32Array(W * H).fill(Infinity);
  const came = new Int32Array(W * H).fill(-1);
  const heap = new Heap();
  const h = (i, j) => Math.hypot(i - gi, j - gj);
  g[idx(si, sj)] = 0;
  heap.push({ i: si, j: sj, f: h(si, sj) });
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  let found = false;
  let guard = 0;
  while (heap.size && guard < 60000) {
    guard += 1;
    const { i, j } = heap.pop();
    if (i === gi && j === gj) { found = true; break; }
    const gc = g[idx(i, j)];
    for (const [di, dj, cost] of dirs) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      // the start cell may sit inside an obstacle's margin — let it leave
      if (!isFree(ni, nj) && !(i === si && j === sj && Math.hypot(ni - si, nj - sj) < 2)) continue;
      if (di && dj && (!isFree(i + di, j) || !isFree(i, j + dj))) continue; // no corner cutting
      const ng = gc + cost;
      const k = idx(ni, nj);
      if (ng < g[k]) {
        g[k] = ng;
        came[k] = idx(i, j);
        heap.push({ i: ni, j: nj, f: ng + h(ni, nj) });
      }
    }
  }
  if (!found) return null;
  // walk back, then string-pull with line-of-sight checks
  const cells = [];
  for (let k = idx(gi, gj); k >= 0; k = came[k]) {
    cells.push({ x: x0 + (k % W) * CELL, z: z0 + Math.floor(k / W) * CELL });
    if (k === idx(si, sj)) break;
  }
  cells.reverse();
  const pts = [{ ...from }, ...cells.slice(1), { ...goal }];
  const out = [];
  let anchor = pts[0];
  let i = 1;
  while (i < pts.length) {
    let j = i;
    while (j + 1 < pts.length && segmentClear(anchor, pts[j + 1], r * 0.98)) j += 1;
    out.push(pts[j]);
    anchor = pts[j];
    i = j + 1;
  }
  return out;
}

// ── agents (moving things others must respect) ───────────────────────────
// agent: { x, z, r } kept up to date by its owner.
export function addAgent(a) { agents.add(a); return a; }
export function removeAgent(a) { agents.delete(a); }
export function allAgents() { return agents; }

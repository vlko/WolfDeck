import * as THREE from 'three';
import { allAgents } from './world.js';

// Road traffic. Every vehicle drives a two-lane road: rightward in the near
// lane, leftward in the far lane, ping-ponging along its `path` (prop-local
// x range) and U-turning across the road at the ends — so oncoming vehicles
// never share a lane. Inside a lane each vehicle keeps a safe gap to
// whatever is ahead (another vehicle, one mid-U-turn, or the wolf standing on
// the road): it eases off, stops, and pulls away again once the way is clear.
// A U-turn only starts once the far lane at that end is free.

export const LANE = 0.85; // lane center offset from the road's center line
const MIN_GAP = 0.6; // bumper-to-bumper standstill gap
const BRAKE = 2.2; // distance over which a vehicle slows to a stop
const ACCEL = 2.5;
const DECEL = 9;

const vehicles = new Set();

// Registers a vehicle model. group: the prop group (positioned by the deck);
// pivot: what we move (local x along the road, local z = lane offset);
// opts: { path:[x1,x2], speed, startAt, direction }; len/width: footprint;
// wheels + wheelR: spun by distance travelled.
export function addVehicle(group, pivot, opts, { len, width, wheels = [], wheelR = 0.2, speed = 2.6 }) {
  const [p1, p2] = Array.isArray(opts.path) ? opts.path : [-6, 6];
  const v = {
    group, pivot, wheels, wheelR,
    x1: Math.min(p1, p2), x2: Math.max(p1, p2),
    maxSpeed: opts.speed ?? speed,
    half: len / 2, width,
    dir: opts.direction === -1 ? -1 : 1,
    u: opts.startAt ?? null, // fraction along the path, resolved on first tick
    v: 0, // current speed
    state: 'run', // run | turn
    theta: 0,
    base: null, // world position of the prop origin (resolved lazily)
    sx: 1,
    wx: 0, wz: 0, // current world position (for others' gap checks)
  };
  vehicles.add(v);
  return v;
}

function laneZ(v, dir) { return dir > 0 ? LANE : -LANE; }

// Distance to the nearest thing ahead of v in its lane (bumper gap), or
// Infinity. Looks at other vehicles (incl. mid-U-turn) and agents (the wolf).
function gapAhead(v) {
  const myZ = v.base.z + laneZ(v, v.dir) * v.sx;
  let gap = Infinity;
  for (const o of vehicles) {
    if (o === v || !o.base || Math.abs(o.base.z - v.base.z) > 3) continue;
    if (Math.abs(o.wz - myZ) > (v.width + o.width) / 2) continue; // not in my lane
    const d = (o.wx - v.wx) * v.dir;
    if (d <= 0) continue;
    gap = Math.min(gap, d - v.half - o.half);
  }
  for (const a of allAgents()) {
    if (Math.abs(a.z - myZ) > v.width / 2 + a.r) continue;
    const d = (a.x - v.wx) * v.dir;
    if (d <= -a.r) continue;
    gap = Math.min(gap, d - v.half - a.r);
  }
  return gap;
}

// Is the far side of the road clear for a U-turn at x = end?
function turnClear(v, end) {
  const otherZ = v.base.z + laneZ(v, -v.dir) * v.sx;
  for (const o of vehicles) {
    if (o === v || !o.base || Math.abs(o.base.z - v.base.z) > 3) continue;
    if (Math.abs(o.wz - otherZ) > (v.width + o.width) / 2 + 0.2 && o.state !== 'turn') continue;
    if (Math.abs(o.wx - end) < v.half + o.half + LANE * 2 + 0.4) return false;
  }
  for (const a of allAgents()) {
    if (Math.abs(a.x - end) < v.half + LANE * 2 + a.r && Math.abs(a.z - v.base.z) < LANE * 2 + a.r) return false;
  }
  return true;
}

// Advances vehicle v by dt. Called from the vehicle's animation tick (so
// vehicles in far-away scenes stay parked, like every other animation).
export function driveVehicle(v, dt) {
  if (!v.base) {
    v.group.updateWorldMatrix(true, false);
    v.base = v.group.getWorldPosition(new THREE.Vector3());
    v.sx = v.group.scale.x || 1;
    if (v.u == null) v.u = 0.5;
    v.lx = v.x1 + (v.x2 - v.x1) * v.u;
    // don't start on top of another vehicle in the same lane
    for (let tries = 0; tries < 20; tries += 1) {
      v.wx = v.base.x + v.lx * v.sx;
      v.wz = v.base.z + laneZ(v, v.dir) * v.sx;
      const clash = [...vehicles].some((o) => o !== v && o.base && Math.abs(o.wz - v.wz) < (v.width + o.width) / 2
        && Math.abs(o.wx - v.wx) < v.half + o.half + MIN_GAP);
      if (!clash) break;
      v.lx = Math.min(v.x2, Math.max(v.x1, v.lx - v.dir * (v.half * 2 + MIN_GAP) / v.sx));
    }
    v.pivot.rotation.y = v.dir > 0 ? 0 : Math.PI;
  }
  let moved = 0;
  if (v.state === 'run') {
    const end = v.dir > 0 ? v.x2 : v.x1;
    const toEnd = (end - v.lx) * v.dir * v.sx;
    const gap = Math.min(gapAhead(v), toEnd + v.half + MIN_GAP); // also ease into the turn point
    const target = v.maxSpeed * Math.min(1, Math.max(0, (gap - MIN_GAP) / BRAKE));
    v.v += Math.max(-DECEL * dt, Math.min(ACCEL * dt, target - v.v));
    const step = Math.min(v.v * dt, Math.max(toEnd, 0));
    v.lx += (step / v.sx) * v.dir;
    moved = step;
    if (toEnd - step < 0.02) {
      v.lx = end;
      if (turnClear(v, v.base.x + end * v.sx)) { v.state = 'turn'; v.theta = 0; }
      else v.v = 0;
    }
    v.pivot.position.set(v.lx, 0, laneZ(v, v.dir));
  } else {
    // U-turn: half circle of radius LANE round (end, road center)
    const end = v.dir > 0 ? v.x2 : v.x1;
    const side = v.dir > 0 ? 1 : -1;
    const speed = Math.max(v.maxSpeed * 0.45, 0.8);
    const dTheta = (speed * dt) / (LANE * v.sx);
    v.theta = Math.min(Math.PI, v.theta + dTheta);
    moved = dTheta * LANE * v.sx;
    v.pivot.position.set(end + v.dir * LANE * Math.sin(v.theta), 0, side * LANE * Math.cos(v.theta));
    v.pivot.rotation.y = (v.dir > 0 ? 0 : Math.PI) + v.theta;
    if (v.theta >= Math.PI) {
      v.dir = -v.dir;
      v.state = 'run';
      v.v = speed;
      v.pivot.rotation.y = v.dir > 0 ? 0 : Math.PI;
    }
  }
  v.wx = v.base.x + v.pivot.position.x * v.sx;
  v.wz = v.base.z + v.pivot.position.z * v.sx;
  for (const w of v.wheels) w.rotation.z -= moved / (v.wheelR * v.sx);
  return moved;
}

export function vehicleCount() { return vehicles.size; }
export function worldVehicles() { return vehicles; }

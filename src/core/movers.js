import * as THREE from 'three';
import { warn } from '../config.js';
import { allAgents } from './world.js';

// Moving props. A prop with options.move travels through its scene by
// itself; the mover replaces the prop's own update, positions it every frame
// and plays the right animation of its rig (a "moving" one while it travels,
// a "still" one while it rests). Travelling models are built front = +x.
//
//   { "kind": "loop",  "oval": [cx, cz, halfStraight, radius] | "points": [[x, z], …],
//     "speed": 4, "startAt": 0…1, "lane": 0, "clockwise": false }
//       laps a closed circuit (points are rounded into a smooth loop)
//   { "kind": "cross", "from": [x, z], "to": [x, z], "speed": 2, "pause": 3, "startAt": 0…1 }
//       crosses the scene again and again (shrinks away at the far end,
//       waits, starts over) — tumbleweed, a paper plane
//   { "kind": "chase", "target": "<prop id>", "speed": 3, "reach": 1.2, "think": 1.1 }
//       runs after another prop, pausing to look around when it has moved
//   { "kind": "flee",  "from": "<prop id>", "spots": [[x, z], …], "near": 1.4, "hop": 1.3 }
//       rests on a spot until the chaser gets near, then hops to the spot
//       farthest from it
// Coordinates are scene-local (x from the scene center, z = depth).
// "anims": { "move": name, "still": name } overrides the animation pick.

const MOVE_ANIMS = ['drive', 'run', 'roll', 'glide', 'walk', 'hop', 'fly'];
const STILL_ANIMS = ['idle', 'sniff', 'sit'];

function animPicker(obj, move, seed) {
  const anims = obj.userData.animations ?? {};
  const pick = (asked, list) => anims[asked] ?? anims[list.find((n) => anims[n])] ?? null;
  const moving = pick(move.anims?.move, MOVE_ANIMS);
  const still = pick(move.anims?.still, STILL_ANIMS) ?? moving;
  const ctx = { group: obj, phase: seed * 1.7 };
  return (t, dt, isMoving) => {
    anims.always?.(t, dt, ctx);
    (isMoving ? moving ?? still : still)?.(t, dt, ctx);
  };
}

// Arc-length table over a closed curve given as a point function u ∈ [0,1).
function arcTable(pointAt, n = 240) {
  const pts = [];
  const len = [0];
  for (let i = 0; i <= n; i += 1) {
    pts.push(pointAt(i / n));
    if (i) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = len[n];
  return {
    total,
    // position + heading at distance d along the loop
    at(d) {
      const s = ((d % total) + total) % total;
      let lo = 0;
      let hi = n;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (len[mid] <= s) lo = mid; else hi = mid; }
      const f = (s - len[lo]) / Math.max(len[hi] - len[lo], 1e-6);
      const a = pts[lo];
      const b = pts[hi];
      return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, dx: b[0] - a[0], dz: b[1] - a[1] };
    },
  };
}

function ovalPoint([cx, cz, hs, r]) {
  // a stadium: two straights of half-length hs joined by half circles
  const straight = 2 * hs;
  const arc = Math.PI * r;
  const total = 2 * straight + 2 * arc;
  return (u) => {
    let s = u * total;
    if (s < straight) return [cx - hs + s, cz + r]; // near straight, heading +x
    s -= straight;
    if (s < arc) { const a = s / r; return [cx + hs + Math.sin(a) * r, cz + Math.cos(a) * r]; }
    s -= arc;
    if (s < straight) return [cx + hs - s, cz - r]; // far straight, heading −x
    s -= straight;
    const a = s / r;
    return [cx - hs - Math.sin(a) * r, cz - Math.cos(a) * r];
  };
}

function spin(obj, dist) {
  const sp = obj.userData.sprite;
  const wheels = sp?.rig?.parts?.wheels;
  if (!wheels?.length) return;
  const r = (sp.rig.parts.wheelRadius ?? 10) * (sp.h / 100) * (obj.scale.x || 1);
  for (const w of wheels) w.rotation.z -= dist / r;
}

// Face the direction of travel. A model turns (front = +x); a flat sprite
// can only mirror.
function head(obj, dx, dz) {
  if (Math.abs(dx) + Math.abs(dz) < 1e-6) return;
  const sp = obj.userData.sprite;
  if (sp?.model) obj.rotation.y = Math.atan2(-dz, dx);
  else if (sp?.flip && Math.abs(dx) > 1e-4) sp.flip.scale.x = dx > 0 ? 1 : -1;
}

// Runners give the wolf (and any other agent) a berth: a direction of travel
// is bent away from an agent standing in the way, more the closer it is, so
// the runner arcs round him instead of passing through. (x, z) is the
// runner's scene-local position; returns the corrected unit direction.
const BERTH = 1.15; // clearance beyond the agent's own radius
function steer(env, x, z, dx, dz) {
  let ox = dx;
  let oz = dz;
  for (const a of allAgents()) {
    const ax = a.x - env.originX;
    const rx = x - ax;
    const rz = z - a.z;
    const dist = Math.hypot(rx, rz) || 1e-3;
    const reach = a.r + BERTH;
    if (dist > reach || rx * -dx + rz * -dz < -0.2 * dist) continue; // far, or already behind us
    const k = 1 - dist / reach;
    // slide round: mostly sideways (the side we are already on), a little outward
    const side = rx * -dz + rz * dx >= 0 ? 1 : -1;
    ox += (-dz * side) * k * 2.4 + (rx / dist) * k * 1.2;
    oz += (dx * side) * k * 2.4 + (rz / dist) * k * 1.2;
  }
  const l = Math.hypot(ox, oz) || 1;
  return [ox / l, oz / l];
}

// env: { originX, heightAt(localX, z) → ground height, byId(id) → prop object }
export function createMover(obj, prop, env) {
  const move = prop.options.move;
  const sp = obj.userData.sprite;
  if (sp?.flip) sp.flip.scale.x = 1; // never the seeded mirror: front is +x
  const seed = prop.options.seed ?? 1;
  const play = animPicker(obj, move, seed);
  const baseY = prop.y;
  const place = (x, z) => obj.position.set(x, env.heightAt(x, z) + baseY, z);
  obj.userData.moves = true;

  if (move.kind === 'loop') {
    let pointAt;
    if (Array.isArray(move.oval)) pointAt = ovalPoint(move.oval.map(Number));
    else if (Array.isArray(move.points) && move.points.length >= 3) {
      const curve = new THREE.CatmullRomCurve3(move.points.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
      pointAt = (u) => { const p = curve.getPoint(u); return [p.x, p.z]; };
    } else { warn('move "loop" needs "oval" or ≥3 "points"'); return null; }
    const table = arcTable(pointAt);
    const dir = move.clockwise ? -1 : 1;
    const speed = move.speed ?? 3;
    const lane = move.lane ?? 0;
    let d = (move.startAt ?? 0) * table.total;
    return (t, dt) => {
      d += speed * dt * dir;
      const p = table.at(d);
      const l = Math.hypot(p.dx, p.dz) || 1;
      // lane: sideways offset to the right of the direction of travel
      place(p.x - (p.dz / l) * lane * dir, p.z + (p.dx / l) * lane * dir);
      head(obj, p.dx * dir, p.dz * dir);
      spin(obj, speed * dt);
      play(t, dt, true);
    };
  }

  if (move.kind === 'cross') {
    const [x0, z0] = move.from ?? [-10, 0];
    const [x1, z1] = move.to ?? [10, 0];
    const len = Math.hypot(x1 - x0, z1 - z0) || 1;
    const speed = move.speed ?? 2;
    const pause = move.pause ?? 2;
    const period = len / speed + pause;
    const s0 = obj.scale.clone();
    let clock = (move.startAt ?? 0) * period;
    let dodge = 0;
    head(obj, x1 - x0, z1 - z0);
    return (t, dt) => {
      clock = (clock + dt) % period;
      const d = Math.min(clock * speed, len);
      const f = d / len;
      const px = x0 + (x1 - x0) * f;
      const pz = z0 + (z1 - z0) * f;
      // drifts aside for an agent standing on its line
      let want = 0;
      for (const a of allAgents()) {
        const rx = px - (a.x - env.originX);
        const rz = pz - a.z;
        const reach = a.r + BERTH;
        const dist = Math.hypot(rx, rz);
        if (dist < reach * 1.8) want += (rz >= 0 ? 1 : -1) * Math.max(0, reach - Math.abs(rz)) * Math.min(1, (reach * 1.8 - dist) / reach);
      }
      dodge += (want - dodge) * Math.min(1, dt * 3);
      place(px, pz + dodge);
      // grows in at the start, shrinks away at the end, gone while waiting
      const k = Math.min(1, d / 0.8, (len - d) / 0.8);
      obj.visible = k > 0.01;
      obj.scale.copy(s0).multiplyScalar(Math.max(k, 0.01));
      if (d < len) spin(obj, speed * dt);
      play(t, dt, d < len);
    };
  }

  if (move.kind === 'chase') {
    const speed = move.speed ?? 3;
    const reach = move.reach ?? 1.2;
    const think = move.think ?? 1.1;
    let v = 0;
    let wait = think;
    let seen = null; // where the target was when we last set off
    let hx = 1; // smoothed heading
    let hz = 0;
    return (t, dt) => {
      const target = env.byId(move.target);
      if (!target) { play(t, dt, false); return; }
      const resting = !target.userData.inAir;
      const tx = target.position.x;
      const tz = target.position.z;
      // the target moved: stop, look around, then go after it
      if (resting && (!seen || Math.hypot(tx - seen[0], tz - seen[1]) > 0.3)) {
        if (seen) wait = think * (0.75 + ((Math.sin(t * 12.9) + 1) / 2) * 0.6);
        seen = [tx, tz];
      }
      const dx = tx - obj.position.x;
      const dz = tz - obj.position.z;
      const dist = Math.hypot(dx, dz);
      let goal = 0;
      if (wait > 0) wait -= dt;
      else if (resting && dist > reach * 0.55) goal = speed * Math.min(1, 0.35 + dist / 2.5);
      v += Math.max(-speed * 6 * dt, Math.min(speed * 3 * dt, goal - v));
      if (v > 0.02 && dist > 1e-3) {
        const step = Math.min(v * dt, dist);
        const [ux, uz] = steer(env, obj.position.x, obj.position.z, dx / dist, dz / dist);
        place(obj.position.x + ux * step, obj.position.z + uz * step);
        // turn smoothly toward where it is really going
        hx += (ux - hx) * Math.min(1, dt * 10);
        hz += (uz - hz) * Math.min(1, dt * 10);
        head(obj, hx, hz);
      } else if (!resting && dist > 1e-3) head(obj, dx, dz); // watches it fly
      play(t, dt, v > 0.25);
    };
  }

  if (move.kind === 'flee') {
    const spots = Array.isArray(move.spots) && move.spots.length > 1 ? move.spots : [[-5, 0], [5, 0]];
    const near = move.near ?? 1.4;
    const hop = move.hop ?? 1.3;
    const air = move.air ?? 0.85; // seconds in the air
    const pivot = sp?.pivot ?? obj;
    let at = 0;
    let jump = null; // { from, to, t }
    place(spots[0][0], spots[0][1]);
    return (t, dt) => {
      const chaser = env.byId(move.from);
      if (!jump && chaser) {
        const d = Math.hypot(chaser.position.x - obj.position.x, chaser.position.z - obj.position.z);
        if (d < near) {
          // the spot farthest from the chaser
          let best = at;
          let bestD = -1;
          spots.forEach(([x, z], i) => {
            if (i === at) return;
            const dd = Math.hypot(chaser.position.x - x, chaser.position.z - z);
            if (dd > bestD) { bestD = dd; best = i; }
          });
          jump = { from: spots[at], to: spots[best], t: 0 };
          at = best;
          obj.userData.inAir = true;
        }
      }
      if (jump) {
        jump.t = Math.min(1, jump.t + dt / air);
        const k = jump.t;
        place(jump.from[0] + (jump.to[0] - jump.from[0]) * k, jump.from[1] + (jump.to[1] - jump.from[1]) * k);
        pivot.position.y = Math.sin(k * Math.PI) * hop; // the shadow stays on the ground
        if (k >= 1) { pivot.position.y = 0; jump = null; obj.userData.inAir = false; }
      }
      // in the air the rig's hop cycle runs on the jump's own clock, so the
      // stretch meets the take-off and the squash the landing
      play(jump ? jump.t * air : t, dt, !!jump);
    };
  }

  warn(`unknown move kind "${move.kind}"`);
  return null;
}

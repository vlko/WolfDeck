import { buildWolf } from '../assets/wolf.js';
import { HURRY_MULTIPLIER } from '../config.js';
import {
  findPath, blocked, segmentClear, nearestFree, addAgent,
} from './world.js';

// The wolf presenter. Owns its own movement state; the step machine calls
// walkTo()/hop() and waits on the returned promise.
//
// While idle he stays alive on his own: every few seconds he picks a little
// behavior — sitting down for a while, looking left and right, or trotting
// toward the viewer and back. Any navigation command cancels the behavior
// instantly, so the presentation always wins.

const WANDER_Z = 2.4; // how far toward the viewer he wanders
const WANDER_SPEED = 2.2;
const MANUAL_SPEED = 4.5; // A/S/D/F free-walk speed
const RETURN_AFTER = 5; // seconds of no movement input before he heads home
const MANUAL_RANGE_X = 13; // how far from his post he may roam
const MANUAL_Z = [-3.2, 4.6]; // stay on the meadow
const RADIUS = 0.45; // his footprint when steering round props

// Shortest signed angle from a to b.
function angleTo(a, b) {
  return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

export function createHero({ walkSpeed, heightAt }) {
  const group = buildWolf({ animation: 'none' }); // hero drives its own pose
  const pose = group.userData.pose;
  // Where he's heading, as a yaw (0 = toward the viewer, +π/2 = right).
  // A paper puppet can't really turn, so the yaw is translated into a card
  // flip (left/right) plus a slight lean of the card — see applyHeading().
  const heading = { y: 0 };
  // He is an agent in the world: vehicles brake for him.
  const agent = addAgent({ x: 0, z: 0, r: RADIUS });

  // A walkable route from where he stands to `to`, around every prop.
  function planPath(to) {
    const from = { x, z: group.position.z };
    const bounds = {
      x0: Math.min(from.x, to.x) - 6, x1: Math.max(from.x, to.x) + 6, z0: MANUAL_Z[0], z1: MANUAL_Z[1],
    };
    const goal = nearestFree(to, RADIUS, bounds) ?? to;
    return findPath(from, goal, RADIUS, bounds) ?? [goal];
  }

  // Moves along a polyline by `dist`; returns the travel direction, or null
  // once the last point is reached.
  function follow(path, dist) {
    let dir = null;
    while (dist > 1e-6 && path.length) {
      const p = path[0];
      const dx = p.x - x;
      const dz = p.z - group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 1e-4) { path.shift(); continue; }
      const step = Math.min(d, dist);
      x += (dx / d) * step;
      group.position.z += (dz / d) * step;
      dist -= step;
      dir = { x: dx / d, z: dz / d };
      if (step >= d) path.shift();
    }
    place();
    return path.length ? dir ?? { x: 0, z: 0 } : null;
  }
  function applyHeading(dt) {
    if (pose.trueYaw) {
      // a real 3D wolf simply turns his body
      group.rotation.y = heading.y;
      pose.update(dt);
      return;
    }
    const dirX = Math.sin(heading.y);
    pose.face(dirX);
    group.rotation.y = dirX * 0.3;
    pose.update(dt);
  }

  let x = 0;
  let mode = 'idle'; // idle | walk | hop | manual
  let walkState = null;
  let hopState = null;

  // His presenter post: where the presentation last put him. Manual roaming
  // and hops always come back here.
  let station = 0;
  let stationZ = 0; // 0 unless a prop stands on his spot
  const manualDir = { x: 0, z: 0 };
  let manualIdleTime = 0;
  let manualStride = 0;

  // Idle behavior scheduler.
  let behavior = null;
  let nextBehaviorIn = 6 + Math.random() * 6;

  function place() {
    group.position.x = x;
    group.position.y = heightAt(x, group.position.z);
  }
  function setX(nx) {
    x = nx;
    place();
  }
  setX(0);

  function cancelBehavior() {
    behavior = null;
    nextBehaviorIn = 6 + Math.random() * 6;
    pose.rest();
    pose.head.rotation.y = 0;
  }

  // ── idle behaviors ──────────────────────────────────────────────────────

  // Sit down, stay a while, get back up.
  function sitBehavior() {
    const hold = 3 + Math.random() * 3;
    let time = 0;
    return {
      update(dt, t) {
        time += dt;
        let k = 1;
        if (time < 0.6) k = time / 0.6;
        else if (time > 0.6 + hold) k = 1 - (time - 0.6 - hold) / 0.6;
        pose.sit(Math.max(0, Math.min(k, 1)), t, dt);
        return time > hold + 1.2;
      },
    };
  }

  // Glance to one side, maybe the other, then back to the audience.
  function lookBehavior() {
    const first = Math.random() < 0.5 ? -1 : 1;
    const both = Math.random() < 0.5;
    // keyframes: [end time, head yaw target]
    const frames = both
      ? [[0.4, first * 0.7], [1.6, first * 0.7], [2.2, -first * 0.7], [3.2, -first * 0.7], [3.7, 0]]
      : [[0.4, first * 0.7], [1.8, first * 0.7], [2.3, 0]];
    let time = 0;
    let yaw = 0;
    return {
      update(dt, t) {
        time += dt;
        const frame = frames.find(([end]) => time < end);
        const target = frame ? frame[1] : 0;
        yaw += (target - yaw) * Math.min(dt * 6, 1);
        pose.idle(t, dt);
        pose.head.rotation.y = yaw;
        return !frame && Math.abs(yaw) < 0.03;
      },
    };
  }

  // Trot from wherever he is back to his presenter post, then face front.
  // Used after manual roaming, and to recover from any interrupted excursion.
  function returnBehavior() {
    let phase = 0; // 0 travel · 1 face front
    let stride = 0;
    let path = null;
    return {
      update(dt, t) {
        if (phase === 0) {
          if (!path) path = planPath({ x: station, z: stationZ });
          const dist = Math.hypot(station - x, stationZ - group.position.z);
          const speed = Math.min(MANUAL_SPEED, dist * 4 + 0.8);
          const dir = follow(path, speed * dt);
          if (!dir) {
            pose.rest();
            phase = 1;
            return false;
          }
          heading.y += angleTo(heading.y, Math.atan2(dir.x, dir.z)) * Math.min(dt * 8, 1);
          stride += speed * dt * 3.2;
          pose.walk(stride, t, dt);
          return false;
        }
        heading.y += (0 - heading.y) * Math.min(dt * 6, 1);
        pose.idle(t, dt);
        return Math.abs(heading.y) < 0.03;
      },
    };
  }

  // Trot toward the viewer, take in the room, turn and trot back to the rail.
  function wanderBehavior() {
    let phase = 0; // 0 out · 1 pause · 2 back · 3 face front
    let ptime = 0;
    let stride = 0;
    return {
      update(dt, t) {
        ptime += dt;
        if (phase === 0) {
          // walk toward the camera, already facing it
          stride += WANDER_SPEED * dt * 3.2;
          pose.walk(stride, t, dt);
          group.position.z = Math.min(group.position.z + WANDER_SPEED * dt, WANDER_Z);
          place();
          if (group.position.z >= WANDER_Z) { phase = 1; ptime = 0; pose.rest(); }
        } else if (phase === 1) {
          pose.idle(t, dt);
          if (ptime > 1.2 + Math.random() * 0.8) { phase = 2; ptime = 0; }
        } else if (phase === 2) {
          // turn away and trot back upstage
          heading.y += (Math.PI - heading.y) * Math.min(dt * 7, 1);
          stride += WANDER_SPEED * dt * 3.2;
          pose.walk(stride, t, dt);
          group.position.z = Math.max(group.position.z - WANDER_SPEED * dt, 0);
          place();
          if (group.position.z <= 0) { phase = 3; ptime = 0; pose.rest(); }
        } else {
          // ease back to face the audience
          heading.y += (0 - heading.y) * Math.min(dt * 6, 1);
          pose.idle(t, dt);
          return Math.abs(heading.y) < 0.03;
        }
        return false;
      },
    };
  }

  function pickBehavior() {
    const roll = Math.random();
    if (roll < 0.4) return sitBehavior();
    if (roll < 0.75) return lookBehavior();
    // trot toward the viewer only if nothing stands in the way
    if (!segmentClear({ x, z: group.position.z }, { x, z: WANDER_Z }, RADIUS)) return lookBehavior();
    return wanderBehavior();
  }

  // ── public API ──────────────────────────────────────────────────────────

  const api = {
    group,
    get x() { return x; },

    snapTo(nx) {
      // jumps land on the nearest free spot by the scene's center
      const spot = nearestFree({ x: nx, z: 0 }, RADIUS, { z0: MANUAL_Z[0], z1: MANUAL_Z[1] }) ?? { x: nx, z: 0 };
      group.position.z = spot.z;
      setX(spot.x);
      station = spot.x;
      stationZ = spot.z;
    },

    // Free-walk input from A/S/D/F ([-1..1] each axis; 0,0 = released).
    setManualDir(dx, dz) {
      manualDir.x = dx;
      manualDir.z = dz;
      if ((dx || dz) && (mode === 'idle' || mode === 'manual')) {
        if (mode === 'idle') cancelBehavior();
        mode = 'manual';
        manualIdleTime = 0;
      }
    },

    // Ease to targetX with a trot; resolves on arrival.
    walkTo(targetX) {
      cancelBehavior();
      station = targetX;
      return new Promise((resolve) => {
        const dir = Math.sign(targetX - x) || 1;
        mode = 'walk';
        const path = planPath({ x: targetX, z: 0 });
        const end = path[path.length - 1];
        station = end.x;
        stationZ = end.z;
        walkState = {
          targetX, dir, stride: 0, hurry: false, resolve, path,
        };
      });
    },

    // Same-direction press mid-walk → speed up.
    hurry(dir) {
      if (mode === 'walk' && walkState && walkState.dir === dir) {
        walkState.hurry = true;
        return true;
      }
      return false;
    },

    get walking() { return mode === 'walk'; },
    get walkDir() { return walkState ? walkState.dir : 0; },

    // Little end-of-deck hop; resolves when landed.
    hop() {
      cancelBehavior();
      return new Promise((resolve) => {
        mode = 'hop';
        hopState = { k: 0, resolve };
      });
    },

    update(t, dt) {
      step(t, dt);
      applyHeading(dt);
      agent.x = x;
      agent.z = group.position.z;
    },
  };

  function step(t, dt) {
    {
      if (mode === 'walk') {
        const ws = walkState;
        const speed = walkSpeed * (ws.hurry ? HURRY_MULTIPLIER : 1);
        // Follow the planned route round any props in the way.
        const dirv = follow(ws.path, speed * dt);

        // Body and head yaw toward the travel direction (a touch toward the
        // audience when trotting sideways, so we still see his face).
        if (dirv) {
          const targetYaw = Math.atan2(dirv.x, dirv.z) * (Math.abs(dirv.z) < 0.3 ? 0.8 : 1);
          heading.y += angleTo(heading.y, targetYaw) * Math.min(dt * 8, 1);
        }
        pose.head.rotation.y = 0;

        ws.stride += speed * dt * 1.6;
        pose.walk(ws.stride, t, dt);

        if (!ws.path.length) {
          place();
          mode = 'idle';
          walkState = null;
          ws.resolve();
        }
      } else if (mode === 'hop') {
        const hs = hopState;
        hs.k = Math.min(hs.k + dt / 0.45, 1);
        pose.hop(hs.k, heightAt(x, group.position.z));
        if (hs.k >= 1) {
          place();
          pose.rest();
          mode = 'idle';
          hopState = null;
          hs.resolve();
        }
      } else if (mode === 'manual') {
        const len = Math.hypot(manualDir.x, manualDir.z);
        if (len > 0) {
          manualIdleTime = 0;
          const vx = manualDir.x / len;
          const vz = manualDir.z / len;
          const nx = Math.max(station - MANUAL_RANGE_X, Math.min(x + vx * MANUAL_SPEED * dt, station + MANUAL_RANGE_X));
          const nz = Math.max(MANUAL_Z[0], Math.min(group.position.z + vz * MANUAL_SPEED * dt, MANUAL_Z[1]));
          // collide with props: slide along whatever is in the way
          const z0 = group.position.z;
          const inside = blocked(x, z0, RADIUS); // already overlapping? let him walk out
          if (inside || !blocked(nx, nz, RADIUS)) { x = nx; group.position.z = nz; }
          else if (!blocked(nx, z0, RADIUS)) x = nx;
          else if (!blocked(x, nz, RADIUS)) group.position.z = nz;
          place();
          const targetYaw = Math.atan2(vx, vz);
          heading.y += angleTo(heading.y, targetYaw) * Math.min(dt * 8, 1);
          manualStride += MANUAL_SPEED * dt * 3.2;
          pose.walk(manualStride, t, dt);
        } else {
          // Keys released: wait where he stands; after RETURN_AFTER seconds
          // of silence he trots back to his post on his own.
          heading.y += (0 - heading.y) * Math.min(dt * 6, 1);
          pose.idle(t, dt);
          manualIdleTime += dt;
          if (manualIdleTime > RETURN_AFTER) {
            mode = 'idle';
            behavior = returnBehavior();
          }
        }
      } else if (behavior) {
        if (behavior.update(dt, t)) cancelBehavior();
      } else {
        // Movement keys still held after a presentation walk? Resume roaming.
        if (manualDir.x || manualDir.z) {
          mode = 'manual';
          manualIdleTime = 0;
          return;
        }
        // Ease yaw back to front-facing, then idle.
        heading.y += (0 - heading.y) * Math.min(dt * 6, 1);
        pose.idle(t, dt);
        // Displaced by a hop or an interrupted excursion? Walk home first.
        if (Math.abs(group.position.z - stationZ) > 0.05 || Math.abs(x - station) > 0.05) {
          behavior = returnBehavior();
          return;
        }
        nextBehaviorIn -= dt;
        if (nextBehaviorIn <= 0) behavior = pickBehavior();
      }
    }
  }
  return api;
}

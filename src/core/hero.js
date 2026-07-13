import { buildWolf } from '../assets/wolf.js';
import { HURRY_MULTIPLIER } from '../config.js';

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

// Shortest signed angle from a to b.
function angleTo(a, b) {
  return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

export function createHero({ walkSpeed, heightAt }) {
  const group = buildWolf({ animation: 'none' }); // hero drives its own pose
  const pose = group.userData.pose;

  let x = 0;
  let mode = 'idle'; // idle | walk | hop | manual
  let walkState = null;
  let hopState = null;

  // His presenter post: where the presentation last put him. Manual roaming
  // and hops always come back here.
  let station = 0;
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
    return {
      update(dt, t) {
        if (phase === 0) {
          const dx = station - x;
          const dz = 0 - group.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.08) {
            setX(station);
            group.position.z = 0;
            place();
            pose.rest();
            phase = 1;
            return false;
          }
          const speed = Math.min(MANUAL_SPEED, dist * 4 + 0.5);
          x += (dx / dist) * speed * dt;
          group.position.z += (dz / dist) * speed * dt;
          place();
          const targetYaw = Math.atan2(dx, dz);
          group.rotation.y += angleTo(group.rotation.y, targetYaw) * Math.min(dt * 8, 1);
          stride += speed * dt * 3.2;
          pose.walk(stride, t, dt);
          return false;
        }
        group.rotation.y += (0 - group.rotation.y) * Math.min(dt * 6, 1);
        pose.idle(t, dt);
        return Math.abs(group.rotation.y) < 0.03;
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
          group.rotation.y += (Math.PI - group.rotation.y) * Math.min(dt * 7, 1);
          stride += WANDER_SPEED * dt * 3.2;
          pose.walk(stride, t, dt);
          group.position.z = Math.max(group.position.z - WANDER_SPEED * dt, 0);
          place();
          if (group.position.z <= 0) { phase = 3; ptime = 0; pose.rest(); }
        } else {
          // ease back to face the audience
          group.rotation.y += (0 - group.rotation.y) * Math.min(dt * 6, 1);
          pose.idle(t, dt);
          return Math.abs(group.rotation.y) < 0.03;
        }
        return false;
      },
    };
  }

  function pickBehavior() {
    const roll = Math.random();
    if (roll < 0.4) return sitBehavior();
    if (roll < 0.75) return lookBehavior();
    return wanderBehavior();
  }

  // ── public API ──────────────────────────────────────────────────────────

  return {
    group,
    get x() { return x; },

    snapTo(nx) {
      setX(nx);
      station = nx;
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
        walkState = {
          targetX, dir, stride: 0, hurry: false, resolve,
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
      if (mode === 'walk') {
        const ws = walkState;
        const speed = walkSpeed * (ws.hurry ? HURRY_MULTIPLIER : 1);
        const remaining = ws.targetX - x;
        const step = Math.min(Math.abs(remaining), speed * dt);
        x += step * ws.dir;

        // If a wander was interrupted, angle back to the rail as he walks.
        group.position.z += (0 - group.position.z) * Math.min(dt * 2, 1);
        place();

        // Body and head both yaw toward the travel direction.
        const targetYaw = ws.dir * Math.PI / 2 * 0.8;
        group.rotation.y += (targetYaw - group.rotation.y) * Math.min(dt * 8, 1);
        pose.head.rotation.y = 0;

        ws.stride += speed * dt * 1.6;
        pose.walk(ws.stride, t, dt);

        if (Math.abs(ws.targetX - x) < 1e-3) {
          setX(ws.targetX);
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
          x = Math.max(station - MANUAL_RANGE_X, Math.min(x + vx * MANUAL_SPEED * dt, station + MANUAL_RANGE_X));
          group.position.z = Math.max(MANUAL_Z[0], Math.min(group.position.z + vz * MANUAL_SPEED * dt, MANUAL_Z[1]));
          place();
          const targetYaw = Math.atan2(vx, vz);
          group.rotation.y += angleTo(group.rotation.y, targetYaw) * Math.min(dt * 8, 1);
          manualStride += MANUAL_SPEED * dt * 3.2;
          pose.walk(manualStride, t, dt);
        } else {
          // Keys released: wait where he stands; after RETURN_AFTER seconds
          // of silence he trots back to his post on his own.
          group.rotation.y += (0 - group.rotation.y) * Math.min(dt * 6, 1);
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
        group.rotation.y += (0 - group.rotation.y) * Math.min(dt * 6, 1);
        pose.idle(t, dt);
        // Displaced by a hop or an interrupted excursion? Walk home first.
        if (Math.abs(group.position.z) > 0.05 || Math.abs(x - station) > 0.05) {
          behavior = returnBehavior();
          return;
        }
        nextBehaviorIn -= dt;
        if (nextBehaviorIn <= 0) behavior = pickBehavior();
      }
    },
  };
}

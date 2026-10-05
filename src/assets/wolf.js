import { register } from './registry.js';
import { makeStandee } from './sprites.js';
import { applyAnimation } from './helpers.js';

// The wolf presenter — the big origami wolf from visual.png, mounted as a
// paper-theatre puppet. He can't bend, so he acts like a cut-out does: a
// waddling rock-and-bounce trot, a squash to sit, a hop, and he turns around
// by flipping the card (it narrows to an edge and opens up mirrored).
//
// userData.pose is driven by core/hero.js:
//   rest() idle(t,dt) walk(stride,t,dt) sit(k,t,dt) hop(k,groundY)
//   head.rotation.y   — glance (the card leans into the look)
//   face(dirX)        — +1 right, −1 left (0 keeps the current side)
//   update(dt)        — eases the flip

export const WOLF_HEIGHT = 2.3;

export function buildWolf(options = {}) {
  const group = makeStandee('wolf', { height: WOLF_HEIGHT, shadowOpacity: 0.24 });
  const rigPose = group.userData.sprite.rig?.pose;
  if (rigPose) {
    // The hand-built 3D wolf: a real rig (legs, head, ears, tail, eyelids),
    // and he turns for real — hero.js yaws the whole group.
    let time = 0;
    group.userData.pose = {
      ...rigPose,
      head: rigPose.head,
      trueYaw: true,
      face() {},
      get facing() { return 1; },
      update(dt) { time += dt; rigPose.tick(time, dt); },
    };
    return group;
  }
  const { pivot, flip } = group.userData.sprite;
  const head = { rotation: { y: 0 } };
  let facing = 1; // the printed wolf's tail is on the left: he "walks right"
  let flipK = 1;

  const pose = {
    head,
    rest() {
      pivot.position.set(0, 0, 0);
      pivot.rotation.set(0, 0, 0);
      pivot.scale.set(1, 1, 1);
    },
    idle(t) {
      const b = Math.sin(t * 2.2);
      pivot.position.y = 0;
      pivot.scale.set(1 - b * 0.007, 1 + b * 0.014, 1);
      pivot.rotation.z = Math.sin(t * 0.8) * 0.018;
      pivot.rotation.y = head.rotation.y * 0.45;
    },
    walk(stride) {
      const s = Math.sin(stride);
      pivot.rotation.z = s * 0.075;
      pivot.rotation.y = 0;
      pivot.position.y = Math.abs(s) * 0.16;
      const land = 1 - Math.abs(Math.cos(stride)) * 0.03;
      pivot.scale.set(1 + (1 - land) * 0.5, land, 1);
    },
    sit(k, t) {
      const b = Math.sin(t * 2.2) * 0.006;
      pivot.position.y = 0;
      pivot.rotation.z = 0;
      pivot.scale.set(1 + k * 0.05, 1 - k * 0.11 + b, 1);
    },
    hop(k, groundY) {
      group.position.y = groundY + Math.sin(Math.PI * k) * 0.95;
      const squash = k < 0.15 ? 1 - (k / 0.15) * 0.1 : k > 0.85 ? 0.9 + ((1 - k) / 0.15) * 0.1 : 1.06;
      pivot.scale.set(2 - squash, squash, 1);
    },
    face(dirX) {
      if (dirX > 0.25) facing = 1;
      else if (dirX < -0.25) facing = -1;
    },
    get facing() { return facing; },
    update(dt) {
      flipK += (facing - flipK) * Math.min(dt * 9, 1);
      // never exactly 0 — an edge-on card would vanish
      flip.scale.x = Math.abs(flipK) < 0.05 ? 0.05 * Math.sign(facing) : flipK;
    },
  };
  group.userData.pose = pose;
  return group;
}

// The wolf as a plain prop (e.g. a second wolf in a scene).
register('wolf', (options = {}) => {
  const group = buildWolf(options);
  const pose = group.userData.pose;
  if (options.flip) { pose.face(-1); pose.update(1); }
  applyAnimation(group, {
    always: pose.trueYaw ? (t, dt) => pose.update(dt) : undefined,
    idle: (t) => pose.idle(t),
    walk: (t) => pose.walk(t * 7),
    sit: (t) => pose.sit(1, t),
  }, options, 'idle', 'wolf');
  return group;
});

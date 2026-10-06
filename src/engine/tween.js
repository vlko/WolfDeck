// Minimal tween system. All tweens live in one list ticked by the ticker;
// finishNow() snaps a tween to its end state (used for jumps).
//
// A new tween of a property that is already animating takes it over: the
// older tween is cancelled (its promise resolves) and the new one starts from
// the current value. So reveal → hide → reveal in quick succession never has
// two tweens fighting over one panel — animations are fire-and-forget and the
// presenter is never blocked by them.

export const ease = {
  linear: (k) => k,
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inCubic: (k) => k * k * k,
  backOut: (k) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  },
};

const active = new Set();
const owners = new WeakMap(); // obj → Map(key → handle animating it)

function claim(obj, keys, handle) {
  let m = owners.get(obj);
  if (!m) { m = new Map(); owners.set(obj, m); }
  for (const k of keys) {
    const prev = m.get(k);
    if (prev && prev !== handle) prev.cancel();
    m.set(k, handle);
  }
}
function release(obj, keys, handle) {
  const m = owners.get(obj);
  if (!m) return;
  for (const k of keys) if (m.get(k) === handle) m.delete(k);
}

// Tween numeric properties of obj. props = { key: endValue }.
// Returns a handle with { finishNow(), cancel(), done } — done is a promise.
export function tween(obj, props, duration, easing = ease.inOutCubic, onUpdate) {
  const keys = Object.keys(props);

  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const from = {};
  const handle = {
    elapsed: 0,
    finished: false,
    done,
    step(dt) {
      this.elapsed += dt;
      const k = duration <= 0 ? 1 : Math.min(this.elapsed / duration, 1);
      const e = easing(k);
      for (const key of keys) {
        obj[key] = from[key] + (props[key] - from[key]) * e;
      }
      if (onUpdate) onUpdate(e);
      if (k >= 1) this.finishNow();
    },
    finishNow() {
      if (this.finished) return;
      this.finished = true;
      for (const key of keys) obj[key] = props[key];
      if (onUpdate) onUpdate(1);
      active.delete(this);
      release(obj, keys, this);
      resolve();
    },
    cancel() {
      if (this.finished) return;
      this.finished = true;
      active.delete(this);
      release(obj, keys, this);
      resolve();
    },
  };
  claim(obj, keys, handle); // cancels whatever animated these keys before
  for (const k of keys) from[k] = obj[k]; // …and starts from where it left off
  active.add(handle);
  return handle;
}

export function tickTweens(dt) {
  for (const h of [...active]) h.step(dt);
}

// Snap every running tween to its end — the "presenter is mashing" fast-forward.
export function finishAllTweens() {
  for (const h of [...active]) h.finishNow();
}

// Minimal tween system. All tweens live in one list ticked by the ticker;
// finishNow() snaps a tween to its end state (used when the presenter mashes keys).

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

// Tween numeric properties of obj. props = { key: endValue }.
// Returns a handle with { finishNow(), cancel(), done } — done is a promise.
export function tween(obj, props, duration, easing = ease.inOutCubic, onUpdate) {
  const from = {};
  for (const k of Object.keys(props)) from[k] = obj[k];

  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const handle = {
    elapsed: 0,
    finished: false,
    done,
    step(dt) {
      this.elapsed += dt;
      const k = duration <= 0 ? 1 : Math.min(this.elapsed / duration, 1);
      const e = easing(k);
      for (const key of Object.keys(props)) {
        obj[key] = from[key] + (props[key] - from[key]) * e;
      }
      if (onUpdate) onUpdate(e);
      if (k >= 1) this.finishNow();
    },
    finishNow() {
      if (this.finished) return;
      this.finished = true;
      for (const key of Object.keys(props)) obj[key] = props[key];
      if (onUpdate) onUpdate(1);
      active.delete(this);
      resolve();
    },
    cancel() {
      if (this.finished) return;
      this.finished = true;
      active.delete(this);
      resolve();
    },
  };
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

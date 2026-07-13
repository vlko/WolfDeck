// requestAnimationFrame loop. Registered callbacks receive (t, dt) in seconds;
// dt is clamped so a background tab doesn't produce a giant catch-up step.
export function createTicker() {
  const callbacks = new Set();
  let last = performance.now();

  function frame(nowMs) {
    const t = nowMs / 1000;
    const dt = Math.min((nowMs - last) / 1000, 1 / 20);
    last = nowMs;
    for (const cb of callbacks) cb(t, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    add(cb) {
      callbacks.add(cb);
      return () => callbacks.delete(cb);
    },
  };
}

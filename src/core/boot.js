// The loading screen (#boot in index.html) — says what the deck is doing
// while it starts, and how long each phase took. The markup and the count of
// engine files arriving are plain HTML/inline script, so they show before
// any module has loaded; from start() on, this module drives it.
//
// Every phase is also a performance measure ("boot:<name>") — they show in
// the browser's Performance panel and in tools/verify/loadtime.mjs.
const el = document.getElementById('boot');
const label = el?.querySelector('.boot-label');
const bar = el?.querySelector('.boot-bar i');
const log = el?.querySelector('.boot-log');

let current = null; // { name, t0 }
let share = [0, 0]; // the slice of the bar the running phase fills

// Let the browser paint the new label before a long synchronous stretch.
// (rAF alone never fires in a background tab — don't let that stall a load.)
const painted = () => new Promise((resolve) => {
  let done = false;
  const go = () => { if (!done) { done = true; resolve(); } };
  requestAnimationFrame(() => setTimeout(go, 0));
  setTimeout(go, 60);
});

function close() {
  if (!current) return;
  const ms = performance.now() - current.t0;
  performance.measure(`boot:${current.name}`, { start: current.t0, duration: ms });
  if (log) {
    const row = document.createElement('div');
    row.innerHTML = '<span></span><b></b>';
    row.firstChild.textContent = current.name;
    row.lastChild.textContent = ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
    log.append(row);
  }
  current = null;
}

// Start a phase: `from`–`to` is the part of the bar it covers (0–1).
export async function phase(name, from, to) {
  close();
  window.__bootStop?.(); // the inline file counter hands over
  current = { name, t0: performance.now() };
  share = [from, to];
  if (label) label.textContent = `${name}…`;
  progress(0, 1);
  await painted();
}

// Progress inside the running phase, with an optional note ("3 / 14").
export function progress(done, total, note) {
  const [a, b] = share;
  if (bar) bar.style.width = `${(a + (b - a) * (total ? done / total : 1)) * 100}%`;
  if (label && current && note) label.textContent = `${current.name}… ${note}`;
}

// Like phase(), for steps inside one (a repaint between two heavy chunks).
export async function step(done, total, note) {
  progress(done, total, note);
  await painted();
}

let finished = false;
export function finish() {
  if (finished) return;
  finished = true;
  close();
  if (!el) return;
  performance.measure('boot:total', { start: 0, duration: performance.now() });
  if (bar) bar.style.width = '100%';
  el.classList.add('done');
  setTimeout(() => el.remove(), 600);
}

// Startup failed — leave the log up and say where it stopped.
export function fail(err) {
  if (label) label.textContent = `Failed while: ${current?.name ?? 'starting'} — ${err?.message ?? err}`;
  el?.classList.add('failed');
}

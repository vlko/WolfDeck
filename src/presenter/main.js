// The presenter's window (opened by F in the deck, see core/presenter.js):
// timer, speaker notes, a live thumbnail of the audience view and the text
// the next keypress brings. It holds no deck — everything arrives over the
// BroadcastChannel named in ?ch=, and its keys go back as commands.
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';

const CSS = `
* { box-sizing: border-box; }
body { font-family: Nunito,'Avenir Next','Trebuchet MS',sans-serif; color: #2f3431;
  overflow: hidden; }
.pv { display: grid; grid-template-columns: minmax(320px, 42%) 1fr;
  grid-template-rows: auto 1fr; gap: 14px; height: 100vh; padding: 14px; }
.pv-card { background: #fbf8f1; border: 5px solid #d9ccb2; border-radius: 14px;
  box-shadow: 6px 8px 0 rgba(74,67,52,0.14); min-height: 0; min-width: 0; }
.pv-head { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
  font-weight: 800; color: #9a716e; }
.pv-top { grid-column: 1 / -1; display: flex; align-items: center; gap: 18px;
  padding: 10px 18px; flex-wrap: wrap; }
.pv-timer { font-size: 44px; font-weight: 800; font-variant-numeric: tabular-nums;
  line-height: 1; min-width: 3.4em; }
.pv-timer.paused { color: #a4b1a2; }
.pv-clock { font-size: 20px; font-weight: 700; color: #71705f;
  font-variant-numeric: tabular-nums; }
.pv-deck { margin-left: auto; text-align: right; min-width: 0; }
.pv-deck-title { font-size: 15px; font-weight: 800; }
.pv-count { font-size: 13px; font-weight: 700; color: #71705f;
  font-variant-numeric: tabular-nums; }
.pv-btn { font: inherit; font-size: 14px; font-weight: 800; color: #2f3431;
  background: #ebe7d7; border: 0; border-radius: 9px; padding: 8px 13px;
  cursor: pointer; min-width: 38px; }
.pv-btn:hover { background: #dfd8c2; }
.pv-btn.on { background: #b98a86; color: #fbf8f1; }
.pv-btns { display: flex; gap: 6px; }
.pv-left { display: flex; flex-direction: column; gap: 14px; min-height: 0; }
.pv-now { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.pv-frame { width: 100%; aspect-ratio: 16 / 9; background: #e4decd;
  border-radius: 8px; overflow: hidden; display: flex; align-items: center;
  justify-content: center; color: #71705f; font-weight: 700; font-size: 14px;
  text-align: center; padding: 0; }
.pv-frame img { width: 100%; height: 100%; object-fit: contain; display: block; }
.pv-frame.stale img { opacity: 0.45; }
.pv-kicker { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
  font-weight: 700; color: #71705f; }
.pv-title { font-size: 18px; font-weight: 800; line-height: 1.25; }
.pv-next { padding: 12px 16px; flex: 1; overflow: auto; display: flex;
  flex-direction: column; gap: 6px; }
.pv-next-title { font-size: 19px; font-weight: 800; line-height: 1.25; }
.pv-next-sub { font-size: 15px; line-height: 1.4; color: #4a4d49; }
.pv-next ul { margin: 2px 0 0; padding-left: 1.15em; font-size: 15px; line-height: 1.4; }
.pv-next li { margin: 2px 0; }
.pv-after { margin-top: auto; padding-top: 8px; font-size: 13px; font-weight: 700;
  color: #71705f; }
.pv-notes { padding: 14px 20px; display: flex; flex-direction: column; gap: 8px; }
.pv-notes-bar { display: flex; align-items: center; justify-content: space-between; }
.pv-notes-text { flex: 1; overflow: auto; white-space: pre-wrap; line-height: 1.5;
  font-weight: 400; }
.pv-notes-text.empty { color: #a4b1a2; }
.pv-notes-text strong { font-weight: 800; }
`;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
// Buttons must not take focus, or Space would press them instead of advancing.
const button = (label, title, onClick) => {
  const b = el('button', 'pv-btn', label);
  b.type = 'button';
  b.title = title;
  b.tabIndex = -1;
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', onClick);
  return b;
};

const style = el('style');
style.textContent = CSS;
document.head.appendChild(style);

const chId = new URLSearchParams(window.location.search).get('ch') ?? '';
const channel = new BroadcastChannel(`wolfdeck-presenter-${chId}`);
const send = (cmd) => channel.postMessage({ type: 'cmd', cmd });

// ── layout ──
const root = el('div', 'pv');

const top = el('div', 'pv-card pv-top');
const timerEl = el('div', 'pv-timer', '0:00');
const pauseBtn = button('Pauza', 'Pozastaviť / spustiť časovač', () => togglePause());
const resetBtn = button('Reset', 'Vynulovať časovač', () => resetTimer());
const timerBtns = el('div', 'pv-btns');
timerBtns.append(pauseBtn, resetBtn);
const clockEl = el('div', 'pv-clock');
const navBtns = el('div', 'pv-btns');
const focusBtn = button('2D', 'Prepnúť prezentačný režim (P)', () => send('focus'));
navBtns.append(button('‹', 'Späť (Backspace)', () => send('prev')), button('›', 'Ďalej (Space)', () => send('next')), focusBtn);
const deckBox = el('div', 'pv-deck');
const deckTitle = el('div', 'pv-deck-title');
const countEl = el('div', 'pv-count');
deckBox.append(deckTitle, countEl);
top.append(timerEl, timerBtns, clockEl, navBtns, deckBox);

const left = el('div', 'pv-left');
const now = el('div', 'pv-card pv-now');
const frame = el('div', 'pv-frame', 'Čakám na prezentáciu…');
const img = el('img');
img.alt = '';
const kickerEl = el('div', 'pv-kicker');
const titleEl = el('div', 'pv-title');
now.append(el('div', 'pv-head', 'Teraz'), frame, kickerEl, titleEl);
const next = el('div', 'pv-card pv-next');
left.append(now, next);

const notes = el('div', 'pv-card pv-notes');
const notesBar = el('div', 'pv-notes-bar');
const sizeBtns = el('div', 'pv-btns');
sizeBtns.append(button('A−', 'Menšie písmo (−)', () => setSize(size - 2)), button('A+', 'Väčšie písmo (+)', () => setSize(size + 2)));
notesBar.append(el('div', 'pv-head', 'Poznámky'), sizeBtns);
const notesText = el('div', 'pv-notes-text');
notes.append(notesBar, notesText);

root.append(top, left, notes);
document.body.appendChild(root);

// Notes are plain text with one bit of markup: **key phrase** is set bold, so the thread of the talk can be read at a glance.
function showNotes(text) {
  notesText.textContent = '';
  text.split(/\*\*(.+?)\*\*/g).forEach((chunk, i) => {
    if (!chunk) return;
    if (i % 2) notesText.append(el('strong', null, chunk));
    else notesText.append(chunk);
  });
}

// ── notes font size (remembered) ──
let size = 24;
try { size = Number(localStorage.getItem('wolfdeck-notes-size')) || 24; } catch { /* blocked */ }
function setSize(px) {
  size = Math.max(14, Math.min(56, px));
  notesText.style.fontSize = `${size}px`;
  try { localStorage.setItem('wolfdeck-notes-size', String(size)); } catch { /* blocked */ }
}
setSize(size);

// ── timer ──
let elapsed = 0; // ms accumulated before `since`
let since = Date.now(); // null while paused
function elapsedMs() { return elapsed + (since == null ? 0 : Date.now() - since); }
function togglePause() {
  if (since == null) since = Date.now();
  else { elapsed = elapsedMs(); since = null; }
  paintTime();
}
function resetTimer() {
  elapsed = 0;
  if (since != null) since = Date.now();
  paintTime();
}
const two = (n) => String(n).padStart(2, '0');
function paintTime() {
  const s = Math.floor(elapsedMs() / 1000);
  const h = Math.floor(s / 3600);
  timerEl.textContent = h ? `${h}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}` : `${Math.floor(s / 60)}:${two(s % 60)}`;
  timerEl.classList.toggle('paused', since == null);
  pauseBtn.textContent = since == null ? 'Štart' : 'Pauza';
  const d = new Date();
  clockEl.textContent = `${two(d.getHours())}:${two(d.getMinutes())}`;
  frame.classList.toggle('stale', Date.now() - lastFrameAt > 3000);
}

// ── state from the audience window ──
function paintNext(m) {
  next.textContent = '';
  const n = m.next ?? { kind: 'end' };
  next.appendChild(el('div', 'pv-head', n.kind === 'slide' ? (n.walk ? 'Ďalej · nová scéna' : 'Ďalej · nový slide') : 'Ďalej'));
  if (n.kind === 'end') {
    next.appendChild(el('div', 'pv-next-title', 'Koniec prezentácie'));
  } else if (n.kind === 'slide') {
    if (n.kicker) next.appendChild(el('div', 'pv-kicker', n.kicker));
    next.appendChild(el('div', 'pv-next-title', n.title || '—'));
    if (n.subtitle) next.appendChild(el('div', 'pv-next-sub', n.subtitle));
  } else {
    const ul = el('ul');
    (n.lines ?? []).forEach((l) => ul.appendChild(el('li', null, l)));
    next.appendChild(ul);
    if (m.after) next.appendChild(el('div', 'pv-after', `Potom slide: ${m.after}`));
  }
}

function paintState(m) {
  deckTitle.textContent = m.deck ?? '';
  document.title = `${m.slide ?? ''}/${m.slides ?? ''} · ${m.deck ?? 'WolfDeck'}`;
  countEl.textContent = m.slides
    ? `Slide ${m.slide} / ${m.slides}${m.steps ? ` · krok ${m.step} / ${m.steps}` : ''}`
    : '';
  kickerEl.textContent = m.kicker ?? '';
  titleEl.textContent = m.title ?? '';
  showNotes(m.notes || 'K tomuto slidu nie sú poznámky.');
  notesText.classList.toggle('empty', !m.notes);
  if (m.slide !== shownSlide) { notesText.scrollTop = 0; shownSlide = m.slide; }
  focusBtn.classList.toggle('on', !!m.focus);
  paintNext(m);
}

let shownSlide = null;
let lastFrameAt = 0;
let frameUrl = null;
channel.onmessage = (e) => {
  const m = e.data ?? {};
  if (m.type === 'state') paintState(m);
  else if (m.type === 'ping') channel.postMessage({ type: 'hello' }); // the deck reloaded
  else if (m.type === 'frame' && m.blob) {
    if (!img.isConnected) { frame.textContent = ''; frame.appendChild(img); }
    const url = URL.createObjectURL(m.blob);
    img.src = url;
    if (frameUrl) URL.revokeObjectURL(frameUrl);
    frameUrl = url;
    lastFrameAt = Date.now();
  }
};

// ── keys: the same ones the deck uses ──
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'PageDown') { e.preventDefault(); send('next'); }
  else if (e.code === 'Backspace' || e.code === 'ArrowLeft' || e.code === 'PageUp') { e.preventDefault(); send('prev'); }
  else if (e.code === 'KeyP' && !e.repeat) send('focus');
  else if (e.key === '+' || e.key === '=') setSize(size + 2);
  else if (e.key === '-') setSize(size - 2);
});

window.addEventListener('pagehide', () => channel.postMessage({ type: 'bye' }));
channel.postMessage({ type: 'hello' });
paintTime();
setInterval(paintTime, 250);

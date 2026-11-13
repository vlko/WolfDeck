// Presenting (press F): this window is the AUDIENCE view — it goes
// fullscreen, on a chosen screen where the browser can place it (Window
// Management API, Chrome/Edge) — and a second, light window opens for the
// presenter: timer, speaker notes, a live thumbnail of this canvas and the
// text of what the next keypress brings (presenter.html).
//
// The presenter window knows nothing about the deck; everything it shows
// arrives over a BroadcastChannel, and its keys come back as commands:
//   presenter → audience  hello | bye | cmd { cmd: next | prev | focus }
//   audience → presenter  state { … } | frame { blob } | ping
import { warn } from '../config.js';
import { partLines } from './slideText.js';

const FRAME_EVERY = 250; // ms between thumbnails
const FRAME_WIDTH = 640;
const KEY = 'wolfdeck-presenter-channel';

const CSS = `
.wd-pick { position: fixed; inset: 0; z-index: 40; display: none;
  align-items: center; justify-content: center;
  background: rgba(47,52,49,0.38);
  font-family: Nunito,'Avenir Next','Trebuchet MS',sans-serif; }
.wd-pick.open { display: flex; }
.wd-pick-panel { background: #fbf8f1; color: #2f3431;
  border-radius: 14px; border: 6px solid #d9ccb2;
  box-shadow: 10px 14px 0 rgba(74,67,52,0.18), 0 24px 60px rgba(0,0,0,0.25);
  width: min(520px, 90vw); padding: 8px; }
.wd-pick-head { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
  font-weight: 800; color: #9a716e; padding: 12px 16px 8px; }
.wd-pick-item { display: flex; gap: 14px; align-items: baseline; width: 100%;
  padding: 12px 16px; border-radius: 10px; cursor: pointer; border: 0;
  background: none; font: inherit; color: inherit; text-align: left; }
.wd-pick-item:hover, .wd-pick-item:focus-visible { background: #ebe7d7; outline: none; }
.wd-pick-num { color: #a4b1a2; font-weight: 800; min-width: 1.4em; text-align: right; }
.wd-pick-title { font-size: 16px; font-weight: 800; }
.wd-pick-sub { font-size: 12px; font-weight: 700; color: #71705f; }
.wd-toast { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%);
  z-index: 41; background: #2f3431; color: #ebe7d7; padding: 10px 18px;
  border-radius: 10px; font: 700 14px Nunito,'Avenir Next','Trebuchet MS',sans-serif;
  opacity: 0; transition: opacity 0.25s; pointer-events: none; max-width: 90vw; }
.wd-toast.show { opacity: 1; }
`;

export function createPresenter({ deck, deckView, stepMachine, focus, renderer }) {
  const canvas = renderer.domElement;
  let channel = null;
  let channelId = null;
  let popup = null;
  let connected = false; // a presenter window said hello
  let lastFrame = 0;
  let encoding = false;
  let thumb = null; // small 2D canvas the frames are drawn to
  let homeScreen = null; // where the presenter window goes

  // ── what is on screen now, and what the next keypress brings ──
  function slideOf(s, k) {
    const scene = deck.scenes[s];
    const li = k > 0 ? scene.steps[k - 1].slideIndex : 0;
    return { scene, li, slide: scene.slides[li] };
  }

  function nextFor(s, k) {
    const scene = deck.scenes[s];
    if (k < scene.steps.length) {
      const st = scene.steps[k];
      if (!st.parts.length) { // the next slide's title beat
        const sl = scene.slides[st.slideIndex];
        return { kind: 'slide', kicker: sl.kicker, title: sl.title, subtitle: sl.subtitle };
      }
      return { kind: 'step', lines: st.parts.flatMap(partLines) };
    }
    const after = deck.scenes[s + 1];
    if (!after) return { kind: 'end' };
    const sl = after.slides[0];
    return { kind: 'slide', walk: true, kicker: sl?.kicker ?? after.kicker, title: sl?.title ?? '', subtitle: sl?.subtitle ?? '' };
  }

  function stateMessage() {
    const { scene: s, step: k } = stepMachine.state;
    if (!deck.scenes[s]) return { type: 'state', deck: deck.meta.title, slides: 0 };
    const { scene, li, slide } = slideOf(s, k);
    const flat = deckView.activeSlide(s, k);
    // progress inside the slide counts its panel groups, not the title beat
    let steps = 0;
    let step = 0;
    scene.steps.forEach((st, j) => {
      if (st.slideIndex !== li || !st.parts.length) return;
      steps += 1;
      if (j < k) step += 1;
    });
    const next = nextFor(s, k);
    return {
      type: 'state',
      deck: deck.meta.title,
      slide: flat + 1,
      slides: deckView.slides.length,
      step,
      steps,
      kicker: slide?.kicker ?? '',
      title: slide?.title ?? '',
      subtitle: slide?.subtitle ?? '',
      notes: slide?.notes ?? '',
      next,
      // while panels are still coming, name the slide after them too
      after: next.kind === 'step' ? (deckView.slides[flat + 1]?.title ?? '') : '',
      focus: !!focus?.active,
    };
  }

  function sendState() {
    if (channel && connected) channel.postMessage(stateMessage());
  }

  // ── channel ──
  function openChannel(id) {
    if (channel) return;
    channelId = id;
    try { sessionStorage.setItem(KEY, id); } catch { /* private mode */ }
    channel = new BroadcastChannel(`wolfdeck-presenter-${id}`);
    channel.onmessage = (e) => {
      const m = e.data ?? {};
      if (m.type === 'hello') {
        connected = true;
        lastFrame = 0;
        sendState();
      } else if (m.type === 'bye') {
        connected = false;
      } else if (m.type === 'cmd') {
        if (m.cmd === 'next') stepMachine.push(+1);
        else if (m.cmd === 'prev') stepMachine.push(-1);
        else if (m.cmd === 'focus') { focus?.toggle(); sendState(); }
      }
    };
  }
  // A reload of this window keeps its presenter window: same channel, and a
  // ping makes the presenter say hello again.
  try {
    const old = sessionStorage.getItem(KEY);
    if (old && 'BroadcastChannel' in window) { openChannel(old); channel.postMessage({ type: 'ping' }); }
  } catch { /* private mode */ }

  // ── DOM: screen picker + toast ──
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const overlay = document.createElement('div');
  overlay.className = 'wd-pick';
  const panel = document.createElement('div');
  panel.className = 'wd-pick-panel';
  overlay.appendChild(panel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePicker(); });
  document.body.appendChild(overlay);
  const toastEl = document.createElement('div');
  toastEl.className = 'wd-toast';
  document.body.appendChild(toastEl);
  let toastTimer = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4500);
  }

  let pickerOpen = false;
  let pickerChoices = [];
  function closePicker() {
    pickerOpen = false;
    overlay.classList.remove('open');
  }
  // `details` = ScreenDetails, or null when the browser cannot tell screens
  // apart (then the only choice is "here").
  function openPicker(details) {
    panel.textContent = '';
    const head = document.createElement('div');
    head.className = 'wd-pick-head';
    head.textContent = details ? 'Kde sa má prezentácia zobraziť? · Esc zruší' : 'Prezentovať · Esc zruší';
    panel.appendChild(head);
    const screens = details ? [...details.screens] : [null];
    pickerChoices = screens.map((scr, i) => {
      const btn = document.createElement('button');
      btn.className = 'wd-pick-item';
      btn.type = 'button';
      const num = document.createElement('span');
      num.className = 'wd-pick-num';
      num.textContent = String(i + 1);
      const txt = document.createElement('span');
      const title = document.createElement('div');
      title.className = 'wd-pick-title';
      const sub = document.createElement('div');
      sub.className = 'wd-pick-sub';
      if (scr) {
        const here = scr === details.currentScreen;
        title.textContent = scr.label || `Obrazovka ${i + 1}`;
        sub.textContent = [`${scr.width} × ${scr.height}`, scr.isInternal ? 'vstavaná' : '', here ? 'toto okno je tu' : '']
          .filter(Boolean).join(' · ');
      } else {
        title.textContent = 'Celá obrazovka + okno prezentujúceho';
        sub.textContent = 'Okná si rozmiestnite ručne';
      }
      txt.append(title, sub);
      btn.append(num, txt);
      const choose = () => { closePicker(); launch(scr, details); };
      btn.addEventListener('click', choose);
      panel.appendChild(btn);
      return choose;
    });
    pickerOpen = true;
    overlay.classList.add('open');
  }

  // ── windows ──
  function popupAlive() { return !!popup && !popup.closed; }

  function openPopup() {
    if (!('BroadcastChannel' in window)) { toast('Tento prehliadač nepodporuje okno prezentujúceho.'); return false; }
    if (!channel) openChannel(Math.random().toString(36).slice(2, 10));
    const url = new URL('presenter.html', window.location.href);
    url.search = `?ch=${channelId}`;
    url.hash = '';
    const h = homeScreen;
    const features = h
      ? `popup,left=${h.availLeft},top=${h.availTop},width=${h.availWidth},height=${h.availHeight}`
      : 'popup,width=1180,height=780';
    popup = window.open(url, `wolfdeck-presenter-${channelId}`, features);
    if (!popup) {
      toast('Prehliadač zablokoval okno prezentujúceho — povoľte vyskakovacie okná a stlačte F znova.');
      return false;
    }
    return true;
  }

  async function enterFullscreen(screen) {
    if (document.fullscreenElement) return true;
    try {
      await document.documentElement.requestFullscreen(screen ? { screen } : undefined);
      return true;
    } catch (err) {
      warn(`fullscreen refused: ${err?.message ?? err}`);
      return false;
    }
  }

  let targetScreen = null;
  async function launch(screen, details) {
    targetScreen = screen;
    if (details && screen) {
      // The presenter window takes the screen this window is leaving — or,
      // when the deck stays on this screen, the first other one.
      const cur = details.currentScreen;
      homeScreen = screen !== cur ? cur : (details.screens.find((x) => x !== screen) ?? null);
    }
    if (screen && details && details.screens.length > 1) {
      // Chrome lets one click place fullscreen content on a screen AND open a
      // companion popup on another — in this order.
      const ok = await enterFullscreen(screen);
      if (!popupAlive()) openPopup();
      if (!ok) toast('Stlačte F pre celú obrazovku.');
    } else {
      // One screen / no placement: the popup first (it needs the click), the
      // fullscreen request may then be refused — a second F finishes the job.
      if (!popupAlive()) openPopup();
      const ok = await enterFullscreen(null);
      if (!ok) toast('Stlačte F pre celú obrazovku.');
    }
  }

  async function start() {
    if (pickerOpen) { closePicker(); return; }
    // Already presenting: F toggles fullscreen, or brings a closed presenter
    // window back.
    if (popupAlive()) {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (!(await enterFullscreen(targetScreen))) await enterFullscreen(null);
      return;
    }
    if (document.fullscreenElement) { openPopup(); return; }

    let details = null;
    if ('getScreenDetails' in window) {
      try { details = await window.getScreenDetails(); } catch { /* denied — place by hand */ }
    }
    if (details && details.screens.length > 1) { openPicker(details); return; }
    // The permission prompt may have used up the keypress; then a click in
    // the picker starts it.
    if (navigator.userActivation && !navigator.userActivation.isActive) { openPicker(null); return; }
    launch(null, null);
  }

  return {
    start,
    get connected() { return connected; },
    get isOpen() { return pickerOpen; },
    // Keys while the screen picker is open — returns true if consumed.
    handleKey(code) {
      if (!pickerOpen) return false;
      const n = /^(?:Digit|Numpad)([1-9])$/.exec(code);
      if (n && pickerChoices[n[1] - 1]) pickerChoices[n[1] - 1]();
      else if (code === 'Escape' || code === 'KeyF') closePicker();
      return true;
    },
    // Step machine moved (also after jumps from the menu / URL).
    onState() { sendState(); },
    stateMessage,
    // Called right after renderer.render, inside the same frame — the only
    // moment a WebGL canvas without preserveDrawingBuffer can be copied.
    afterRender() {
      if (!connected || encoding) return;
      const now = performance.now();
      if (now - lastFrame < FRAME_EVERY) return;
      if (popup && popup.closed) { connected = false; popup = null; return; }
      lastFrame = now;
      if (!canvas.width || !canvas.height) return;
      if (!thumb) thumb = document.createElement('canvas');
      const w = Math.min(FRAME_WIDTH, canvas.width);
      const h = Math.max(1, Math.round((w * canvas.height) / canvas.width));
      if (thumb.width !== w || thumb.height !== h) { thumb.width = w; thumb.height = h; }
      thumb.getContext('2d').drawImage(canvas, 0, 0, w, h);
      encoding = true;
      thumb.toBlob((blob) => {
        encoding = false;
        if (blob && connected) channel.postMessage({ type: 'frame', blob });
      }, 'image/jpeg', 0.72);
    },
  };
}

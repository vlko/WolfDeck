// Slide menu (press L): a paper-card overlay listing every virtual slide
// ("stránka"). Click an entry — or arrow to it and press Enter — to jump
// straight there (the same teleport as the URL hash), then it closes. L or
// Esc closes it too. Scrolls when there are many slides.

const CSS = `
.wd-menu { position: fixed; inset: 0; z-index: 30; display: none;
  align-items: center; justify-content: center;
  background: rgba(47,52,49,0.38);
  font-family: Nunito,'Avenir Next','Trebuchet MS',sans-serif; }
.wd-menu.open { display: flex; }
.wd-menu-panel { background: #fbf8f1; color: #2f3431;
  border-radius: 14px; border: 6px solid #d9ccb2;
  box-shadow: 10px 14px 0 rgba(74,67,52,0.18), 0 24px 60px rgba(0,0,0,0.25);
  width: min(600px, 90vw); max-height: 84vh; overflow: auto; padding: 8px; }
.wd-menu-head { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
  font-weight: 800; color: #9a716e; padding: 12px 16px 8px; }
.wd-menu-item { display: flex; gap: 14px; align-items: baseline;
  padding: 10px 16px; border-radius: 10px; cursor: pointer;
  border-left: 4px solid transparent; }
.wd-menu-item:hover, .wd-menu-item.sel { background: #ebe7d7; }
.wd-menu-item.cur { border-left-color: #b98a86; }
.wd-menu-num { color: #a4b1a2; font-weight: 800; min-width: 1.7em;
  text-align: right; font-variant-numeric: tabular-nums; }
.wd-menu-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.wd-menu-kicker { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
  font-weight: 700; color: #71705f; }
.wd-menu-title { font-size: 16px; font-weight: 800; color: #2f3431; }
`;

export function createSceneMenu({ deckView, stepMachine }) {
  const slides = deckView.slides; // [{ id, sceneIndex, jumpK, title, kicker }]

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'wd-menu';
  const panel = document.createElement('div');
  panel.className = 'wd-menu-panel';
  const head = document.createElement('div');
  head.className = 'wd-menu-head';
  head.textContent = 'Stránky · klik alebo ↑↓ + Enter · L / Esc zavrie';
  panel.appendChild(head);

  const items = slides.map((sl, i) => {
    const el = document.createElement('div');
    el.className = 'wd-menu-item';
    const num = document.createElement('div');
    num.className = 'wd-menu-num';
    num.textContent = String(i + 1);
    const txt = document.createElement('div');
    txt.className = 'wd-menu-txt';
    if (sl.kicker) {
      const kick = document.createElement('div');
      kick.className = 'wd-menu-kicker';
      kick.textContent = sl.kicker;
      txt.appendChild(kick);
    }
    const title = document.createElement('div');
    title.className = 'wd-menu-title';
    title.textContent = sl.title || sl.id || `Stránka ${i + 1}`;
    txt.appendChild(title);
    el.append(num, txt);
    el.addEventListener('click', () => go(i));
    panel.appendChild(el);
    return el;
  });
  overlay.appendChild(panel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);

  let open = false;
  let sel = 0;

  function currentSlide() {
    const st = stepMachine.state;
    return deckView.activeSlide(st.scene, st.step);
  }
  function paint() {
    const cur = currentSlide();
    items.forEach((el, i) => {
      el.classList.toggle('cur', i === cur);
      el.classList.toggle('sel', i === sel);
    });
  }
  function go(i) {
    const sl = slides[i];
    stepMachine.jumpTo(sl.sceneIndex, sl.jumpK);
    close();
  }
  function openMenu() {
    open = true;
    sel = currentSlide();
    overlay.classList.add('open');
    paint();
    items[sel]?.scrollIntoView({ block: 'nearest' });
  }
  function close() {
    open = false;
    overlay.classList.remove('open');
  }

  return {
    get isOpen() { return open; },
    toggle() { if (open) close(); else openMenu(); },
    close,
    // Keyboard control while open — returns true if it consumed the key.
    handleKey(code) {
      if (!open) return false;
      if (code === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); paint(); items[sel].scrollIntoView({ block: 'nearest' }); }
      else if (code === 'ArrowUp') { sel = Math.max(sel - 1, 0); paint(); items[sel].scrollIntoView({ block: 'nearest' }); }
      else if (code === 'Enter') go(sel);
      else if (code === 'Escape' || code === 'KeyL') close();
      return true;
    },
  };
}

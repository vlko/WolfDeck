// On-screen controls for touch / keyboard-less devices. When the primary
// pointer is coarse (phones, tablets, kiosks) the keyboard shortcuts are
// unreachable, so we pin four papercraft buttons to the corners:
//
//   ┌ list (L) ───────── presentation (P) ┐
//   │                                     │
//   └ previous (←) ─────────── next (→) ──┘
//
// Same actions the keys drive: stepMachine.push(∓1), menu.toggle(),
// focus.toggle().

const CSS = `
.wd-touch { position: fixed; z-index: 25; display: none;
  align-items: center; justify-content: center;
  width: 60px; height: 60px; padding: 0; margin: 0;
  border: 4px solid #d9ccb2; border-radius: 16px; cursor: pointer;
  background: #fbf8f1; color: #4b5654;
  box-shadow: 5px 7px 0 rgba(74,67,52,0.2);
  font: 800 26px/1 Nunito,'Avenir Next','Trebuchet MS',sans-serif;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  transition: transform 0.08s ease, background 0.12s ease; }
.wd-touch:active { transform: scale(0.92); background: #ebe7d7; }
.wd-touch.on { display: flex; }
.wd-touch-bl { left: max(16px, env(safe-area-inset-left));
  bottom: max(16px, env(safe-area-inset-bottom)); }
.wd-touch-br { right: max(16px, env(safe-area-inset-right));
  bottom: max(16px, env(safe-area-inset-bottom)); }
.wd-touch-tl { left: max(16px, env(safe-area-inset-left));
  top: max(16px, env(safe-area-inset-top)); }
.wd-touch-tr { right: max(16px, env(safe-area-inset-right));
  top: max(16px, env(safe-area-inset-top)); }
`;

// Coarse pointer ⇒ touch-first device with no usable keyboard. Fall back to
// touch-capability sniffing for older engines that lack the media query.
function isTouchDevice() {
  const mm = window.matchMedia?.('(pointer: coarse)');
  if (mm) return mm.matches;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function createTouchControls({ stepMachine, focus, menu, hero, canvas }) {
  if (!isTouchDevice()) return { enabled: false };

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const make = (corner, label, aria, onTap) => {
    const btn = document.createElement('button');
    btn.className = `wd-touch wd-touch-${corner} on`;
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('aria-label', aria);
    // Pointerdown, not click: fires immediately and never double-counts a tap.
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onTap();
    });
    document.body.appendChild(btn);
    return btn;
  };

  make('tl', '☰', 'Zoznam stránok', () => menu?.toggle());
  make('tr', '▶', 'Režim prezentácie', () => focus?.toggle());
  make('bl', '‹', 'Predchádzajúca stránka', () => stepMachine.push(-1));
  make('br', '›', 'Ďalšia stránka', () => stepMachine.push(+1));

  // Hold-to-walk: touch-and-hold anywhere on the diorama walks the wolf in
  // that direction, exactly as holding W/A/S/D would. Direction is taken from
  // the screen centre — the camera trails the wolf, so he sits near centre and
  // "press left → walk left" reads naturally. Up on screen = away from the
  // viewer (W), down = toward the viewer (S). The corner buttons swallow their
  // own taps, so this never fires under them.
  if (hero && canvas) {
    let holding = false;

    const steer = (e) => {
      const dx = e.clientX - window.innerWidth / 2;
      // Screen-down (clientY larger) means toward the viewer → +z (S key).
      const dz = e.clientY - window.innerHeight / 2;
      // Tiny dead zone at the centre so a near-centre hold doesn't jitter.
      if (Math.hypot(dx, dz) < 24) hero.setManualDir(0, 0);
      else hero.setManualDir(dx, dz); // setManualDir normalises — only the angle matters
    };

    const release = () => {
      if (!holding) return;
      holding = false;
      hero.setManualDir(0, 0); // like releasing the key: he waits, then trots home
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      holding = true;
      canvas.setPointerCapture?.(e.pointerId);
      steer(e);
    });
    canvas.addEventListener('pointermove', (e) => { if (holding) steer(e); });
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
  }

  return { enabled: true };
}

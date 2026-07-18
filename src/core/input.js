// Space / → = next, Backspace / ← = previous. Ignored while an input field
// has focus. Every press counts — the step machine queues them.
//
// P toggles presentation (focus) mode: the diorama washes into a flat 2D
// backdrop and the title + panels come to the front.
//
// L opens the scene menu (jump straight to any scene).
//
// W/A/S/D walk the wolf around freely (A left, D right, W back away from
// the viewer, S front toward the viewer; combine for diagonals). Five
// seconds after the last movement key he trots back to his presenter post
// on his own.
const MOVE_KEYS = {
  KeyA: [-1, 0],
  KeyD: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
};

export function bindInput(stepMachine, hero, focus, menu) {
  const held = new Set();

  function pushDir() {
    let dx = 0;
    let dz = 0;
    for (const code of held) {
      dx += MOVE_KEYS[code][0];
      dz += MOVE_KEYS[code][1];
    }
    hero.setManualDir(dx, dz);
  }

  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

    // While the scene menu is open it swallows navigation keys.
    if (menu?.isOpen) {
      if (menu.handleKey(e.code)) e.preventDefault();
      return;
    }

    if (e.code === 'Space' || e.code === 'ArrowRight') {
      e.preventDefault();
      stepMachine.push(+1);
    } else if (e.code === 'Backspace' || e.code === 'ArrowLeft') {
      e.preventDefault();
      stepMachine.push(-1);
    } else if (e.code === 'KeyP' && !e.repeat) {
      e.preventDefault();
      focus?.toggle();
    } else if (e.code === 'KeyL' && !e.repeat) {
      e.preventDefault();
      menu?.toggle();
    } else if (e.code in MOVE_KEYS && !e.repeat) {
      e.preventDefault();
      held.add(e.code);
      pushDir();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (held.delete(e.code)) pushDir();
  });

  window.addEventListener('blur', () => {
    if (held.size) {
      held.clear();
      pushDir();
    }
  });
}

// Scene ↔ URL hash sync. The address bar always carries the current scene's
// id (e.g. #scene-3, or the author's custom scene id from the deck JSON), so
// every scene has a shareable link — and editing the hash, or opening a link
// that carries one, jumps straight to that scene.
//
// Bare numbers work too: #4 means the 4th slide (1-based).
// Our own writes use history.replaceState, which never fires hashchange, so
// only real user edits (and browser Back/Forward) trigger a jump.

export function bindUrlHash({ deck, deckView, stepMachine, cameraRig }) {
  const ids = deck.scenes.map((scene) => scene.id);
  if (!ids.length) return;

  function indexFor(hash) {
    const h = decodeURIComponent((hash ?? '').replace(/^#/, '')).trim();
    if (!h) return null;
    const byId = ids.indexOf(h);
    if (byId !== -1) return byId;
    if (/^\d+$/.test(h)) {
      const n = Number(h) - 1; // 1-based slide number
      if (n >= 0 && n < ids.length) return n;
    }
    return null;
  }

  function writeHash(i) {
    const hash = `#${encodeURIComponent(ids[i])}`;
    if (window.location.hash === hash) return;
    window.history.replaceState(null, '', hash);
  }

  // Every scene change — walks and jumps alike — lands in onSceneChange.
  const onSceneChange = deckView.onSceneChange;
  deckView.onSceneChange = (to, dir) => {
    writeHash(to);
    onSceneChange(to, dir);
  };

  window.addEventListener('hashchange', () => {
    const i = indexFor(window.location.hash);
    if (i == null) writeHash(stepMachine.state.scene); // unknown → restore
    else stepMachine.jumpTo(i);
  });

  // Deep link on load; otherwise stamp the first scene's id.
  const initial = indexFor(window.location.hash);
  if (initial != null && initial > 0) {
    stepMachine.jumpTo(initial);
    cameraRig.snapTo(deckView.sceneX(initial)); // no cross-deck glide on load
  } else {
    writeHash(stepMachine.state.scene);
  }
}

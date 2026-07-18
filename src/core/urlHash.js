// Slide ↔ URL hash sync. The address bar always carries the CURRENT slide's
// id (e.g. #o-namestove), so every virtual slide has a shareable link — and
// editing the hash, or opening a link that carries one, jumps straight there.
//
// Also accepts a scene id (→ that scene's first slide) and bare numbers
// (#4 = the 4th slide, 1-based). Our own writes use history.replaceState,
// which never fires hashchange, so only real user edits (and Back/Forward)
// trigger a jump.

export function bindUrlHash({ deck, deckView, stepMachine, cameraRig }) {
  const slides = deckView.slides; // [{ id, sceneIndex, jumpK, title, kicker }]
  if (!slides.length) return;

  const firstSlideOfScene = new Map(); // sceneIndex → first flat slide index
  slides.forEach((sl, i) => { if (!firstSlideOfScene.has(sl.sceneIndex)) firstSlideOfScene.set(sl.sceneIndex, i); });
  const sceneIdToIndex = new Map(deck.scenes.map((sc, i) => [sc.id, i]));

  // Resolve a hash to a flat slide index, or null.
  function slideIndexFor(hash) {
    const h = decodeURIComponent((hash ?? '').replace(/^#/, '')).trim();
    if (!h) return null;
    const byId = slides.findIndex((sl) => sl.id === h);
    if (byId !== -1) return byId;
    if (sceneIdToIndex.has(h)) return firstSlideOfScene.get(sceneIdToIndex.get(h)) ?? null;
    if (/^\d+$/.test(h)) {
      const n = Number(h) - 1;
      if (n >= 0 && n < slides.length) return n;
    }
    return null;
  }

  function writeHashForState(s, k) {
    const id = slides[deckView.activeSlide(s, k)]?.id;
    if (!id) return;
    const hash = `#${encodeURIComponent(id)}`;
    if (window.location.hash === hash) return;
    window.history.replaceState(null, '', hash);
  }

  function jumpToSlide(flatIndex) {
    const sl = slides[flatIndex];
    stepMachine.jumpTo(sl.sceneIndex, sl.jumpK);
  }

  window.addEventListener('hashchange', () => {
    const i = slideIndexFor(window.location.hash);
    if (i == null) writeHashForState(stepMachine.state.scene, stepMachine.state.step); // unknown → restore
    else jumpToSlide(i);
  });

  // Deep link on load; otherwise stamp the first slide's id.
  const initial = slideIndexFor(window.location.hash);
  if (initial != null && initial > 0) {
    jumpToSlide(initial);
    cameraRig.snapTo(deckView.sceneX(slides[initial].sceneIndex)); // no glide on load
  } else {
    writeHashForState(0, 0);
  }

  return { writeHashForState };
}

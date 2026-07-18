import { finishAllTweens } from '../engine/tween.js';

// Navigation state machine. State is (sceneIndex s, revealed-step count k).
//
//   next(): k < steps → reveal step k, k++
//           else s < last → walk to s+1, k = 0
//           else → hop
//   prev(): k > 0 → k--, hide step k
//           else s > 0 → walk to s−1, k = steps(s−1)   (previous scenes stay
//           revealed — this is what makes N forward / N back exact)
//           else → hop
//
// Input pushes ±1 intents into a queue; one is processed at a time. If more
// intents are waiting, running reveal tweens are snapped (mash = fast-forward).
// While the hero is WALKING, at most ONE keystroke is buffered — further
// presses are dropped (a same-direction press still kicks in hurry), so a
// long transition never fires a burst of reveals on arrival.

// onArrive(sceneIndex) — optional; fires when the hero has actually arrived
// at a scene (end of the walk, or right after a teleport jump).
export function createStepMachine({ deckView, hero, onArrive, onStateChange }) {
  const sceneCount = deckView.sceneCount;
  let s = 0;
  let k = 0;
  let busy = false;
  const queue = [];

  function sceneX(i) {
    return deckView.sceneX(i);
  }

  async function doNext() {
    const steps = deckView.stepCount(s);
    if (k < steps) {
      const done = deckView.revealStep(s, k);
      k += 1;
      await done;
    } else if (s < sceneCount - 1) {
      s += 1;
      k = 0;
      deckView.onSceneChange(s, +1);
      await hero.walkTo(sceneX(s));
      onArrive?.(s);
    } else {
      await hero.hop();
    }
  }

  async function doPrev() {
    if (k > 0) {
      k -= 1;
      await deckView.hideStep(s, k);
    } else if (s > 0) {
      s -= 1;
      k = deckView.stepCount(s);
      deckView.onSceneChange(s, -1);
      await hero.walkTo(sceneX(s));
      onArrive?.(s);
    } else {
      await hero.hop();
    }
  }

  // Teleport straight to a slide — (scene, k). Replays the missing reveals/
  // hides so the invariant "scenes before the target are fully revealed, the
  // target scene up to k, later scenes hidden" holds, then snaps the tweens.
  async function doJump(target) {
    const ts = target.scene;
    const tk = Math.max(0, Math.min(target.k, deckView.stepCount(ts)));
    if (ts === s && tk === k) return;
    for (let j = 0; j < sceneCount; j += 1) {
      let want;
      if (j < ts) want = deckView.stepCount(j);
      else if (j === ts) want = tk;
      else want = 0;
      const have = j < s ? deckView.stepCount(j) : (j === s ? k : 0);
      for (let q = have; q < want; q += 1) deckView.revealStep(j, q, true); // instant, no stagger
      for (let q = have - 1; q >= want; q -= 1) deckView.hideStep(j, q);
    }
    finishAllTweens();
    s = ts;
    k = tk;
    deckView.showTitleFor(s, k); // correct title even for a title-only landing
    hero.snapTo(sceneX(s));
    onArrive?.(s);
  }

  async function drain() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      // More presses waiting → snap any content animation still running.
      if (queue.length > 1) finishAllTweens();
      const intent = queue.shift();
      if (typeof intent === 'object') await doJump(intent.jump);
      else if (intent > 0) await doNext();
      else await doPrev();
      onStateChange?.(s, k); // slide may have changed → update URL hash
    }
    busy = false;
  }

  return {
    get state() { return { scene: s, step: k }; },
    // Teleport to a slide at (scene, k). Pending intents are dropped; an
    // in-flight walk finishes first, then the jump snaps everything.
    jumpTo(scene, kk = 0) {
      const i = Math.max(0, Math.min(sceneCount - 1, Math.trunc(scene) || 0));
      queue.length = 0;
      queue.push({ jump: { scene: i, k: Math.max(0, Math.trunc(kk) || 0) } });
      finishAllTweens();
      drain();
    },
    push(dir) {
      if (hero.walking) {
        // A same-direction press mid-walk kicks the wolf into a run — but a
        // scene transition never BUFFERS presses: it ends firmly at the new
        // scene's title + subtitle, rather than bursting into the first
        // panel on arrival. Use the scene menu (L) or the URL for fast jumps.
        if (hero.walkDir === dir) hero.hurry(dir);
        return;
      }
      queue.push(dir);
      if (queue.length > 1) finishAllTweens();
      drain();
    },
  };
}

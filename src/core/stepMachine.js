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
export function createStepMachine({ deckView, hero, onArrive }) {
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

  // Teleport straight to a scene (URL-hash navigation). Replays the missing
  // reveals/hides so the invariant "scenes before the current one are fully
  // revealed, the current and later ones are not" still holds, then snaps
  // the tweens — a jump is a teleport, not a walk-through.
  async function doJump(target) {
    if (target === s && k === 0) return;
    for (let j = 0; j < sceneCount; j += 1) {
      const want = j < target ? deckView.stepCount(j) : 0;
      const have = j < s ? deckView.stepCount(j) : (j === s ? k : 0);
      for (let q = have; q < want; q += 1) deckView.revealStep(j, q);
      for (let q = have - 1; q >= want; q -= 1) deckView.hideStep(j, q);
    }
    finishAllTweens();
    const dir = target > s ? +1 : -1;
    s = target;
    k = 0;
    deckView.onSceneChange(s, dir);
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
    }
    busy = false;
  }

  return {
    get state() { return { scene: s, step: k }; },
    // Teleport to a scene (URL-hash navigation). Pending intents are dropped;
    // an in-flight walk finishes first, then the jump snaps everything.
    jumpTo(target) {
      const i = Math.max(0, Math.min(sceneCount - 1, Math.trunc(target) || 0));
      queue.length = 0;
      queue.push({ jump: i });
      finishAllTweens();
      drain();
    },
    push(dir) {
      if (hero.walking) {
        // A same-direction press mid-walk kicks the wolf into a run.
        if (hero.walkDir === dir) hero.hurry(dir);
        // Only one keystroke is buffered during a movement animation —
        // the rest are ignored so arrival doesn't burst through steps.
        if (queue.length >= 1) return;
      }
      queue.push(dir);
      if (queue.length > 1) finishAllTweens();
      drain();
    },
  };
}

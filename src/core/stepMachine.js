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

export function createStepMachine({ deckView, hero }) {
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
    } else {
      await hero.hop();
    }
  }

  async function drain() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      // More presses waiting → snap any content animation still running.
      if (queue.length > 1) finishAllTweens();
      const dir = queue.shift();
      if (dir > 0) await doNext(); else await doPrev();
    }
    busy = false;
  }

  return {
    get state() { return { scene: s, step: k }; },
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

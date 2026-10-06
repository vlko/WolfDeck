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
// Input pushes ±1 intents. Stepping within a scene is NEVER blocked by
// animations: a reveal or hide only starts its tweens (fire-and-forget) and
// the state moves on at once, so fast clicks land exactly where the presenter
// is heading. When clicks come quickly, the outgoing panels clear at
// FAST_CLEAR× speed. Only a walk between scenes holds input: while the hero
// is WALKING, a same-direction press kicks in hurry and others are dropped,
// so a transition never fires a burst of reveals on arrival.

const FAST_CLICK = 0.9; // s between presses that counts as clicking ahead
const FAST_CLEAR = 3; // outgoing panels shrink this much faster then

// onArrive(sceneIndex) — optional; fires when the hero has actually arrived
// at a scene (end of the walk, or right after a teleport jump).
export function createStepMachine({ deckView, hero, onArrive, onStateChange }) {
  const sceneCount = deckView.sceneCount;
  let s = 0;
  let k = 0;
  let busy = false;
  const queue = [];
  let lastPress = -Infinity;
  let speed = 1; // hide speed for the step being processed

  function sceneX(i) {
    return deckView.sceneX(i);
  }

  async function doNext() {
    const steps = deckView.stepCount(s);
    if (k < steps) {
      deckView.revealStep(s, k, false, speed); // not awaited — never blocks
      k += 1;
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
      deckView.hideStep(s, k, speed); // not awaited — never blocks
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
      const now = performance.now() / 1000;
      speed = now - lastPress < FAST_CLICK ? FAST_CLEAR : 1;
      lastPress = now;
      queue.push(dir);
      drain();
    },
  };
}

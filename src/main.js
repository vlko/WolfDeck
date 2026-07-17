import { createRenderer } from './engine/renderer.js';
import { createCameraRig } from './engine/cameraRig.js';
import { createTicker } from './engine/ticker.js';
import { tickTweens } from './engine/tween.js';
import { loadPresentation } from './core/loader.js';
import { buildDeck } from './core/deck.js';
import { createHero } from './core/hero.js';
import { createStepMachine } from './core/stepMachine.js';
import { bindInput } from './core/input.js';
import { bindOrbit } from './core/orbit.js';
import { createFocusMode } from './core/focusMode.js';
import { bindUrlHash } from './core/urlHash.js';
import { createSpeechBubble } from './core/speechBubble.js';

// Register the asset library (side-effect imports).
import './assets/nature.js';
import './assets/buildings.js';
import './assets/animals.js';
import './assets/city.js';
import './assets/office.js';
import './assets/shop.js';
import './assets/school.js';
import './assets/finance.js';
import './assets/construction.js';
import './assets/civic.js';
import './assets/wolf.js';

async function start() {
  // ?deck=other.json presents a different deck from public/ — handy for
  // authoring a new presentation next to the shipped demo.
  const deckUrl = new URLSearchParams(window.location.search).get('deck') ?? 'presentation.json';
  const deck = await loadPresentation(deckUrl);

  const { renderer, scene } = createRenderer();
  const cameraRig = createCameraRig();
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    cameraRig.resize();
  });

  const deckView = buildDeck(deck, scene);

  const hero = createHero({
    walkSpeed: deck.meta.walkSpeed,
    heightAt: deckView.heightAt,
  });
  hero.snapTo(deckView.sceneCount ? deckView.sceneX(0) : 0);
  scene.add(hero.group);
  cameraRig.snapTo(hero.x);

  // The wolf announces every scene in a papercraft bubble — on arrival,
  // not when he sets off.
  const bubble = createSpeechBubble(hero);
  scene.add(bubble.group);

  const stepMachine = createStepMachine({
    deckView,
    hero,
    onArrive: (i) => bubble.announce(i + 1),
  });
  const focus = createFocusMode();
  bindInput(stepMachine, hero, focus);
  bindOrbit(cameraRig, renderer.domElement);

  bubble.announce(1); // greet on the opening scene
  // #<scene-id> in the URL ↔ current scene; editing the hash jumps there.
  // (A deep-link jump re-announces the landing scene via onArrive.)
  bindUrlHash({ deck, deckView, stepMachine, cameraRig });

  const ticker = createTicker();
  ticker.add((t, dt) => {
    tickTweens(dt);
    hero.update(t, dt);
    bubble.update(t, dt);
    cameraRig.setTarget(hero.x); // camera trails the wolf with damped easing
    cameraRig.update(t, dt);
    deckView.update(t, dt, cameraRig.x, focus);
    focus.render(renderer, scene, cameraRig.camera);
  });

  // Console debugging handle.
  window.wolfdeck = { deck, deckView, hero, stepMachine, cameraRig, scene, focus, renderer };
}

start();

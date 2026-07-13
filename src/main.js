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

// Register the asset library (side-effect imports).
import './assets/nature.js';
import './assets/buildings.js';
import './assets/animals.js';
import './assets/city.js';
import './assets/office.js';
import './assets/shop.js';
import './assets/wolf.js';

async function start() {
  const deck = await loadPresentation();

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

  const stepMachine = createStepMachine({ deckView, hero });
  bindInput(stepMachine, hero);
  bindOrbit(cameraRig, renderer.domElement);

  const ticker = createTicker();
  ticker.add((t, dt) => {
    tickTweens(dt);
    hero.update(t, dt);
    cameraRig.setTarget(hero.x); // camera trails the wolf with damped easing
    cameraRig.update(t, dt);
    deckView.update(t, dt, cameraRig.x);
    renderer.render(scene, cameraRig.camera);
  });

  // Console debugging handle.
  window.wolfdeck = { deck, deckView, hero, stepMachine, cameraRig, scene };
}

start();

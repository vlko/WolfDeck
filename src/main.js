import { createRenderer } from './engine/renderer.js';
import { showWebGLError } from './engine/webgl.js';
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
import { createSceneMenu } from './core/sceneMenu.js';
import { createTouchControls } from './core/touchControls.js';
import { createPresenter } from './core/presenter.js';
import * as world from './core/world.js';
import * as traffic from './core/traffic.js';

import { spritesSettled } from './assets/sprites.js';
import { loadFonts } from './parts/fonts.js';
import * as boot from './core/boot.js';

// Register the asset library (side-effect imports): every asset is a sprite
// cut from the reference sheets (see tools/extract-sprites.mjs).
import { modelNamesFor } from './assets/catalog.js';
import './assets/wolf.js';
import { loadModelsFor } from './models/index.js'; // hand-built 3D models, in lazy packs
import { loadStyles, STYLE_NAMES } from './styles/index.js';
import { env as styleEnv } from './styles/env.js';

async function start() {
  // ?deck=other.json presents a different deck from public/ — handy for
  // authoring a new presentation next to the shipped demo.
  const deckUrl = new URLSearchParams(window.location.search).get('deck') ?? 'presentation.json';
  // The panel typeface loads in parallel with the deck, so no panel is drawn
  // in a fallback font.
  await boot.phase('Loading the deck and fonts', 0.3, 0.4);
  const [deck] = await Promise.all([loadPresentation(deckUrl), loadFonts()]);
  // Download only the model packs this deck's props are built from (plus the
  // wolf) — not the whole library.
  const names = new Set(['wolf']);
  for (const sc of deck.scenes) {
    for (const prop of sc.props) for (const n of modelNamesFor(prop.type, prop.options)) names.add(n);
  }
  // ?style=<name> dresses every slide in one style — a quick way to try one.
  const forced = new URLSearchParams(window.location.search).get('style');
  if (STYLE_NAMES.includes(forced)) {
    for (const sc of deck.scenes) for (const sl of sc.slides) sl.style = forced;
  }
  // …and only the slide styles it uses.
  await boot.phase('Loading 3D models', 0.4, 0.6);
  await Promise.all([
    loadModelsFor(names, (done, total, pack) => boot.progress(done, total, `${done} / ${total} packs${pack ? ` (${pack})` : ''}`)),
    // extruded lettering brings a font along — only decks that use it pay
    deck.scenes.some((sc) => sc.props.some((p) => p.type === 'text3d')) ? import('./assets/text3d.js') : null,
    loadStyles(deck.scenes.flatMap((sc) => sc.slides.map((sl) => sl.style))),
  ]);

  await boot.phase('Starting the renderer', 0.6, 0.62);
  let renderer;
  let scene;
  try {
    ({ renderer, scene } = createRenderer());
  } catch (err) {
    showWebGLError(err);
    throw err;
  }
  const cameraRig = createCameraRig();
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    cameraRig.resize();
  });

  await boot.phase('Building the scenes', 0.62, 0.9);
  const deckView = await buildDeck(deck, scene, (i, n, id) => boot.step(i, n, `${i + 1} / ${n} (${id})`));
  // Objects without a 3D model stand in as flat sprites; wait for just those
  // images so the first frame is complete (no pop-in).
  await boot.phase('Loading images', 0.9, 0.95);
  await spritesSettled();
  await boot.phase('First frame', 0.95, 1);

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
  // a scene's own lines, else the deck's, else the built-in ones
  const quipsFor = (i) => (deck.scenes[i]?.quips.length ? deck.scenes[i].quips : deck.meta.quips);
  scene.add(bubble.group);

  let notifyState = () => {}; // set once the URL-hash sync exists (below)
  const stepMachine = createStepMachine({
    deckView,
    hero,
    onArrive: (i) => bubble.announce(i + 1, quipsFor(i)),
    onStateChange: (s, k) => notifyState(s, k),
  });
  const focus = createFocusMode();
  styleEnv.renderer = renderer;
  styleEnv.camera = () => (focus.active ? focus.ortho : cameraRig.camera);
  const sceneMenu = createSceneMenu({ deckView, stepMachine });
  // F: fullscreen here + a presenter window (timer, notes, preview, next).
  const presenter = createPresenter({ deck, deckView, stepMachine, focus, renderer });
  bindInput(stepMachine, hero, focus, sceneMenu, presenter);
  bindOrbit(cameraRig, renderer.domElement);
  // Touch/keyboard-less devices get corner buttons for the core shortcuts.
  createTouchControls({ stepMachine, focus, menu: sceneMenu, hero, canvas: renderer.domElement });

  bubble.announce(1, quipsFor(0)); // greet on the opening scene
  // #<slide-id> in the URL ↔ current slide; editing the hash jumps there.
  const urlHash = bindUrlHash({ deck, deckView, stepMachine, cameraRig });
  notifyState = (s, k) => {
    urlHash?.writeHashForState(s, k); // hash follows every slide change
    presenter.onState(s, k); // …and so does the presenter view
  };

  const ticker = createTicker();
  ticker.add((t, dt) => {
    tickTweens(dt);
    hero.update(t, dt);
    bubble.update(t, dt);
    cameraRig.setTarget(hero.x); // camera trails the wolf with damped easing
    // closeups: only on a resting 3D view (not while walking, not in the flat P view)
    const st = stepMachine.state;
    cameraRig.setCloseup(hero.walking || focus.active ? null : deckView.closeupFor(st.scene, st.step));
    hero.setAside(focus.active ? 0 : deckView.heroSideFor(st.scene, st.step));
    cameraRig.update(t, dt);
    deckView.update(t, dt, cameraRig.x, focus);
    focus.render(renderer, scene, cameraRig.camera);
    presenter.afterRender(); // thumbnail for the presenter view, if one is open
  });

  // The first frames compile every shader and upload every texture — the
  // loading screen stays until one has actually been drawn.
  requestAnimationFrame(() => requestAnimationFrame(boot.finish));
  setTimeout(boot.finish, 1500); // a background tab draws no frames

  // Console debugging handle.
  window.wolfdeck = { deck, deckView, hero, stepMachine, cameraRig, scene, focus, sceneMenu, presenter, renderer, world, traffic };
}

start().catch((err) => {
  boot.fail(err);
  throw err;
});

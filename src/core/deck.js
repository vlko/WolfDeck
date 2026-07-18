import * as THREE from 'three';
import { build } from '../assets/registry.js';
import { createGround } from '../environment/ground.js';
import { createSun } from '../environment/sky.js';
import { createClouds } from '../environment/clouds.js';
import { createTitle } from '../parts/title.js';
import { buildPart } from '../parts/partsFactory.js';
import { CONTENT_LAYER } from './focusMode.js';
import { tween, ease } from '../engine/tween.js';
import { ACTIVE_SCENE_RADIUS, PART_CASCADE, PART_STACK_DZ, PART_STAGGER } from '../config.js';

// A tween-driven delay so it snaps when the presenter mashes forward.
function delayThen(seconds, fn) {
  return tween({ t: 0 }, { t: 1 }, seconds, ease.linear).done.then(fn);
}

// Tags an object tree as presentation CONTENT so focus mode (P) can
// re-render it in front of the veiled diorama.
function tagContent(obj) {
  obj.traverse((child) => child.layers.enable(CONTENT_LAYER));
}

// Builds the whole diorama from the normalized deck and exposes the deckView
// the step machine drives. Every scene's props AND parts are built up front —
// stepping back through an already-visited scene is instant and exact.

export function buildDeck(deck, scene3) {
  const spacing = deck.meta.sceneSpacing;
  const sceneCount = deck.scenes.length;
  const minX = -spacing * 0.6;
  const maxX = spacing * (sceneCount - 1) + spacing * 0.6;

  document.title = deck.meta.title;

  // Terrain (rivers may be requested per scene later; keep the hook simple).
  const ground = createGround({
    minX, maxX, seed: deck.meta.seed, rivers: deck.meta.rivers, roads: deck.meta.roads,
  });
  scene3.add(ground.group);

  const sun = createSun();
  sun.position.set(minX + (maxX - minX) * 0.22, 11, -32);
  scene3.add(sun);

  const clouds = createClouds({ minX, maxX });
  scene3.add(clouds);

  const scenes = deck.scenes.map((sceneDef, i) => {
    const group = new THREE.Group();
    const originX = i * spacing;
    group.position.x = originX;
    scene3.add(group);

    const updatables = [];

    for (const prop of sceneDef.props) {
      const obj = build(prop.type, prop.options);
      const z = prop.z + prop.dz;
      obj.position.set(prop.x, ground.heightAt(originX + prop.x, z) + prop.y, z);
      obj.scale.set(...prop.scale);
      if (prop.rotation) obj.rotation.y = prop.rotation;
      group.add(obj);
      obj.traverse((child) => {
        if (child.userData.update) updatables.push(child.userData.update);
      });
    }

    // One 3D title per virtual SLIDE — only the active slide's is shown.
    // Titles live BEHIND the panel zone (parked between the mid and back
    // rows), so panels always pass in front; scaled up a touch to offset the
    // extra perspective distance, and dropped a little when a kicker needs
    // headroom above the letters.
    const slideTitles = sceneDef.slides.map((sl) => {
      const t = createTitle(sl.title, { kicker: sl.kicker, subtitle: sl.subtitle });
      t.position.set(0, sl.kicker ? 7.9 : 8.5, -6.5);
      t.scale.setScalar(1.12);
      t.userData.pos3d = t.position.clone();
      tagContent(t);
      group.add(t);
      updatables.push(t.userData.update);
      return t;
    });

    let slot = 0; // cascade slot — restarts each group (every group clears)
    let zSeen = new Map(); // same-depth stacking, also per group
    const stepParts = sceneDef.steps.map((step) => {
      // A step reveals its whole batch of parts on one press. Parts without
      // an explicit position/depth land on the cascade.
      if (step.clears) { slot = 0; zSeen = new Map(); }
      return step.parts.map((partDef) => {
        const def = {
          ...partDef,
          x: partDef.x ?? PART_CASCADE.x0 + PART_CASCADE.dx * slot,
          y: partDef.y ?? PART_CASCADE.y + (slot % 2 ? -PART_CASCADE.yAlt : PART_CASCADE.yAlt),
          z: partDef.z ?? PART_CASCADE.z0 + PART_CASCADE.dz * slot,
        };
        slot += 1;
        const zKey = def.z.toFixed(2);
        const stacked = zSeen.get(zKey) ?? 0;
        zSeen.set(zKey, stacked + 1);
        def.z += stacked * PART_STACK_DZ;
        const part = buildPart(def);
        part.position.y += ground.heightAt(originX + part.position.x, part.position.z);
        tagContent(part);
        group.add(part);
        updatables.push(part.userData.update);
        return part;
      });
    });

    const meta = sceneDef.steps.map((step) => ({
      clears: step.clears, slideIndex: step.slideIndex, slideStart: step.slideStart,
    }));
    for (const batch of stepParts) {
      for (const part of batch) part.userData.pos3d = part.position.clone();
    }
    return { group, originX, slideTitles, stepParts, meta, slides: sceneDef.slides, updatables };
  });

  // The single title visible right now (across all scenes/slides).
  let shownTitle = null;
  function showSlideTitle(sceneIndex, slideIndex) {
    const t = scenes[sceneIndex].slideTitles[slideIndex];
    if (t === shownTitle) return;
    if (shownTitle) shownTitle.userData.setShown(false);
    t.userData.setShown(true, !shownTitle); // instant for the very first
    shownTitle = t;
  }
  // Active slide index for a state (scene, k = steps revealed): k=0 is the
  // first slide (cover/arrival), otherwise the slide owning the last step.
  function activeSlideIndex(s, k) {
    return k > 0 ? scenes[s].meta[k - 1].slideIndex : 0;
  }
  // Subtitle shows while the active slide's TITLE BEAT is on screen (the empty
  // step or the k=0 cover) and fades once one of its groups is visible.
  function updateSubtitle(s, k) {
    const active = activeSlideIndex(s, k);
    const hasPanels = k > 0 && scenes[s].stepParts[k - 1].length > 0;
    scenes[s].slideTitles[active].userData.setSubShown?.(!hasPanels);
  }
  if (scenes[0]) { showSlideTitle(0, 0); updateSubtitle(0, 0); }

  // Flat, ordered list of every slide for the menu + URL hash.
  const slideList = [];
  scenes.forEach((s, si) => s.slides.forEach((sl) => {
    slideList.push({ sceneIndex: si, jumpK: sl.jumpK, id: sl.id, title: sl.title, kicker: sl.kicker });
  }));

  // First index of the page that step k belongs to: just past the previous
  // clearing step, or 0.
  function pageStart(clears, k) {
    for (let j = k - 1; j >= 0; j -= 1) if (clears[j]) return j;
    return 0;
  }

  // ── focus-mode 2D layout ──────────────────────────────────────────────
  // In the flat presentation view the title moves to the top edge and the
  // current scene's visible panels stay AT their authored positions — they
  // are only nudged apart where they overlap (and clamped into the frame),
  // so the 2D slide keeps the same arrangement the audience saw in 3D
  // while every panel becomes fully visible.
  let focusLayouted = false;

  function layoutFocus(cameraX, frame) {
    focusLayouted = true;
    const i = Math.max(0, Math.min(sceneCount - 1, Math.round(cameraX / spacing)));
    const s = scenes[i];

    // The active slide's title tucks against the top edge in flat 2D view.
    if (shownTitle) shownTitle.position.set(0, frame.top - 1.7, shownTitle.userData.pos3d.z);

    const visible = s.stepParts.flat().filter((p) => p.userData.isRevealed?.());
    if (!visible.length) return;

    const margin = 0.35; // minimum air between panels
    const minX = -frame.halfW + 0.7;
    const maxX = frame.halfW - 0.7;
    const minY = frame.bottom + 0.9; // above the ground strip
    const maxY = frame.top - 2.8; // below the title block

    const rects = visible.map((p) => ({
      p,
      hw: p.userData.footprint.w / 2 + margin / 2,
      hh: p.userData.footprint.h / 2 + margin / 2,
      x: p.userData.pos3d.x,
      y: p.userData.pos3d.y,
    }));
    const clamp = (r) => {
      r.x = Math.min(Math.max(r.x, minX + r.hw), maxX - r.hw);
      r.y = Math.min(Math.max(r.y, minY + r.hh), maxY - r.hh);
    };
    rects.forEach(clamp);

    // Push-apart relaxation: overlapping pairs separate along the axis of
    // least penetration, half-and-half, staying inside the frame. Same
    // input every frame → same stable result. The `spill` pass instead
    // moves DEEPLY stuck pairs sideways — a stack that ran out of vertical
    // room (column taller than the frame) escapes along x; slivers are
    // left alone so they don't trigger chain reactions.
    const relax = (iters, spill) => {
      for (let it = 0; it < iters; it += 1) {
        let moved = false;
        for (let a = 0; a < rects.length; a += 1) {
          for (let b = a + 1; b < rects.length; b += 1) {
            const A = rects[a];
            const B = rects[b];
            const ox = A.hw + B.hw - Math.abs(A.x - B.x);
            const oy = A.hh + B.hh - Math.abs(A.y - B.y);
            if (ox <= 0 || oy <= 0) continue;
            if (spill && oy <= 0.45) continue;
            moved = true;
            if (!spill && ox < oy) {
              const dir = A.x <= B.x ? 1 : -1;
              A.x -= (dir * ox) / 2;
              B.x += (dir * ox) / 2;
            } else if (spill) {
              const dir = A.x <= B.x ? 1 : -1;
              A.x -= (dir * ox) / 2;
              B.x += (dir * ox) / 2;
            } else {
              const dir = A.y <= B.y ? 1 : -1;
              A.y -= (dir * oy) / 2;
              B.y += (dir * oy) / 2;
            }
            clamp(A);
            clamp(B);
          }
        }
        if (!moved) break;
      }
    };
    relax(24, false); // settle by least penetration
    relax(8, true); // spill hard conflicts sideways
    relax(12, false); // clean up what the spill disturbed

    for (const r of rects) {
      r.p.position.x = r.x;
      r.p.position.y = r.y;
    }
  }

  function restoreFocus() {
    focusLayouted = false;
    for (const s of scenes) {
      for (const t of s.slideTitles) t.position.copy(t.userData.pos3d);
      for (const batch of s.stepParts) {
        for (const p of batch) p.position.copy(p.userData.pos3d);
      }
    }
  }

  const clearsOf = (s) => s.meta.map((m) => m.clears);

  return {
    heightAt: ground.heightAt,
    sceneCount,

    sceneX(i) { return scenes[i].originX; },
    stepCount(i) { return scenes[i].stepParts.length; },

    // Every group clears the previous one — only one group shows at a time.
    // Revealing a group that STARTS a slide swaps the 3D title to that slide;
    // the slide's first content group fades its subtitle aside.
    revealStep(i, k, instant = false) {
      const s = scenes[i];
      const m = s.meta[k];
      if (m.slideStart) showSlideTitle(i, m.slideIndex);
      const batch = s.stepParts[k];
      const clears = clearsOf(s);
      const hideCleared = (jobs) => {
        if (!clears[k]) return;
        for (let j = pageStart(clears, k); j < k; j += 1) {
          for (const p of s.stepParts[j]) jobs.push(p.userData.hide());
        }
      };
      let out;
      if (instant) { // URL / menu jumps land whole pages at once, no stagger
        for (const p of batch) p.userData.revealInstant();
        const jobs = [];
        hideCleared(jobs);
        out = Promise.all(jobs);
      } else {
        // Panels of a group appear one after another (PART_STAGGER apart), not
        // all at once. The delay is a tween so mashing forward snaps it.
        const jobs = batch.map((p, j) => (
          j === 0 ? p.userData.reveal() : delayThen(j * PART_STAGGER, () => p.userData.reveal())
        ));
        hideCleared(jobs);
        out = Promise.all(jobs);
      }
      updateSubtitle(i, k + 1);
      return out;
    },
    hideStep(i, k) {
      const s = scenes[i];
      const clears = clearsOf(s);
      const jobs = s.stepParts[k].map((p) => p.userData.hide());
      if (clears[k]) {
        for (let j = pageStart(clears, k); j < k; j += 1) {
          for (const p of s.stepParts[j]) jobs.push(p.userData.reveal());
        }
      }
      // Returning to state k: show the now-active slide's title, and its
      // subtitle if a title beat (not a group) is what's on screen.
      showSlideTitle(i, activeSlideIndex(i, k));
      updateSubtitle(i, k);
      return Promise.all(jobs);
    },

    // Called when the hero starts walking to scene `to` (dir ±1) — show the
    // active slide's title for the state he's arriving into.
    onSceneChange(to, dir) {
      const kAfter = dir > 0 ? 0 : scenes[to].stepParts.length;
      showSlideTitle(to, activeSlideIndex(to, kAfter));
      updateSubtitle(to, kAfter);
    },

    // ── slide addressing (menu + URL) ──
    slides: slideList,
    // Flat-list index of the slide active at state (s, k) — for menu
    // highlight and writing the URL hash.
    activeSlide(s, k) {
      const localIdx = activeSlideIndex(s, k);
      let base = 0;
      for (let j = 0; j < s; j += 1) base += scenes[j].slides.length;
      return base + localIdx;
    },
    // Force the 3D title to the active slide for state (s, k) — used after a
    // jump, where no reveal fired for a title-only landing.
    showTitleFor(s, k) { showSlideTitle(s, activeSlideIndex(s, k)); updateSubtitle(s, k); },

    update(t, dt, cameraX, focus) {
      if (focus?.active) layoutFocus(cameraX, focus.frame);
      else if (focusLayouted) restoreFocus();
      clouds.userData.update(t, dt);
      for (const s of scenes) {
        if (Math.abs(s.originX - cameraX) > ACTIVE_SCENE_RADIUS) continue;
        for (const fn of s.updatables) fn(t, dt);
      }
    },
  };
}

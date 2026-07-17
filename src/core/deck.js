import * as THREE from 'three';
import { build } from '../assets/registry.js';
import { createGround } from '../environment/ground.js';
import { createSun } from '../environment/sky.js';
import { createClouds } from '../environment/clouds.js';
import { createTitle } from '../parts/title.js';
import { buildPart } from '../parts/partsFactory.js';
import { CONTENT_LAYER } from './focusMode.js';
import { ACTIVE_SCENE_RADIUS, PART_CASCADE, PART_STACK_DZ } from '../config.js';

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

    const title = createTitle(sceneDef.title, {
      kicker: sceneDef.kicker, subtitle: sceneDef.subtitle,
    });
    // The title lives BEHIND the panel zone (mid row and nearer): parked
    // between the mid and back rows, panels always pass in front of it.
    // Slightly scaled up to offset the extra perspective distance; a kicker
    // needs headroom above the letters, so that variant sits a bit lower.
    title.position.set(0, sceneDef.kicker ? 7.9 : 8.5, -6.5);
    title.scale.setScalar(1.12);
    tagContent(title);
    group.add(title);
    updatables.push(title.userData.update);

    let slot = 0; // cascade slot — restarts on a clearing step (new "page")
    let zSeen = new Map(); // same-depth stacking, also per page
    const stepParts = sceneDef.steps.map((step) => {
      // A step reveals its whole batch of parts on one press. Parts
      // without an explicit position/depth land on the cascade: each new
      // panel in front of the older ones, fanned to the right.
      if (step.clears) { slot = 0; zSeen = new Map(); }
      return step.parts.map((partDef) => {
        const def = {
          ...partDef,
          x: partDef.x ?? PART_CASCADE.x0 + PART_CASCADE.dx * slot,
          y: partDef.y ?? PART_CASCADE.y + (slot % 2 ? -PART_CASCADE.yAlt : PART_CASCADE.yAlt),
          z: partDef.z ?? PART_CASCADE.z0 + PART_CASCADE.dz * slot,
        };
        slot += 1;
        // Panels of one page sharing a depth never sit in the same plane —
        // each later one steps a little toward the camera, in reveal order,
        // so overlapping cards always occlude cleanly instead of bleeding.
        const zKey = def.z.toFixed(2);
        const stacked = zSeen.get(zKey) ?? 0;
        zSeen.set(zKey, stacked + 1);
        def.z += stacked * PART_STACK_DZ;
        const part = buildPart(def);
        // part y is height above the terrain at its own footprint
        part.position.y += ground.heightAt(originX + part.position.x, part.position.z);
        tagContent(part);
        group.add(part);
        updatables.push(part.userData.update);
        return part;
      });
    });

    const clears = sceneDef.steps.map((step) => step.clears);
    // Remember every anchor's authored 3D spot — focus mode restacks
    // panels for the flat view and puts them back on exit.
    title.userData.pos3d = title.position.clone();
    for (const batch of stepParts) {
      for (const part of batch) part.userData.pos3d = part.position.clone();
    }
    return { group, originX, title, stepParts, clears, updatables };
  });

  if (scenes[0]) scenes[0].title.userData.setShown(true, true);

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

    // Title tucked against the top edge (kicker rides just above it).
    s.title.position.set(0, frame.top - 1.7, s.title.userData.pos3d.z);

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
      s.title.position.copy(s.title.userData.pos3d);
      for (const batch of s.stepParts) {
        for (const p of batch) p.position.copy(p.userData.pos3d);
      }
    }
  }

  return {
    heightAt: ground.heightAt,
    sceneCount,

    sceneX(i) { return scenes[i].originX; },
    stepCount(i) { return scenes[i].stepParts.length; },

    // A step reveals its whole batch of panels at once. A step marked
    // "clears" retires the previous page of panels when it lands and
    // brings that page back when stepped over backwards — the page window
    // runs from the previous clearing step (or 0) up to k−1.
    revealStep(i, k) {
      const s = scenes[i];
      // The first panel takes the kicker/subtitle's sky — fade them aside.
      if (k === 0) s.title.userData.setSubShown?.(false);
      const jobs = s.stepParts[k].map((p) => p.userData.reveal());
      if (s.clears[k]) {
        for (let j = pageStart(s.clears, k); j < k; j += 1) {
          for (const p of s.stepParts[j]) jobs.push(p.userData.hide());
        }
      }
      return Promise.all(jobs);
    },
    hideStep(i, k) {
      const s = scenes[i];
      if (k === 0) s.title.userData.setSubShown?.(true);
      const jobs = s.stepParts[k].map((p) => p.userData.hide());
      if (s.clears[k]) {
        for (let j = pageStart(s.clears, k); j < k; j += 1) {
          for (const p of s.stepParts[j]) jobs.push(p.userData.reveal());
        }
      }
      return Promise.all(jobs);
    },

    // Called when the hero starts walking to scene `to` — swap titles.
    onSceneChange(to) {
      scenes.forEach((s, i) => s.title.userData.setShown(i === to));
    },

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

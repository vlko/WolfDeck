import * as THREE from 'three';
import { build } from '../assets/registry.js';
import { createGround } from '../environment/ground.js';
import { createSun } from '../environment/sky.js';
import { createClouds } from '../environment/clouds.js';
import { createTitle } from '../parts/title.js';
import { buildPart } from '../parts/partsFactory.js';
import { ACTIVE_SCENE_RADIUS, PART_CASCADE, PART_STACK_DZ } from '../config.js';

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
    group.add(title);
    updatables.push(title.userData.update);

    let slot = 0; // cascade slot — restarts on a clearing step (new "page")
    let zSeen = new Map(); // same-depth stacking, also per page
    const parts = sceneDef.steps.map((step) => {
      // Steps without an explicit position/depth land on the cascade:
      // each new panel in front of the older ones, fanned to the right.
      if (step.clears) { slot = 0; zSeen = new Map(); }
      const def = {
        ...step.part,
        x: step.part.x ?? PART_CASCADE.x0 + PART_CASCADE.dx * slot,
        y: step.part.y ?? PART_CASCADE.y + (slot % 2 ? -PART_CASCADE.yAlt : PART_CASCADE.yAlt),
        z: step.part.z ?? PART_CASCADE.z0 + PART_CASCADE.dz * slot,
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
      group.add(part);
      updatables.push(part.userData.update);
      return part;
    });

    const clears = sceneDef.steps.map((step) => step.clears);
    return { group, originX, title, parts, clears, updatables };
  });

  if (scenes[0]) scenes[0].title.userData.setShown(true, true);

  // First index of the page that step k belongs to: just past the previous
  // clearing step, or 0.
  function pageStart(clears, k) {
    for (let j = k - 1; j >= 0; j -= 1) if (clears[j]) return j;
    return 0;
  }

  return {
    heightAt: ground.heightAt,
    sceneCount,

    sceneX(i) { return scenes[i].originX; },
    stepCount(i) { return scenes[i].parts.length; },

    // A step marked "clears" retires the previous page of panels when it
    // lands and brings that page back when stepped over backwards — the
    // page window runs from the previous clearing step (or 0) up to k−1.
    revealStep(i, k) {
      const s = scenes[i];
      // The first panel takes the kicker/subtitle's sky — fade them aside.
      if (k === 0) s.title.userData.setSubShown?.(false);
      const jobs = [s.parts[k].userData.reveal()];
      if (s.clears[k]) {
        for (let j = pageStart(s.clears, k); j < k; j += 1) {
          jobs.push(s.parts[j].userData.hide());
        }
      }
      return Promise.all(jobs);
    },
    hideStep(i, k) {
      const s = scenes[i];
      if (k === 0) s.title.userData.setSubShown?.(true);
      const jobs = [s.parts[k].userData.hide()];
      if (s.clears[k]) {
        for (let j = pageStart(s.clears, k); j < k; j += 1) {
          jobs.push(s.parts[j].userData.reveal());
        }
      }
      return Promise.all(jobs);
    },

    // Called when the hero starts walking to scene `to` — swap titles.
    onSceneChange(to) {
      scenes.forEach((s, i) => s.title.userData.setShown(i === to));
    },

    update(t, dt, cameraX) {
      clouds.userData.update(t, dt);
      for (const s of scenes) {
        if (Math.abs(s.originX - cameraX) > ACTIVE_SCENE_RADIUS) continue;
        for (const fn of s.updatables) fn(t, dt);
      }
    },
  };
}

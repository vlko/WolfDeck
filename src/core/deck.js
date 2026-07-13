import * as THREE from 'three';
import { build } from '../assets/registry.js';
import { createGround } from '../environment/ground.js';
import { createSun } from '../environment/sky.js';
import { createClouds } from '../environment/clouds.js';
import { createTitle } from '../parts/title.js';
import { buildPart } from '../parts/partsFactory.js';
import { ACTIVE_SCENE_RADIUS, PART_CASCADE } from '../config.js';

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

    const title = createTitle(sceneDef.title);
    title.position.set(0, 9, -3.5);
    group.add(title);
    updatables.push(title.userData.update);

    const parts = sceneDef.steps.map((step, k) => {
      // Steps without an explicit position/depth land on the cascade:
      // each new panel in front of the older ones, fanned to the right.
      const def = {
        ...step.part,
        x: step.part.x ?? PART_CASCADE.x0 + PART_CASCADE.dx * k,
        y: step.part.y ?? PART_CASCADE.y + (k % 2 ? -PART_CASCADE.yAlt : PART_CASCADE.yAlt),
        z: step.part.z ?? PART_CASCADE.z0 + PART_CASCADE.dz * k,
      };
      const part = buildPart(def);
      // part y is height above the terrain at its own footprint
      part.position.y += ground.heightAt(originX + part.position.x, part.position.z);
      group.add(part);
      updatables.push(part.userData.update);
      return part;
    });

    return { group, originX, title, parts, updatables };
  });

  if (scenes[0]) scenes[0].title.userData.setShown(true, true);

  return {
    heightAt: ground.heightAt,
    sceneCount,

    sceneX(i) { return scenes[i].originX; },
    stepCount(i) { return scenes[i].parts.length; },

    revealStep(i, k) { return scenes[i].parts[k].userData.reveal(); },
    hideStep(i, k) { return scenes[i].parts[k].userData.hide(); },

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

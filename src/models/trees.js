import * as THREE from 'three';
import { defineModel } from './registry.js';
import { mesh, box, group } from './kit.js';

// Trees from the sheets. Every tree is a stack of paper TIERS — square
// pyramids / frustums turned edge-on to the viewer (that's what gives each
// printed tree its light-left / dark-right halves) — on a box trunk.
//
// Rig: each tier hangs on the one below at its base, so a tiny rotation per
// joint adds up into a soft bend: the tree sways from the trunk up.

const BARK = { tex: 'bark' };
const LEAF = { tex: 'leaf' };

// tiers: [gyTop, hwTop, gyBase, hwBase, color, seg?] in 10-grid units (gx of
// half-width, gy from the top); trunk: [gx0, gx1, color]; aspect: w/h × 100.
function tieredTree(name, { aspect, tiers, trunk, seg = 4, depth = 1 }) {
  defineModel(name, (opts, rig) => {
    const W = aspect;
    const gx = (g) => (g / 10) * W; // grid width → units
    const Y = (gy) => 100 - gy * 10;
    const trunkTop = Y(tiers[tiers.length - 1][2]) + 2;
    const tw = gx(trunk[1] - trunk[0]);
    const tcx = (gx(trunk[0]) + gx(trunk[1])) / 2 - W / 2;
    rig.body.add(mesh(box(tw, trunkTop, tw * 0.9), trunk[2] ?? '#8b6d4f', tcx, 0, 0, BARK));

    // Build bottom-up: each tier group sits at the previous tier's base.
    const joints = [];
    let parent = rig.body;
    let parentY = 0;
    for (let i = tiers.length - 1; i >= 0; i -= 1) {
      const [gyTop, hwTop, gyBase, hwBase, color, tseg] = tiers[i];
      const yb = Y(gyBase);
      const yt = Y(gyTop);
      const j = group(0, yb - parentY, 0);
      const s = tseg ?? seg;
      const rb = gx(hwBase);
      const rt = gx(hwTop);
      const geo = rt > 0.01
        ? new THREE.CylinderGeometry(rt, rb, yt - yb, s, 1)
        : new THREE.ConeGeometry(rb, yt - yb, s, 1);
      geo.translate(0, (yt - yb) / 2, 0);
      geo.scale(1, 1, depth);
      j.add(mesh(geo, color, 0, 0, 0, LEAF));
      parent.add(j);
      joints.push(j);
      parent = j;
      parentY = yb;
    }
    rig.parts.tiers = joints;
    rig.anims.sway = (t, dt, ctx) => {
      const base = Math.sin(t * 0.9 + ctx.phase) * 0.012 + Math.sin(t * 2.3 + ctx.phase) * 0.004;
      joints.forEach((j, k) => {
        j.rotation.z = base * (1 + k * 0.6);
        j.rotation.x = Math.sin(t * 0.7 + ctx.phase + k) * 0.004 * (k + 1);
      });
    };
  });
}

const TRUNK = '#8b6d4f';

tieredTree('pine1', { aspect: 53.0, trunk: [3.6, 6.0, '#7a5c3f'], tiers: [
  [0, 0, 3.3, 3.0, '#6f8a78'], [2.6, 1.7, 6.1, 4.7, '#8fa192'], [5.6, 2.4, 8.5, 5.0, '#577060']] });
tieredTree('pine2', { aspect: 53.2, trunk: [3.7, 6.0, TRUNK], tiers: [
  [0, 0, 3.3, 3.1, '#8c9a82'], [2.6, 1.7, 6.1, 4.7, '#86947d'], [5.6, 2.4, 8.5, 5.0, '#5c6e5f']] });
tieredTree('pine3', { aspect: 52.6, seg: 8, trunk: [3.6, 5.8, TRUNK], tiers: [
  [0, 0, 3.3, 3.0, '#8fa196'], [2.6, 1.6, 6.1, 4.4, '#6f897b'], [5.6, 2.3, 8.4, 4.9, '#9fb0a5']] });
tieredTree('pine4', { aspect: 73.5, trunk: [3.4, 6.7, '#7e603e'], tiers: [
  [0, 0, 3.7, 3.6, '#c3cdc6', 4], [3.3, 2.6, 6.2, 4.6, '#8fa098'], [5.8, 2.2, 8.7, 4.9, '#5a7a6e']] });
tieredTree('pine5', { aspect: 48.6, trunk: [3.4, 5.9, '#9b7f60'], tiers: [
  [0, 0, 3.1, 4.6, '#b6c4bb'], [3.1, 2.0, 5.5, 4.7, '#6a857a'], [5.6, 2.4, 8.0, 5.0, '#5f7d6d']] });
tieredTree('pine6', { aspect: 50.6, trunk: [3.7, 6.3, '#a27b56'], tiers: [
  [0, 0, 1.6, 2.2, '#8a9891'], [1.6, 2.2, 3.0, 4.3, '#8a9891'], [3.0, 2.2, 5.4, 4.6, '#4f6659'], [5.4, 2.3, 8.0, 4.9, '#6f8a7b']] });
tieredTree('pine7', { aspect: 51.1, trunk: [3.8, 6.3, '#9b7c5e'], tiers: [
  [0, 0, 3.4, 3.4, '#5f7d70'], [3.3, 2.0, 6.0, 4.6, '#a9b8ab'], [5.9, 2.6, 8.0, 4.9, '#3f5a4c']] });
tieredTree('pine8', { aspect: 53.4, trunk: [3.8, 6.5, '#9a7d5c'], tiers: [
  [0, 0, 3.4, 3.3, '#7f9886'], [3.3, 2.2, 6.0, 4.4, '#5e7562'], [5.9, 2.4, 8.0, 5.0, '#90a196']] });

export { tieredTree };

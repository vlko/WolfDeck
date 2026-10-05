import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, box, cbox, beam, group, smoke, eyes, cheek, blinker, fold, facet, mat, PI,
} from './kit.js';

// Objects the decks need that no reference sheet shows (construction site,
// school, finance, civic services). Built in the same origami language as
// the sheet models: faceted paper solids, folded fronts, the nine-swatch
// palette, rigged so they can move.

const C = {
  ochre: '#c49a5c', sand: '#d9bb8c', cream: '#ece4d6', ivory: '#f2ede2', sage: '#8fa592', sageDeep: '#6d7e6e',
  slate: '#56625f', slateSoft: '#7c8784', mauve: '#b08884', brown: '#7b6548', wood: '#9a774f', ink: '#24221e',
  gold: '#d0a84f', goldDeep: '#b08a3c', pink: '#e2aaa6', white: '#f4f1ea', glass: '#3d4a4a',
};

// A wheel: chunky faceted tyre + hub, its axle along z. Returns the group.
function wheel(r, w, tyre = C.slate, hub = C.cream) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(r, r, w, 10).rotateX(PI / 2), tyre));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, w + 0.6, 8).rotateX(PI / 2), hub));
  return g;
}

// ── footballGoal — white posts, crossbar, a sagging net ───────────────────
defineModel('footballGoal', (opts, rig) => {
  const W = 200;
  const H = 100;
  const D = 50; // net depth at the ground
  const F = D / 2; // the goal mouth (posts) is at z = +F, the net's back foot at −F
  for (const x of [-W / 2, W / 2]) rig.body.add(mesh(box(5, H, 5), C.white, x, 0, F));
  rig.body.add(mesh(box(W + 5, 5, 5), C.white, 0, H - 5, F));
  // side frames: from the crossbar ends down and back to the ground, and a
  // ground bar joining the back feet
  const side = (x) => {
    // beam drawn in (x, y), turned so its x runs along z: (F, H) → mouth top
    const g = beam(F, H - 2.5, -F, 0, 3, 3).rotateY(-PI / 2);
    rig.body.add(mesh(g, C.white, x, 0, 0));
  };
  side(-W / 2);
  side(W / 2);
  rig.body.add(mesh(cbox(W, 3, 3), C.white, 0, 1.5, -F));
  // net: back slope + two side triangles, a grid of thin cords
  const net = new THREE.Group();
  const cord = (g) => net.add(mesh(g, '#e2ddd2'));
  // the net slopes from the crossbar (top, at the mouth) to the back foot bar
  for (let x = -W / 2; x <= W / 2 + 0.1; x += 12.5) {
    cord(beam(F, H - 2.5, -F, 0, 0.6, 0.6).rotateY(-PI / 2).translate(x, 0, 0));
  }
  for (let y = 0; y <= H - 5; y += 12.5) cord(cbox(W, 0.6, 0.6).translate(0, y, -F + (y / (H - 2.5)) * D));
  rig.body.add(net);
  rig.anims.idle = (t, dt, ctx) => { net.position.z = -Math.max(0, Math.sin(t * 0.8 + ctx.phase)) * 2; };
});

// ── ball — paper football: faceted white ball with dark patches ───────────
defineModel('ball', (opts, rig) => {
  const geo = facet(new THREE.IcosahedronGeometry(50, 1), 0.04);
  const col = geo.attributes.color;
  for (let tri = 0; tri < col.count / 3; tri += 1) {
    const dark = tri % 5 === 0;
    for (let j = 0; j < 3; j += 1) col.setXYZ(tri * 3 + j, dark ? 0.25 : 1, dark ? 0.25 : 1, dark ? 0.25 : 1);
  }
  const ball = new THREE.Mesh(geo, mat(C.white));
  const hold = group(0, 50, 0, ball);
  rig.body.add(hold);
  rig.anims.bounce = (t, dt, ctx) => {
    const c = ((t * 1.1 + ctx.phase) % 1);
    hold.position.y = 50 + Math.sin(c * PI) * 70;
    const squash = c < 0.08 || c > 0.92 ? 0.85 : 1;
    hold.scale.set(2 - squash, squash, 2 - squash);
    ball.rotation.z -= dt * 2.5;
  };
  rig.anims.idle = rig.anims.bounce;
});

// ── pram — rounded tub with a folding hood, on a chassis with four wheels;
// the tub rocks gently on its springs ────────────────────────────────────
defineModel('pram', (opts, rig) => {
  const wheels = [];
  for (const [x, z] of [[-24, -17], [24, -17], [-24, 17], [24, 17]]) {
    const w = wheel(13, 4, C.slate, C.ivory);
    w.position.set(x, 13, z);
    rig.body.add(w);
    wheels.push(w);
  }
  // axles + chassis bar + two springs up to the tub
  for (const x of [-24, 24]) rig.body.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 38, 6).rotateX(PI / 2), C.slate, x, 13, 0));
  rig.body.add(mesh(cbox(52, 3, 3), C.slate, 0, 18, 0));
  for (const x of [-12, 12]) rig.body.add(mesh(cbox(3, 12, 3), C.slate, x, 24, 0));
  // cradle pivots at the spring tops
  const cradle = group(0, 30, 0);
  rig.body.add(cradle);
  // tub: the bottom half of a squashed sphere, open at the top
  const tub = new THREE.SphereGeometry(1, 16, 8, 0, PI * 2, PI / 2, PI / 2).scale(36, 24, 22);
  cradle.add(mesh(tub, C.sage, 0, 22, 0, { side: THREE.DoubleSide }));
  cradle.add(inkMesh(new THREE.CircleGeometry(1, 20).rotateX(-PI / 2).scale(34, 1, 20), '#e8e1d2', 0, 20, 0)); // blanket
  cradle.add(mesh(new THREE.TorusGeometry(1, 0.08, 4, 24).rotateX(PI / 2).scale(36, 24, 22), C.ivory, 0, 22, 0)); // rim
  // hood: a quarter sphere over the back half, sitting on the rim
  const hood = new THREE.SphereGeometry(1, 14, 8, -PI / 2, PI, 0, PI / 2).scale(36, 26, 22); // the x < 0 half
  cradle.add(mesh(hood, C.mauve, 0, 22, 0, { side: THREE.DoubleSide }));
  // handle: from the tub's rim up and back
  cradle.add(mesh(beam(32, 22, 50, 54, 3, 3), C.slate, 0, 0, 12));
  cradle.add(mesh(beam(32, 22, 50, 54, 3, 3), C.slate, 0, 0, -12));
  cradle.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 30, 8).rotateX(PI / 2), C.ivory, 50, 54, 0));
  rig.parts.wheels = wheels;
  rig.anims.idle = (t, dt, ctx) => {
    cradle.rotation.z = Math.sin(t * 1.6 + ctx.phase) * 0.04;
  };
  rig.anims.stroll = rig.anims.idle;
});

// ── zevoPlant — waste-to-energy plant: hall, tall chimney, paper smoke ────
defineModel('zevoPlant', (opts, rig) => {
  rig.body.add(mesh(box(120, 40, 60), C.cream, -10, 0, 0));
  const r = new THREE.Shape([new THREE.Vector2(-30, 0), new THREE.Vector2(30, 0), new THREE.Vector2(30, 6), new THREE.Vector2(-30, 18)]);
  rig.body.add(mesh(new THREE.ExtrudeGeometry(r, { depth: 120, bevelEnabled: false }).rotateY(PI / 2).translate(-70, 40, 0), C.sage));
  for (let x = -60; x <= 40; x += 20) rig.body.add(mesh(box(10, 12, 2), C.glass, x, 18, 31));
  rig.body.add(mesh(new THREE.CylinderGeometry(7, 10, 100, 8).translate(0, 50, 0), '#cfc8b8', 40, 0, -6));
  rig.body.add(mesh(new THREE.CylinderGeometry(7.6, 7.6, 7, 8), C.mauve, 40, 86, -6));
  const sm = smoke(40, 102, -6, { size: 6, rise: 50, count: 5, drift: 16 });
  rig.body.add(sm.group);
  rig.anims.smoke = (t) => sm.update(t);
  rig.anims.idle = rig.anims.smoke;
});

// ── deskLamp — arm, shade, warm bulb (the catalog adds the glow) ──────────
defineModel('deskLamp', (opts, rig) => {
  rig.body.add(mesh(new THREE.CylinderGeometry(20, 24, 8, 10).translate(0, 4, 0), C.slate, 0, 0, 0));
  rig.body.add(mesh(new THREE.SphereGeometry(4, 8, 6), C.slate, 0, 8, 0)); // joint
  const arm = group(0, 8, 0);
  arm.add(mesh(beam(0, 0, 18, 58, 4, 4), C.slate));
  const head = group(18, 58, 0);
  head.add(mesh(new THREE.ConeGeometry(18, 18, 8, 1, true).translate(0, -9, 0), C.ochre, 0, 0, 0, { side: THREE.DoubleSide }));
  head.add(inkMesh(new THREE.SphereGeometry(6, 8, 6), '#ffe9b0', 0, -14, 0));
  head.add(mesh(new THREE.SphereGeometry(4, 8, 6), C.slate));
  head.rotation.z = 0.35;
  arm.add(head);
  rig.body.add(arm);
  rig.anims.idle = (t, dt, ctx) => { head.rotation.z = 0.35 + Math.sin(t * 0.5 + ctx.phase) * 0.05; };
});

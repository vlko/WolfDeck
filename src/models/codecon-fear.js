// CodeCon 2026 — pack "codecon-fear" (see tools/sprites-src/codecon-fear for the
// drawn reference sprites): the gloomy diorama of STRACH / NIKOHO NEZAUJÍMAM
// and the IMPOSTOR SYNDROME props. Eerie-cute paper craft, never horror.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, ink, mat, box, cbox, cyl, extrude, beam, group, eyes, cheek, PI,
} from './kit.js';

const WOOD = { tex: 'wood' };
const WOOD_V = { tex: 'wood', texRotate: true };
const BARK = { tex: 'bark' };
const METAL = { tex: 'metal' };
const WOOL = { tex: 'wool', texScale: 1.3 };

const UP = new THREE.Vector3(0, 1, 0);
const V = (a) => new THREE.Vector3(a[0], a[1], a[2] ?? 0);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const lcg = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

// Tapered faceted stick from a to b (radius r0 → r1).
function limbGeo(a, b, r0, r1, seg = 5) {
  const va = V(a);
  const d = V(b).sub(va);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()));
  g.translate(va.x + d.x / 2, va.y + d.y / 2, va.z + d.z / 2);
  return g;
}

function merged(geos) {
  return BufferGeometryUtils.mergeGeometries(geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.clearGroups();
    for (const k of Object.keys(n.attributes)) if (k !== 'position') n.deleteAttribute(k);
    return n;
  }));
}

// Stepped poses (birds move in little jerks): holds vals[i] for `period`
// seconds, easing to the next within `ease` seconds. Loops over vals.
function steps(t, period, vals, ease = 0.22) {
  const u = (((t / period) % vals.length) + vals.length) % vals.length;
  const i = Math.floor(u);
  const a = vals[i];
  const b = vals[(i + 1) % vals.length];
  const k = smooth(((u - i) * period - (period - ease)) / ease);
  return a + (b - a) * k;
}

// deterministic blink: k 0 open … 1 shut, a quick blink every `every` seconds
function blinkAt(t, every, off = 0) {
  const c = (((t + off) % every) + every) % every;
  return c < 0.16 ? Math.sin((c / 0.16) * PI) : 0;
}

// ── deadTree — bare gnarled paper tree, forked angular branches, a knothole ──
defineModel('deadTree', (opts, rig) => {
  const C1 = '#85735f';
  const C2 = '#77675a';
  const limb = ([a, b, r0, r1], at, color, knuckle = true) => {
    const gs = [limbGeo(a, b, r0, r1, 5)];
    if (knuckle) gs.push(new THREE.IcosahedronGeometry(r0 * 1.04, 0).translate(a[0], a[1], a[2]));
    return mesh(merged(gs), color, -at[0], -at[1], -at[2], BARK);
  };
  const O = [0, 0, 0];
  // trunk (kinked), a broken stub, three roots
  rig.body.add(limb([[0, 0, 0], [-2, 26, 0], 9, 7.5], O, C1, false));
  rig.body.add(limb([[-2, 26, 0], [0, 44, 0], 7.5, 6], O, C1));
  rig.body.add(mesh(new THREE.IcosahedronGeometry(6.2, 0), C1, 0, 43.5, 0, BARK));
  rig.body.add(limb([[2, 30, 4], [9, 38, 13], 3, 2.2], O, C2, false));
  for (const end of [[-15, 1.5, 4], [14, 1.5, 6], [2, 1.5, -13]]) rig.body.add(limb([[0, 9, 0], end, 5.5, 1.5], O, C2, false));
  // knothole: a little collar with a dark heart
  rig.body.add(mesh(limbGeo([-1, 24, 4], [-1.4, 24, 8.9], 4.6, 3.6, 6), C2, 0, 0, 0, BARK));
  const hole = inkMesh(new THREE.CircleGeometry(2.5, 8), '#2b2622', -1.4, 24, 9.35);
  hole.scale.y = 1.3;
  rig.body.add(hole);

  // hinged branches: { at, limbs, kids }
  const BR = [
    { at: [0, 43, 0], limbs: [[[0, 43, 0], [-16, 58, 3], 5, 4], [[-16, 58, 3], [-22, 72, 4], 4, 3], [[-16, 58, 3], [-27, 60, 8], 1.8, 0.5]],
      kids: [
        { at: [-22, 72, 4], limbs: [[[-22, 72, 4], [-34, 80, 2], 2.6, 1.6], [[-34, 80, 2], [-36, 91, 0], 1.6, 0.5]] },
        { at: [-22, 72, 4], limbs: [[[-22, 72, 4], [-15, 84, -2], 2.6, 1.6], [[-15, 84, -2], [-19, 95, -4], 1.6, 0.5]] },
      ] },
    { at: [0, 40, 0], limbs: [[[0, 40, 0], [15, 50, -2], 4.6, 3.8], [[15, 50, -2], [22, 64, -3], 3.8, 2.8], [[15, 50, -2], [25, 47, 6], 1.6, 0.5]],
      kids: [
        { at: [22, 64, -3], limbs: [[[22, 64, -3], [34, 68, 2], 2.4, 1.5], [[34, 68, 2], [37, 80, 4], 1.5, 0.5]] },
        { at: [22, 64, -3], limbs: [[[22, 64, -3], [19, 78, -6], 2.4, 1.5], [[19, 78, -6], [26, 88, -8], 1.5, 0.5]] },
      ] },
    { at: [0, 44, 0], limbs: [[[0, 44, 0], [3, 62, -4], 4.6, 3.2], [[3, 62, -4], [-3, 76, -6], 3.2, 2.2]],
      kids: [
        { at: [-3, 76, -6], limbs: [[[-3, 76, -6], [-6, 90, -4], 2, 1.2], [[-6, 90, -4], [-2, 100, -3], 1.2, 0.4]] },
        { at: [-3, 76, -6], limbs: [[[-3, 76, -6], [8, 86, -10], 1.9, 1.1], [[8, 86, -10], [9, 96, -12], 1.1, 0.4]] },
      ] },
    { at: [-1, 36, -3], limbs: [[[-1, 36, -3], [-7, 52, -16], 3.6, 2.4], [[-7, 52, -16], [-2, 66, -24], 2.4, 0.6]], kids: [] },
  ];
  const joints = [];
  const add = (def, parent, pAt, depth) => {
    const g = group(def.at[0] - pAt[0], def.at[1] - pAt[1], def.at[2] - pAt[2]);
    def.limbs.forEach((l, i) => g.add(limb(l, def.at, (i + depth) % 2 ? C2 : C1)));
    parent.add(g);
    joints.push({ g, depth, i: joints.length });
    for (const k of def.kids ?? []) add(k, g, def.at, depth + 1);
  };
  for (const b of BR) add(b, rig.body, O, 0);
  rig.parts.branches = joints.map((j) => j.g);
  rig.anims.sway = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    for (const { g, depth, i } of joints) {
      const a = depth ? 0.03 : 0.016;
      // slow lean + a small stiff creak on top
      g.rotation.z = Math.sin(t * 0.8 + p + i * 1.3) * a + Math.sin(t * 2.9 + p * 2 + i * 2.1) * a * 0.22;
      g.rotation.x = Math.sin(t * 0.6 + p + i * 0.7) * a * 0.6;
    }
  };
});

// ── stormCloud — floating dark cloud, slanted paper rain, a flashing bolt ───
defineModel('stormCloud', (opts, rig) => {
  const CY = 80;
  const cloud = group(0, CY, 0);
  rig.body.add(cloud);
  const LUMPS = [
    [-22, 74, 0, 20, 12, 14, '#566260'], [-8, 84, -2, 18, 14, 15, '#5f6b69'], [12, 86, 2, 20, 14, 15, '#4f5a58'],
    [28, 76, 0, 14, 12, 13, '#434e4c'], [2, 72, 3, 30, 10, 16, '#4b5654'], [-30, 70, -3, 12, 8, 10, '#5a6664'],
    [16, 72, -6, 20, 9, 12, '#414c4a'],
  ];
  LUMPS.forEach(([x, y, z, rx, ry, rz, c], i) => {
    const g = new THREE.IcosahedronGeometry(1, 1).rotateY(i * 1.1).rotateX(i * 0.7).scale(rx, ry, rz);
    cloud.add(mesh(g, c, x, y - CY, z));
  });
  // rain: slanted streaks falling from inside the cloud down to the ground
  const SLANT = 0.22;
  const r = lcg(7);
  const rainMat = mat('#a9bbbf', { emissive: '#2c383b' });
  const drops = [];
  const N = 18;
  for (let i = 0; i < N; i += 1) {
    const m = mesh(cbox(1.2, 8, 1.2), '#a9bbbf', 0, 0, 0, { material: rainMat });
    m.rotation.z = -Math.atan(SLANT);
    rig.body.add(m);
    drops.push({ m, x: -30 + ((i * 7) % N) * (60 / (N - 1)) + (r() - 0.5) * 3, z: (r() - 0.5) * 16, off: i / N + r() * 0.04, sp: 0.5 + r() * 0.12 });
  }
  // lightning: unlit warm zig-zag
  const bolt = new THREE.Mesh(extrude([[2, 66], [11, 66], [4, 48], [10, 48], [-5, 24], [0, 42], [-6, 42]], 3), ink('#ffe7a8'));
  bolt.position.z = 1;
  rig.body.add(bolt);
  const rain = (t, p) => {
    for (const d of drops) {
      const k = (((t * d.sp + d.off + p) % 1) + 1) % 1;
      const y = 61 - k * 57;
      d.m.position.set(d.x - (k - 0.5) * 57 * SLANT, y, d.z);
      d.m.scale.setScalar(Math.max(0.001, Math.min(1, k / 0.06, (1 - k) / 0.1)));
    }
  };
  rain(0, 0);
  rig.parts.bolt = bolt;
  rig.parts.cloud = cloud;
  rig.anims.storm = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    rain(t, p * 0.37);
    // two strikes per 10.4 s loop (gaps 4.4 s and 6 s), each with a double flicker
    const c = (((t + p * 1.7) % 10.4) + 10.4) % 10.4;
    const s = c < 4.4 ? c : c - 4.4;
    const on = s < 0.09 || (s > 0.17 && s < 0.36);
    bolt.visible = on;
    const b = Math.sin(t * 1.1 + p);
    cloud.scale.set(1 + b * 0.025 + (on ? 0.02 : 0), 1 - b * 0.03, 1 + b * 0.025);
    cloud.position.y = CY + Math.sin(t * 0.7 + p) * 0.6;
  };
});

// ── crow — origami crow perched on a fence post ────────────────────────────
defineModel('crow', (opts, rig) => {
  const BLK = '#2b3234';
  const BLK2 = '#232a2c';
  const GLOSS = '#3f4a4c';
  const BEAK = '#ddd1ae';
  const LEG = '#b9ab88';
  // post
  rig.body.add(mesh(cyl(8, 8.6, 38.6, 6), '#84694b', 0, 0, 0, WOOD_V));
  rig.body.add(mesh(cyl(7.2, 8.4, 1.4, 6), '#a88c68', 0, 38.6, 0, WOOD));
  const bird = group(0, 40, 0);
  bird.rotation.y = 0.8;
  rig.body.add(bird);
  for (const s of [-1, 1]) {
    bird.add(mesh(cyl(0.8, 0.8, 9, 5), LEG, s * 4, 0, 0));
    bird.add(mesh(box(1.3, 0.9, 6.5), LEG, s * 4, 0, 1.2));
    for (const a of [-0.5, 0.5]) {
      const toe = mesh(box(1, 0.8, 4.5).translate(0, 0, 2.2), LEG, s * 4, 0, 1);
      toe.rotation.y = a;
      bird.add(toe);
    }
  }
  const lean = group(0, 6, 0); // hips
  bird.add(lean);
  const torso = mesh(new THREE.IcosahedronGeometry(1, 1).scale(11, 14, 17).rotateX(-0.5), BLK, 0, 14, -1);
  lean.add(torso);
  // tail: a tapered slab pointing back and down
  const tail = group(0, 9, -12);
  const tailSlab = mesh(extrude([[-3.5, 3], [3.5, 3], [6.5, -22], [0, -24.5], [-6.5, -22]], 1.8), BLK2);
  tailSlab.rotation.x = 0.95;
  tail.add(tailSlab);
  lean.add(tail);
  // wings: folded shields hinged at the shoulders
  const wings = [];
  for (const s of [-1, 1]) {
    const w = group(s * 10.2, 23, 3);
    const g = extrude([[-5, 3], [4, 4], [20, -12], [27, -25], [12, -19], [-1, -13], [-6, -4]], 2).rotateY(PI / 2);
    w.add(mesh(g, GLOSS));
    w.rotation.z = s * 0.1;
    lean.add(w);
    wings.push(w);
  }
  // head on the neck
  const head = group(0, 30, 8);
  lean.add(head);
  const HC = new THREE.Vector3(0, 8, 2);
  head.add(mesh(new THREE.IcosahedronGeometry(12, 1).scale(1, 0.95, 1.05), BLK, HC.x, HC.y, HC.z));
  const crest = mesh(new THREE.ConeGeometry(3.4, 7, 4).translate(0, 3.5, 0), BLK2, 0, 18, -1.5);
  crest.rotation.x = -0.55;
  head.add(crest);
  head.add(mesh(new THREE.ConeGeometry(4.4, 15, 4).rotateX(PI / 2).translate(0, 0, 7.5).scale(1, 0.5, 1), BEAK, 0, 8.2, 12.5));
  const jaw = group(0, 7.2, 12.5);
  jaw.add(mesh(new THREE.ConeGeometry(3.8, 12, 4).rotateX(PI / 2).translate(0, 0, 6).scale(1, 0.4, 1), '#b7a983', 0, -0.9, 0));
  head.add(jaw);
  const eyeGs = [];
  for (const s of [-1, 1]) {
    const dir = new THREE.Vector3(s * 0.74, 0.24, 0.63).normalize();
    const e = group(HC.x + dir.x * 11.0, HC.y + dir.y * 10.4, HC.z + dir.z * 11.6);
    e.add(new THREE.Mesh(new THREE.SphereGeometry(2.7, 10, 8), ink('#f3e3b8')));
    const pu = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), ink('#15181a'));
    pu.position.copy(dir).multiplyScalar(1.7);
    e.add(pu);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 4), ink('#ffffff'));
    gl.position.copy(dir).multiplyScalar(2.9).add(new THREE.Vector3(0, 0.8, 0.5));
    e.add(gl);
    head.add(e);
    eyeGs.push(e);
  }
  rig.parts.head = head;
  rig.parts.wings = wings;
  const pose = (t, p, { leanX = 0, headX = 0, headY = 0, headZ = 0, open = 0, wing = 0, tailX = 0 }) => {
    lean.rotation.x = leanX;
    head.rotation.set(headX, headY, headZ);
    jaw.rotation.x = open;
    wings[0].rotation.z = -0.1 - wing;
    wings[1].rotation.z = 0.1 + wing;
    wings[0].rotation.x = wings[1].rotation.x = -wing * 0.5;
    tail.rotation.x = tailX;
    const b = Math.sin(t * 2.2 + p);
    torso.scale.set(1 + b * 0.015, 1 + b * 0.012, 1);
  };
  rig.anims.always = (t, dt, ctx) => {
    const k = Math.max(blinkAt(t, 3.7, ctx?.phase ?? 0), blinkAt(t, 9.1, 1.2));
    for (const e of eyeGs) e.scale.y = Math.max(0.1, 1 - k);
  };
  rig.anims.idle = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    const tt = t + p;
    const c = tt % 4.3;
    pose(t, p, {
      headY: steps(tt, 0.95, [0, -0.7, -0.7, 0.25, 0, -1.0, -0.4, 0.2]),
      headZ: steps(tt, 0.95, [0, 0.28, 0, -0.2, 0.3, 0.1, 0, 0]),
      headX: steps(tt, 0.95, [0, 0, 0.12, 0, -0.1, 0, 0.1, 0]),
      tailX: c < 0.45 ? Math.sin((c / 0.45) * PI * 2) * 0.22 : 0,
    });
  };
  rig.anims.caw = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    const c = (t + p) % 2.6;
    const k = smooth(c / 0.3) * (1 - smooth((c - 1.7) / 0.4));
    const pulse = Math.abs(Math.sin(clamp01((c - 0.25) / 1.5) * PI * 2)); // two caws
    pose(t, p, {
      leanX: 0.32 * k,
      headX: -0.3 * k - 0.08 * k * pulse,
      open: (0.15 + 0.6 * pulse) * k,
      wing: (0.38 + 0.14 * pulse) * k,
      tailX: -0.25 * k,
    });
  };
  rig.anims.peck = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    const c = (t + p) % 3.4;
    const k = smooth(c / 0.4) * (1 - smooth((c - 1.9) / 0.4));
    const tap = Math.max(0, Math.sin(clamp01((c - 0.45) / 1.35) * PI * 6)); // three pecks
    pose(t, p, {
      leanX: 0.5 * k + 0.08 * k * tap,
      headX: 0.5 * k + 0.4 * k * tap,
      headZ: (1 - k) * steps(t + p, 0.95, [0, 0.2, 0, -0.2]),
      wing: 0.06 * k,
      tailX: -0.3 * k,
    });
  };
});

// ── tombstoneCode — granite gravestone engraved </> RIP, dry grass, a
// wilted flower ──────────────────────────────────────────────────────────────
defineModel('tombstoneCode', (opts, rig) => {
  const GR = { tex: 'granite' };
  // earth mound + plinth
  rig.body.add(mesh(cyl(40, 47, 6, 9).scale(1, 1, 0.55), '#746858'));
  rig.body.add(mesh(box(74, 9, 22), '#8d9794', 0, 5, 0, GR));
  rig.body.add(mesh(cyl(1, 1, 1.6, 4).rotateY(PI / 4).scale(52.3 * 0.99, 1, 15.5), '#a7b0ad', 0, 14, 0, GR)); // chamfer course
  // stone: rounded top slab
  const pts = [[29.5, 0], [29.5, 57]];
  for (let i = 1; i < 14; i += 1) { const a = (i / 14) * PI; pts.push([Math.cos(a) * 29.5, 57 + Math.sin(a) * 29.5]); }
  pts.push([-29.5, 57], [-29.5, 0]);
  rig.body.add(mesh(extrude(pts, 13, 1.5), '#939d9a', 0, 12, 0, GR));
  const F = 8; // front face z
  const glyphs = [];
  const st = (x1, y1, x2, y2, w) => glyphs.push(beam(x1, y1, x2, y2, w, 0.6, w / 2));
  // </>
  st(-11, 82, -19, 73, 3.2); st(-19, 73, -11, 64, 3.2);
  st(11, 82, 19, 73, 3.2); st(19, 73, 11, 64, 3.2);
  st(4, 84, -4, 62, 3.2);
  // RIP
  const s = 1.7;
  st(-11, 41, -11, 51, s); st(-11, 51, -6.5, 51, s); st(-6.5, 51, -6.5, 46.5, s); st(-6.5, 46.5, -11, 46.5, s); st(-9, 46.5, -6.2, 41, s);
  st(0, 41, 0, 51, s);
  st(6.5, 41, 6.5, 51, s); st(6.5, 51, 11, 51, s); st(11, 51, 11, 46.5, s); st(11, 46.5, 6.5, 46.5, s);
  const gm = mesh(merged(glyphs), '#4a5552', 0, 0, F + 0.25);
  rig.body.add(gm);
  // dry grass tuft (front left)
  const blades = [];
  [[-40, 13, -7, 19, '#a3966a'], [-38, 15, -4, 26, '#c2b382'], [-36, 13, 1, 22, '#a3966a'], [-34, 15, 6, 17, '#c2b382'], [-41, 16, -3, 12, '#c2b382'], [-37, 17, 3, 11, '#a3966a']]
    .forEach(([x, z, dx, h, c]) => {
      const b = group(x, 1, z);
      b.add(mesh(limbGeo([0, 0, 0], [dx, h, (z - 15) * 0.8], 1.7, 0.12, 3), c));
      rig.body.add(b);
      blades.push(b);
    });
  // wilted flower (front right)
  const flower = group(36, 1, 14);
  const stem = [[0, 0, 0], [2, 19, 0], [5, 28.5, 0.5], [9, 31, 1], [12, 26, 1.5]];
  const sg = [];
  for (let i = 0; i < stem.length - 1; i += 1) { sg.push(limbGeo(stem[i], stem[i + 1], 0.8, 0.8, 4)); sg.push(new THREE.IcosahedronGeometry(0.85, 0).translate(...stem[i + 1])); }
  sg.push(limbGeo([1.2, 11, 0], [8, 15, 1.5], 1.6, 0.1, 3).scale(1, 1, 0.5));
  flower.add(mesh(merged(sg), '#798877'));
  const bloom = group(12, 26.5, 1.5);
  bloom.add(mesh(new THREE.ConeGeometry(3.9, 8, 6).translate(0, -4.2, 0), '#a5817f'));
  bloom.add(mesh(new THREE.IcosahedronGeometry(1.5, 0), '#6d7a6c'));
  bloom.rotation.z = 0.15;
  flower.add(bloom);
  rig.body.add(flower);
  rig.anims.idle = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    blades.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.3 + p + i * 0.8) * 0.05 + Math.sin(t * 3.1 + i) * 0.012; });
    flower.rotation.z = Math.sin(t * 0.9 + p) * 0.025;
    bloom.rotation.z = 0.15 + Math.sin(t * 1.4 + p + 1) * 0.1;
  };
});

// ── impostorSheep — a sheep holding a wolf mask on a stick ─────────────────
defineModel('impostorSheep', (opts, rig) => {
  const wool = '#e6e2d8';
  const woolShade = '#dcd6c9';
  const woolMat = (c) => mat(c, { flat: false, soft: true, ...WOOL });
  const tan = '#dcbfa2';
  const muzzleC = '#e8d2b8';
  const legC = '#a9815d';
  const inkC = '#2a221c';
  const puff = (r, x, y, z, color = wool) => mesh(new THREE.IcosahedronGeometry(r, 2), color, x, y, z, { material: woolMat(color), jitter: 0.012 });

  const body = group(0, 0, 0);
  rig.body.add(body);
  const torso = group(0, 36, -8);
  body.add(torso);
  torso.add(mesh(new THREE.SphereGeometry(1, 18, 12).scale(25, 23, 27), wool, 0, 0, 0, { material: woolMat(wool), jitter: 0.01 }));
  const hash = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const N = 14;
  for (let i = 0; i < N; i += 1) {
    const k = (i + 0.5) / N;
    const phi = Math.acos(1 - 2 * k);
    const th = i * 2.39996;
    const x = Math.sin(phi) * Math.cos(th) * 17;
    const y = Math.cos(phi) * 15.5;
    const z = Math.sin(phi) * Math.sin(th) * 19;
    if (y < -12) continue;
    torso.add(puff(10.5 + hash(i) * 2, x, y, z, i % 4 ? wool : woolShade));
  }
  const tail = group(0, 6, -27);
  tail.add(puff(7.5, 0, 0, -2));
  torso.add(tail);
  for (const [x, z, len] of [[-11.5, 6, 21], [11.5, 6, 21], [-7, -20, 20], [7, -20, 20]]) {
    const leg = group(x, 22, z);
    leg.add(mesh(box(4.9, len, 5).translate(0, -len, 0), legC));
    leg.add(mesh(box(5.4, 3, 5.6).translate(0, -len, 0), '#6e523a'));
    body.add(leg);
  }

  // head (the library sheep's round face in its wool bonnet)
  const HY = 48;
  const head = group(0, HY, 4);
  body.add(head);
  const hy = 19.5;
  const hz = 7;
  const R = 15.5;
  head.add(mesh(new THREE.SphereGeometry(R, 20, 14).scale(1, 0.96, 0.92), tan, 0, hy, hz));
  const surf = (x, y) => hz + R * 0.92 * Math.sqrt(Math.max(0, 1 - (x / R) ** 2 - (y / (R * 0.96)) ** 2));
  const mz = surf(0, -5) - 3;
  head.add(mesh(new THREE.SphereGeometry(1, 16, 10).scale(8.5, 6.2, 5.5), muzzleC, 0, hy - 5.2, mz));
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8).scale(2.6, 1.7, 1.4), new THREE.MeshBasicMaterial({ color: inkC }));
  nose.position.set(0, hy - 2.6, mz + 4.6);
  head.add(nose);
  const mouthZ = mz + 5.2;
  head.add(inkMesh(new THREE.BoxGeometry(0.6, 2.2, 0.4), inkC, 0, hy - 4.6, mouthZ));
  for (const s2 of [-1, 1]) {
    const arc = inkMesh(new THREE.TorusGeometry(1.5, 0.32, 4, 10, PI), inkC, s2 * 1.5, hy - 5.6, mouthZ - 0.5);
    arc.rotation.z = PI;
    head.add(arc);
  }
  const ey = eyes(6.6, 2.1);
  ey.group.position.set(0, hy + 2.2, surf(6.6, 2.2) + 0.4);
  head.add(ey.group);
  for (const s2 of [-1, 1]) {
    const c = cheek(4.2, '#df9a92');
    c.position.set(s2 * 10.2, hy - 3.6, surf(10.2, -3.6) + 0.35);
    c.rotation.y = s2 * 0.62;
    head.add(c);
  }
  const bonnet = new THREE.Group();
  bonnet.add(mesh(new THREE.SphereGeometry(1, 16, 12).scale(18.5, 18.5, 15), wool, 0, hy + 2.5, hz - 7, { material: woolMat(wool), jitter: 0.01 }));
  const ring = 17.5;
  for (let i = 0; i <= 8; i += 1) {
    const a = (-35 + (i / 8) * 250) * (PI / 180);
    const r = 7.6 + (i % 2) * 1.0;
    bonnet.add(puff(r, Math.cos(a) * (ring - 1.5), hy + 1.5 + Math.sin(a) * (ring - 1.5) * 0.95, hz - 0.5 - Math.abs(Math.cos(a)) * 3, wool));
  }
  bonnet.add(puff(7, 0, hy + 14.5, hz + 5));
  head.add(bonnet);
  const ears = [];
  for (const s2 of [-1, 1]) {
    const ear = group(s2 * 20, hy + 3, hz - 2);
    const leaf = mesh(new THREE.SphereGeometry(1, 10, 6).scale(10, 4.4, 3.2), '#b5845a', s2 * 8, -3, 0);
    leaf.rotation.z = s2 * -0.45;
    ear.add(leaf);
    head.add(ear);
    ears.push(ear);
  }

  // arm (a raised front hoof) gripping the stick
  const H0 = [19, 42, 24];
  body.add(mesh(limbGeo([15, 37, 9], H0, 3.4, 3, 6), legC));
  body.add(mesh(new THREE.IcosahedronGeometry(3.7, 0), '#6e523a', H0[0], H0[1], H0[2] + 0.5));
  const holder = group(...H0);
  body.add(holder);
  const MC = [-19, 24.5, 12]; // mask centre, holder-local
  holder.add(mesh(limbGeo([1.2, -6, -0.6], [MC[0] + 5, MC[1] + 3, MC[2] - 2.8], 1.1, 1.1, 5), '#8a6a4a', 0, 0, 0, WOOD_V));
  // the wolf mask: folded card, crease down the middle
  const mask = group(...MC);
  holder.add(mask);
  const K = 1.2;
  const HW = 19 * K;
  const RIDGE = 3.5;
  const zf = (x) => RIDGE * (1 - Math.abs(x) / HW);
  const sheet = (ptsR, side, d, zc) => {
    const g = extrude(ptsR.map(([x, y]) => [x * K * side, y * K]), d);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i += 1) pos.setZ(i, pos.getZ(i) + zf(pos.getX(i)) + zc);
    return g;
  };
  const cheekR = [[9, 13], [14, 13], [19, 4], [4, -15], [0, -15], [0, -12], [3, -12], [5, -2]];
  const blazeR = [[0, 13], [9, 13], [5, -2], [3, -12], [0, -12]];
  const earR = [[4, 13], [14, 13], [16, 27.9]];
  const earIn = [[7.5, 13.6], [12.5, 13.6], [14.3, 22]];
  for (const side of [-1, 1]) {
    mask.add(mesh(sheet(cheekR, side, 2, 0), '#dccfae'));
    mask.add(mesh(sheet(blazeR, side, 2, 0), '#8f8482'));
    mask.add(mesh(sheet(earR, side, 2, 0), '#857a78'));
    mask.add(mesh(sheet(earIn, side, 0.8, 1.2), '#b39c97'));
    const e = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 8), ink('#1f1d1a'));
    e.scale.z = 0.3;
    e.position.set(side * 12, 3.6, 1 + zf(12) + 0.25);
    e.rotation.y = side * Math.atan(RIDGE / HW);
    mask.add(e);
  }
  mask.add(mesh(extrude([[-3.9, -12.4], [3.9, -12.4], [0, -17.6]], 1.6), '#2a2522', 0, 0, RIDGE + 1.25));

  rig.parts.mask = mask;
  rig.parts.holder = holder;
  rig.parts.head = head;
  const twitch = (t) => {
    const c = t % 4.7;
    ears[0].rotation.z = c < 0.25 ? -Math.sin((c / 0.25) * PI) * 0.4 : 0;
    const c2 = (t + 2.2) % 5.9;
    ears[1].rotation.z = c2 < 0.25 ? Math.sin((c2 / 0.25) * PI) * 0.4 : 0;
    const c3 = t % 3.8;
    tail.rotation.y = c3 < 0.6 ? Math.sin(c3 * 30) * 0.35 * (1 - c3 / 0.6) : 0;
  };
  const breathe = (t, p) => {
    const b = Math.sin(t * 2 + p);
    torso.scale.set(1 + b * 0.012, 1 + b * 0.02, 1);
  };
  // k: 0 mask in front of the face … 1 lowered to the side
  const hold = (t, p, k) => {
    const wob = (1 - k * 0.6);
    holder.rotation.z = -1.3 * k + (Math.sin(t * 1.3 + p) * 0.035 + Math.sin(t * 3.3 + p) * 0.012) * wob;
    holder.rotation.x = Math.sin(t * 1.7 + p) * 0.02 * wob;
    mask.rotation.z = 1.05 * k;
  };
  rig.anims.idle = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    twitch(t + p);
    breathe(t, p);
    hold(t, p, 0);
    head.rotation.z = Math.sin(t * 0.6 + p) * 0.03;
    ey.blink(blinkAt(t, 4.1, p));
  };
  rig.anims.peek = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    twitch(t + p);
    breathe(t, p);
    const c = (t + p) % 6.4;
    // 0–2.8 hidden · lower · 3.4–5.3 peeking · raise
    const k = smooth((c - 2.8) / 0.6) * (1 - smooth((c - 5.3) / 0.55));
    hold(t, p, k);
    head.rotation.z = -0.1 * k + Math.sin(t * 0.6 + p) * 0.03 * (1 - k);
    head.rotation.y = 0.12 * k * Math.sin((c - 3.4) * 1.6);
    const bl = (at) => { const u = (c - at) / 0.18; return u > 0 && u < 1 ? Math.sin(u * PI) : 0; };
    ey.blink(Math.max(bl(3.9), bl(4.25), bl(4.95), bl(1.2)));
  };
});

// ── standingMirror — oval cheval mirror showing a sheep with wolf ears ─────
defineModel('standingMirror', (opts, rig) => {
  const W1 = '#93714f';
  const W2 = '#7d5f42';
  for (const s of [-1, 1]) {
    rig.body.add(mesh(box(3.6, 60, 3.6), W1, s * 23.6, 3, 0, WOOD_V));
    rig.body.add(mesh(extrude([[-14, 0], [14, 0], [9, 4.5], [-9, 4.5]], 5).rotateY(PI / 2), W2, s * 23.6, 0, 0, WOOD));
    rig.body.add(mesh(new THREE.IcosahedronGeometry(3.1, 0), '#a8845c', s * 23.6, 64, 0));
    rig.body.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 3, 6).rotateZ(PI / 2), '#5b4631', s * 21.6, 58, 0));
  }
  rig.body.add(mesh(box(44, 3.5, 2.6), W2, 0, 8, 0, WOOD));
  const CYM = 58;
  const mirror = group(0, CYM, 0);
  mirror.rotation.x = -0.07;
  rig.body.add(mirror);
  const ell = (rx, ry, n = 24, a0 = 0) => Array.from({ length: n }, (_, i) => new THREE.Vector2(Math.cos(a0 + (i / n) * PI * 2) * rx, Math.sin(a0 + (i / n) * PI * 2) * ry));
  const frameShape = new THREE.Shape(ell(20, 37.5));
  frameShape.holes.push(new THREE.Path(ell(16.5, 34).reverse()));
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 5, bevelEnabled: true, bevelSize: 0.8, bevelThickness: 0.8, bevelSegments: 1, curveSegments: 4 }).translate(0, 0, -2.5);
  mirror.add(mesh(frameGeo, W1, 0, 0, 0, { tex: 'woodFine' }));
  mirror.add(mesh(new THREE.ExtrudeGeometry(new THREE.Shape(ell(18, 35.5)), { depth: 2, bevelEnabled: false }).translate(0, 0, -2.6), '#6b5239', 0, 0, 0, WOOD));
  mirror.add(mesh(new THREE.ConeGeometry(5, 5.2, 4).translate(0, 2.6, 0), W2, 0, 36.6, 0));
  // glass + the impostor's reflection (flat unlit shapes, layered 0.4 apart)
  const flat = (shape, color, z) => { const m = new THREE.Mesh(shape, ink(color)); m.position.z = z; mirror.add(m); return m; };
  const polyG = (pts) => new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y - CYM))));
  const circG = (x, y, r, n = 14) => new THREE.CircleGeometry(r, n).translate(x, y - CYM, 0);
  flat(new THREE.ShapeGeometry(new THREE.Shape(ell(17.2, 34.7, 32))), '#cddbd6', 0.4);
  flat(circG(0, 40, 9.5), '#f3f0e6', 0.8);
  flat(polyG([[-4, 40], [-1.5, 40], [-1.5, 28.5], [-4, 28.5]]), '#b8946f', 1.2);
  flat(polyG([[4, 40], [4, 28.5], [1.5, 28.5], [1.5, 40]]), '#b8946f', 1.2);
  flat(polyG([[-8.5, 62], [-2, 63], [-8, 76]]), '#6f6a6c', 0.8);
  flat(polyG([[8.5, 62], [8, 76], [2, 63]]), '#5d5859', 0.8);
  flat(circG(0, 56, 9), '#fbf9f2', 1.2);
  flat(circG(0, 55, 5.8), '#e2c7ab', 1.6);
  flat(circG(-2.3, 56, 0.85, 8), '#2a2522', 2.0);
  flat(circG(2.3, 56, 0.85, 8), '#2a2522', 2.0);
  // glint: a slanted band of light clipped to the oval, rebuilt as it sweeps
  const OV = ell(16.3, 33.8, 36).map((v) => [v.x, v.y]);
  const NX = 0.94;
  const NY = -0.34; // band normal: bands run up-right
  const clip = (poly, lo, hi) => {
    let out = poly;
    for (const [sgn, lim] of [[1, hi], [-1, -lo]]) {
      const res = [];
      for (let i = 0; i < out.length; i += 1) {
        const a = out[i];
        const b = out[(i + 1) % out.length];
        const da = sgn * (a[0] * NX + a[1] * NY) - lim;
        const db = sgn * (b[0] * NX + b[1] * NY) - lim;
        if (da <= 0) res.push(a);
        if ((da <= 0) !== (db <= 0)) { const k = da / (da - db); res.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
      }
      out = res;
      if (!out.length) break;
    }
    return out;
  };
  const glintMat = new THREE.MeshBasicMaterial({ color: '#f4faf7', transparent: true, opacity: 0.6, depthWrite: false });
  const bands = [[0, 4.2], [6.2, 1.5]].map(([off, w]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(44 * 9), 3));
    const m = new THREE.Mesh(g, glintMat);
    m.position.z = 2.4;
    m.frustumCulled = false;
    mirror.add(m);
    return { g, off, w };
  });
  const setGlint = (c) => {
    for (const { g, off, w } of bands) {
      const poly = clip(OV, c + off - w / 2, c + off + w / 2);
      const pos = g.attributes.position;
      let n = 0;
      for (let i = 1; i + 1 < poly.length && n < 42; i += 1) {
        pos.setXYZ(n * 3, poly[0][0], poly[0][1], 0);
        pos.setXYZ(n * 3 + 1, poly[i][0], poly[i][1], 0);
        pos.setXYZ(n * 3 + 2, poly[i + 1][0], poly[i + 1][1], 0);
        n += 1;
      }
      pos.needsUpdate = true;
      g.setDrawRange(0, n * 3);
    }
  };
  const REST = -15;
  setGlint(REST);
  rig.parts.mirror = mirror;
  rig.anims.idle = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    const c = (t + p) % 5.6;
    // rest (upper left) → sweep off to the right → slide back in from the left
    let pos = REST;
    if (c < 1.5) pos = REST + smooth(c / 1.5) * (40 - REST);
    else if (c < 2.1) pos = -40 + smooth((c - 1.5) / 0.6) * (REST + 40);
    setGlint(pos);
    mirror.rotation.x = -0.07 + Math.sin(t * 0.7 + p) * 0.012;
  };
});

// ── tumbleweed — airy ball of dry twigs; rolls toward +x ───────────────────
defineModel('tumbleweed', (opts, rig) => {
  const r = lcg(41);
  const cols = ['#c9b182', '#a98f63', '#d8c59a', '#8a7352', '#bfa574'];
  const items = [];
  for (let i = 0; i < 14; i += 1) {
    const u = r() * 2 - 1;
    const th = r() * PI * 2;
    const R = 36 + r() * 10;
    const tube = 0.9 + r() * 0.6;
    const n = new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(th), Math.sqrt(1 - u * u) * Math.sin(th), u);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    const pts = [];
    for (let k = 0; k < 11; k += 1) {
      const a = (k / 11) * PI * 2 + i;
      const rr = R * (0.9 + r() * 0.2);
      const v = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0).applyQuaternion(q);
      pts.push([v.x, v.y, v.z]);
    }
    items.push({ pts, w: tube * 2, c: i % 5, close: true });
  }
  for (let i = 0; i < 9; i += 1) {
    const pt = () => { const u = r() * 2 - 1; const th = r() * PI * 2; const R = 42 + r() * 7; return [Math.sqrt(1 - u * u) * Math.cos(th) * R, Math.sqrt(1 - u * u) * Math.sin(th) * R, u * R]; };
    const p1 = pt();
    let p2 = pt();
    while (Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]) < 45) p2 = pt();
    items.push({ pts: [p1, p2], w: 1.8, c: (i + 2) % 5, close: false });
  }
  let lo = 1e9;
  let hi = -1e9;
  for (const it of items) for (const p of it.pts) { lo = Math.min(lo, p[1] - it.w / 2); hi = Math.max(hi, p[1] + it.w / 2); }
  const k = 100 / (hi - lo);
  const cy = (hi + lo) / 2;
  const byCol = cols.map(() => []);
  for (const it of items) {
    const P = it.pts.map((p) => [p[0] * k, (p[1] - cy) * k, p[2] * k]);
    const rad = (it.w / 2) * k;
    const n = it.close ? P.length : P.length - 1;
    for (let i = 0; i < n; i += 1) {
      byCol[it.c].push(limbGeo(P[i], P[(i + 1) % P.length], rad, rad, 4));
      byCol[it.c].push(new THREE.IcosahedronGeometry(rad * 1.05, 0).translate(...P[i]));
    }
    if (!it.close) byCol[it.c].push(new THREE.IcosahedronGeometry(rad * 1.05, 0).translate(...P[1]));
  }
  const hop = group(0, 50, 0);
  const spin = group(0, 0, 0);
  hop.add(spin);
  rig.body.add(hop);
  byCol.forEach((gs, i) => { if (gs.length) spin.add(mesh(merged(gs), cols[i], 0, 0, 0, { jitter: 0.08 })); });
  rig.parts.ball = spin;
  rig.anims.roll = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    spin.rotation.z = -(t * 3.4 + p);
    const b = Math.abs(Math.sin(t * 2.6 + p));
    hop.position.set(0, 50 + b * 9, 0);
    spin.rotation.x = Math.sin(t * 1.3 + p) * 0.12;
  };
  rig.anims.idle = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    const a = Math.sin(t * 1.1 + p) * 0.07 + Math.sin(t * 2.7 + p) * 0.015;
    spin.rotation.z = -a;
    spin.rotation.x = 0;
    hop.position.set(a * 50, 50, 0); // rocks on its contact point
  };
});

// ── emptySpotlight — a round riser, an unused microphone, a cobweb, a tag ──
defineModel('emptySpotlight', (opts, rig) => {
  rig.body.add(mesh(cyl(30, 30, 12.4, 12), '#7d6449', 0, 0, 0, { tex: 'boards' }));
  rig.body.add(mesh(cyl(30.7, 30.7, 1.6, 12), '#b8946a', 0, 12.4, 0, WOOD));
  rig.body.add(mesh(cyl(7.6, 9, 2.4, 10), '#4f5a58', 0, 14, 0, METAL));
  rig.body.add(mesh(cyl(1.3, 1.3, 70, 6), '#56625f', 0, 16, 0));
  rig.body.add(mesh(cyl(2.1, 2.1, 4, 6), '#3f4947', 0, 56, 0));
  rig.body.add(mesh(new THREE.IcosahedronGeometry(2.5, 0), '#2f3836', 0, 86, 0));
  const d = new THREE.Vector3(8.5, 9, 3).normalize();
  const at = (s, dy = 0) => [d.x * s, 86 + d.y * s + dy, d.z * s];
  rig.body.add(mesh(limbGeo(at(-3.5), at(8), 1.9, 2.5, 6), '#3c4644'));
  rig.body.add(mesh(limbGeo(at(7.4), at(8.8), 2.9, 2.9, 6), '#d6b386'));
  rig.body.add(mesh(new THREE.IcosahedronGeometry(5, 1), '#8b9592', ...at(12.5), METAL));
  // cobweb between the pole and the mic's underside
  const h = new THREE.Vector3(d.x, 0, d.z).normalize();
  const hub = [h.x * 1.3, 84.5, h.z * 1.3];
  const A = [h.x * 1.3, 59, h.z * 1.3];
  const B = at(10.5, -3.6);
  const lerp = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];
  const rel = (p) => [p[0] - hub[0], p[1] - hub[1], p[2] - hub[2]];
  const threads = [];
  const ends = [0, 1, 2, 3, 4].map((i) => lerp(A, B, i / 4));
  for (const e of ends) threads.push(limbGeo([0, 0, 0], rel(e), 0.42, 0.42, 3));
  for (const kk of [0.3, 0.53, 0.77, 1]) {
    const ring = ends.map((e, i) => rel(lerp(hub, e, kk * (i === 0 || i === 4 ? 1 : 0.9))));
    for (let i = 0; i < 4; i += 1) threads.push(limbGeo(ring[i], ring[i + 1], 0.36, 0.36, 3));
  }
  const web = group(...hub);
  web.add(new THREE.Mesh(merged(threads), ink('#f1ecde')));
  rig.body.add(web);
  // dusty paper tag on a string
  const tagPivot = group(-1.2, 58, 0.9);
  tagPivot.add(new THREE.Mesh(limbGeo([0, 0, 0], [-4.8, -4.5, 0.6], 0.25, 0.25, 3), ink('#d6cfbb')));
  const tag = group(-4.8, -4.5, 0.6);
  tag.rotation.z = -0.07;
  tag.add(mesh(cbox(6.6, 11.4, 0.6), '#f1ecdc', 0, -4.6, 0));
  tag.add(inkMesh(new THREE.CircleGeometry(0.8, 8), '#6f573f', 0, -0.9, 0.72));
  tag.add(inkMesh(new THREE.PlaneGeometry(4, 0.5), '#a5817f', 0, -4.2, 0.72));
  tag.add(inkMesh(new THREE.PlaneGeometry(3.2, 0.5), '#a5817f', -0.4, -6.6, 0.72));
  tagPivot.add(tag);
  rig.body.add(tagPivot);
  rig.parts.tag = tagPivot;
  rig.parts.web = web;
  rig.anims.idle = (t, dt, ctx) => {
    const p = ctx?.phase ?? 0;
    tagPivot.rotation.z = Math.sin(t * 1.6 + p) * 0.07 + Math.sin(t * 4.3 + p) * 0.015;
    tag.rotation.y = Math.sin(t * 1.1 + p) * 0.3;
    tag.rotation.z = -0.07 + Math.sin(t * 2.3 + p) * 0.05;
    const tr = Math.sin(t * 9 + p) * Math.max(0, Math.sin(t * 0.9 + p)); // trembles in gusts
    web.rotation.y = tr * 0.06;
    web.scale.set(1 + tr * 0.012, 1 - tr * 0.008, 1);
  };
});

// CodeCon 2026 — pack "codecon-work" (see tools/sprites-src/codecon-work for the
// drawn reference sprites): the props of the four "DIFF" slides about how AI
// changed a developer's world — the AI robot, a server rack, a laptop, the
// broken career ladder, a carpenter's bench, a queue barrier, a swarm of
// notifications, a pile of CVs and the "robot hired" sign.
import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, box, cbox, cyl, ball, cone, extrude, fold, foldPanel, beam, lathe, group, disc, plate, cheek, PI,
} from './kit.js';

const C = {
  cream: '#f1ebdc', creamDk: '#dbd3be', ivory: '#f7f3e8', sage: '#a4b1a2', sageDk: '#798877', slate: '#4b5654',
  slateLt: '#66716e', dark: '#333b3a', teal: '#6fa3a0', glow: '#8fd0c8', warm: '#ffe7a8', ochre: '#bd9662',
  sand: '#d6b386', brown: '#7b6548', brownDk: '#655239', mauve: '#a5817f', red: '#b5544d', green: '#7fae84',
  rose: '#d79c92', brass: '#c9a55c', brassDk: '#a98a48', steel: '#c6ccc5', pale: '#ead9b5', grey: '#aeb5b0',
};
const WOOD = { tex: 'wood' };
const WOOD_V = { tex: 'wood', texRotate: true }; // grain running up posts and rails
const WOOD_FINE = { tex: 'woodFine' };
const METAL = { tex: 'metal' };
const FABRIC = { tex: 'fabric' };

// ── local helpers ─────────────────────────────────────────────────────────

// Unlit mesh with a material of its own (screens, LEDs: the colour animates).
function glow(geo, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, ...opts }));
  m.position.set(x, y, z);
  return m;
}

// A w × d bar from point a to point b (any direction in space).
function strut(a, b, w, d, color, opts) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const m = mesh(cbox(w, A.distanceTo(B), d), color, 0, 0, 0, opts);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

// Rounded-rectangle outline (for extrude()).
function rr(w, h, r, cx = 0, cy = 0, seg = 3) {
  const pts = [];
  const cs = [[w / 2 - r, h / 2 - r], [-(w / 2 - r), h / 2 - r], [-(w / 2 - r), -(h / 2 - r)], [w / 2 - r, -(h / 2 - r)]];
  cs.forEach(([x, y], q) => {
    for (let k = 0; k <= seg; k += 1) {
      const a = (q + k / seg) * (PI / 2);
      pts.push([cx + x + r * Math.cos(a), cy + y + r * Math.sin(a)]);
    }
  });
  return pts;
}

// Flat +z-facing shape (decals on a sheet).
function flat(points) {
  return new THREE.ShapeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))));
}

// A coin lying in the xy plane (its faces look along ±z).
function coin(r, d, seg = 12) {
  return new THREE.CylinderGeometry(r, r, d, seg).rotateX(PI / 2);
}

function rng(seed) {
  let s = (seed * 2654435761 + 12345) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const hash = (i, k) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// ── aiRobot — friendly boxy paper robot: visor eyes, antenna bulb, mitts ───
defineModel('aiRobot', (opts, rig) => {
  // legs + feet stay on the ground, everything above bobs on them
  for (const s of [-1, 1]) {
    rig.body.add(mesh(box(12, 5, 16), s < 0 ? C.cream : C.creamDk, s * 11, 0, 1));
    rig.body.add(mesh(box(5, 17, 5), C.slate, s * 10.5, 4, 0));
  }
  const upper = group(0, 17, 0);
  rig.body.add(upper);
  const torso = fold([[-19, 0], [19, 0], [21, 33], [-21, 33]], 24, 2.5);
  upper.add(mesh(torso, C.cream));
  upper.add(mesh(foldPanel(torso, -11, 11, 9, 25, 0.5), C.sage));
  const tz = torso.userData.zAt;
  upper.add(glow(disc(3, 12), C.glow, -5, 19, tz(-2) + 1));
  for (const y of [20, 16]) upper.add(mesh(cbox(6, 2, 0.6), C.slate, 5, y, tz(2) + 0.9));
  upper.add(glow(disc(1.3, 10), C.warm, 5, 12, tz(3.7) + 1));
  upper.add(mesh(cbox(18, 14, 1.5), C.slate, 0, 17, -14.7)); // battery hatch on the back
  upper.add(mesh(cyl(5, 5, 7, 8), C.slate, 0, 32, 0)); // neck

  const head = group(0, 38, 0);
  head.rotation.order = 'YXZ';
  upper.add(head);
  const skull = fold([[-24, 0], [24, 0], [26, 4], [26, 28], [23, 32], [-23, 32], [-26, 28], [-26, 4]], 30, 3);
  head.add(mesh(skull, C.cream));
  head.add(mesh(cbox(42, 18, 4), C.slate, 0, 16, 17.3)); // visor
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = glow(extrude(rr(9, 10, 2), 0.4), C.glow, s * 10.5, 16, 19.5);
    head.add(e);
    eyes.push(e);
    const ch = cheek(2.4, C.rose);
    ch.position.set(s * 17, 3.6, skull.userData.zAt(14) + 0.45);
    head.add(ch);
    head.add(mesh(cbox(3.5, 14, 12), s < 0 ? C.sage : C.sageDk, s * 27.7, 16, 0)); // ear caps
  }
  head.add(mesh(cbox(30, 16, 1.5), C.creamDk, 0, 16, -18.4)); // back plate
  const antenna = group(0, 32, 0);
  antenna.add(mesh(box(2, 8, 2), C.slate));
  const bulbMat = new THREE.MeshLambertMaterial({ color: C.warm, emissive: '#c79a45', flatShading: true });
  const bulb = new THREE.Mesh(ball(3.8, 1), bulbMat);
  bulb.position.y = 9.4;
  antenna.add(bulb);
  head.add(antenna);

  // translucent scan fan from the visor (collapsed unless scanning)
  const fanGeo = new THREE.BufferGeometry();
  {
    const a = [[-17, -3], [17, -3], [17, 3], [-17, 3]].map(([x, y]) => [x, y, 0]);
    const b = [[-34, -17], [34, -17], [34, 13], [-34, 13]].map(([x, y]) => [x, y, 46]);
    const pos = [];
    for (let i = 0; i < 4; i += 1) {
      const j = (i + 1) % 4;
      pos.push(...a[i], ...a[j], ...b[j], ...a[i], ...b[j], ...b[i]);
    }
    fanGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  }
  const fanMat = new THREE.MeshBasicMaterial({ color: C.glow, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const fan = new THREE.Mesh(fanGeo, fanMat);
  fan.position.set(0, 16, 19.6);
  fan.rotation.x = 0.16;
  fan.scale.setScalar(0.001);
  fan.visible = false;
  head.add(fan);

  const arms = [-1, 1].map((s) => {
    const arm = group(s * 25.6, 28, 0);
    arm.add(mesh(ball(4, 1), C.slate));
    arm.add(mesh(box(7, 20, 8).translate(0, -22, 0), s < 0 ? C.cream : C.creamDk));
    arm.add(mesh(box(9, 7, 10).translate(0, -28.5, 0), s < 0 ? C.sage : C.sageDk));
    upper.add(arm);
    return arm;
  });
  const [armL, armR] = arms; // armL is on the −x side (screen left)
  rig.parts.head = head;
  rig.parts.armL = armL;
  rig.parts.armR = armR;
  rig.parts.upper = upper;

  const pose = (t, ph) => {
    head.rotation.set(0, 0, 0);
    armL.rotation.set(0, 0, -0.07 - Math.sin(t * 1.6 + ph) * 0.025);
    armR.rotation.set(0, 0, 0.07 + Math.sin(t * 1.6 + ph) * 0.025);
    upper.position.y = 17 + Math.sin(t * 1.6 + ph) * 0.8;
    fan.visible = false;
    fan.scale.setScalar(0.001);
  };
  rig.anims.idle = (t, dt, ctx) => {
    pose(t, ctx.phase);
    head.rotation.z = Math.sin(t * 0.8 + ctx.phase) * 0.03;
  };
  rig.anims.scan = (t, dt, ctx) => {
    pose(t, ctx.phase);
    head.rotation.y = Math.sin(t * 1.1 + ctx.phase) * 0.6;
    fan.visible = true;
    fan.scale.setScalar(1);
    fanMat.opacity = 0.2 + Math.sin(t * 9) * 0.035;
  };
  rig.anims.point = (t, dt, ctx) => {
    pose(t, ctx.phase);
    const nod = Math.max(0, Math.sin(t * 2.4 + ctx.phase)) ** 2;
    armL.rotation.z = -1.5 + nod * 0.07;
    head.rotation.y = -0.5;
    head.rotation.x = nod * 0.13;
  };
  rig.anims.wave = (t, dt, ctx) => {
    pose(t, ctx.phase);
    armR.rotation.z = 2.35 + Math.sin(t * 5.5 + ctx.phase) * 0.25;
    head.rotation.z = -0.07;
  };
  rig.anims.always = (t, dt, ctx) => {
    const c = (t + ctx.phase * 1.7) % 4.1;
    const k = c < 0.18 ? Math.sin((c / 0.18) * PI) : 0;
    for (const e of eyes) e.scale.y = Math.max(0.1, 1 - k);
    antenna.rotation.z = Math.sin(t * 2.1 + ctx.phase) * 0.12;
    bulbMat.emissiveIntensity = 0.8 + Math.sin(t * 3 + ctx.phase) * 0.2;
  };
});

// ── serverRack — cabinet of stacked units, vents, blinking LEDs ────────────
defineModel('serverRack', (opts, rig) => {
  const W = 46;
  const D = 42;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rig.body.add(mesh(box(6, 3, 6), '#3a4442', sx * 19, 0, sz * 17));
  rig.body.add(mesh(box(W, 93.5, D), '#5d6967', 0, 3, 0, METAL));
  rig.body.add(mesh(box(48, 4, 44), C.cream, 0, 96, 0));
  rig.body.add(mesh(cbox(38, 84, 0.6), C.dark, 0, 50, D / 2 + 0.3));
  const leds = [];
  const palette = [C.green, C.glow, C.warm, C.green, C.red, C.glow, C.green];
  for (let i = 0; i < 7; i += 1) {
    const y = 14 + 12 * i;
    const z = D / 2 + 1.2;
    rig.body.add(mesh(cbox(36, 10, 1.6), i === 3 ? '#d2cab5' : '#84917f', 0, y, z));
    for (const dy of [-1.9, 0.3, 2.5]) rig.body.add(mesh(cbox(11, 1.2, 0.5), '#39423f', -9.5, y + dy, z + 1));
    [4, 8, 12, 15.2].forEach((x, k) => {
      const on = palette[(i + k * 2) % 7];
      const led = glow(cbox(2, 2, 0.6), on, x, y, z + 1.05);
      rig.body.add(led);
      const n = i * 4 + k;
      // kinds: steady power light, busy activity light, slow heartbeat, rare alarm
      const kind = on === C.red ? 3 : k === 0 ? 0 : (n * 7) % 3 === 0 ? 2 : 1;
      leds.push({ led, on: new THREE.Color(on), off: new THREE.Color(on).multiplyScalar(0.22), kind, n });
    });
  }
  // side vents + back panel with grilles and fan rings
  for (const s of [-1, 1]) {
    for (let y = 66; y <= 86; y += 5) rig.body.add(mesh(cbox(0.6, 1.6, 26), C.dark, s * (W / 2 + 0.15), y, 0));
    for (let y = 14; y <= 34; y += 5) rig.body.add(mesh(cbox(0.6, 1.6, 26), C.dark, s * (W / 2 + 0.15), y, 0));
  }
  rig.body.add(mesh(cbox(38, 84, 0.6), '#414b49', 0, 50, -D / 2 - 0.3));
  for (let y = 62; y <= 86; y += 4) rig.body.add(mesh(cbox(28, 1.5, 0.5), C.dark, 0, y, -D / 2 - 0.8));
  for (const x of [-9, 9]) {
    rig.body.add(mesh(coin(7, 0.6, 10), C.dark, x, 34, -D / 2 - 0.85));
    rig.body.add(mesh(coin(2.4, 0.6, 8), C.slateLt, x, 34, -D / 2 - 1.4));
  }
  rig.body.add(mesh(cbox(16, 5, 0.6), C.creamDk, 0, 16, -D / 2 - 0.85));
  rig.anims.idle = () => {};
  rig.anims.always = (t, dt, ctx) => {
    const tt = t + ctx.phase * 3.1;
    for (const { led, on, off, kind, n } of leds) {
      let lit;
      if (kind === 0) lit = hash(n, Math.floor(tt * 0.5)) > 0.06;
      else if (kind === 1) lit = hash(n, Math.floor(tt * (5 + (n % 4) * 1.5))) > 0.45;
      else if (kind === 2) lit = ((tt * (0.5 + (n % 3) * 0.17) + n * 0.37) % 1) < 0.55;
      else lit = hash(n, Math.floor(tt * 1.5)) > 0.8;
      led.material.color.copy(lit ? on : off);
    }
  };
});

// ── laptop — open notebook: glowing screen with scrolling code lines ───────
defineModel('laptop', (opts, rig) => {
  const W = 145;
  rig.body.add(mesh(box(W, 4, 96), C.sage));
  rig.body.add(mesh(cbox(122, 0.8, 42), '#56615f', 0, 4.2, -15));
  const keyRow = [12, 12, 12, 12];
  keyRow.forEach((n, r) => {
    for (let k = 0; k < n; k += 1) rig.body.add(mesh(cbox(8, 0.8, 7.6), C.creamDk, -52.8 + k * 9.6, 4.95, -29.4 + r * 9.6, { jitter: 0.08 }));
  });
  rig.body.add(mesh(cbox(44, 0.5, 26), '#b4c0b2', 0, 4.2, 28));
  rig.body.add(mesh(cyl(2.2, 2.2, 112, 8).rotateZ(PI / 2).translate(56, 0, 0), C.slate, 0, 4, -46));
  const lid = group(0, 4, -46);
  lid.rotation.x = -0.21;
  rig.body.add(lid);
  lid.add(mesh(box(W, 97, 3), C.sage, 0, 0, -1.5));
  const screen = glow(plate(131, 82), '#22383a', 0, 49, 0.45);
  lid.add(screen);
  lid.add(mesh(coin(0.9, 0.5, 8), C.slate, 0, 93.5, 0.2));
  // lid back: a folded paper diamond as the maker's mark
  lid.add(mesh(cone(8, 1.6, 4).rotateX(-PI / 2), C.cream, 0, 52, -3.0));
  const rows = new THREE.Group();
  lid.add(rows);
  const spec = [
    [0, [22, C.glow], [30, C.cream]], [8, [34, C.cream], [14, C.warm]], [8, [18, C.rose], [40, C.cream]], [16, [46, C.glow]],
    [16, [24, C.cream], [20, C.warm], [16, C.cream]], [8, [30, C.sage]], [0, [16, C.rose], [26, C.cream]], [8, [52, C.cream], [12, C.glow]], [0, [20, C.warm]],
  ];
  const PITCH = 8.2;
  const Y0 = 11;
  const SPAN = spec.length * PITCH;
  const lines = spec.map(([ind, ...segs]) => {
    const g = group(-58, 0, 0.9);
    let x = ind;
    for (const [len, col] of segs) {
      g.add(glow(plate(len, 3.4).translate(len / 2, 0, 0), col, x, 0, 0));
      x += len + 4;
    }
    rows.add(g);
    return g;
  });
  rig.parts.lid = lid;
  rig.anims.type = (t, dt, ctx) => {
    rows.visible = true;
    const k = 0.5 + 0.5 * Math.sin(t * 0.9 + ctx.phase);
    screen.material.color.setRGB(0.125 + k * 0.02, 0.21 + k * 0.03, 0.22 + k * 0.03, THREE.SRGBColorSpace);
    lines.forEach((g, i) => {
      // lines scroll up; the newest one types itself out as it enters
      const u = (((spec.length - 1 - i) * PITCH + (t + ctx.phase) * 4.5) % SPAN + SPAN) % SPAN;
      g.position.y = Y0 + u;
      const edge = Math.min(1, u / 2.5, (SPAN - u) / 2.5);
      g.scale.set(Math.min(1, Math.max(0.02, (u / PITCH) * 1.3)), Math.max(0.02, edge), 1);
      g.visible = edge > 0.04;
    });
  };
  rig.anims.off = () => {
    rows.visible = false;
    screen.material.color.set('#1a2021');
  };
});

// ── careerLadder — wooden step ladder, a flag on top, one broken rung ──────
defineModel('careerLadder', (opts, rig) => {
  const TOP = 84;
  const hw = (y) => 19.5 - 7.5 * (y / TOP);
  const zf = (y) => 15 * (1 - y / TOP);
  for (const s of [-1, 1]) {
    rig.body.add(strut([s * 19.5, 0.9, 15], [s * 12, TOP, 0], 5, 3.4, C.ochre, WOOD_V));
    rig.body.add(strut([s * 19.5, 0.9, -19], [s * 12, TOP, 0], 4, 3, C.brown, WOOD_V));
    rig.body.add(mesh(box(6.4, 1.6, 6), C.slate, s * 19.6, 0, 15.2));
    rig.body.add(mesh(box(5.4, 1.6, 5.4), C.slate, s * 19.6, 0, -19.2));
    // spreader between the front and rear frame
    rig.body.add(strut([s * (hw(40) + 2.9), 40, zf(40)], [s * (hw(40) + 2.4), 40, -19 * (1 - 40 / TOP)], 1.2, 1.2, C.slate));
  }
  rig.body.add(mesh(cbox(2 * hw(18), 3, 2.4), C.brown, 0, 18, -19 * (1 - 18 / TOP), WOOD));
  rig.body.add(mesh(cbox(2 * hw(42), 3, 2.4), C.brown, 0, 42, -19 * (1 - 42 / TOP), WOOD));
  for (const y of [12, 24, 36, 48, 72]) rig.body.add(mesh(cbox(2 * hw(y) + 1, 2.6, 7.5), C.sand, 0, y, zf(y) + 0.6, WOOD_FINE));
  // the broken rung: two splintered stubs drooping from the rails
  const y = 60;
  const stub = (len) => extrude([[0, -1.3], [len - 2.6, -1.3], [len, -0.5], [len - 1.9, 0.1], [len - 0.4, 1.3], [0, 1.3]], 7.5);
  const sl = group(-hw(y), y, zf(y) + 0.6, mesh(stub(13), C.sand, 0, 0, 0, WOOD_FINE));
  sl.rotation.z = -0.36;
  const sr = group(hw(y), y, zf(y) + 0.6, mesh(stub(9.5), '#ccab7c', 0, 0, 0, WOOD_FINE));
  sr.rotation.set(0, PI, -0.3);
  rig.body.add(sl, sr);
  rig.body.add(mesh(box(31, 4, 13), C.brown, 0, TOP - 1, 0, WOOD));
  rig.body.add(mesh(box(1.6, 13, 1.6), C.slate, 0, TOP + 3, 0));
  // pennant: three hinged strips so it can flutter
  const H = [9, 6, 3, 0];
  const segs = [];
  let parent = group(0.8, TOP + 11.5, 0);
  rig.body.add(parent);
  for (let i = 0; i < 3; i += 1) {
    const g = group(i ? 7 : 0, 0, 0);
    g.add(mesh(extrude([[0, -H[i] / 2], [7, -H[i + 1] / 2], [7, H[i + 1] / 2], [0, H[i] / 2]], 0.6), i % 2 ? '#c4665e' : C.red));
    parent.add(g);
    segs.push(g);
    parent = g;
  }
  rig.parts.flag = segs;
  rig.anims.idle = (t, dt, ctx) => {
    segs.forEach((g, i) => { g.rotation.y = Math.sin(t * 4.2 + ctx.phase - i * 1.1) * (0.16 + i * 0.12); });
    sl.rotation.z = -0.36 + Math.sin(t * 1.3 + ctx.phase) * 0.025;
  };
});

// ── carpenterBench — workbench, vice, a plank being sawn, shavings ─────────
defineModel('carpenterBench', (opts, rig) => {
  const TOPY = 54;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) rig.body.add(mesh(box(9, TOPY, 9), C.brown, sx * 61, 0, sz * 18, WOOD_V));
    rig.body.add(mesh(cbox(4, 5, 28), C.brownDk, sx * 61, 16.5, 0, WOOD));
  }
  for (const sz of [-1, 1]) {
    rig.body.add(mesh(cbox(113, 5, 4), C.brownDk, 0, 16.5, sz * 18, WOOD));
    rig.body.add(mesh(cbox(114, 8, 3), '#a5814f', 0, 50, sz * 20.5, WOOD));
  }
  rig.body.add(mesh(box(118, 2.5, 34), C.sand, 0, 19, 0, { tex: 'boards' }));
  rig.body.add(mesh(box(144, 9, 50), C.ochre, 0, TOPY, 0, WOOD));
  // face vice at the front left: jaw, screw, guide rods, handle
  const vx = -49;
  rig.body.add(mesh(cbox(30, 22, 5), C.sand, vx, 49, 31, WOOD_FINE));
  rig.body.add(mesh(cyl(2.2, 2.2, 14, 8).rotateX(PI / 2), C.slate, vx, 49, 23, METAL));
  for (const s of [-1, 1]) rig.body.add(mesh(cyl(1.2, 1.2, 8, 6).rotateX(PI / 2), C.slateLt, vx + s * 10, 46, 24.5));
  rig.body.add(mesh(coin(3.6, 3, 10), C.slate, vx, 49, 35));
  const handle = group(vx, 49, 37.6);
  handle.add(mesh(cyl(1, 1, 26, 6).translate(0, -13, 0), C.slate));
  for (const s of [-1, 1]) handle.add(mesh(ball(1.8, 0), C.slate, 0, s * 13, 0));
  handle.rotation.z = 0.12;
  rig.body.add(handle);
  // the plank lies across the bench and overhangs its front edge
  rig.body.add(mesh(box(38, 5, 76), C.pale, 11, 63, 6, WOOD_FINE));
  // saw: slides along its own blade in the cut
  const saw = group(11, 68, 34);
  saw.rotation.z = 0.42;
  const slide = new THREE.Group();
  saw.add(slide);
  const teeth = [];
  for (let u = -22; u <= 34.01; u += 2) teeth.push([u, Math.round((u + 22) / 2) % 2 ? -2.6 : -3.5]);
  slide.add(mesh(extrude([...teeth, [34, 7], [-22, 1]], 0.8), C.steel));
  const hs = new THREE.Shape([[34, -5], [47, -5], [48, 9.5], [34, 9.5]].map(([x, y]) => new THREE.Vector2(x, y)));
  hs.holes.push(new THREE.Path([[37.5, -1.5], [37.5, 6], [44, 6], [43.5, -1.5]].map(([x, y]) => new THREE.Vector2(x, y))));
  slide.add(mesh(new THREE.ExtrudeGeometry(hs, { depth: 2.6, bevelEnabled: false }).translate(0, 0, -1.3), C.brown, 0, 0, 0, WOOD_FINE));
  rig.body.add(saw);
  // shavings: curled strips on the bench and the floor, sawdust under the cut
  const curl = (r, w, color, x, y, z, ry = 0) => {
    const m = mesh(new THREE.CylinderGeometry(r, r * 0.8, w, 8, 1, true, 0, PI * 1.55).rotateX(PI / 2), color, 0, 0, 0, { side: THREE.DoubleSide });
    const g = group(x, y + r, z, m);
    g.rotation.y = ry;
    rig.body.add(g);
    return g;
  };
  curl(3.2, 5, '#f3e7c8', -28, 63, 4, 0.2);
  curl(2.6, 4, '#e4d3aa', 44, 63, -8, -0.5);
  curl(2.2, 4, '#f3e7c8', 52, 63, 12, 0.9);
  curl(3.4, 5, '#f3e7c8', -16, 0, 36, 0.4);
  curl(2.8, 4, '#e4d3aa', 50, 0, 34, -0.3);
  const flutter = curl(2.6, 4.5, '#f3e7c8', 24, 68, 22, 0.3);
  const fy = flutter.position.y;
  rig.body.add(mesh(cone(9, 3.2, 7), C.sand, 12, 0, 36));
  const off = mesh(box(14, 5, 10), C.pale, 33, 0, 40, WOOD_FINE);
  off.rotation.y = 0.5;
  rig.body.add(off);
  rig.parts.saw = saw;
  rig.anims.saw = (t, dt, ctx) => {
    const p = t * 4.2 + ctx.phase;
    slide.position.x = Math.sin(p) * 6;
    saw.rotation.z = 0.42 + Math.cos(p) * 0.012;
    // the shaving hops a little on every push stroke and rocks back
    const hop = Math.max(0, Math.sin(p - 0.6)) ** 2;
    flutter.position.y = fy + hop * 1.6;
    flutter.rotation.z = Math.sin(p * 0.5) * 0.35 + hop * 0.25;
  };
  rig.anims.idle = () => {
    slide.position.x = 0;
    saw.rotation.z = 0.42;
    flutter.position.y = fy;
    flutter.rotation.z = 0;
  };
});

// ── queueRope — two brass stanchions joined by a sagging velvet rope ───────
defineModel('queueRope', (opts, rig) => {
  const X = 105;
  const HOOK = 83;
  for (const s of [-1, 1]) {
    rig.body.add(mesh(lathe([[0, 0], [13, 0], [13, 2], [9, 5], [3.4, 6.5], [0, 6.5]], 10), C.brassDk, s * X, 0, 0, METAL));
    rig.body.add(mesh(cyl(2.6, 3, 82, 8), C.brass, s * X, 6, 0, METAL));
    rig.body.add(mesh(cyl(4.2, 4.2, 3.5, 8), C.brassDk, s * X, 80, 0));
    rig.body.add(mesh(ball(5.6, 1), C.brass, s * X, 93, 0));
    rig.body.add(mesh(cyl(0.9, 1.4, 2.4, 6), C.brassDk, s * X, 97.6, 0));
    rig.body.add(mesh(ball(3, 0), C.brassDk, s * (X - 4.2), HOOK, 0)); // rope end cap
  }
  const pts = [];
  for (let i = 0; i <= 16; i += 1) {
    const x = -(X - 4.2) + (2 * (X - 4.2) * i) / 16;
    pts.push(new THREE.Vector3(x, -31 * (1 - (x / (X - 4.2)) ** 2), 0));
  }
  const rope = group(0, HOOK, 0, mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 2.5, 6, false), C.red, 0, 0, 0, FABRIC));
  rig.body.add(rope);
  rig.parts.rope = rope;
  rig.anims.idle = (t, dt, ctx) => {
    rope.rotation.x = Math.sin(t * 1.3 + ctx.phase) * 0.09 + Math.sin(t * 2.9 + ctx.phase * 2) * 0.02;
  };
});

// ── notifySwarm — paper notifications circling an empty centre ─────────────
defineModel('notifySwarm', (opts, rig) => {
  const D = 3;
  const F = D / 2;
  const chip = (pts, color) => mesh(extrude(pts, D), color);
  const dot = (r, color, x, y) => mesh(coin(r, 0.8, 10), color, x, y, F + 0.2);
  const bar = (w, h, color, x, y) => mesh(cbox(w, h, 0.8), color, x, y, F + 0.2);
  const builders = [
    () => { // chat bubble with three dots
      const g = group(0, 0, 0, chip(rr(22, 14, 3.5, 0, 2), C.cream), chip([[-7, -4.4], [-1, -4.4], [-8, -10]], C.cream));
      for (const x of [-5, 0, 5]) g.add(dot(1.5, C.slate, x, 2));
      return [g, 9.5, 9.5];
    },
    () => { // bell
      const g = group(0, 0, 0, chip([[-8, -5], [8, -5], [6, -2], [5, 5], [2.5, 9], [-2.5, 9], [-5, 5], [-6, -2]], '#cfa95e'));
      g.add(mesh(ball(2.1, 1), C.brownDk, 0, -7, 0), mesh(ball(1.7, 1), '#cfa95e', 0, 10, 0));
      return [g, 7, 8];
    },
    () => { // envelope
      const g = group(0, 0, 0, chip(rr(24, 16, 1), C.cream));
      g.add(mesh(extrude([[-12, 8], [12, 8], [0, -1]], 0.8), '#cdc4ac', 0, 0, F + 0.2));
      return [g, 11, 8];
    },
    () => { // calendar chip
      const g = group(0, 0, 0, chip(rr(20, 20, 2), C.cream), mesh(cbox(20.6, 5, D + 0.9), C.red, 0, 7.5, 0));
      for (const x of [-5, 5]) g.add(mesh(cbox(2, 4, 2), C.slate, x, 10.4, 0));
      [-5.5, 0, 5.5].forEach((x, i) => [1, -4.5].forEach((y, j) => g.add(bar(3, 3, i === 1 && j === 0 ? C.teal : '#9aa5a2', x, y))));
      return [g, 10, -9];
    },
    () => { // "@" chip
      const g = group(0, 0, 0, chip(rr(20, 20, 5), C.teal));
      g.add(mesh(new THREE.TorusGeometry(5.8, 0.85, 4, 18, PI * 1.74).rotateZ(-0.3), C.cream, 0, 0, F + 0.3));
      g.add(mesh(new THREE.TorusGeometry(2.3, 0.8, 4, 12), C.cream, -0.4, 0, F + 0.3), bar(1.5, 5.4, C.cream, 2.7, -0.2));
      g.add(mesh(beam(2.7, -2.5, 5.2, -1.9, 1.5, 0.8, 0.5), C.cream, 0, 0, F + 0.2));
      return [g, 9, 9];
    },
    () => { // second bubble with text lines
      const g = group(0, 0, 0, chip(rr(22, 14, 3.5, 0, 2), C.sage), chip([[7, -4.4], [1, -4.4], [8, -10]], C.sage));
      g.add(bar(12, 1.8, C.cream, -1, 3.9), bar(8, 1.8, C.cream, -3, -0.1));
      return [g, 9.5, 9.5];
    },
    () => { // exclamation chip
      const g = group(0, 0, 0, mesh(coin(10, D, 14), C.mauve));
      g.add(bar(3.2, 8, C.cream, 0, 2), dot(1.8, C.cream, 0, -5.5));
      return [g, 7.5, 7.5];
    },
  ];
  const icons = builders.map((b, i) => {
    const [g, bx, by] = b();
    const badge = group(bx, by, F + 0.5, mesh(coin(3.2, 1.2, 12), C.red));
    badge.scale.setScalar(0.001);
    badge.visible = false;
    g.add(badge);
    g.scale.setScalar(0.92);
    const holder = group(0, 0, 0, g);
    rig.body.add(holder);
    return { holder, g, badge, i };
  });
  rig.parts.icons = icons.map((o) => o.holder);
  const N = icons.length;
  const place = (t, ph) => {
    for (const { holder, i } of icons) {
      const a = 0.45 + (i * PI * 2) / N + t * 0.2;
      holder.position.set(
        34 * Math.cos(a) + Math.sin(t * 0.9 + i * 1.3 + ph) * 1.2,
        67.5 + 21 * Math.sin(a) + Math.sin(t * 1.3 + i * 1.9 + ph) * 1.4,
        -12 * Math.sin(a),
      );
      holder.rotation.y = -0.05 + Math.sin(t * 0.7 + i * 2.1 + ph) * 0.05;
    }
  };
  place(0, 0);
  rig.anims.buzz = (t, dt, ctx) => {
    place(t, ctx.phase);
    for (const { g, badge, i } of icons) {
      // each icon gets its turn: a pop, a shake, a red dot that lingers
      const p = (((t / 1.1 - i * 3) % N) + N) % N; // 3 is coprime with 7: turns hop around the ring
      const hit = p < 1 ? p : 0;
      g.rotation.z = p < 1 ? Math.sin(hit * PI * 6) * 0.2 * (1 - hit) : 0;
      g.scale.setScalar(0.92 * (1 + (p < 1 ? Math.sin(hit * PI) * 0.14 : 0)));
      const k = p < 0.25 ? p / 0.25 : p < 2.4 ? 1 : p < 2.8 ? 1 - (p - 2.4) / 0.4 : 0;
      badge.visible = k > 0.02;
      badge.scale.setScalar(Math.max(0.001, k * (1 + (p < 0.5 ? Math.sin(p * 2 * PI) * 0.25 : 0))));
    }
  };
  rig.anims.idle = (t, dt, ctx) => {
    place(t, ctx.phase);
    for (const { g, badge } of icons) { g.rotation.z = 0; g.scale.setScalar(0.92); badge.visible = false; }
  };
});

// ── cvStack — a leaning pile of CVs and folders, one sheet sliding off ─────
// CV pictogram (portrait 46 × 68, centred): a head-and-shoulders, text lines.
function cvFace() {
  const g = new THREE.Group();
  g.add(mesh(disc(5.5, 12), '#7c8784', -10, 19, 0));
  g.add(mesh(flat([[-18.5, 3], [-1.5, 3], [-1.5, 6], [-4.5, 10.5], [-10, 12], [-15.5, 10.5], [-18.5, 6]]), '#7c8784'));
  g.add(mesh(plate(15, 2.6), C.teal, 10.5, 23.3, 0));
  for (const [x, y, w] of [[9, 17.1, 12], [10.5, 11.6, 15], [7.5, 6.1, 9], [0, -3.9, 36], [0, -9.4, 36], [0, -14.9, 36], [-7, -20.4, 22]]) {
    g.add(mesh(plate(w, 2.2), C.grey, x, y, 0));
  }
  return g;
}

defineModel('cvStack', (opts, rig) => {
  const r = rng(11);
  const folders = [C.ochre, C.sage, '#a98684'];
  const kinds = 'fsssfssfssssfssfsssfsss';
  let y = 0;
  let k = 0;
  let nf = 0;
  let x = -8;
  let z = 0;
  for (const ch of kinds) {
    const f = ch === 'f';
    const h = f ? 4.4 : 3.4;
    if (y + h > 84.5) break;
    x = -8 + y * 0.07 + (r() - 0.5) * 3;
    z = (r() - 0.5) * 2;
    const layer = group(x, y, z);
    layer.rotation.y = (r() - 0.5) * 0.1;
    if (f) {
      const col = folders[nf % 3];
      nf += 1;
      layer.add(mesh(box(74, h - 0.3, 56), col, 0, 0, 0, { jitter: 0.07 }));
      layer.add(mesh(cbox(12, 2.4, 0.7), C.cream, 20, h / 2 - 0.1, 28.3)); // label
    } else {
      layer.add(mesh(box(70, h - 0.3, 52), k % 2 ? C.ivory : '#ebe5d4', 0, 0, 0, { jitter: 0.07 }));
    }
    rig.body.add(layer);
    y += h;
    k += 1;
  }
  // top sheet, hinged along its front edge: a draught from behind lifts it
  const top = group(x, y - 0.25, z + 26);
  top.add(mesh(box(70, 0.7, 52).translate(0, 0, -26), C.ivory));
  const tf = cvFace();
  tf.rotation.set(-PI / 2, 0, PI / 2);
  tf.position.set(0, 0.7 + 0.45, -26);
  top.add(tf);
  rig.body.add(top);
  // the sheet that slid off: leaning against the front of the pile
  const slip = group(22, 2.2, 47.5);
  slip.rotation.set(-0.232, 0, -0.09);
  slip.add(mesh(box(46, 68, 0.8), '#f4f0e4'));
  const sf = cvFace();
  sf.position.set(0, 34, 0.4 + 0.45);
  slip.add(sf);
  // paper clip over the top-left corner
  const clip = group(-14, 64.5, 0);
  clip.add(mesh(new THREE.TorusGeometry(1.9, 0.38, 4, 12).scale(1, 3.2, 1), C.slate, 0, 0, 0.9));
  clip.add(mesh(new THREE.TorusGeometry(1.1, 0.34, 4, 10).scale(1, 3.4, 1), C.slate, 0, -1.4, 0.9));
  slip.add(clip);
  rig.body.add(slip);
  rig.parts.top = top;
  rig.anims.idle = (t, dt, ctx) => {
    const g = Math.max(0, Math.sin(t * 0.9 + ctx.phase)) ** 2;
    top.rotation.x = 0.05 + g * 0.18 + Math.sin(t * 6.5 + ctx.phase) * 0.015 * g;
  };
  rig.anims.idle(0, 0, { phase: 0 });
});

// ── hiredSign — A-frame board: robot ✓, person ✗ (pictograms only) ─────────
defineModel('hiredSign', (opts, rig) => {
  const HINGE = 97;
  const L = 98;
  const PHI = Math.atan2(17, HINGE);
  const board = () => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(mesh(cbox(6, L, 3), C.brown, s * 37, -L / 2, 0, WOOD_V));
    g.add(mesh(cbox(68, 6, 3), C.brown, 0, -3, 0, WOOD));
    g.add(mesh(cbox(68, 5, 3), C.brown, 0, -83.5, 0, WOOD));
    g.add(mesh(cbox(68, 75, 1.6), '#ece6d6', 0, -43.5, 0));
    const p = group(0, -44.5, 0.8 + 0.45); // pictograms, panel centre
    g.add(p);
    p.add(mesh(plate(1.2, 60), C.sand));
    // robot head
    p.add(mesh(flat(rr(20, 18, 3, -17, 10)), C.slate));
    for (const s of [-1, 1]) {
      p.add(mesh(plate(2.5, 8), C.sageDk, -17 + s * 11.25, 10, 0));
      p.add(glow(flat(rr(4.5, 5, 1, -17 + s * 4.25, 10.5)), C.glow, 0, 0, 0.45));
    }
    p.add(mesh(plate(1.2, 5), C.slate, -17, 21.5, 0), mesh(disc(2, 10), '#e3bf6a', -17, 25.5, 0));
    // check mark
    p.add(mesh(beam(-25.5, -18, -19.5, -25, 4.2, 0.8, 1.2), C.green), mesh(beam(-19.5, -25, -8.5, -10, 4.2, 0.8, 1.2), C.green, 0, 0, 0.06));
    // person, crossed out
    p.add(mesh(disc(6.5, 14), C.ochre, 17, 12, 0));
    p.add(mesh(flat([[5, -10], [29, -10], [29, -6], [25, 0], [17, 2], [9, 0], [5, -6]]), C.ochre));
    p.add(mesh(beam(4, -16, 30, 22, 3.6, 0.8), C.red, 0, 0, 0.9), mesh(beam(4, 22, 30, -16, 3.6, 0.8), C.red, 0, 0, 1.0));
    return g;
  };
  const front = group(0, HINGE, 0, board());
  front.rotation.x = -PHI;
  const backIn = board();
  backIn.rotation.y = PI;
  const back = group(0, HINGE, 0, backIn);
  back.rotation.x = PHI;
  rig.body.add(front, back);
  rig.body.add(mesh(cbox(82, 4.5, 8), C.slate, 0, 97.7, 0));
  for (const s of [-1, 1]) rig.body.add(mesh(cbox(1, 1, 18), C.slate, s * 40.4, 45, 0));
});

import * as THREE from 'three';
import { defineModel } from './registry.js';
import {
  mesh, inkMesh, cbox, beam, group, eyes, cheek, blinker, PI,
} from './kit.js';

// Every vehicle, built on one shared kit so they read as one toy set:
// bodies are side profiles (read off the sprites, front = +x) extruded with
// a soft bevel, wheel arches cut into the profile, chamfered tyres with
// recessed hubs, inset glass with a glint, chrome / dark bumpers, lamps,
// mirrors, door seams and handles. Wheels stand on y = 0, centred in their
// arches; the body rests on them.
//
// rig.parts.wheels — groups whose local z is the axle (the catalog spins
// them by distance driven); rig.parts.wheelRadius in model units. No
// 'drive' animation here: core/traffic.js drives, steers and U-turns.
//
// This module loads LAST (see models/index.js), so these definitions
// replace the earlier per-sheet vehicle models of the same name.

const B = 1.6; // body bevel
const TYRE = '#2a2c29';
const GLASS = '#26302e';
const GLINT = '#5f6f6a';
const DARK = '#2e3330';
const CHROME = '#cfc9bb';
const HEAD = '#f6e8bd';
const TAIL = '#b4565a';
const AMBER = '#e8a64f';

const shade = (hex, dl) => `#${new THREE.Color(hex).offsetHSL(0, 0, dl).getHexString()}`;

// ── geometry helpers ───────────────────────────────────────────────────────

// Path commands: [x, y] (first = moveTo), {arc:[cx,cy,r,a0,a1,cw]},
// {ell:[cx,cy,rx,ry,a0,a1,cw]}.
function shapeFrom(cmds) {
  const s = new THREE.Shape();
  cmds.forEach((c, i) => {
    if (Array.isArray(c)) {
      if (i === 0) s.moveTo(c[0], c[1]);
      else s.lineTo(c[0], c[1]);
    } else if (c.arc) s.absarc(...c.arc);
    else if (c.ell) s.absellipse(...c.ell);
  });
  s.closePath();
  return s;
}

// Side profile extruded to `depth` (z −depth/2 … depth/2) with a soft bevel.
function extrudeGeo(cmds, depth, bevel = B, seg = 12) {
  const g = new THREE.ExtrudeGeometry(shapeFrom(cmds), {
    depth: depth - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: seg,
  });
  return g.translate(0, 0, -(depth - 2 * bevel) / 2);
}

// Thin flat plate of a profile (decals, glass), t thick, centred in z.
function flat(cmds, t) {
  return new THREE.ExtrudeGeometry(shapeFrom(cmds), { depth: t, bevelEnabled: false, curveSegments: 8 })
    .translate(0, 0, -t / 2);
}

function rrect(x0, y0, x1, y1, r) {
  const R = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  return [
    [x0 + R, y0], [x1 - R, y0], { arc: [x1 - R, y0 + R, R, -PI / 2, 0, false] },
    [x1, y1 - R], { arc: [x1 - R, y1 - R, R, 0, PI / 2, false] },
    [x0 + R, y1], { arc: [x0 + R, y1 - R, R, PI / 2, PI, false] },
    [x0, y0 + R], { arc: [x0 + R, y0 + R, R, PI, 1.5 * PI, false] },
  ];
}

// An arch cut into a profile's bottom edge (cmd for shapeFrom).
const arch = (x, yb, r) => ({ arc: [x, yb, r, PI, 0, true] });

// The same geometry on both sides of a body whose side surfaces are at
// z = ±zs, `off` proud of the surface, t thick.
function onSides(parent, geo, color, zs, off, t, sides = [1, -1], x = 0, y = 0, unlit = false) {
  const out = [];
  for (const s of sides) {
    const m = unlit ? inkMesh(geo, color) : mesh(geo, color);
    m.position.set(x, y, s * (zs + off + t / 2));
    parent.add(m);
    out.push(m);
  }
  return out;
}

// A side window: pale frame, inset dark glass and a diagonal glint.
function windowRect(parent, x0, y0, x1, y1, zs, { sides = [1, -1], r = 3, frame = null } = {}) {
  if (frame) onSides(parent, flat(rrect(x0 - 1.4, y0 - 1.4, x1 + 1.4, y1 + 1.4, r + 1.2), 0.35), frame, zs, 0.05, 0.35, sides);
  onSides(parent, flat(rrect(x0, y0, x1, y1, r), 0.4), GLASS, zs, 0.45, 0.4, sides);
  if (x1 - x0 > 9) {
    const w = x1 - x0;
    const h = y1 - y0;
    onSides(parent, beam(x0 + w * 0.22, y0 + h * 0.2, x0 + w * 0.48, y1 - h * 0.14, Math.min(2, w * 0.1), 0.2), GLINT, zs, 0.9, 0.2, sides);
  }
}

function windowPoly(parent, pts, zs, sides = [1, -1]) {
  onSides(parent, flat(pts, 0.4), GLASS, zs, 0.45, 0.4, sides);
}

// A plate lying on a body face given by the segment (x1,y1)→(x2,y2) of the
// profile (windscreens, grilles): spans zw in z, pushed out past the bevel.
function slab(parent, x1, y1, x2, y2, zw, color, cx, cy, out = B + 0.4, t = 0.45) {
  const g = beam(x1, y1, x2, y2, t, zw);
  let nx = -(y2 - y1);
  let ny = x2 - x1;
  const L = Math.hypot(nx, ny);
  nx /= L; ny /= L;
  if (nx * ((x1 + x2) / 2 - cx) + ny * ((y1 + y2) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
  const m = mesh(g, color);
  m.position.set(nx * (out + t / 2), ny * (out + t / 2), 0);
  parent.add(m);
  return m;
}

// A curved strip lying on an elliptic body edge (curved windscreens).
function shell(parent, cx, cy, a, b, t0, t1, zw, color, off = B + 0.4, t = 0.45, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const th = t0 + ((t1 - t0) * i) / n;
    pts.push([cx + (a + off + t) * Math.cos(th), cy + (b + off + t) * Math.sin(th)]);
  }
  for (let i = n; i >= 0; i -= 1) {
    const th = t0 + ((t1 - t0) * i) / n;
    pts.push([cx + (a + off) * Math.cos(th), cy + (b + off) * Math.sin(th)]);
  }
  const m = mesh(flat(pts, zw), color);
  parent.add(m);
  return m;
}

// Lamp on a face pointing along ±x (dir) — dark ring + unlit lens.
function lamp(parent, x, y, z, r, color, dir = 1, rim = '#3d423f') {
  const g = group(x, y, z);
  g.add(mesh(new THREE.CylinderGeometry(r + 1.1, r + 1.1, 1.6, 14).rotateZ(PI / 2), rim));
  g.add(inkMesh(new THREE.CylinderGeometry(r, r, 2.4, 14).rotateZ(PI / 2), color, dir * 0.5, 0, 0));
  parent.add(g);
  return g;
}

// Round decal facing ±z on a side (markers, hub caps).
function sideDisc(parent, x, y, zs, r, color, t = 0.6, sides = [1, -1], unlit = false) {
  return onSides(parent, new THREE.CylinderGeometry(r, r, t, 16).rotateX(PI / 2), color, zs, 0.05, t, sides, x, y, unlit);
}

function mirrors(parent, x, y, zs, color = '#3a3f3d', reach = 5) {
  for (const s of [1, -1]) {
    parent.add(mesh(cbox(1.4, 1.4, reach), color, x, y, s * (zs + reach / 2 - 0.4)));
    parent.add(mesh(cbox(2.6, 6, 4.4), color, x + 0.6, y + 2.4, s * (zs + reach + 1.6)));
    parent.add(inkMesh(cbox(0.4, 4.8, 3.2), '#55625e', x - 0.9, y + 2.4, s * (zs + reach + 1.6)));
  }
}

function seam(parent, x, y0, y1, zs, color, sides = [1, -1]) {
  onSides(parent, cbox(0.7, y1 - y0, 0.35), color, zs, 0.05, 0.35, sides, x, (y0 + y1) / 2);
}

function handle(parent, x, y, zs, sides = [1, -1]) {
  onSides(parent, cbox(5, 1.4, 0.9), '#3c4240', zs, 0.05, 0.9, sides, x, y);
}

// Cylinder between two 3D points.
function rod(parent, a, b, r, color, seg = 8) {
  const A = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(A);
  const L = d.length();
  const m = mesh(new THREE.CylinderGeometry(r, r, L, seg), color);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  parent.add(m);
  return m;
}

// ── wheels ─────────────────────────────────────────────────────────────────

// Chamfered tyre (axis z, pivot at the centre), recessed hub, cap and lugs.
function wheel(r, w, { hub = '#d8cfbb', tyre = TYRE, cap = null, ch = 0.2, lugs = 5 } = {}) {
  const g = new THREE.Group();
  const c = Math.min(w * ch, r * 0.3);
  const prof = [[r * 0.6, -w / 2], [r - c, -w / 2], [r, -w / 2 + c], [r, w / 2 - c], [r - c, w / 2], [r * 0.6, w / 2]];
  const lg = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 16).rotateX(PI / 2);
  g.add(mesh(lg, tyre, 0, 0, 0, { side: THREE.DoubleSide }));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.64, r * 0.64, w - 1.6, 16).rotateX(PI / 2), hub));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.24, r * 0.24, w - 0.5, 10).rotateX(PI / 2), cap ?? shade(hub, -0.12)));
  for (const s of [1, -1]) {
    for (let i = 0; i < lugs; i += 1) {
      const a = (i / lugs) * PI * 2;
      g.add(mesh(new THREE.CylinderGeometry(r * 0.065, r * 0.065, 1, 6).rotateX(PI / 2), shade(hub, -0.22),
        Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, s * (w / 2 - 0.6)));
    }
  }
  return g;
}

function addWheels(rig, list, radius) {
  rig.parts.wheels = rig.parts.wheels ?? [];
  for (const [x, y, z, r, w, o] of list) {
    const wg = wheel(r, w, o);
    wg.position.set(x, y, z);
    rig.body.add(wg);
    rig.parts.wheels.push(wg);
  }
  rig.parts.wheelRadius = radius;
}

// Pairs of wheels on both sides.
const pairs = (xs, r, z, w, o) => xs.flatMap((x) => [[x, r, z, r, w, o], [x, r, -z, r, w, o]]);

function steeringWheel(parent, x, y, z, r, tilt) {
  const g = group(x, y, z);
  g.add(mesh(new THREE.TorusGeometry(r, r * 0.17, 6, 16).rotateY(PI / 2), DARK));
  g.add(mesh(cbox(0.8, r * 2, 0.8), DARK));
  g.rotation.z = tilt;
  parent.add(g);
  return g;
}

// ── drivers ────────────────────────────────────────────────────────────────
// A cute big-headed figure facing its local +z; mounted with rotation.y =
// PI/2 so it faces the vehicle's +x. Origin = hips.

function figure({
  skin = '#f0c3a6', top = '#3d4a62', pants = '#323a4c', hat = '#e2b54d', hair = '#2c2724',
  vest = false, bear = false, fur = '#9a7457', muzzle = '#e1a798', seated = true, legLen = 10, seed = 0,
} = {}) {
  const root = new THREE.Group();
  const body = bear ? fur : top;
  root.add(mesh(new THREE.SphereGeometry(1, 12, 8).scale(7.5, 5, 6.5), bear ? fur : pants, 0, 1, 0));
  root.add(mesh(new THREE.SphereGeometry(1, 14, 10).scale(bear ? 9.5 : 8.5, 11, bear ? 8 : 7), body, 0, 10, 0));
  if (vest) {
    root.add(mesh(new THREE.SphereGeometry(1, 14, 10).scale(8.9, 8.2, 7.4), '#d6d36a', 0, 9, 0));
    root.add(mesh(new THREE.CylinderGeometry(9.1, 9.1, 1.6, 16).scale(1, 1, 0.84), '#eeeadb', 0, 7, 0));
  }
  const R = bear ? 11.5 : 9;
  const head = group(0, bear ? 25 : 23, 0);
  root.add(head);
  head.add(mesh(new THREE.SphereGeometry(R, 18, 12), bear ? fur : skin));
  if (bear) {
    for (const s of [-1, 1]) {
      head.add(mesh(new THREE.SphereGeometry(4.2, 10, 8), fur, s * 8.4, 7.8, -1));
      head.add(mesh(new THREE.SphereGeometry(2.4, 8, 6).scale(1, 1, 0.5), '#6e5040', s * 8.6, 8.0, 2.6));
    }
    head.add(mesh(new THREE.SphereGeometry(1, 12, 8).scale(5.4, 4.2, 3.6), muzzle, 0, -3.6, R - 1.6));
    head.add(inkMesh(new THREE.SphereGeometry(1, 10, 6).scale(2.1, 1.5, 1.2), '#2a2220', 0, -2.0, R + 1.7));
  } else {
    head.add(mesh(new THREE.SphereGeometry(R + 0.4, 16, 10), hair, 0, 0.7, -1.7));
    for (const s of [-1, 1]) head.add(mesh(new THREE.SphereGeometry(2, 8, 6), skin, s * 8.8, -0.6, 0));
    head.add(mesh(new THREE.SphereGeometry(1.2, 8, 6), shade(skin, -0.05), 0, -1.6, R - 0.1));
    if (hat) {
      head.add(mesh(new THREE.SphereGeometry(R + 1.3, 16, 8, 0, PI * 2, 0, PI / 2), hat, 0, 1.6, 0));
      head.add(mesh(new THREE.CylinderGeometry(R + 2.6, R + 2.6, 1.1, 18), shade(hat, -0.05), 0, 1.6, 1.2));
    }
  }
  const dx = bear ? 4.4 : 3.2;
  const ey = bear ? 1.6 : -0.3;
  const e = eyes(dx, bear ? 1.4 : 1.15);
  e.group.position.set(0, ey, Math.sqrt(R * R - dx * dx - ey * ey) - 0.2);
  head.add(e.group);
  for (const s of [-1, 1]) {
    const cx = bear ? 6.8 : 5.2;
    const cy = bear ? -2.4 : -2.6;
    const c = cheek(bear ? 2.6 : 2.0, '#e5968f');
    c.position.set(s * cx, cy, Math.sqrt(R * R - cx * cx - cy * cy) + 0.3);
    c.rotation.y = s * Math.asin(cx / R) * 0.9;
    head.add(c);
  }
  const arms = [-1, 1].map((s) => {
    const a = group(s * (bear ? 9.6 : 8.6), 17, 0);
    a.add(mesh(new THREE.CylinderGeometry(2.6, 2.2, 13.5, 8).translate(0, -6.75, 0), body));
    a.add(mesh(new THREE.SphereGeometry(2.6, 10, 8), bear ? fur : skin, 0, -13.8, 0));
    root.add(a);
    return a;
  });
  for (const s of [-1, 1]) {
    const thigh = group(s * 4, 0, 0);
    root.add(thigh);
    if (seated) {
      thigh.add(mesh(cbox(5.6, 5.6, 13).translate(0, 0, 6.5), bear ? fur : pants));
      const knee = group(0, 0, 13);
      thigh.add(knee);
      knee.add(mesh(cbox(5, legLen, 5).translate(0, -legLen / 2, 0), bear ? fur : pants));
      knee.add(mesh(cbox(5.8, 3, 8).translate(0, -legLen, 1.5), bear ? shade(fur, -0.15) : '#2b2622'));
    } else {
      thigh.add(mesh(cbox(5.4, legLen, 5.4).translate(0, -legLen / 2, 0), pants));
      thigh.add(mesh(cbox(5.8, 3, 8).translate(0, -legLen, 1.2), '#2b2622'));
    }
  }
  return { root, head, arms, eyes: e, blink: blinker(seed) };
}

// Point an arm (hanging along its local −y) so its hand lands on t
// (figure-local coordinates), stretching it slightly if needed.
function reach(arm, t) {
  const v = new THREE.Vector3(t[0] - arm.position.x, t[1] - arm.position.y, t[2] - arm.position.z);
  const L = v.length();
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), v.normalize());
  arm.scale.set(1, L / 13.8, 1);
}

// Vehicle coordinates → figure-local for a figure facing +x at root (rx,ry,rz).
const toFig = (f, x, y, z) => {
  const k = f.root.scale.x;
  return [-(z - f.root.position.z) / k, (y - f.root.position.y) / k, (x - f.root.position.x) / k];
};

function seat(parent, f, x, y, z) {
  f.root.position.set(x, y, z);
  f.root.rotation.y = PI / 2;
  parent.add(f.root);
}

// Head mostly turned toward the camera (+z), glancing ahead now and then.
function driverLife(f, t, phase = 0) {
  f.eyes.blink(f.blink(t));
  const look = Math.sin(t * 0.45 + phase);
  f.head.rotation.y = -0.95 + Math.max(0, look) * 0.85;
  f.head.rotation.x = Math.sin(t * 1.3 + phase) * 0.04;
}

// Blinking amber beacon: own material so it can flash.
function beacon(parent, x, y, z, r = 3.4) {
  const m = new THREE.MeshBasicMaterial({ color: AMBER });
  parent.add(mesh(new THREE.CylinderGeometry(r + 1, r + 1.4, 1.6, 10), '#3a3d39', x, y + 0.8, z));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8, 0, PI * 2, 0, PI / 2), m);
  dome.position.set(x, y + 1.6, z);
  parent.add(dome);
  return (t) => { m.color.set(Math.floor(t * 2.4) % 2 ? '#f6c14e' : '#9a6a27'); };
}

// ══ cars ═══════════════════════════════════════════════════════════════════

// carSage / carSage2 — vintage coupé: long rounded hood, short cab set back.
function sageCar(name, C) {
  defineModel(name, (opts, rig) => {
    const b = rig.body;
    const D = 80;
    const r = 18.5;
    const yb = 19;
    const aR = r * 1.12 + B;
    const xr = -52;
    const xf = 51;
    b.add(mesh(extrudeGeo([
      [-75, yb], arch(xr, yb, aR), arch(xf, yb, aR), [75, yb],
      { arc: [75, yb + 10, 10, -PI / 2, 0, false] }, [85, 46], { arc: [61, 46, 24, 0, PI / 2, false] },
      [-61, 70], { arc: [-61, 46, 24, PI / 2, PI, false] }, [-85, yb + 10], { arc: [-75, yb + 10, 10, PI, 1.5 * PI, false] },
    ], D), C.body));
    const cabD = 68;
    b.add(mesh(extrudeGeo([[-57, 66], [7, 66], [-8, 100], [-45, 100], { arc: [-45, 88, 12, PI / 2, PI, false] }], cabD, 1.5), C.cab));
    windowRect(b, -52, 74, -33, 93, cabD / 2, { r: 4, frame: C.trim });
    windowPoly(b, [[-28, 74], [-0.6, 74], [-5.8, 93], [-28, 93]], cabD / 2);
    slab(b, 3.9, 73, -5.8, 95, cabD - 12, GLASS, -25, 80, 1.9);
    slab(b, -57, 72, -57, 86, cabD - 14, GLASS, -25, 80, 1.9);
    mirrors(b, 2, 74, cabD / 2);
    // doors, handles, side marker (the oval lamp on the sprite)
    seam(b, -30, 24, 68, D / 2, shade(C.body, -0.12));
    seam(b, 10, 24, 68, D / 2, shade(C.body, -0.12));
    handle(b, -22, 61, D / 2);
    onSides(b, flat(rrect(66, 47, 76, 57, 5), 0.5), '#efdcab', D / 2, 0.05, 0.5);
    // front and back
    lamp(b, 85 + B, 40, 26, 5.5, HEAD);
    lamp(b, 85 + B, 40, -26, 5.5, HEAD);
    b.add(mesh(cbox(1.2, 10, 22), DARK, 87, 35, 0));
    for (const z of [-7, 0, 7]) b.add(mesh(cbox(1.4, 9, 1.2), shade(C.body, 0.08), 87.4, 35, z));
    b.add(mesh(cbox(10, 7, D - 4), CHROME, 88, 22.5, 0));
    b.add(mesh(cbox(10, 7, D - 4), CHROME, -88, 22.5, 0));
    for (const z of [-28, 28]) b.add(mesh(cbox(1.2, 7, 9), TAIL, -87, 42, z));
    b.add(mesh(cbox(4, 3, 6), DARK, -86, 17, 22)); // exhaust
    b.add(mesh(cbox(59, 7, 50), DARK, -0.5, 15.5, 0)); // chassis between the wheels
    addWheels(rig, pairs([xr, xf], r, 30, 14, { hub: '#c8cfc9' }), r);
  });
}
sageCar('carSage', { body: '#9fb2a3', cab: '#adbfb0', trim: '#d9ddd2' });
sageCar('carSage2', { body: '#93a697', cab: '#a3b5a6', trim: '#d4d9cc' });

// carMint / carMint2 — round beetle: domed cabin, two arched side windows.
function beetle(name, L, C) {
  defineModel(name, (opts, rig) => {
    const b = rig.body;
    const D = 78;
    const r = 16.5;
    const yb = 17;
    const aR = r * 1.12 + B;
    const xw = L * 0.52;
    b.add(mesh(extrudeGeo([
      [-L + 8, yb], arch(-xw, yb, aR), arch(xw, yb, aR), [L - 8, yb],
      { arc: [L - 8, yb + 8, 8, -PI / 2, 0, false] }, [L, 42], { arc: [L - 12, 42, 12, 0, PI / 2, false] },
      [26, 63], [-30, 63], [-L + 16, 58], { arc: [-L + 16, 42, 16, PI / 2, PI, false] },
      [-L, yb + 8], { arc: [-L + 8, yb + 8, 8, PI, 1.5 * PI, false] },
    ], D), C.body));
    const domeD = 64;
    const cx = -4;
    const cy = 60;
    const a = 32;
    const bb = 37;
    b.add(mesh(extrudeGeo([[cx + a, cy], { ell: [cx, cy, a, bb, 0, PI, false] }], domeD, 1.5, 16), C.dome));
    // arched side windows follow the dome, inset 4.5
    const win = (xa, xc) => {
      const pts = [[xa, 65], [xc, 65]];
      for (let i = 0; i <= 8; i += 1) {
        const x = xc + ((xa - xc) * i) / 8;
        const k = Math.max(0, 1 - ((x - cx) / (a - 4.5)) ** 2);
        pts.push([x, Math.max(65.5, cy + (bb - 4.5) * Math.sqrt(k))]);
      }
      return pts;
    };
    windowPoly(b, win(-29, -6.5), domeD / 2);
    windowPoly(b, win(-1.5, 22), domeD / 2);
    shell(b, cx, cy, a, bb, 0.14, 1.02, domeD - 14, GLASS, 1.5 + 0.35);
    shell(b, cx, cy, a, bb, 2.15, 2.95, domeD - 16, GLASS, 1.5 + 0.35);
    mirrors(b, 21, 66, domeD / 2 + 2);
    seam(b, -4, 22, 62, D / 2, shade(C.body, -0.12));
    handle(b, -13, 56, D / 2);
    handle(b, 6, 56, D / 2);
    lamp(b, L + B, 34, 25, 5.5, HEAD);
    lamp(b, L + B, 34, -25, 5.5, HEAD);
    for (const z of [-25, 25]) b.add(mesh(cbox(1.2, 6, 8), TAIL, -L - B - 0.3, 40, z));
    b.add(mesh(cbox(12, 7, D - 2), C.bumper, L + 2, 27, 0));
    b.add(mesh(cbox(12, 7, D - 2), C.bumper, -L - 2, 27, 0));
    b.add(mesh(cbox(Math.max(8, 2 * (xw - aR) - 4), 6, 44), DARK, 0, 13, 0));
    addWheels(rig, pairs([-xw, xw], r, 29.5, 13, { hub: '#efe8da', cap: '#c9c2b4' }), r);
  });
}
beetle('carMint', 66, { body: '#a9bcb0', dome: '#b3c5b9', bumper: '#b9ada3' });
beetle('carMint2', 72, { body: '#a2b6a9', dome: '#aec0b3', bumper: '#b3a79d' });

// ══ buses ═════════════════════════════════════════════════════════════════

// busCream — city bus: cream upper, sage lower, short engine nose, sliding door.
defineModel('busCream', (opts, rig) => {
  const b = rig.body;
  const D = 76;
  const zs = D / 2;
  const r = 14.5;
  const yb = 17;
  const aR = r * 1.12 + B;
  const xr = -45;
  const xf = 52;
  const sage = '#9db1a1';
  const cream = '#ebe2cc';
  b.add(mesh(extrudeGeo([
    [-90, yb], arch(xr, yb, aR), arch(xf, yb, aR), [86, yb], { arc: [86, yb + 6, 6, -PI / 2, 0, false] },
    [92, 44], { arc: [86, 44, 6, 0, PI / 2, false] }, [73, 50], [73, 44.4], [-96, 44.4], [-96, yb + 6],
    { arc: [-90, yb + 6, 6, PI, 1.5 * PI, false] },
  ], D), sage));
  b.add(mesh(extrudeGeo([
    [-96, 47.6], [73, 47.6], [73, 82], { arc: [55, 82, 18, 0, PI / 2, false] }, [-82, 100],
    { arc: [-82, 86, 14, PI / 2, PI, false] },
  ], D), cream));
  for (const [x0, x1] of [[-90, -66], [-60, -36], [-30, -6], [31, 64]]) windowRect(b, x0, 62, x1, 82, zs, { frame: '#d8ceb6' });
  windowRect(b, 3, 62, 24, 82, zs, { sides: [-1], frame: '#d8ceb6' });
  // rub strip (skips the doorway on the kerb side)
  onSides(b, cbox(90, 1.6, 0.4), '#56665b', zs, 0.05, 0.4, [1], -45, 30);
  onSides(b, cbox(59, 1.6, 0.4), '#56665b', zs, 0.05, 0.4, [1], 56.5, 30);
  onSides(b, cbox(176, 1.6, 0.4), '#56665b', zs, 0.05, 0.4, [-1], -4, 30);
  // sliding door (kerb side = +z)
  onSides(b, flat(rrect(2, 20, 25, 86, 3), 0.3), '#232a28', zs, 0.05, 0.3, [1]);
  const door = group(0, 0, 0);
  b.add(door);
  onSides(door, flat(rrect(2, 20, 25, 86, 3), 0.6), '#869b8b', zs, 1.3, 0.6, [1]);
  onSides(door, flat(rrect(4, 52, 12, 82, 2), 0.3), GLASS, zs, 1.9, 0.3, [1]);
  onSides(door, flat(rrect(15, 52, 23, 82, 2), 0.3), GLASS, zs, 1.9, 0.3, [1]);
  onSides(door, cbox(0.7, 64, 0.3), '#5f7466', zs, 1.9, 0.3, [1], 13.5, 53);
  // front
  slab(b, 73, 55, 73, 80, D - 14, GLASS, 0, 70);
  shell(b, 55, 82, 18, 18, 0.05, 1.2, D - 14, GLASS);
  slab(b, -96, 60, -96, 82, D - 16, GLASS, 0, 70);
  lamp(b, 92 + B, 34, 24, 5, HEAD);
  lamp(b, 92 + B, 34, -24, 5, HEAD);
  b.add(mesh(cbox(1.2, 10, 24), DARK, 93.9, 31, 0));
  b.add(mesh(cbox(10, 6, D - 4), '#2c3330', 93, 19, 0));
  b.add(mesh(cbox(10, 6, D - 4), '#2c3330', -97, 19, 0));
  for (const z of [-28, 28]) b.add(mesh(cbox(1.2, 8, 7), TAIL, -97.8, 40, z));
  mirrors(b, 76, 78, zs, '#3a3f3d', 6);
  b.add(mesh(cbox(18, 3, 26), '#d9cfb6', -30, 101.5, 0)); // roof hatch
  b.add(mesh(cbox(60, 6, 40), DARK, 3.5, 14, 0));
  addWheels(rig, pairs([xr, xf], r, 28, 14, { hub: '#8f9893', cap: '#5d6662' }), r);
  rig.anims.always = (t) => {
    const c = t % 11;
    const k = c < 0.8 ? c / 0.8 : c < 3 ? 1 : c < 3.8 ? 1 - (c - 3) / 0.8 : 0;
    door.position.x = -21 * k * k * (3 - 2 * k);
  };
});

// busGray — rounded coach: two-tone grey, belt line, big curved windscreen.
defineModel('busGray', (opts, rig) => {
  const b = rig.body;
  const D = 74;
  const zs = D / 2;
  const r = 17;
  const yb = 18;
  const aR = r * 1.12 + B;
  b.add(mesh(extrudeGeo([
    [-73, yb], arch(-37, yb, aR), arch(40, yb, aR), [73, yb], { arc: [73, yb + 6, 6, -PI / 2, 0, false] },
    [79, 44.4], [-79, 44.4], [-79, yb + 6], { arc: [-73, yb + 6, 6, PI, 1.5 * PI, false] },
  ], D), '#8d939a'));
  b.add(mesh(extrudeGeo([
    [-79, 47.6], [79, 47.6], [79, 75], { arc: [57, 75, 22, 0, PI / 2, false] }, [-69, 97],
    { arc: [-69, 87, 10, PI / 2, PI, false] },
  ], D), '#a9adb3'));
  onSides(b, cbox(150, 4, 0.4), '#7f858c', zs, 0.05, 0.4, [1, -1], -2, 52);
  for (const [x0, x1] of [[-72.6, -50.4], [-46, -23.8], [-17.5, 3.2], [9.5, 31.8], [38, 56]]) windowRect(b, x0, 62, x1, 88, zs, { frame: '#c9ccd0' });
  slab(b, 79, 52, 79, 75, D - 14, GLASS, 0, 60);
  shell(b, 57, 75, 22, 22, 0, 1.25, D - 14, GLASS);
  slab(b, -79, 60, -79, 86, D - 16, GLASS, 0, 60);
  lamp(b, 79 + B, 32, 24, 5, HEAD);
  lamp(b, 79 + B, 32, -24, 5, HEAD);
  for (const z of [-30, 30]) b.add(mesh(cbox(1.2, 3, 4), AMBER, 80.9, 40, z));
  b.add(mesh(cbox(1.2, 8, 26), DARK, 80.9, 30, 0));
  b.add(mesh(cbox(9, 7, D - 2), '#2f3d36', 80, 21.5, 0));
  b.add(mesh(cbox(9, 7, D - 2), '#2f3d36', -80, 21.5, 0));
  for (const z of [-28, 28]) b.add(mesh(cbox(1.2, 8, 7), TAIL, -80.9, 36, z));
  for (const z of [-28, 28]) b.add(mesh(cbox(130, 2, 6), '#d2d5d8', -5, 98.4, z)); // roof rails
  mirrors(b, 81, 74, zs, '#3a3f3d', 6);
  b.add(mesh(cbox(30, 7, 40), DARK, 1.5, 14, 0));
  addWheels(rig, pairs([-37, 40], r, 26.5, 15, { hub: '#d5d7d9', cap: '#9aa0a5' }), r);
});

// schoolBus — yellow, long hood, black rub rails, door + stop arm.
defineModel('schoolBus', (opts, rig) => {
  const b = rig.body;
  const D = 80;
  const zs = D / 2;
  const r = 16;
  const yb = 18;
  const aR = r * 1.12 + B;
  const yel = '#e1c07c';
  b.add(mesh(extrudeGeo([
    [-107.5, yb], arch(-60.5, yb, aR), arch(67, yb, aR), [105, yb], { arc: [105, yb + 6, 6, -PI / 2, 0, false] },
    [111, 48], { arc: [103, 48, 8, 0, PI / 2, false] }, [86, 56], [80.5, 96], { arc: [76.5, 96, 4, 0, PI / 2, false] },
    [-101.5, 100], { arc: [-101.5, 88, 12, PI / 2, PI, false] }, [-113.5, yb + 6],
    { arc: [-107.5, yb + 6, 6, PI, 1.5 * PI, false] },
  ], D), yel));
  b.add(mesh(cbox(178, 2.4, D - 14), '#ecd69f', -12, 101.2, 0));
  for (const [x0, x1] of [[22, 44], [-11, 11], [-44, -22], [-77, -55], [-99, -81]]) windowRect(b, x0, 62, x1, 84, zs, { frame: '#f0dcae' });
  windowPoly(b, [[66, 62], [81, 62], [78, 84], [66, 84]], zs);
  windowRect(b, 48, 62, 63, 84, zs, { sides: [-1], frame: '#f0dcae' });
  // black rub rails (skip the doorway on the kerb side)
  for (const y of [41, 53]) {
    onSides(b, cbox(156, 1.6, 0.4), '#2b2d2a', zs, 0.05, 0.4, [1], -32, y);
    onSides(b, cbox(36, 1.6, 0.4), '#2b2d2a', zs, 0.05, 0.4, [1], 84, y);
    onSides(b, cbox(212, 1.6, 0.4), '#2b2d2a', zs, 0.05, 0.4, [-1], -3, y);
  }
  // door (kerb side)
  onSides(b, flat(rrect(47, 22, 64, 88, 2), 0.3), '#232a28', zs, 0.05, 0.3, [1]);
  const door = group(0, 0, 0);
  b.add(door);
  onSides(door, flat(rrect(47, 22, 64, 88, 2), 0.6), '#d4b26e', zs, 1.3, 0.6, [1]);
  onSides(door, flat(rrect(49, 50, 62, 85, 2), 0.3), GLASS, zs, 1.9, 0.3, [1]);
  onSides(door, flat(rrect(49, 25, 62, 46, 2), 0.3), GLASS, zs, 1.9, 0.3, [1]);
  // stop arm (driver side, −z), hinged at the body
  const arm = group(40, 66, -(zs + 0.4));
  b.add(arm);
  arm.add(mesh(cbox(5, 2, 1.2), DARK, -2, 0, -0.6));
  arm.add(mesh(new THREE.CylinderGeometry(7.8, 7.8, 0.8, 8).rotateX(PI / 2), '#f2efe6', -10, 0, -0.6));
  arm.add(mesh(new THREE.CylinderGeometry(7, 7, 1.2, 8).rotateX(PI / 2), '#b9514c', -10, 0, -1.4));
  // front & back
  slab(b, 85.45, 60, 81.05, 92, D - 16, GLASS, 0, 60);
  b.add(mesh(cbox(1.2, 16, 30), DARK, 112.9, 34, 0));
  for (const z of [-10, -5, 0, 5, 10]) b.add(mesh(cbox(1.4, 15, 1), '#c9ab69', 113.1, 34, z));
  lamp(b, 111 + B, 42, 27, 5, HEAD);
  lamp(b, 111 + B, 42, -27, 5, HEAD);
  b.add(mesh(cbox(9, 7, D - 2), '#2b2d2a', 113, 21, 0));
  b.add(mesh(cbox(9, 7, D - 2), '#2b2d2a', -115, 21, 0));
  for (const z of [-30, 30]) b.add(mesh(cbox(1.2, 8, 7), TAIL, -115.4, 60, z));
  slab(b, -113.5, 62, -113.5, 84, D - 34, GLASS, 0, 60);
  for (const [x, z] of [[70, 26], [70, -26], [-95, 26], [-95, -26]]) b.add(mesh(cbox(5, 2.5, 5), AMBER, x, 103, z));
  mirrors(b, 100, 68, zs, '#2b2d2a', 8);
  b.add(mesh(cbox(84, 7, 44), DARK, 3, 14.5, 0));
  addWheels(rig, pairs([-60.5, 67], r, 29.5, 15, { hub: '#596360', cap: '#3a403c' }), r);
  rig.anims.always = (t) => {
    const c = t % 12;
    const k = c < 0.7 ? c / 0.7 : c < 3.5 ? 1 : c < 4.2 ? 1 - (c - 3.5) / 0.7 : 0;
    door.position.x = -14 * k;
    arm.rotation.y = -PI / 2 * k;
  };
});

// ══ pickup — open jeep with the bear at the wheel ═════════════════════════
defineModel('pickup', (opts, rig) => {
  const b = rig.body;
  const D = 72;
  const zs = D / 2;
  const r = 14;
  const yb = 16;
  const aR = r * 1.12 + B;
  const sage = '#9aac9e';
  b.add(mesh(extrudeGeo([
    [-57, yb], arch(-39, yb, aR), arch(38, yb, aR), [57, yb], { arc: [57, yb + 6, 6, -PI / 2, 0, false] },
    [63, 40], { arc: [59, 40, 4, 0, PI / 2, false] }, [-59, 44], { arc: [-59, 40, 4, PI / 2, PI, false] },
    [-63, yb + 6], { arc: [-57, yb + 6, 6, PI, 1.5 * PI, false] },
  ], D), sage));
  // arch lips
  for (const x of [-39, 38]) {
    const pts = [];
    for (let i = 0; i <= 10; i += 1) pts.push([x + (aR + 2.2) * Math.cos((PI * i) / 10), yb + (aR + 2.2) * Math.sin((PI * i) / 10)]);
    for (let i = 10; i >= 0; i -= 1) pts.push([x + (aR - B) * Math.cos((PI * i) / 10), yb + (aR - B) * Math.sin((PI * i) / 10)]);
    onSides(b, flat(pts, 0.6), '#6e8073', zs, 0.05, 0.6);
  }
  b.add(mesh(extrudeGeo([[30, 43], [62, 43], [61, 50], [54, 54], [30, 54]], D - 8, 1.2), '#a6b8aa'));
  // bed: walls, tailgate, bulkhead, rims
  for (const s of [1, -1]) {
    b.add(mesh(cbox(75, 12, 3), sage, -25.5, 50, s * (zs - 1.5)));
    b.add(mesh(cbox(75, 2, 4), '#7d8f82', -25.5, 57, s * (zs - 1.5)));
  }
  b.add(mesh(cbox(3, 12, D), sage, -61.5, 50, 0));
  b.add(mesh(cbox(4, 2, D + 1), '#7d8f82', -61.5, 57, 0));
  b.add(mesh(cbox(3, 12, D), sage, 11.5, 50, 0));
  const spare = wheel(10, 6, { hub: '#d4d6d2' });
  spare.rotation.y = PI / 2;
  spare.position.set(-66, 50, 0);
  b.add(spare);
  // roll bar
  const gray = '#5d6662';
  for (const s of [1, -1]) b.add(mesh(cbox(3, 26, 3), gray, 11.5, 69, s * (zs - 4)));
  b.add(mesh(cbox(3, 3, D - 5), gray, 11.5, 82, 0));
  // windscreen frame + glass (well ahead of the driver's big head)
  for (const s of [1, -1]) b.add(mesh(beam(47, 52, 42, 80, 3, 3), gray, 0, 0, s * (zs - 3)));
  b.add(mesh(cbox(3, 3, D - 3), gray, 42, 80, 0));
  b.add(mesh(beam(46.4, 54, 42.4, 78.4, 1, D - 10), GLASS));
  b.add(mesh(cbox(4, 6, D - 10), DARK, 43, 50, 0));
  // seat cushions (the bulkhead is the backrest)
  for (const z of [12, -12]) b.add(mesh(cbox(16, 4, 20), '#4a4f4c', 21, 46, z));
  rod(b, [42, 50, 12], [36.5, 60, 12], 1, DARK);
  steeringWheel(b, 36, 61, 12, 5, 0.5);
  // nose
  b.add(mesh(cbox(1.2, 12, 30), DARK, 64.9, 31, 0));
  for (const z of [-9, -3, 3, 9]) b.add(mesh(cbox(1.4, 12, 1.6), '#b7c2b9', 65.1, 31, z));
  lamp(b, 63 + B, 34, 27, 4.5, HEAD);
  lamp(b, 63 + B, 34, -27, 4.5, HEAD);
  b.add(mesh(cbox(8, 6, D - 6), '#6f7873', 64, 20, 0));
  b.add(mesh(cbox(8, 6, D - 6), '#6f7873', -64, 20, 0));
  for (const z of [-28, 28]) b.add(mesh(cbox(1.2, 6, 6), TAIL, -64.8, 36, z));
  for (const s of [1, -1]) {
    b.add(mesh(cbox(1.4, 1.4, 5), gray, 44, 68, s * (zs + 1)));
    b.add(mesh(cbox(2.6, 5, 4), gray, 44.5, 70, s * (zs + 4.6)));
  }
  b.add(mesh(cbox(30, 6, 30), DARK, -0.5, 13, 0));
  // the bear
  const bear = figure({ bear: true, legLen: 3, seed: 3 });
  bear.root.scale.setScalar(1.3);
  seat(b, bear, 24, 48, 12);
  const wheelTarget = (dz) => toFig(bear, 36, 61, 12 + dz);
  reach(bear.arms[1], wheelTarget(-4.5));
  reach(bear.arms[0], wheelTarget(4.5));
  addWheels(rig, pairs([-39, 38], r, 27.5, 13, { hub: '#d4d6d2' }), r);
  rig.anims.always = (t) => {
    driverLife(bear, t, 1);
    bear.root.position.y = 48 + Math.abs(Math.sin(t * 3)) * 0.5;
  };
});

// ══ garbageTruck ═════════════════════════════════════════════════════════
defineModel('garbageTruck', (opts, rig) => {
  const b = rig.body;
  const D = 74;
  const zs = D / 2;
  const r = 14;
  const yb = 17;
  const aR = r * 1.12 + B;
  const cab = '#a9bfb1';
  b.add(mesh(extrudeGeo([
    [39, yb], arch(56.5, yb, aR), [74, yb], { arc: [74, yb + 5, 5, -PI / 2, 0, false] },
    [79, 68], { arc: [67, 68, 12, 0, PI / 2, false] }, [39, 80],
  ], D), cab));
  windowRect(b, 50, 57, 71, 72, zs, { frame: '#d6dfd8' });
  seam(b, 47, 20, 78, zs, shade(cab, -0.12));
  handle(b, 51, 52, zs);
  sideDisc(b, 66, 36, zs, 6, '#d98f8a');
  slab(b, 79, 50, 79, 67, D - 12, GLASS, 60, 50);
  shell(b, 67, 68, 12, 12, 0.05, 1.3, D - 12, GLASS);
  lamp(b, 79 + B, 32, 25, 6, HEAD);
  lamp(b, 79 + B, 32, -25, 6, HEAD);
  b.add(mesh(cbox(1.2, 12, 26), DARK, 80.9, 34, 0));
  b.add(mesh(cbox(8, 6, D - 4), '#3a3f3c', 81, 20, 0));
  mirrors(b, 76, 70, zs, '#3a3f3c', 6);
  b.add(mesh(cbox(108, 10, 30), DARK, -10, 25, 0)); // chassis
  b.add(mesh(cbox(4, 4, 10), DARK, -8, 26, zs - 8)); // fuel step
  // container with ribs that rise above the roof
  b.add(mesh(extrudeGeo(rrect(-22, 30, 37, 90, 4), D - 2), '#a3a7a9'));
  for (const x of [-18, -4, 10, 24, 34]) b.add(mesh(cbox(3, 66, D + 0.6), '#8f9496', x, 63, 0));
  // hopper
  b.add(mesh(extrudeGeo([[-22, 30], [-22, 90], [-56, 82], [-71, 60], [-69, 42], [-58, 30]], D - 6), '#55595c'));
  onSides(b, flat([[-26, 80], [-54, 74], [-64, 58], [-26, 58]], 0.4), '#6a6f72', (D - 6) / 2, 0.05, 0.4);
  for (const z of [-26, 26]) b.add(mesh(cbox(1.2, 7, 6), TAIL, -72.2, 50, z));
  // rails for the bin lift on the hopper's back
  for (const z of [-10, 10]) b.add(mesh(cbox(2, 40, 3), '#c9a64b', -73, 42, z));
  // rear mudguards
  for (const s of [1, -1]) {
    const pts = [];
    for (let i = 0; i <= 10; i += 1) pts.push([-10 + 19 * Math.cos(0.12 + (2.9 * i) / 10), 14 + 19 * Math.sin(0.12 + (2.9 * i) / 10)]);
    for (let i = 10; i >= 0; i -= 1) pts.push([-10 + 16.5 * Math.cos(0.12 + (2.9 * i) / 10), 14 + 16.5 * Math.sin(0.12 + (2.9 * i) / 10)]);
    const g = mesh(flat(pts, 20), DARK);
    g.position.z = s * 25;
    b.add(g);
  }
  // wheelie bin on the lift (pivot at its front-top edge)
  const bin = group(-74, 22, 0);
  b.add(bin);
  bin.add(mesh(cbox(14, 22, 22), '#8fa592', -8, -11, 0));
  bin.add(mesh(cbox(16, 2, 24), '#6f8673', -8, 0.8, 0));
  for (const z of [-8, 8]) bin.add(mesh(new THREE.CylinderGeometry(2, 2, 2, 8).rotateX(PI / 2), TYRE, -13, -20, z));
  bin.add(mesh(cbox(2, 6, 18), '#c9a64b', -0.5, -3, 0)); // the clamp on the rails
  addWheels(rig, [...pairs([56.5], r, 26, 16, { hub: '#e9e2d0', cap: '#b9b2a2' }), ...pairs([-10], r, 25, 18, { hub: '#e9e2d0', cap: '#b9b2a2' })], r);
  rig.anims.always = (t) => {
    const c = t % 9;
    const ease = (k) => k * k * (3 - 2 * k);
    const lift = c < 1.5 ? ease(c / 1.5) : c < 4.5 ? 1 : c < 6 ? 1 - ease((c - 4.5) / 1.5) : 0;
    const tip = c < 1.6 ? 0 : c < 2.4 ? ease((c - 1.6) / 0.8) : c < 3.6 ? 1 : c < 4.4 ? 1 - ease((c - 3.6) / 0.8) : 0;
    bin.position.y = 22 + lift * 40;
    bin.rotation.z = -tip * 2.0;
  };
});

// ══ snowPlough ═══════════════════════════════════════════════════════════
defineModel('snowPlough', (opts, rig) => {
  const b = rig.body;
  const D = 74;
  const zs = D / 2;
  const r = 15;
  const yb = 18;
  const aR = r * 1.12 + B;
  const body = '#c5d3c7';
  const snow = '#eef1ee';
  b.add(mesh(extrudeGeo([
    [-79, yb], arch(-56, yb, aR), arch(38, yb, aR), [64, yb], { arc: [64, yb + 6, 6, -PI / 2, 0, false] },
    [70, 48], { arc: [66, 48, 4, 0, PI / 2, false] }, [46, 56], [40, 94], { arc: [37, 94, 3, 0, PI / 2, false] },
    [2, 97], [0, 94], [0, 62], [-85, 62], [-85, yb + 6], { arc: [-79, yb + 6, 6, PI, 1.5 * PI, false] },
  ], D), body));
  windowRect(b, 6, 66, 32, 90, zs, { frame: '#e3ebe4' });
  seam(b, 4, 22, 60, zs, shade(body, -0.12));
  handle(b, 10, 58, zs);
  slab(b, 45.37, 60, 40.63, 90, D - 14, GLASS, 20, 70);
  slab(b, 0, 68, 0, 90, D - 24, GLASS, 20, 70);
  onSides(b, cbox(80, 3, 0.4), '#e2a54e', zs, 0.05, 0.4, [1, -1], -42, 50); // warning stripe
  // snow: roof cap, hood lumps, a heap on the bed
  b.add(mesh(new THREE.SphereGeometry(1, 16, 8, 0, PI * 2, 0, PI / 2).scale(22, 5, 32), snow, 19, 98.2, 0));
  for (const [x, y, z, rr] of [[54, 54, 10, 6], [58, 52, -12, 5], [-20, 64, -12, 12], [-40, 66, 10, 14], [-62, 64, -5, 13], [-76, 62, 16, 9]]) {
    b.add(mesh(new THREE.IcosahedronGeometry(rr, 1), snow, x, y, z));
  }
  // blade: concave mouldboard on a push frame bolted to the chassis
  const front = [[86, 2], [83, 12], [82, 22], [84, 32], [89, 40], [95, 45]];
  const back = [[82.5, 2], [79.5, 12], [78.5, 22], [80.5, 32], [85.5, 40], [92, 46.5]];
  b.add(mesh(flat([...front, ...back.reverse()], D + 34), '#4d5560'));
  b.add(mesh(cbox(4, 3, D + 34), '#8a9296', 84.5, 2.5, 0));
  for (const z of [-18, 18]) b.add(mesh(beam(66, 26, 81, 18, 4, 4), DARK, 0, 0, z));
  b.add(mesh(beam(66, 44, 82, 33, 2.4, 2.4), '#b8bdb9'));
  b.add(mesh(cbox(6, 8, 44), DARK, 69, 24, 0));
  for (const [x, z, rr] of [[104, -24, 6], [108, 2, 7], [104, 26, 5], [116, 14, 5], [114, -10, 6]]) b.add(mesh(new THREE.IcosahedronGeometry(rr, 1), snow, x, 2, z));
  for (const z of [-30, -10, 12, 32]) b.add(mesh(new THREE.IcosahedronGeometry(5, 1), snow, 88, 46, z));
  lamp(b, 70 + B, 40, 26, 4.5, HEAD);
  lamp(b, 70 + B, 40, -26, 4.5, HEAD);
  b.add(mesh(cbox(2, 6, 2), DARK, 30, 101, 0));
  const flash = beacon(b, 30, 104, 0);
  rod(b, [-3, 62, -26], [-3, 104, -26], 2, DARK);
  mirrors(b, 42, 74, zs, '#3a3f3d', 5);
  for (const z of [-28, 28]) b.add(mesh(cbox(1.2, 6, 6), TAIL, -86.8, 40, z));
  b.add(mesh(cbox(54, 7, 40), DARK, -9, 14.5, 0));
  addWheels(rig, pairs([-56, 38], r, 26.5, 15, { hub: '#56605a', cap: '#3a403c' }), r);
  rig.anims.always = (t) => flash(t);
});

// ══ lawnMower — ride-on mower with its driver under a sunshade ══════════
defineModel('lawnMower', (opts, rig) => {
  const b = rig.body;
  const green = '#5d8a68';
  const light = '#6b9a77';
  b.add(mesh(extrudeGeo([[-55, 12], [50, 12], [64, 20], [60, 28], [15, 34], [-35, 32], [-55, 30]], 36, 1.4), green));
  b.add(mesh(extrudeGeo(rrect(-8, 3, 28, 10, 3), 60, 1.2), '#4a7055')); // cutting deck
  for (const [x, z] of [[2, 10], [2, -10], [22, 10], [22, -10]]) b.add(mesh(cbox(3, 4, 3), DARK, x, 11, z));
  b.add(mesh(cbox(8, 5, 6), '#4a7055', 10, 6, 31)); // side chute
  b.add(mesh(extrudeGeo([[18, 32], [58, 30], [61, 36], [52, 46], [18, 46]], 30, 1.4), light)); // hood
  slab(b, 58.5, 31, 60.8, 35.5, 20, DARK, 40, 38, 1.6);
  for (const z of [-11, 11]) lamp(b, 61.6, 34, z, 2.2, HEAD);
  for (const s of [1, -1]) onSides(b, flat(rrect(26, 36, 44, 42, 2), 0.3), '#3f4a3e', 15, 0.05, 0.3, [s]);
  // rear fenders over the big wheels
  for (const s of [1, -1]) {
    const pts = [];
    for (let i = 0; i <= 12; i += 1) pts.push([-40 + 21.4 * Math.cos(0.15 + (2.84 * i) / 12), 17 + 21.4 * Math.sin(0.15 + (2.84 * i) / 12)]);
    for (let i = 12; i >= 0; i -= 1) pts.push([-40 + 19 * Math.cos(0.15 + (2.84 * i) / 12), 17 + 19 * Math.sin(0.15 + (2.84 * i) / 12)]);
    const g = mesh(flat(pts, 16), light);
    g.position.z = s * 26;
    b.add(g);
  }
  // seat on a post
  b.add(mesh(cbox(8, 8, 8), DARK, -18, 37, 0));
  b.add(mesh(cbox(18, 4, 22), '#4e5148', -18, 42, 0));
  b.add(mesh(cbox(4, 24, 22), '#4e5148', -28, 56, 0));
  // steering
  rod(b, [20, 46, 0], [-1, 60, 0], 1.3, DARK);
  steeringWheel(b, -2, 61, 0, 6.5, 0.55);
  // sunshade
  for (const z of [-14, 14]) rod(b, [10, 45, z], [10, 98, z], 1.3, DARK);
  for (const z of [-16, 16]) rod(b, [-42, 30, z], [-42, 98, z], 1.3, DARK);
  b.add(mesh(cbox(60, 3, 40), light, -16, 99.5, 0));
  b.add(mesh(cbox(30, 1.4, 24), '#d6c58e', -16, 101.6, 0));
  rod(b, [40, 44, 10], [40, 54, 10], 1.6, DARK); // exhaust
  // driver
  const driver = figure({ legLen: 9, seed: 5 });
  seat(b, driver, -16, 44, 0);
  reach(driver.arms[1], toFig(driver, -2, 61, -6));
  reach(driver.arms[0], toFig(driver, -2, 61, 6));
  addWheels(rig, [...pairs([-40], 17, 26, 14, { hub: '#c9b57a', cap: '#8a7a4c' }), ...pairs([40], 10, 23.5, 9, { hub: '#c9b57a', cap: '#8a7a4c' })], 17);
  rig.anims.always = (t) => driverLife(driver, t, 2);
});

// ══ bucketTruck — utility truck, 2-link boom, worker fixing a lamp ═══════
defineModel('bucketTruck', (opts, rig) => {
  const b = rig.body;
  const D = 66;
  const zs = D / 2;
  const r = 12;
  const yb = 14;
  const aR = r * 1.12 + B;
  const cream = '#e6dcc5';
  const cabC = '#7c8698';
  b.add(mesh(extrudeGeo([
    [-60, yb], arch(-44, yb, aR), arch(11, yb, aR), [27, yb], { arc: [27, yb + 6, 6, -PI / 2, 0, false] },
    [33, 36], { arc: [29, 36, 4, 0, PI / 2, false] }, [14, 40], [14, 30], [-14, 30], [-14, 34], [-66, 34],
    [-66, yb + 6], { arc: [-60, yb + 6, 6, PI, 1.5 * PI, false] },
  ], D), cream));
  b.add(mesh(extrudeGeo([[-14, 29], [14, 29], [14, 52], { arc: [4, 52, 10, 0, PI / 2, false] }, [-14, 62]], D - 2), cabC));
  windowRect(b, -10, 42, 6, 58, (D - 2) / 2, { r: 2, frame: '#c3c9d4' });
  seam(b, -12, 32, 60, (D - 2) / 2, shade(cabC, -0.1));
  handle(b, -6, 39, (D - 2) / 2);
  slab(b, 14, 42, 14, 51, D - 12, GLASS, 0, 45);
  shell(b, 4, 52, 10, 10, 0.05, 1.3, D - 12, GLASS);
  b.add(mesh(cbox(1.2, 10, 22), DARK, 34.9, 27, 0));
  lamp(b, 33 + B, 32, 22, 4, HEAD);
  lamp(b, 33 + B, 32, -22, 4, HEAD);
  b.add(mesh(cbox(7, 5, D - 4), '#8c8f90', 34, 17, 0));
  mirrors(b, 15, 52, (D - 2) / 2, '#3a3f45', 5);
  for (const s of [1, -1]) b.add(mesh(cbox(52, 3, 3), '#3a3f45', -40, 36.5, s * (zs - 1.5)));
  b.add(mesh(cbox(3, 3, D), '#3a3f45', -64.5, 36.5, 0));
  for (const z of [-24, 24]) b.add(mesh(cbox(1.2, 5, 6), TAIL, -67.8, 28, z));
  for (const s of [1, -1]) { // outriggers
    b.add(mesh(cbox(3, 28, 3), '#3a3f45', -58, 18, s * (zs + 1.5)));
    b.add(mesh(cbox(8, 2, 8), '#3a3f45', -58, 1, s * (zs + 1.5)));
  }
  b.add(mesh(cbox(30, 6, 30), DARK, -16.5, 11, 0));
  // turret + boom
  const P0 = [-30, 42];
  const L1 = 36;
  const L2 = 40;
  b.add(mesh(new THREE.CylinderGeometry(9, 10, 6, 12), '#c9a35a', P0[0], 37, 0));
  b.add(mesh(cbox(8, 6, 10), '#c9a35a', P0[0], 41, 0));
  const tan = '#d9b25e';
  const link1 = group(P0[0], P0[1], 0);
  b.add(link1);
  link1.add(mesh(cbox(L1, 5, 6).translate(L1 / 2, 0, 0), tan));
  link1.add(mesh(cbox(L1 * 0.6, 2.4, 3).translate(L1 * 0.35, -3.6, 0), '#e9e3d4'));
  link1.add(mesh(new THREE.CylinderGeometry(3.4, 3.4, 8, 10).rotateX(PI / 2), DARK));
  const link2 = group(L1, 0, 0);
  link1.add(link2);
  link2.add(mesh(cbox(L2, 4, 5).translate(L2 / 2, 0, 0), tan));
  link2.add(mesh(new THREE.CylinderGeometry(3, 3, 7, 10).rotateX(PI / 2), DARK));
  const basket = group(L2, 0, 0);
  link2.add(basket);
  basket.add(mesh(cbox(4, 6, 4), DARK, 0, -1, 0));
  // the basket hangs on the lamp side (rear) of the boom tip
  basket.add(mesh(cbox(18, 12, 18), '#d2a85a', -8, -8, 0));
  basket.add(mesh(cbox(19, 1.6, 19), '#b38a40', -8, -1.6, 0));
  const worker = figure({ seated: false, legLen: 12, vest: true, seed: 7 });
  worker.root.scale.setScalar(0.8);
  worker.root.position.set(-8, 3, 0);
  worker.root.rotation.y = -PI / 2; // faces the lamp, behind the truck
  basket.add(worker.root);
  // street lamp BEHIND the truck: the cab faces away, and the boom swings
  // up from the turret over the rear and out to the lamp — never over the cab
  const lampX = -96;
  b.add(mesh(new THREE.CylinderGeometry(4, 5, 3, 10), '#2e3330', lampX, 1.5, 0));
  b.add(mesh(new THREE.CylinderGeometry(1.6, 1.9, 84, 8), '#2e3330', lampX, 42, 0));
  b.add(mesh(new THREE.CylinderGeometry(2, 6.5, 4, 10), '#2e3330', lampX, 88, 0));
  const glowMat = new THREE.MeshBasicMaterial({ color: '#fbe3a0' });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 10), glowMat);
  globe.position.set(lampX, 81.5, 0);
  b.add(globe);
  const ik = (tx, ty) => {
    const dx = tx - P0[0];
    const dy = ty - P0[1];
    const d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01);
    const a = Math.atan2(dy, dx);
    const c = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
    let best = null;
    for (const a1 of [a + c, a - c]) {
      const ex = P0[0] + L1 * Math.cos(a1);
      const ey = P0[1] + L1 * Math.sin(a1);
      if (!best || ey > best[2]) best = [a1, Math.atan2(ty - ey, tx - ex) - a1, ey];
    }
    return best;
  };
  const T0 = [-50, 44]; // stowed over the rear bed
  const T1 = [lampX + 22, 62]; // basket beside the lamp head
  const pose = (k) => {
    const tx = T0[0] + (T1[0] - T0[0]) * k;
    const ty = T0[1] + (T1[1] - T0[1]) * k;
    const [a1, a2] = ik(tx, ty);
    link1.rotation.z = a1;
    link2.rotation.z = a2;
    basket.rotation.z = -(a1 + a2);
    return [tx, ty];
  };
  pose(1);
  addWheels(rig, pairs([-44, 11], r, 24.5, 12, { hub: '#d8d4cb' }), r);
  rig.anims.always = (t) => {
    const c = t % 14;
    const ease = (k) => k * k * (3 - 2 * k);
    const k = c < 3 ? 0 : c < 6 ? ease((c - 3) / 3) : c < 10 ? 1 : c < 13 ? 1 - ease((c - 10) / 3) : 0;
    const [tx, ty] = pose(k);
    worker.eyes.blink(worker.blink(t));
    // in basket coords: the globe relative to the basket attachment point
    const gx = lampX - tx;
    const gy = 81.5 - ty;
    const ks = worker.root.scale.x;
    const rx = worker.root.position.x;
    const ry = worker.root.position.y;
    const near = k > 0.97;
    const fix = Math.sin(t * 6) * 1.2;
    // worker-local z points to world −x (he faces the lamp)
    reach(worker.arms[0], near ? [fix * 0.3, (gy - ry - 2 + fix) / ks, (-(gx - rx) - 4.5) / ks] : [4, 6, 10]);
    reach(worker.arms[1], [-6, 5, 9]);
    worker.head.rotation.y = near ? 0.1 : -0.9;
    worker.head.rotation.x = near ? -0.25 : 0;
    glowMat.color.set(near && Math.sin(t * 11) > 0.3 ? '#fff4c8' : near ? '#c9b98a' : '#fbe3a0');
  };
  rig.anims.always(0);
});

// ══ roadRoller — pneumatic-tyre compactor ═══════════════════════════════
defineModel('roadRoller', (opts, rig) => {
  const b = rig.body;
  const D = 78;
  const yel = '#d6b56c';
  b.add(mesh(extrudeGeo(rrect(-78, 26, 76, 44, 5), D), '#d2b062')); // side frame band
  b.add(mesh(extrudeGeo([[-72, 44], [66, 44], [64, 52], [40, 70], [-66, 70], { arc: [-66, 64, 6, PI / 2, PI, false] }], D - 14), yel));
  for (const x of [-48, 40]) sideDisc(b, x, 32, D / 2, 4.5, '#3a3832', 1);
  for (const x of [-66, -32, -26, 6, 56, 66]) sideDisc(b, x, 32, D / 2, 1.8, '#5a4a2f', 0.8);
  b.add(mesh(cbox(16, 22, D + 2), '#c9a85c', -6, 30, 0)); // ballast box
  for (const s of [1, -1]) {
    onSides(b, flat(rrect(-50, 52, -30, 58, 2), 0.4), '#3a3d39', (D - 14) / 2, 0.05, 0.4, [s]);
    onSides(b, flat(rrect(18, 52, 32, 60, 2), 0.4), '#3a3d39', (D - 14) / 2, 0.05, 0.4, [s]);
  }
  b.add(mesh(cbox(44, 5, 52), '#3a3d39', -6, 72, 0)); // operator deck
  b.add(mesh(cbox(14, 3, 22), '#3a3d39', 6, 76, 0));
  b.add(mesh(cbox(4, 14, 22), '#3a3d39', 14, 81, 0));
  steeringWheel(b, -2, 82, 0, 5, -0.5);
  rod(b, [-4, 74, 0], [-2, 81, 0], 1, DARK);
  b.add(mesh(cbox(10, 3, 10), '#efe6cf', -18, 76, 0));
  const flash = beacon(b, -18, 77.5, 0, 5);
  rod(b, [-56, 70, -18], [-56, 96, -18], 2.2, '#2f322f');
  rod(b, [-56, 96, -18], [-62, 99, -18], 2.2, '#2f322f');
  rod(b, [64, 50, 0], [76, 66, 0], 1.4, DARK);
  b.add(mesh(cbox(4, 5, 4), '#c9a85c', 77, 68, 0));
  lamp(b, 76 + B, 38, 26, 3.5, HEAD);
  lamp(b, 76 + B, 38, -26, 3.5, HEAD);
  for (const z of [-26, 26]) b.add(mesh(cbox(1.2, 5, 5), TAIL, -79.8, 38, z));
  addWheels(rig, pairs([-48, 40], 16, 25, 18, { hub: '#c9c2ab', cap: '#8e8a7b' }), 16);
  rig.anims.always = (t) => flash(t);
});

// ══ drumRoller — tandem vibratory roller ═════════════════════════════════
defineModel('drumRoller', (opts, rig) => {
  // Single-drum compactor, after the sprite: one BIG steel drum up front (the
  // printed black disc is its end), a long rounded two-tone body behind it
  // (dark top, sage-gray lower band with yellow rivets), a cream operator
  // cage on top, and a small rear drum tucked under the body.
  const b = rig.body;
  const dark = '#33363a';
  const sage = '#a8b0a4';
  const cream = '#dcc68e';
  const D = 64;
  rig.parts.wheels = [];
  const front = wheel(36, D, { hub: '#4a4e4a', tyre: '#2b2d2b', ch: 0.04, lugs: 6 });
  front.position.set(46, 36, 0);
  b.add(front);
  const rear = wheel(20, D - 6, { hub: '#a4aaa1', tyre: '#2b2d2b', ch: 0.05, lugs: 5 });
  rear.position.set(-58, 20, 0);
  b.add(rear);
  rig.parts.wheels.push(front, rear);
  rig.parts.wheelRadius = 36; // rear drum turns a little fast — not noticeable
  // body: rounded capsule profile, lower sage band + dark top as one solid
  // each, the band slightly proud so the seam reads as a fold
  b.add(mesh(extrudeGeo([[-84, 22], [2, 22], [2, 44], [-84, 44]], D - 2), sage));
  b.add(mesh(extrudeGeo([[-84, 44], [2, 44], { arc: [-12, 44, 14, 0, PI / 2, false] }, [-74, 58], { arc: [-74, 48, 10, PI / 2, PI, false] }], D - 2), dark));
  onSides(b, cbox(84, 2.2, 0.4), cream, (D - 2) / 2, 0.05, 0.4, [1, -1], -41, 44);
  for (const x of [-72, -56, -40, -24, -8]) sideDisc(b, x, 35, (D - 2) / 2, 1.8, AMBER, 0.6);
  // the yoke: a steel frame from the body round the big drum's axle
  for (const s2 of [1, -1]) {
    const p = mesh(flat([[0, 26], [0, 52], [46, 44], [52, 36], [46, 28]], 3), '#5b5f5a');
    p.position.z = s2 * (D / 2 + 2.2);
    b.add(p);
    b.add(mesh(new THREE.CylinderGeometry(7, 7, 3, 12).rotateX(PI / 2), '#43474a', 46, 36, s2 * (D / 2 + 3.8)));
  }
  b.add(mesh(cbox(4, 3, D + 6), DARK, 84, 24, 0)); // front scraper
  rod(b, [84, 25, 30], [70, 42, 30], 1.2, '#5b5f5a');
  rod(b, [84, 25, -30], [70, 42, -30], 1.2, '#5b5f5a');
  // operator platform + cream cage on top of the body
  b.add(mesh(cbox(40, 3, D - 6), '#4a4e49', -40, 59.5, 0));
  b.add(mesh(cbox(12, 10, 18), cream, -48, 66, 0)); // seat
  b.add(mesh(cbox(4, 14, 18), cream, -55, 73, 0));
  b.add(mesh(cbox(6, 14, 8), '#4a4e49', -26, 68, 0)); // steering column
  steeringWheel(b, -27, 77, 0, 5, -0.4);
  for (const z of [-24, 24]) {
    rod(b, [-60, 61, z], [-60, 92, z], 1.6, cream);
    rod(b, [-22, 61, z], [-22, 92, z], 1.6, cream);
  }
  b.add(mesh(cbox(42, 2.5, 52), cream, -41, 93, 0)); // canopy
  rod(b, [-8, 58, 18], [-8, 80, 18], 2.6, DARK); // exhaust
  const flash = beacon(b, -41, 95.5, 0);
  lamp(b, 2 + B, 50, 22, 3.2, HEAD);
  lamp(b, 2 + B, 50, -22, 3.2, HEAD);
  lamp(b, -84 - B, 50, 22, 3.2, TAIL, -1);
  lamp(b, -84 - B, 50, -22, 3.2, TAIL, -1);
  rig.anims.always = (t) => flash(t);
});

// ══ cementMixer — towed drum mixer ═══════════════════════════════════════
defineModel('cementMixer', (opts, rig) => {
  const b = rig.body;
  const tan = '#cfc19b';
  const brown = '#7a5b3e';
  for (const z of [-14, 14]) b.add(mesh(cbox(86, 5, 4), tan, 3, 22, z));
  for (const x of [-36, 40]) b.add(mesh(cbox(4, 5, 32), tan, x, 22, 0));
  for (const x of [-26, 22]) {
    for (const z of [-14, 14]) b.add(mesh(cbox(4, 9, 4), tan, x, 16.5, z));
    b.add(mesh(new THREE.CylinderGeometry(1.8, 1.8, 52, 8).rotateX(PI / 2), DARK, x, 13, 0));
  }
  b.add(mesh(beam(44, 22, 56, 16, 3, 4), tan));
  b.add(mesh(new THREE.TorusGeometry(2.6, 0.9, 6, 12), DARK, 57.5, 15, 0));
  for (const z of [-10, 10]) b.add(mesh(cbox(2.4, 50, 2.4), brown, 38, 47, z));
  b.add(mesh(cbox(2.4, 2.4, 22), brown, 38, 72, 0));
  for (const z of [-10, 10]) b.add(mesh(cbox(6, 2.4, 2.4), brown, 41, 72, z));
  // drum on a yoke, spinning about its own axis
  const tilt = group(-4, 50, 0);
  tilt.rotation.z = -0.62;
  b.add(tilt);
  const pinY = 12;
  const world = (lx, ly) => {
    const c = Math.cos(-0.62);
    const s = Math.sin(-0.62);
    return [-4 + lx * c - ly * s, 50 + lx * s + ly * c];
  };
  const [px, py] = world(0, pinY);
  for (const z of [-33, 33]) {
    rod(b, [-16, 24, Math.sign(z) * 14], [px, py, z], 1.4, tan);
    rod(b, [8, 24, Math.sign(z) * 14], [px, py, z], 1.4, tan);
  }
  tilt.add(mesh(new THREE.TorusGeometry(30, 1.5, 6, 16).rotateX(PI / 2), '#9a937c', 0, pinY, 0));
  for (const z of [-31.5, 31.5]) tilt.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 8).rotateX(PI / 2), DARK, 0, pinY, z));
  const spin = group(0, 0, 0);
  tilt.add(spin);
  const prof = [[0, -36], [16, -34], [27, -22], [30, -8], [30, 6], [25, 18], [16, 28], [13, 33], [15, 36]];
  spin.add(mesh(new THREE.LatheGeometry(prof.map(([a, c]) => new THREE.Vector2(a, c)), 8), '#e4dfcc', 0, 0, 0, { side: THREE.DoubleSide }));
  spin.add(inkMesh(new THREE.CircleGeometry(13, 8).rotateX(-PI / 2), '#3b3833', 0, 33, 0));
  spin.add(mesh(new THREE.CylinderGeometry(30.7, 30.7, 6, 8), '#b8b19a', 0, -1, 0));
  for (let i = 0; i < 4; i += 1) {
    const f = group(0, -6, 0);
    f.rotation.y = (i / 4) * PI * 2;
    const fin = mesh(cbox(2.5, 16, 2.6), '#cfc8b0', 0, 0, 30.8);
    fin.rotation.z = 0.5;
    f.add(fin);
    spin.add(f);
  }
  addWheels(rig, pairs([-26, 22], 13, 21.5, 9, { hub: '#e2dccb', cap: '#a39d8b' }), 13);
  rig.anims.idle = (t) => { spin.rotation.y = t * 1.4; };
  rig.anims.always = rig.anims.idle;
});

// ══ excavator — tracks, slewing house, boom → arm → bucket ════════════════
defineModel('excavator', (opts, rig) => {
  const b = rig.body;
  const tan = '#d8b878';
  const dark = '#3b3f3c';
  for (const s of [1, -1]) {
    const track = mesh(extrudeGeo(rrect(-31, 0, 31, 15, 7.5), 12, 1), '#2f322f');
    track.position.z = s * 16;
    b.add(track);
    for (const x of [-18, -6, 6, 18]) b.add(mesh(new THREE.CylinderGeometry(3, 3, 1, 10).rotateX(PI / 2), '#7d817b', x, 7.5, s * 22.4));
    for (const x of [-24, 24]) b.add(mesh(new THREE.CylinderGeometry(5.5, 5.5, 1, 10).rotateX(PI / 2), '#5c605a', x, 7.5, s * 22.4));
    for (let x = -24; x <= 24; x += 6) b.add(mesh(cbox(2.2, 1.2, 12.4), '#45494a', x, 15.3, s * 16));
  }
  b.add(mesh(cbox(36, 8, 22), DARK, 0, 10, 0));
  b.add(mesh(new THREE.CylinderGeometry(14, 14, 4, 16), DARK, 0, 17, 0));
  const house = group(0, 19, 0);
  b.add(house);
  house.add(mesh(cbox(48, 6, 40), tan, -4, 3, 0));
  house.add(mesh(extrudeGeo(rrect(-32, 6, -10, 26, 6), 36), '#cfae6c'));
  house.add(mesh(cbox(14, 12, 30), tan, -4, 12, -4));
  house.add(mesh(cbox(4, 3, 4), DARK, -6, 19, -12));
  const cab = mesh(extrudeGeo(rrect(-2, 6, 20, 52, 3), 22), '#d9bd82');
  cab.position.z = 8;
  house.add(cab);
  const cabSide = mesh(flat(rrect(1, 20, 17, 48, 2), 0.4), GLASS);
  cabSide.position.z = 8 + 11 + 0.65;
  house.add(cabSide);
  house.add(mesh(beam(3, 24, 9, 46, 1.6, 0.2), GLINT, 0, 0, 8 + 11 + 0.95));
  const ws = mesh(cbox(0.45, 26, 16), GLASS, 20 + 1.6 + 0.6, 34, 8);
  house.add(ws);
  house.add(mesh(cbox(24, 2, 24), tan, 9, 53.5, 8));
  house.add(mesh(cbox(6, 8, 8), tan, 14, 12, -10)); // boom foot
  const boom = group(14, 16, -10);
  house.add(boom);
  const L1 = 56;
  const L2 = 36;
  boom.add(mesh(cbox(L1, 7, 7).translate(L1 / 2, 0, 0), dark));
  boom.add(mesh(cbox(24, 2.6, 3).translate(16, -5, 0), '#e9e3d4'));
  boom.add(mesh(new THREE.CylinderGeometry(3.6, 3.6, 10, 10).rotateX(PI / 2), DARK));
  const arm = group(L1, 0, 0);
  boom.add(arm);
  arm.add(mesh(cbox(L2, 6, 6).translate(L2 / 2, 0, 0), '#d9b363'));
  arm.add(mesh(new THREE.CylinderGeometry(3.2, 3.2, 9, 10).rotateX(PI / 2), DARK));
  const bucket = group(L2, 0, 0);
  arm.add(bucket);
  bucket.add(mesh(extrudeGeo([[0, 3], [12, 2], [15, -10], [6, -16], [-2, -8]], 14, 1), dark));
  for (const z of [-5, 0, 5]) bucket.add(mesh(cbox(2, 4, 2), '#8a8f8a', 6.5, -17.5, z));
  const pose = (k, slew) => {
    boom.rotation.z = 1.15 - 0.6 * k;
    arm.rotation.z = -2.2 + 0.7 * k;
    bucket.rotation.z = -0.6 + 1.0 * k;
    house.rotation.y = slew;
  };
  rig.anims.dig = (t, dt, ctx) => {
    const c = ((t + (ctx?.phase ?? 0)) % 8) / 8;
    const k = (a, z) => Math.min(1, Math.max(0, (c - a) / (z - a)));
    const reachK = k(0, 0.2) - k(0.4, 0.55);
    const scoop = k(0.2, 0.35) - k(0.65, 0.75);
    const swing = k(0.45, 0.6) - k(0.78, 0.95);
    boom.rotation.z = 1.15 - 0.62 * reachK;
    arm.rotation.z = -2.2 + 0.75 * reachK;
    bucket.rotation.z = -0.5 + 1.1 * scoop;
    house.rotation.y = swing * 0.8;
  };
  rig.anims.idle = rig.anims.dig;
  pose(0.3, 0);
});

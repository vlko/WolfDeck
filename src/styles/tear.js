// tear — a rip in the paper. The world is a paper backdrop and someone tore it
// open: a thin ragged edge with white fibres, small curls of paper rolled
// back toward the viewer, a shadow of depth inside, and at the back a clean
// flat white page — the 2D reality behind the diorama.
import * as THREE from 'three';
import { rng } from '../assets/helpers.js';
import { getGrainTexture, getGrainCanvas, shadedColors } from '../assets/materials.js';
import { env } from './env.js';
import { flat, canvasTexture, blurRect } from './util.js';

const RIM = '#e9e1cd'; // the world's paper, seen from the front
const BACK = [0.74, 0.62, 0.44]; // …and its kraft back, on the curls (rgb)
const FIBRE = '#fffdf8';

// Points walking round a rectangle of half-size (hx, hy), pushed in/out by
// seeded noise — a torn edge: a slow wander, fine teeth, the odd deeper nick.
function tornLoop(hx, hy, amp, r, step) {
  const pts = [];
  const side = (x0, y0, x1, y1, nx, ny) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(3, Math.round(len / step));
    let from = r() - 0.5;
    let to = r() - 0.5;
    for (let i = 0; i < n; i += 1) {
      const span = 7;
      if (i % span === 0) { from = to; to = r() - 0.5; }
      const k = (i % span) / span;
      const slow = from + (to - from) * (k * k * (3 - 2 * k));
      const nick = r() < 0.07 ? -r() * 0.9 : 0;
      const off = amp * (slow * 1.3 + (r() - 0.5) * 0.9 + nick);
      const u = i / n;
      pts.push({ x: x0 + (x1 - x0) * u + nx * off, y: y0 + (y1 - y0) * u + ny * off, nx, ny });
    }
  };
  side(-hx, -hy, hx, -hy, 0, -1);
  side(hx, -hy, hx, hy, 1, 0);
  side(hx, hy, -hx, hy, 0, 1);
  side(-hx, hy, -hx, -hy, -1, 0);
  return pts;
}
const toShape = (pts, Ctor = THREE.Shape) => new Ctor(pts.map((p) => new THREE.Vector2(p.x, p.y)));

function ring(outer, inner, material, z) {
  const s = toShape(outer);
  s.holes.push(toShape(inner, THREE.Path));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), material);
  m.position.z = z;
  return m;
}

let rimMat = null;
let fibreMat = null;
function materials() {
  if (!rimMat) {
    // ShapeGeometry UVs are world units, so the paper tooth keeps its scale
    const grain = getGrainTexture().clone();
    grain.needsUpdate = true;
    grain.repeat.set(1.6, 1.6);
    rimMat = new THREE.MeshBasicMaterial({ color: RIM, map: grain });
    fibreMat = new THREE.MeshBasicMaterial({ color: FIBRE });
  }
  return { rimMat, fibreMat };
}

let innerShadow = null;
function innerShadowTexture() {
  if (innerShadow) return innerShadow;
  innerShadow = canvasTexture(256, 256, (ctx, w, h) => {
    // light comes from the top-left, so the edge shades the page there
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.13);
    top.addColorStop(0, 'rgba(30,26,34,0.36)');
    top.addColorStop(1, 'rgba(30,26,34,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h);
    const left = ctx.createLinearGradient(0, 0, w * 0.07, 0);
    left.addColorStop(0, 'rgba(30,26,34,0.28)');
    left.addColorStop(1, 'rgba(30,26,34,0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, w, h);
  });
  return innerShadow;
}

// One curl: a strip that leaves the edge and rolls back on itself, tapering
// to a ragged tip. Its visible side is the kraft back of the world's paper.
function addCurl(a, b, r, pos, col) {
  const tx = b.x - a.x;
  const ty = b.y - a.y;
  const base = Math.hypot(tx, ty) || 1;
  const ux = tx / base;
  const uy = ty / base;
  const L = 0.2 + r() * 0.26;
  const S = 5;
  const start = 0.25 + r() * 0.35;
  const roll = 1.5 + r() * 1.3; // how far it rolls back
  const skew = (r() - 0.5) * 0.5;
  let cx = (a.x + b.x) / 2;
  let cy = (a.y + b.y) / 2;
  let cz = 0.062;
  let prev = [[a.x, a.y, cz], [b.x, b.y, cz]];
  let prevShade = 0.9;
  for (let j = 1; j <= S; j += 1) {
    const s = j / S;
    const th = start + roll * s;
    const d = L / S;
    cx += a.nx * d * Math.cos(th) + ux * skew * d;
    cy += a.ny * d * Math.cos(th) + uy * skew * d;
    cz += d * Math.sin(th);
    const half = (base / 2) * (1 - 0.6 * s) * (0.85 + r() * 0.3);
    const row = [[cx - ux * half, cy - uy * half, cz], [cx + ux * half, cy + uy * half, cz]];
    // lit from above-left: the part turned up to the light is brighter
    const shade = Math.min(1, 0.62 + 0.4 * Math.max(0, Math.sin(th)) + (r() - 0.5) * 0.06);
    for (const [p, sh] of [[prev[0], prevShade], [prev[1], prevShade], [row[1], shade],
      [prev[0], prevShade], [row[1], shade], [row[0], shade]]) {
      pos.push(...p);
      col.push(BACK[0] * sh, BACK[1] * sh, BACK[2] * sh);
    }
    prev = row;
    prevShade = shade;
  }
}

const ROLL = '#cbb48c';
const P = new THREE.Vector3();
const N = new THREE.Vector3();

let serial = 0;
export default {
  face: { fill: '#ffffff', grain: false, radius: 0.01 },
  float: false,
  // The tear runs across the panel left to right; the torn-off paper rolls
  // up at its front and drops away at the end.
  revealDuration: 0.95,
  reveal(content, k, ctx) {
    content.scale.setScalar(1);
    if (!ctx.tear) {
      if (!env.renderer || k >= 1) return; // nothing to animate (instant reveal)
      env.renderer.localClippingEnabled = true;
      const size = content.children[0]?.userData.cardSize ?? { w: 4, h: 2.5 };
      const plane = new THREE.Plane();
      // every material of this panel gets its own copy, cut by the plane
      content.traverse((o) => {
        if (!o.material) return;
        o.material = o.material.clone();
        o.material.clippingPlanes = [plane];
      });
      const roll = new THREE.Mesh(
        shadedColors(new THREE.CylinderGeometry(1, 1, size.h + 0.5, 9, 1), 4, 0.08),
        new THREE.MeshBasicMaterial({ color: ROLL, vertexColors: true }),
      );
      content.add(roll);
      roll.layers.mask = content.children[0].layers.mask;
      ctx.tear = { plane, roll, hx: size.w / 2 };
    }
    const { plane, roll, hx } = ctx.tear;
    const e = k * k * (3 - 2 * k);
    const front = k >= 1 ? 1e4 : -hx - 0.5 + e * (hx * 2 + 1.0);
    content.updateWorldMatrix(true, false);
    P.set(front, 0, 0).applyMatrix4(content.matrixWorld);
    N.set(-1, 0, 0).transformDirection(content.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(N, P);
    // the roll grows as it gathers paper, then falls off in the last moment
    const end = Math.min(1, (1 - k) / 0.1);
    const radius = (0.09 + 0.15 * e) * Math.min(1, k / 0.06) * end;
    roll.visible = k > 0 && k < 1 && radius > 0.004;
    roll.scale.set(radius, 1, radius);
    roll.position.set(front + radius * 0.4, -(1 - end) * 0.8, 0.14 + radius);
    roll.rotation.y = e * 14;
    roll.rotation.z = (1 - end) * 0.5;
  },
  backing(w, h) {
    serial += 1;
    const r = rng(serial * 31 + Math.round(w * 10));
    const hx = w / 2;
    const hy = h / 2;
    const { rimMat: rim, fibreMat: fibre } = materials();
    const out = [];

    // a thin edge: the hole sits just inside the page, the paper barely beyond
    const inner = tornLoop(hx - 0.13, hy - 0.13, 0.04, r, 0.055);
    const outer = tornLoop(hx + 0.05, hy + 0.05, 0.03, r, 0.07);
    // white torn fibres peek out from under both sides of it
    const fibreIn = tornLoop(hx - 0.165, hy - 0.165, 0.022, r, 0.035);
    const fibreOut = tornLoop(hx + 0.085, hy + 0.085, 0.022, r, 0.04);
    out.push(ring(fibreOut, fibreIn, fibre, 0.045));
    out.push(ring(outer, inner, rim, 0.06));

    // curls of paper still hanging on round the hole
    const pos = [];
    const col = [];
    const n = Math.round(4 + (w + h) * 0.7 + r() * 2);
    for (let f = 0; f < n; f += 1) {
      const i = Math.floor(r() * inner.length);
      const a = inner[i];
      const b = inner[(i + 3 + Math.floor(r() * 4)) % inner.length];
      if (a.nx !== b.nx || a.ny !== b.ny) continue; // not across a corner
      addCurl(a, b, r, pos, col);
    }
    if (pos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      out.push(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    }

    // depth: the edge throws a shadow onto the page behind it
    const shade = flat(new THREE.PlaneGeometry(w - 0.12, h - 0.12), 0xffffff, 0.02, {
      map: innerShadowTexture(), transparent: true, depthWrite: false,
    });
    shade.renderOrder = 1;
    out.push(shade);

    // …and the torn sheet a soft one onto the world
    const b = blurRect(w + 0.1, h + 0.1, 0.6, 0.16);
    const drop = flat(new THREE.PlaneGeometry(b.W, b.H), 0x3a3428, -0.25, {
      map: b.texture, transparent: true, opacity: 0.2, depthWrite: false,
    });
    drop.position.set(0.08, -0.1, -0.25);
    drop.renderOrder = -1;
    out.push(drop);
    return out;
  },
};

// ── titles: the same tear, as strips ─────────────────────────────────────
// The heading and the labels are torn-open strips too: world paper round the
// edge, white fibres, and the flat white page showing through.

let titleSerial = 0;
function tornPath(ctx, inset, amp, step, w, h, r) {
  const pts = [];
  const side = (x0, y0, x1, y1, nx, ny) => {
    const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    let from = r() - 0.5;
    let to = r() - 0.5;
    for (let i = 0; i < n; i += 1) {
      if (i % 6 === 0) { from = to; to = r() - 0.5; }
      const k = (i % 6) / 6;
      const off = amp * ((from + (to - from) * k) * 1.3 + (r() - 0.5) * 0.9);
      pts.push([x0 + (x1 - x0) * (i / n) + nx * off, y0 + (y1 - y0) * (i / n) + ny * off]);
    }
  };
  side(inset, inset, w - inset, inset, 0, -1);
  side(w - inset, inset, w - inset, h - inset, 1, 0);
  side(w - inset, h - inset, inset, h - inset, 0, 1);
  side(inset, h - inset, inset, inset, -1, 0);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}
// e = thickness of the torn edge in px
function tornStrip(ctx, c, e) {
  titleSerial += 1;
  const r = rng(titleSerial * 17 + c.width);
  const { width: w, height: h } = c;
  // the world's paper, with a soft shadow onto the scene
  ctx.save();
  ctx.shadowColor = 'rgba(58,52,40,0.28)';
  ctx.shadowBlur = e * 0.9;
  ctx.shadowOffsetY = e * 0.3;
  ctx.fillStyle = RIM;
  tornPath(ctx, e * 1.3, e * 0.28, e * 0.5, w, h, r);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = 'multiply';
  const g = getGrainCanvas();
  for (let y = 0; y < h; y += g.height) for (let x = 0; x < w; x += g.width) ctx.drawImage(g, x, y);
  ctx.restore();
  // fibres, then the page
  ctx.fillStyle = FIBRE;
  tornPath(ctx, e * 1.95, e * 0.16, e * 0.28, w, h, r);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  tornPath(ctx, e * 2.25, e * 0.26, e * 0.42, w, h, r);
  ctx.fill();
  // depth: the edge shades the page along the top and the left
  ctx.save();
  ctx.clip();
  const top = ctx.createLinearGradient(0, e * 2.1, 0, e * 2.1 + e * 1.5);
  top.addColorStop(0, 'rgba(30,26,34,0.34)');
  top.addColorStop(1, 'rgba(30,26,34,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h);
  const left = ctx.createLinearGradient(e * 2.1, 0, e * 2.1 + e * 1.1, 0);
  left.addColorStop(0, 'rgba(30,26,34,0.24)');
  left.addColorStop(1, 'rgba(30,26,34,0)');
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export const title = {
  kickerColor: '#8a5d5a',
  subtitleColor: '#2b2f33',
  labelPad: 1.7,
  heading(L, { paint, size }) {
    const margin = Math.round(size * 0.34);
    return [{ canvas: paint(L, '#23272c', { margin, before: (ctx, c) => tornStrip(ctx, c, size * 0.085) }) }];
  },
  label(ctx, c, { size }) { tornStrip(ctx, c, size * 0.14); },
};

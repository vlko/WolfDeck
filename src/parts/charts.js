import * as THREE from 'three';
import { makeCard, FONT_STACK, PX } from './card.js';
import { paperMesh } from '../assets/helpers.js';
import { palette, chartColors } from '../assets/palette.js';
import { tween, ease } from '../engine/tween.js';
import { warn } from '../config.js';

// chart part — fields: chart: "bar"|"line"|"pie", title?, data: [{label, value}],
// colors?, width?. A papercraft backing card carries title/labels (canvas);
// the data itself is real 3D — boxes, an extruded ribbon, extruded pie wedges —
// standing proud of the card. Grow-in runs after the card lands; mash-forward
// snaps it via the shared tween system.

function seriesColor(def, i) {
  const list = Array.isArray(def.colors) && def.colors.length ? def.colors : chartColors;
  return list[i % list.length];
}

// World→canvas-px conversion for a card of size (w, h), origin at card center.
function toPx(w, h) {
  return (x, y) => [(x + w / 2) * PX, (h / 2 - y) * PX];
}

// Shared grow-in driver: tween {k: 0→1}; apply(k) positions every element.
function growDriver(group, apply, duration = 0.9) {
  const state = { k: 0 };
  apply(0);
  group.userData.growIn = () => tween(state, { k: 1 }, duration, ease.outCubic, () => apply(state.k)).done;
  group.userData.growInInstant = () => { state.k = 1; apply(1); };
  group.userData.resetGrow = () => { state.k = 0; apply(0); };
}

// Per-element stagger: element i of n gets progress 0..1 within global k.
function windowK(k, i, n, overlap = 0.55) {
  const span = 1 / (n - (n - 1) * overlap || 1);
  const start = i * span * (1 - overlap);
  return Math.max(0, Math.min((k - start) / span, 1));
}

export function chartPart(def) {
  const data = Array.isArray(def.data)
    ? def.data.filter((d) => d && typeof d.value === 'number').map((d) => ({ label: String(d.label ?? ''), value: d.value }))
    : [];
  if (!data.length) {
    warn(`chart part "${def.title ?? ''}": no usable data`);
    return null; // caller falls back to placeholder
  }
  const kind = def.chart ?? 'bar';
  if (kind === 'bar') return barChart(def, data);
  if (kind === 'line') return lineChart(def, data);
  if (kind === 'pie') return pieChart(def, data);
  warn(`chart part: unknown chart kind "${kind}"`);
  return null;
}

function chartCard(def, w, h, drawExtra) {
  return makeCard(w, h, (ctx, wPx) => {
    if (def.title) {
      ctx.font = `700 ${0.46 * PX}px ${FONT_STACK}`;
      ctx.fillStyle = palette.deepBrown;
      ctx.textAlign = 'center';
      ctx.fillText(def.title, wPx / 2, 0.72 * PX);
      ctx.fillStyle = palette.dustyRose;
      const tw = ctx.measureText(def.title).width;
      ctx.fillRect(wPx / 2 - tw / 2, 0.88 * PX, tw, 4);
    }
    if (drawExtra) drawExtra(ctx);
  });
}

// ── bar ─────────────────────────────────────────────────────────────────────
function barChart(def, data) {
  const w = def.width ?? 6;
  const h = 4.6;
  const baseY = -h / 2 + 0.85;
  const topY = h / 2 - 1.35;
  const chartH = topY - baseY;
  const chartW = w - 1.1;
  const maxV = Math.max(...data.map((d) => d.value), 1e-9);
  const slot = chartW / data.length;
  const px = toPx(w, h);

  const group = chartCard(def, w, h, (ctx) => {
    ctx.textAlign = 'center';
    ctx.font = `600 ${0.3 * PX}px ${FONT_STACK}`;
    ctx.fillStyle = palette.deepBrown;
    data.forEach((d, i) => {
      const [cx, cy] = px(-chartW / 2 + slot * (i + 0.5), baseY - 0.42);
      ctx.fillText(d.label, cx, cy);
    });
    // baseline
    ctx.fillStyle = palette.barkBrown;
    const [bx, by] = px(-chartW / 2 - 0.1, baseY);
    ctx.fillRect(bx, by, (chartW + 0.2) * PX, 4);
  });

  const bars = data.map((d, i) => {
    const barH = Math.max((d.value / maxV) * chartH, 0.02);
    const bar = paperMesh(new THREE.BoxGeometry(slot * 0.55, 1, 0.24), seriesColor(def, i), i + 1, 0.06);
    bar.position.set(-chartW / 2 + slot * (i + 0.5), baseY, 0.13);
    group.add(bar);
    return { bar, barH };
  });

  growDriver(group, (k) => {
    bars.forEach(({ bar, barH }, i) => {
      const e = ease.outCubic(windowK(k, i, bars.length));
      const cur = Math.max(barH * e, 0.001);
      bar.scale.y = cur;
      bar.position.y = baseY + cur / 2;
      bar.visible = e > 0.001;
    });
  });
  return group;
}

// ── line ────────────────────────────────────────────────────────────────────
function lineChart(def, data) {
  const w = def.width ?? 6;
  const h = 4.6;
  const baseY = -h / 2 + 0.85;
  const topY = h / 2 - 1.5;
  const chartH = topY - baseY;
  const chartW = w - 1.2;
  const maxV = Math.max(...data.map((d) => d.value), 1e-9);
  const px = toPx(w, h);

  const pts = data.map((d, i) => new THREE.Vector3(
    -chartW / 2 + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    baseY + (d.value / maxV) * chartH,
    0.14,
  ));

  const group = chartCard(def, w, h, (ctx) => {
    ctx.textAlign = 'center';
    ctx.font = `600 ${0.3 * PX}px ${FONT_STACK}`;
    ctx.fillStyle = palette.deepBrown;
    data.forEach((d, i) => {
      const [cx, cy] = px(pts[i].x, baseY - 0.42);
      ctx.fillText(d.label, cx, cy);
    });
    ctx.fillStyle = palette.barkBrown;
    const [bx, by] = px(-chartW / 2 - 0.1, baseY);
    ctx.fillRect(bx, by, (chartW + 0.2) * PX, 4);
    // faint gridlines
    ctx.fillStyle = 'rgba(95, 81, 66, 0.12)';
    for (let g = 1; g <= 3; g += 1) {
      const [gx, gy] = px(-chartW / 2, baseY + (chartH * g) / 3);
      ctx.fillRect(gx, gy, chartW * PX, 2);
    }
  });

  // Ribbon: one flat quad per segment (two triangles), revealed by drawRange.
  const ribbonW = 0.09;
  const verts = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const dir = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    const nx = -dir.y * ribbonW;
    const ny = dir.x * ribbonW;
    const quad = [
      [a.x + nx, a.y + ny], [a.x - nx, a.y - ny], [b.x + nx, b.y + ny],
      [a.x - nx, a.y - ny], [b.x - nx, b.y - ny], [b.x + nx, b.y + ny],
    ];
    for (const [vx, vy] of quad) verts.push(vx, vy, 0.14);
  }
  const ribbonGeo = new THREE.BufferGeometry();
  ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const colors = new Float32Array(verts.length).fill(1);
  ribbonGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  ribbonGeo.computeVertexNormals();
  const ribbon = new THREE.Mesh(ribbonGeo, new THREE.MeshBasicMaterial({
    color: seriesColor(def, 0), side: THREE.DoubleSide,
  }));
  group.add(ribbon);

  const dots = pts.map((p, i) => {
    const dot = paperMesh(new THREE.OctahedronGeometry(0.14, 0), seriesColor(def, 1), i, 0.05);
    dot.position.copy(p);
    dot.position.z = 0.16;
    group.add(dot);
    return dot;
  });

  const totalTris = (pts.length - 1) * 2;
  growDriver(group, (k) => {
    const segs = Math.floor(totalTris * k);
    ribbonGeo.setDrawRange(0, segs * 3);
    ribbon.visible = segs > 0;
    dots.forEach((dot, i) => {
      const e = ease.backOut(windowK(k, i, dots.length, 0.3));
      dot.scale.setScalar(Math.max(e, 0.001));
      dot.visible = e > 0.001;
    });
  });
  return group;
}

// ── pie ─────────────────────────────────────────────────────────────────────
function pieChart(def, data) {
  const w = def.width ?? 5.2;
  const h = 5.2;
  const total = data.reduce((a, d) => a + Math.max(d.value, 0), 0) || 1;
  const radius = Math.min(w, h) / 2 - 1.35;
  const centerY = -0.35;
  const px = toPx(w, h);

  const group = chartCard(def, w, h, (ctx) => {
    // legend under the pie
    ctx.font = `600 ${0.28 * PX}px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    let lx = 0.5 * PX;
    const [, ly] = px(0, -h / 2 + 0.55);
    data.forEach((d, i) => {
      ctx.fillStyle = seriesColor(def, i);
      ctx.fillRect(lx, ly - 0.22 * PX, 0.24 * PX, 0.24 * PX);
      ctx.fillStyle = palette.deepBrown;
      ctx.fillText(d.label, lx + 0.34 * PX, ly);
      lx += 0.34 * PX + ctx.measureText(d.label).width + 0.4 * PX;
    });
  });

  let angle = Math.PI / 2; // start at 12 o'clock
  const wedges = data.map((d, i) => {
    const sweep = (Math.max(d.value, 0) / total) * Math.PI * 2;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.absarc(0, 0, radius, angle, angle - sweep, true);
    shape.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false, curveSegments: 10 });
    const wedge = paperMesh(geo, seriesColor(def, i), i + 3, 0.05);
    const mid = angle - sweep / 2;
    wedge.position.set(0, centerY, 0.1);
    wedge.userData.explode = new THREE.Vector2(Math.cos(mid), Math.sin(mid));
    group.add(wedge);
    angle -= sweep;
    return wedge;
  });

  growDriver(group, (k) => {
    wedges.forEach((wedge, i) => {
      const e = ease.backOut(windowK(k, i, wedges.length, 0.4));
      wedge.scale.setScalar(Math.max(e, 0.001));
      wedge.visible = e > 0.001;
      // tiny radial explode as each slice lands
      const out = 0.06 * e;
      wedge.position.x = wedge.userData.explode.x * out;
      wedge.position.y = centerY + wedge.userData.explode.y * out;
    });
  });
  return group;
}

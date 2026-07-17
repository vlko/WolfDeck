import * as THREE from 'three';
import { makeCard, cardOptsFrom, growDriver, windowK, FONT_STACK, PX } from './card.js';
import { paperMesh } from '../assets/helpers.js';
import { palette, chartColors } from '../assets/palette.js';
import { ease } from '../engine/tween.js';
import { warn } from '../config.js';

// chart part — fields: chart: "bar"|"barh"|"line"|"pie", title?,
// data: [{label, value, plan?, display?}], series?/labels? (grouped bars),
// colors?, width?, height?, valueLabels?, donut?, centerLabel?, centerSub?,
// legendValues? + shared card fields (cardColor, accentColor, card: false).
// A papercraft backing card carries title/labels/legends (canvas); the data
// itself is real 3D — boxes, an extruded ribbon, extruded pie wedges —
// standing proud of the card. Grow-in runs after the card lands;
// mash-forward snaps it via the shared tween system.

function seriesColor(def, i) {
  const list = Array.isArray(def.colors) && def.colors.length ? def.colors : chartColors;
  return list[i % list.length];
}

// Slovak-style number: thousands grouped with thin spaces, comma decimals.
function fmt(v) {
  const s = Math.abs(v) >= 100 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1).replace('.', ',');
  const [int, frac] = s.split(',');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return frac != null ? `${grouped},${frac}` : grouped;
}

// World→canvas-px conversion for a card of size (w, h), origin at card center.
function toPx(w, h) {
  return (x, y) => [(x + w / 2) * PX, (h / 2 - y) * PX];
}

export function chartPart(def) {
  const kind = def.chart ?? 'bar';
  if (kind === 'bar' && Array.isArray(def.series) && def.series.length) {
    return groupedBarChart(def);
  }
  const data = Array.isArray(def.data)
    ? def.data.filter((d) => d && typeof d.value === 'number').map((d) => ({
      label: String(d.label ?? ''),
      value: d.value,
      plan: typeof d.plan === 'number' ? d.plan : null,
      display: d.display != null ? String(d.display) : null,
    }))
    : [];
  if (!data.length) {
    warn(`chart part "${def.title ?? ''}": no usable data`);
    return null; // caller falls back to placeholder
  }
  if (kind === 'bar') return barChart(def, data);
  if (kind === 'barh') return barhChart(def, data);
  if (kind === 'line') return lineChart(def, data);
  if (kind === 'pie') return pieChart(def, data);
  warn(`chart part: unknown chart kind "${kind}"`);
  return null;
}

function chartCard(def, w, h, drawExtra) {
  return makeCard(w, h, (ctx, wPx) => {
    if (def.title) {
      // shrink the title font until the whole line fits the card
      let size = 0.46 * PX;
      ctx.font = `700 ${size}px ${FONT_STACK}`;
      while (size > 0.24 * PX && ctx.measureText(def.title).width > wPx - 0.6 * PX) {
        size *= 0.94;
        ctx.font = `700 ${size}px ${FONT_STACK}`;
      }
      ctx.fillStyle = palette.ink;
      ctx.textAlign = 'center';
      ctx.fillText(def.title, wPx / 2, 0.72 * PX);
      ctx.fillStyle = palette.dustyRose;
      const tw = ctx.measureText(def.title).width;
      ctx.fillRect(wPx / 2 - tw / 2, 0.88 * PX, tw, 4);
    }
    if (drawExtra) drawExtra(ctx);
  }, cardOptsFrom(def));
}

// ── bar ─────────────────────────────────────────────────────────────────────
function barChart(def, data) {
  const w = def.width ?? 6;
  const h = def.height ?? 4.6;
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
    ctx.fillStyle = palette.ink;
    data.forEach((d, i) => {
      const [cx, cy] = px(-chartW / 2 + slot * (i + 0.5), baseY - 0.42);
      ctx.fillText(d.label, cx, cy);
    });
    if (def.valueLabels) {
      ctx.font = `700 ${0.26 * PX}px ${FONT_STACK}`;
      ctx.fillStyle = palette.inkMuted;
      data.forEach((d, i) => {
        const barH = Math.max((d.value / maxV) * chartH, 0.02);
        const [cx, cy] = px(-chartW / 2 + slot * (i + 0.5), baseY + barH + 0.28);
        ctx.fillText(d.display ?? fmt(d.value), cx, cy);
      });
    }
    // baseline
    ctx.fillStyle = palette.inkMuted;
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

// ── grouped bar ── def.series: [{name, values: [number]}], def.labels ──────
function groupedBarChart(def) {
  const series = def.series
    .filter((s) => s && Array.isArray(s.values))
    .map((s) => ({ name: String(s.name ?? ''), values: s.values.filter((v) => typeof v === 'number') }));
  const labels = Array.isArray(def.labels) ? def.labels.map(String) : [];
  const nGroups = Math.max(labels.length, ...series.map((s) => s.values.length), 0);
  if (!series.length || !nGroups) {
    warn(`chart part "${def.title ?? ''}": grouped bars need series[].values`);
    return null;
  }

  const w = def.width ?? 7;

  // legend entries flow into rows; the chart area shrinks to make room
  const legendFont = `600 ${0.27 * PX}px ${FONT_STACK}`;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = legendFont;
  const legendW = (w - 1.1) * PX;
  let legendRows = 1;
  let flowX = 0;
  const entries = series.map((s, i) => {
    const width = 0.32 * PX + measure.measureText(s.name).width + 0.38 * PX;
    if (flowX + width > legendW && flowX > 0) { legendRows += 1; flowX = 0; }
    const e = { name: s.name, color: seriesColor(def, i), x: flowX, row: legendRows - 1 };
    flowX += width;
    return e;
  });

  const h = def.height ?? 5 + (legendRows - 1) * 0.42;
  const baseY = -h / 2 + 0.85;
  const topY = h / 2 - 1.9 - (legendRows - 1) * 0.42; // headroom for the legend
  const chartH = topY - baseY;
  const chartW = w - 1.1;
  const maxV = Math.max(...series.flatMap((s) => s.values), 1e-9);
  const slot = chartW / nGroups;
  const barW = (slot * 0.72) / series.length;
  const px = toPx(w, h);

  const group = chartCard(def, w, h, (ctx) => {
    // legend row(s) under the title
    ctx.font = legendFont;
    ctx.textAlign = 'left';
    const ly0 = (def.title ? 1.35 : 0.6) * PX;
    entries.forEach((e) => {
      const ex = 0.55 * PX + e.x;
      const ey = ly0 + e.row * 0.42 * PX;
      ctx.fillStyle = e.color;
      ctx.fillRect(ex, ey - 0.2 * PX, 0.22 * PX, 0.22 * PX);
      ctx.fillStyle = palette.ink;
      ctx.fillText(e.name, ex + 0.32 * PX, ey);
    });
    ctx.textAlign = 'center';
    ctx.font = `600 ${0.3 * PX}px ${FONT_STACK}`;
    ctx.fillStyle = palette.ink;
    labels.forEach((label, g) => {
      const [cx, cy] = px(-chartW / 2 + slot * (g + 0.5), baseY - 0.42);
      ctx.fillText(label, cx, cy);
    });
    ctx.fillStyle = palette.inkMuted;
    const [bx, by] = px(-chartW / 2 - 0.1, baseY);
    ctx.fillRect(bx, by, (chartW + 0.2) * PX, 4);
  });

  const bars = [];
  series.forEach((s, si) => {
    for (let g = 0; g < nGroups; g += 1) {
      const v = s.values[g];
      if (typeof v !== 'number') continue;
      const barH = Math.max((v / maxV) * chartH, 0.02);
      const bar = paperMesh(new THREE.BoxGeometry(barW * 0.88, 1, 0.24), seriesColor(def, si), si * 7 + g + 1, 0.06);
      const x = -chartW / 2 + slot * (g + 0.5) + (si - (series.length - 1) / 2) * barW;
      bar.position.set(x, baseY, 0.13);
      group.add(bar);
      bars.push({ bar, barH, order: g * series.length + si });
    }
  });
  const n = bars.length;

  growDriver(group, (k) => {
    bars.forEach(({ bar, barH, order }) => {
      const e = ease.outCubic(windowK(k, order, n, 0.7));
      const cur = Math.max(barH * e, 0.001);
      bar.scale.y = cur;
      bar.position.y = baseY + cur / 2;
      bar.visible = e > 0.001;
    });
  });
  return group;
}

// ── barh ── horizontal bars, value labels at the bar ends. A datum with
// `plan` gets a muted full-length backing bar (plan-vs-actual comparison)
// and its label defaults to "value (pct %)".
function barhChart(def, data) {
  const w = def.width ?? 7;
  const rowH = 0.66;
  const topPad = def.title ? 1.5 : 0.55;
  const h = def.height ?? topPad + data.length * rowH + 0.5;
  const compare = data.some((d) => d.plan != null);
  const px = toPx(w, h);

  // label column: wide enough for the longest label, capped at 40% of card —
  // if the longest label wants more, the label font shrinks to fit the cap
  const measure = document.createElement('canvas').getContext('2d');
  let labelSize = 0.28 * PX;
  let labelFont = `600 ${labelSize}px ${FONT_STACK}`;
  measure.font = labelFont;
  const longest = Math.max(...data.map((d) => measure.measureText(d.label).width / PX)) + 0.4;
  if (longest > w * 0.4) {
    labelSize = Math.max(labelSize * (w * 0.4) / longest, 0.19 * PX);
    labelFont = `600 ${labelSize}px ${FONT_STACK}`;
    measure.font = labelFont;
  }
  const labelW = Math.min(
    Math.max(...data.map((d) => measure.measureText(d.label).width / PX)) + 0.4,
    w * 0.4,
  );
  // value texts sit past the bar ends — reserve room for the widest one so
  // even the longest bar's label stays on the card
  const valueText = (d) => {
    const pct = d.plan ? ` (${(d.value / d.plan * 100).toFixed(1).replace('.', ',')} %)` : '';
    return d.display ?? fmt(d.value) + pct;
  };
  measure.font = `600 ${0.26 * PX}px ${FONT_STACK}`;
  const valueW = def.valueLabels !== false
    ? Math.max(...data.map((d) => measure.measureText(valueText(d)).width / PX)) + 0.14
    : 0;
  const x0 = -w / 2 + labelW + 0.25; // bar baseline (world x)
  const spanW = Math.max(w - labelW - 0.55 - valueW, 1); // room for the bars
  const maxV = Math.max(...data.map((d) => Math.max(d.value, d.plan ?? 0)), 1e-9);
  const rowY = (i) => h / 2 - topPad - rowH * (i + 0.5);

  const group = chartCard(def, w, h, (ctx) => {
    ctx.textAlign = 'right';
    ctx.font = labelFont;
    ctx.fillStyle = palette.ink;
    data.forEach((d, i) => {
      const [cx, cy] = px(x0 - 0.18, rowY(i) - 0.1);
      ctx.fillText(d.label, cx, cy);
    });
    // value labels just past each bar's end
    ctx.textAlign = 'left';
    ctx.font = `600 ${0.26 * PX}px ${FONT_STACK}`;
    ctx.fillStyle = palette.inkMuted;
    if (def.valueLabels !== false) {
      data.forEach((d, i) => {
        const end = Math.max(d.value, d.plan ?? 0) / maxV * spanW;
        const [cx, cy] = px(x0 + end + 0.14, rowY(i) - 0.09);
        ctx.fillText(valueText(d), cx, cy);
      });
    }
    // vertical baseline the bars grow from
    ctx.fillStyle = palette.inkMuted;
    const [bx, topPx] = px(x0, rowY(0) + rowH / 2 - 0.06);
    const [, botPx] = px(x0, rowY(data.length - 1) - rowH / 2 + 0.06);
    ctx.fillRect(bx - 2, topPx, 4, botPx - topPx);
  });

  const bars = data.map((d, i) => {
    if (d.plan != null) {
      // muted backing bar showing the plan/target length
      const back = paperMesh(
        new THREE.BoxGeometry(1, rowH * 0.52, 0.1),
        palette.parchment, i + 11, 0.04,
      );
      const backL = Math.max((d.plan / maxV) * spanW, 0.02);
      back.scale.x = backL;
      back.position.set(x0 + backL / 2, rowY(i), 0.06);
      group.add(back);
    }
    const barL = Math.max((d.value / maxV) * spanW, 0.02);
    const bar = paperMesh(
      new THREE.BoxGeometry(1, rowH * (compare ? 0.4 : 0.52), 0.22),
      seriesColor(def, compare ? 0 : i), i + 1, 0.06,
    );
    bar.position.set(x0, rowY(i), 0.13);
    group.add(bar);
    return { bar, barL };
  });

  growDriver(group, (k) => {
    bars.forEach(({ bar, barL }, i) => {
      const e = ease.outCubic(windowK(k, i, bars.length, 0.6));
      const cur = Math.max(barL * e, 0.001);
      bar.scale.x = cur;
      bar.position.x = x0 + cur / 2;
      bar.visible = e > 0.001;
    });
  });
  return group;
}

// ── line ────────────────────────────────────────────────────────────────────
function lineChart(def, data) {
  const w = def.width ?? 6;
  const h = def.height ?? 4.6;
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
    ctx.fillStyle = palette.ink;
    data.forEach((d, i) => {
      const [cx, cy] = px(pts[i].x, baseY - 0.42);
      ctx.fillText(d.label, cx, cy);
    });
    if (def.valueLabels) {
      ctx.font = `700 ${0.26 * PX}px ${FONT_STACK}`;
      ctx.fillStyle = palette.inkMuted;
      data.forEach((d, i) => {
        const [cx, cy] = px(pts[i].x, pts[i].y + 0.42);
        ctx.fillText(d.display ?? fmt(d.value), cx, cy);
      });
    }
    ctx.fillStyle = palette.inkMuted;
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

// ── pie / donut ─────────────────────────────────────────────────────────────
// donut: true (or an inner-radius fraction 0..0.9) cuts a hole; centerLabel /
// centerSub float in the hole. legendValues: true appends each share's %.
function pieChart(def, data) {
  const w = def.width ?? 5.2;
  const total = data.reduce((a, d) => a + Math.max(d.value, 0), 0) || 1;
  const donut = def.donut === true ? 0.55 : (typeof def.donut === 'number' ? Math.min(Math.max(def.donut, 0), 0.9) : 0);

  // Legend entries flow into as many rows as they need; the card grows.
  const legendFont = `600 ${0.28 * PX}px ${FONT_STACK}`;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = legendFont;
  const entries = data.map((d, i) => {
    const pct = `${(Math.max(d.value, 0) / total * 100).toFixed(1).replace('.', ',')} %`;
    const text = def.legendValues ? `${d.label} · ${d.display ?? pct}` : d.label;
    return { text, width: 0.34 * PX + measure.measureText(text).width + 0.4 * PX, color: seriesColor(def, i) };
  });
  const legendW = (w - 0.9) * PX;
  let legendRows = 1;
  let lx = 0;
  for (const e of entries) {
    if (lx + e.width > legendW && lx > 0) { legendRows += 1; lx = 0; }
    e.row = legendRows - 1;
    e.x = lx;
    lx += e.width;
  }

  const h = def.height ?? 5.2 + (legendRows - 1) * 0.45;
  const radius = Math.min(w, 5.2) / 2 - 1.35;
  const innerR = radius * donut;
  const centerY = (h - 5.2) / 2 - 0.35 + (legendRows - 1) * 0.05;
  const px = toPx(w, h);

  // center label must fit the donut hole — shrink its font if needed
  let centerSize = 0.42 * PX;
  if (donut && def.centerLabel) {
    const holeW = innerR * 2 * PX * 0.88;
    measure.font = `800 ${centerSize}px ${FONT_STACK}`;
    while (centerSize > 0.16 * PX && measure.measureText(String(def.centerLabel)).width > holeW) {
      centerSize *= 0.93;
      measure.font = `800 ${centerSize}px ${FONT_STACK}`;
    }
  }

  const group = chartCard(def, w, h, (ctx) => {
    // legend under the pie
    ctx.font = legendFont;
    ctx.textAlign = 'left';
    const [, ly0] = px(0, -h / 2 + 0.55 + (legendRows - 1) * 0.42);
    entries.forEach((e) => {
      const exPx = 0.45 * PX + e.x;
      const eyPx = ly0 + e.row * 0.42 * PX;
      ctx.fillStyle = e.color;
      ctx.fillRect(exPx, eyPx - 0.22 * PX, 0.24 * PX, 0.24 * PX);
      ctx.fillStyle = palette.ink;
      ctx.fillText(e.text, exPx + 0.34 * PX, eyPx);
    });
    if (donut && (def.centerLabel || def.centerSub)) {
      ctx.textAlign = 'center';
      const [ccx, ccy] = px(0, centerY);
      if (def.centerLabel) {
        ctx.font = `800 ${centerSize}px ${FONT_STACK}`;
        ctx.fillStyle = palette.ink;
        ctx.fillText(String(def.centerLabel), ccx, ccy + (def.centerSub ? -0.02 * PX : 0.12 * PX));
      }
      if (def.centerSub) {
        ctx.font = `600 ${0.22 * PX}px ${FONT_STACK}`;
        ctx.fillStyle = palette.inkMuted;
        ctx.fillText(String(def.centerSub), ccx, ccy + 0.3 * PX);
      }
    }
  });

  let angle = Math.PI / 2; // start at 12 o'clock
  const wedges = data.map((d, i) => {
    const sweep = (Math.max(d.value, 0) / total) * Math.PI * 2;
    const shape = new THREE.Shape();
    if (innerR > 0) {
      // ring segment: outer arc, then back along the inner arc
      shape.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      shape.absarc(0, 0, radius, angle, angle - sweep, true);
      shape.lineTo(Math.cos(angle - sweep) * innerR, Math.sin(angle - sweep) * innerR);
      shape.absarc(0, 0, innerR, angle - sweep, angle, false);
    } else {
      shape.moveTo(0, 0);
      shape.absarc(0, 0, radius, angle, angle - sweep, true);
      shape.lineTo(0, 0);
    }
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

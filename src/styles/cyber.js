// cyber — a cyberpunk display. The light window's rougher cousin: a black frame with
// cut corners, a magenta and a cyan neon line, colour-split ghost outlines
// that twitch now and then, a hazard tab, and a scan bar sliding down the
// glass. Still a bright, readable screen in the middle.
import * as THREE from 'three';
import { shadedColors } from '../assets/materials.js';
import { flat, canvasTexture, blurRect } from './util.js';

const BODY = '#0d0e15';
const MAGENTA = '#ff2bd6';
const CYAN = '#19f0ff';
const YELLOW = '#fcee0a';

// Rectangle with the top-right and bottom-left corners cut off.
function cut(w, h, c, Ctor = THREE.Shape) {
  const x = w / 2;
  const y = h / 2;
  return new Ctor([
    new THREE.Vector2(-x, y), new THREE.Vector2(x - c, y), new THREE.Vector2(x, y - c),
    new THREE.Vector2(x, -y), new THREE.Vector2(-x + c, -y), new THREE.Vector2(-x, -y + c),
  ]);
}
function cutRing(wo, ho, co, wi, hi, ci) {
  const s = cut(wo, ho, co);
  s.holes.push(cut(wi, hi, ci, THREE.Path));
  return s;
}

let scanTex = null;
let barTex = null;
let hazardTex = null;
function textures() {
  if (!scanTex) {
    scanTex = canvasTexture(4, 6, (ctx) => {
      ctx.fillStyle = 'rgba(120,20,160,0.09)';
      ctx.fillRect(0, 0, 4, 2);
    });
    scanTex.wrapS = scanTex.wrapT = THREE.RepeatWrapping;
    barTex = canvasTexture(4, 64, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.8, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    hazardTex = canvasTexture(64, 16, (ctx, w, h) => {
      ctx.fillStyle = YELLOW;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#111';
      for (let x = -16; x < w + 16; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, h); ctx.lineTo(x + 8, h); ctx.lineTo(x + 16, 0); ctx.lineTo(x + 8, 0);
        ctx.fill();
      }
    });
    hazardTex.wrapS = THREE.RepeatWrapping;
  }
  return { scanTex, barTex, hazardTex };
}

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

const panel = {
  face: { fill: '#f0fbff', grain: false, radius: 0 },
  float: false,
  // Boots with a glitch: the panel stutters in — flickering, jumping
  // sideways, stretched in bands — and snaps into register.
  revealDuration: 0.6,
  reveal(content, k, ctx) {
    if (ctx.glitchSeed == null) ctx.glitchSeed = Math.random() * 100;
    const step = Math.floor(k * 16); // the stutter runs in 16 frames
    const rnd = (n) => {
      const x = Math.sin((step + 1) * 12.9898 + n * 78.233 + ctx.glitchSeed) * 43758.5453;
      return x - Math.floor(x);
    };
    const wild = k >= 1 ? 0 : (1 - k) ** 1.5; // how far out of register
    // flicker: mostly dark at first, solid by the end
    content.visible = k >= 1 || rnd(1) < 0.35 + k * 0.9;
    content.position.x = (rnd(2) - 0.5) * 1.1 * wild;
    content.position.y = (rnd(3) - 0.5) * 0.25 * wild;
    content.scale.set(1 + (rnd(4) - 0.3) * 0.5 * wild, Math.max(0.05, 1 - rnd(5) * 0.9 * wild), 1);
  },
  update(content, t, ctx) {
    if (!ctx.cy) {
      ctx.cy = { phase: Math.random() * 10 };
      content.traverse((o) => { if (o.userData.cy) ctx.cy[o.userData.cy] = o; });
    }
    const { scan, ghostL, ghostR, phase } = ctx.cy;
    if (scan) {
      // slides down the glass, then waits a while off-screen
      const k = ((t * 0.22 + phase) % 1.6) / 1.0;
      scan.visible = k < 1;
      scan.position.y = scan.userData.top - k * scan.userData.travel;
    }
    if (ghostL && ghostR) {
      // a short twitch every few seconds
      const burst = Math.sin(t * 1.3 + phase) * Math.sin(t * 0.71 + phase * 2) > 0.86 ? 1 : 0;
      const j = burst * (Math.sin(t * 47) > 0 ? 0.09 : -0.04);
      ghostL.position.x = -0.05 - j;
      ghostR.position.x = 0.05 + j;
      ghostL.position.y = burst * 0.03;
    }
  },
  backing(w, h) {
    const { scanTex: lines, barTex: bar, hazardTex: hazard } = textures();
    const out = [];
    const c = Math.min(0.34, h * 0.14);

    // two-tone halo: magenta up-left, cyan down-right
    for (const [color, dx, dy] of [[MAGENTA, -0.22, 0.16], [CYAN, 0.22, -0.16]]) {
      const b = blurRect(w, h, 1.3, 0.42);
      const halo = flat(new THREE.PlaneGeometry(b.W, b.H), color, -0.22, { map: b.texture, opacity: 0.42, ...additive });
      halo.position.x = dx;
      halo.position.y = dy;
      halo.renderOrder = -1;
      out.push(halo);
    }

    // colour-split ghosts of the outline
    for (const [key, color] of [['ghostL', MAGENTA], ['ghostR', CYAN]]) {
      const g = flat(new THREE.ShapeGeometry(cutRing(w + 0.36, h + 0.36, c + 0.1, w + 0.28, h + 0.28, c + 0.07)), color, -0.04, {
        opacity: 0.75, ...additive,
      });
      g.userData.cy = key;
      out.push(g);
    }

    // the frame: black, cut corners, proud of the glass
    const geo = new THREE.ExtrudeGeometry(cutRing(w + 0.2, h + 0.2, c + 0.06, w - 0.2, h - 0.2, c - 0.02), {
      depth: 0.18, bevelEnabled: false,
    });
    geo.translate(0, 0, -0.08);
    out.push(new THREE.Mesh(shadedColors(geo, 5, 0.02), new THREE.MeshBasicMaterial({ color: BODY, vertexColors: true })));
    out.push(flat(new THREE.ShapeGeometry(cut(w + 0.18, h + 0.18, c + 0.05)), '#07070b', -0.07));

    // neon: magenta round the outside, a cyan hairline on the glass
    out.push(flat(new THREE.ShapeGeometry(cutRing(w + 0.27, h + 0.27, c + 0.085, w + 0.2, h + 0.2, c + 0.06)), MAGENTA, 0.0));
    out.push(flat(new THREE.ShapeGeometry(cutRing(w - 0.2, h - 0.2, c - 0.02, w - 0.25, h - 0.25, c - 0.04)), CYAN, 0.102));

    // hardware details: a hazard tab under the bottom-right, a cyan block top-left
    const tabW = Math.min(1.5, w * 0.34);
    const ht = hazard.clone();
    ht.needsUpdate = true;
    ht.repeat.set(tabW * 2.4, 1);
    const tab = flat(new THREE.PlaneGeometry(tabW, 0.14), 0xffffff, 0.0, { map: ht });
    tab.position.set(w / 2 - tabW / 2 - 0.1, -h / 2 - 0.24, 0.0);
    out.push(tab);
    const block = flat(new THREE.PlaneGeometry(0.62, 0.07), CYAN, 0.0);
    block.position.set(-w / 2 + 0.31, h / 2 + 0.2, 0.0);
    out.push(block);
    const pip = flat(new THREE.PlaneGeometry(0.1, 0.07), MAGENTA, 0.0);
    pip.position.set(-w / 2 + 0.74, h / 2 + 0.2, 0.0);
    out.push(pip);

    // scanlines, and a bar of light that slides down the glass
    const lt = lines.clone();
    lt.needsUpdate = true;
    lt.repeat.set(1, h * 16);
    const overlay = flat(new THREE.PlaneGeometry(w - 0.2, h - 0.2), 0xffffff, 0.014, { map: lt, transparent: true, depthWrite: false });
    overlay.renderOrder = 1;
    out.push(overlay);
    const barH = 0.5;
    const scan = flat(new THREE.PlaneGeometry(w - 0.22, barH), CYAN, 0.016, { map: bar, opacity: 0.22, ...additive });
    scan.renderOrder = 2;
    scan.userData.cy = 'scan';
    scan.userData.top = h / 2 - 0.1 - barH / 2;
    scan.userData.travel = h - 0.2 - barH;
    scan.position.y = scan.userData.top;
    out.push(scan);
    return out;
  },
};

// ── titles: neon signage ─────────────────────────────────────────────────
// The heading is a black cut-corner bar with white lettering split into a
// magenta and a cyan ghost; the kicker is a yellow hazard chip, the subtitle
// a black bar with cyan text.
function cutPath(ctx, x, y, w, h, c) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.closePath();
}
function bar(ctx, c, { pad, cutSize, fill, edge, glow = true, line = null }) {
  const { width: w, height: h } = c;
  if (glow) {
    for (const [color, dx, dy] of [['rgba(255,43,214,0.9)', -pad * 0.25, pad * 0.12], ['rgba(25,240,255,0.9)', pad * 0.25, -pad * 0.12]]) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = pad * 0.8;
      ctx.shadowOffsetX = dx;
      ctx.shadowOffsetY = dy;
      ctx.fillStyle = fill;
      cutPath(ctx, pad, pad, w - pad * 2, h - pad * 2, cutSize);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.fillStyle = fill;
  cutPath(ctx, pad, pad, w - pad * 2, h - pad * 2, cutSize);
  ctx.fill();
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(2, pad * 0.12);
    ctx.stroke();
  }
  if (line) {
    ctx.fillStyle = line;
    ctx.fillRect(pad * 1.6, h - pad * 1.42, (w - pad * 3.2) * 0.62, Math.max(2, pad * 0.1));
    ctx.fillStyle = YELLOW;
    ctx.fillRect(pad * 1.6 + (w - pad * 3.2) * 0.66, h - pad * 1.42, pad * 0.9, Math.max(2, pad * 0.1));
  }
}

export const title = {
  kickerColor: '#0d0e15',
  subtitleColor: '#c8fbff',
  labelPad: 1.6,
  heading(L, { paint, size }) {
    const margin = Math.round(size * 0.4);
    const split = size * 0.035;
    return [{
      canvas: paint(L, '#f4feff', {
        margin,
        before: (ctx, c) => bar(ctx, c, { pad: size * 0.3, cutSize: size * 0.32, fill: BODY, edge: MAGENTA, line: CYAN }),
        passes: [
          { color: MAGENTA, dx: -split, dy: split * 0.3 },
          { color: CYAN, dx: split, dy: -split * 0.3, composite: 'lighter' },
          { color: '#f4feff' },
        ],
      }),
    }];
  },
  label(ctx, c, { kind, size }) {
    if (kind === 'kicker') bar(ctx, c, { pad: size * 0.34, cutSize: size * 0.34, fill: YELLOW, edge: null, glow: false });
    else bar(ctx, c, { pad: size * 0.3, cutSize: size * 0.3, fill: BODY, edge: CYAN });
  },
};

// The title block enters the way the panels do.
title.reveal = panel.reveal;
title.revealDuration = panel.revealDuration;

export default panel;

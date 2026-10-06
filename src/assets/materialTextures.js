import * as THREE from 'three';

// Procedural material textures for the 3D models: wood, bricks, roof tiles,
// plaster, fur, wool… Every texture is GRAYSCALE CENTERED ON WHITE — it
// multiplies the model's own color, so the palette stays in the models and
// a texture only adds the material's tooth (and, read as a height, a faint
// relief). Contrast is kept low on purpose: the models are still storybook
// paper, the texture just tells wood from plaster.
//
// Every generator draws on a seamless tile: shapes crossing an edge are
// drawn again on the opposite side (wrap()).

function seeded(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  return { c, ctx };
}

// draw(ox, oy) is called for the 9 tile offsets, so shapes wrap seamlessly.
function wrap(size, draw) {
  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) draw(ox, oy);
}

const gray = (v, a = 1) => `rgba(${v},${v},${v - 2},${a})`;

// fine paper speckle on top of every material (same tooth as the sheets)
function speckle(ctx, size, r, amount = 10) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// soft low-frequency mottling, so big flat walls are not dead even
function mottle(ctx, size, r, count = 18, a = 0.05) {
  for (let i = 0; i < count; i += 1) {
    const x = r() * size;
    const y = r() * size;
    const rad = size * (0.08 + r() * 0.2);
    const dark = r() < 0.55;
    wrap(size, (ox, oy) => {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      g.addColorStop(0, dark ? `rgba(60,55,45,${a})` : `rgba(255,255,255,${a * 1.4})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    });
  }
}

// ── generators (size px, return canvas) ──────────────────────────────────

const GEN = {
  // long grain lines along x with a knot or two
  wood(size, r) {
    const { c, ctx } = canvas(size);
    mottle(ctx, size, r, 10, 0.04);
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i += 1) {
      const y = r() * size;
      const amp = 0.8 + r() * 2.2;
      const ph = r() * 6.28;
      const k = (1 + Math.floor(r() * 2)) * (Math.PI * 2 / size); // whole waves per tile
      ctx.strokeStyle = gray(150 + r() * 60, 0.22 + r() * 0.2);
      ctx.lineWidth = 0.8 + r() * 1.6;
      wrap(size, (ox, oy) => {
        if (ox) return;
        ctx.beginPath();
        for (let x = 0; x <= size; x += 4) {
          const yy = y + oy + Math.sin(x * k + ph) * amp;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      });
    }
    for (let i = 0; i < 1; i += 1) {
      const x = r() * size;
      const y = r() * size;
      wrap(size, (ox, oy) => {
        for (let k = 2; k > 0; k -= 1) {
          ctx.strokeStyle = gray(150, 0.25);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(x + ox, y + oy, 3 + k * 4, 2 + k * 1.6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }
    speckle(ctx, size, r, 8);
    return c;
  },

  // horizontal boards with dark seams and staggered butt joints
  planks(size, r) {
    const c = GEN.wood(size, r);
    const ctx = c.getContext('2d');
    const rows = 6;
    const h = size / rows;
    for (let i = 0; i < rows; i += 1) {
      const y = i * h;
      ctx.fillStyle = gray(120, 0.55);
      ctx.fillRect(0, y, size, 2);
      ctx.fillStyle = gray(255, 0.35);
      ctx.fillRect(0, y + 2, size, 1.5);
      ctx.fillStyle = gray(225 + r() * 30, 0.25);
      ctx.fillRect(0, y + 3, size, h - 3);
      const jx = r() * size;
      ctx.fillStyle = gray(130, 0.5);
      ctx.fillRect(jx, y, 2, h);
    }
    return c;
  },

  // running-bond bricks with mortar joints and per-brick tone
  brick(size, r) {
    const { c, ctx } = canvas(size);
    const rows = 8;
    const cols = 4;
    const h = size / rows;
    const w = size / cols;
    ctx.fillStyle = gray(200);
    ctx.fillRect(0, 0, size, size); // mortar
    for (let j = 0; j < rows; j += 1) {
      const off = (j % 2) * w / 2;
      for (let i = -1; i < cols; i += 1) {
        const v = 228 + r() * 27;
        ctx.fillStyle = gray(Math.min(255, v));
        const x = i * w + off;
        ctx.fillRect(x + 2, j * h + 2, w - 4, h - 4);
        // lit top edge, shaded bottom edge — reads as relief
        ctx.fillStyle = gray(255, 0.5);
        ctx.fillRect(x + 2, j * h + 2, w - 4, 1.5);
        ctx.fillStyle = gray(170, 0.35);
        ctx.fillRect(x + 2, j * h + h - 3.5, w - 4, 1.5);
      }
    }
    mottle(ctx, size, r, 14, 0.05);
    speckle(ctx, size, r, 12);
    return c;
  },

  // overlapping scalloped roof tiles
  roofTile(size, r) {
    const { c, ctx } = canvas(size);
    const rows = 8;
    const cols = 6;
    const h = size / rows;
    const w = size / cols;
    for (let j = 0; j < rows; j += 1) {
      const off = (j % 2) * w / 2;
      for (let i = -1; i <= cols; i += 1) {
        const x = i * w + off;
        const y = j * h;
        const v = 232 + r() * 23;
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, gray(Math.min(255, v + 10)));
        g.addColorStop(0.85, gray(v - 18));
        g.addColorStop(1, gray(165));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 1, y + h * 0.55);
        ctx.quadraticCurveTo(x + w / 2, y + h * 1.15, x + w - 1, y + h * 0.55);
        ctx.lineTo(x + w - 1, y);
        ctx.closePath();
        ctx.fill();
      }
    }
    speckle(ctx, size, r, 10);
    return c;
  },

  // flat rectangular shingles / slate
  shingle(size, r) {
    const { c, ctx } = canvas(size);
    const rows = 8;
    const cols = 5;
    const h = size / rows;
    for (let j = 0; j < rows; j += 1) {
      let x = -r() * 20;
      while (x < size) {
        const w = size / cols * (0.7 + r() * 0.6);
        ctx.fillStyle = gray(225 + r() * 30);
        ctx.fillRect(x + 1.5, j * h, w - 3, h - 2);
        ctx.fillStyle = gray(160, 0.5);
        ctx.fillRect(x + 1.5, j * h + h - 3, w - 3, 2);
        x += w;
      }
    }
    speckle(ctx, size, r, 10);
    return c;
  },

  // straw / thatch — dense short strokes, mostly vertical
  straw(size, r) {
    const { c, ctx } = canvas(size);
    ctx.lineCap = 'round';
    for (let i = 0; i < 900; i += 1) {
      const x = r() * size;
      const y = r() * size;
      const len = 10 + r() * 22;
      const a = Math.PI / 2 + (r() - 0.5) * 0.35;
      ctx.strokeStyle = r() < 0.5 ? gray(170 + r() * 50, 0.35) : gray(255, 0.4);
      ctx.lineWidth = 0.8 + r() * 1.2;
      wrap(size, (ox, oy) => {
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
        ctx.stroke();
      });
    }
    return c;
  },

  // rendered wall — soft blotches and fine sand
  plaster(size, r) {
    const { c, ctx } = canvas(size);
    mottle(ctx, size, r, 30, 0.032);
    speckle(ctx, size, r, 16);
    return c;
  },

  // irregular fieldstones with light mortar joints
  stone(size, r) {
    const { c, ctx } = canvas(size);
    ctx.fillStyle = gray(212);
    ctx.fillRect(0, 0, size, size);
    const rows = 5;
    const h = size / rows;
    for (let j = 0; j < rows; j += 1) {
      const widths = [];
      let total = 0;
      while (total < size - h * 0.6) { const w = h * (0.9 + r() * 0.8); widths.push(w); total += w; }
      const k = size / total; // whole stones per row → seamless in x
      let x = (j % 2) * h * 0.5;
      for (const w0 of widths) {
        const w = w0 * k;
        const v = 228 + r() * 27;
        // a cell-filling stone: an octagon with clipped, jittered corners
        const hw = w / 2 - 2;
        const hh = h / 2 - 2;
        const cut = Math.min(hw, hh) * 0.35;
        const j3 = () => (r() - 0.5) * 3;
        const pts = [
          [-hw + cut + j3(), -hh], [hw - cut + j3(), -hh], [hw, -hh + cut + j3()], [hw, hh - cut + j3()],
          [hw - cut + j3(), hh], [-hw + cut + j3(), hh], [-hw, hh - cut + j3()], [-hw, -hh + cut + j3()],
        ];
        const cx = x + w / 2;
        const cy = j * h + h / 2;
        wrap(size, (ox, oy) => {
          if (oy) return;
          ctx.fillStyle = gray(Math.min(255, v));
          ctx.beginPath();
          pts.forEach(([px, py], i) => (i ? ctx.lineTo(cx + ox + px, cy + py) : ctx.moveTo(cx + ox + px, cy + py)));
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = gray(255, 0.3);
          ctx.beginPath();
          ctx.ellipse(cx + ox - w * 0.1, cy - h * 0.14, w * 0.25, h * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        x += w;
      }
    }
    speckle(ctx, size, r, 12);
    return c;
  },

  // short soft fur strokes, gently downward
  fur(size, r) {
    const { c, ctx } = canvas(size);
    mottle(ctx, size, r, 10, 0.04);
    ctx.lineCap = 'round';
    for (let i = 0; i < 1400; i += 1) {
      const x = r() * size;
      const y = r() * size;
      const len = 6 + r() * 9;
      const a = Math.PI / 2 + (r() - 0.5) * 0.9;
      ctx.strokeStyle = r() < 0.55 ? gray(165 + r() * 40, 0.4) : gray(255, 0.6);
      ctx.lineWidth = 0.9 + r() * 1;
      wrap(size, (ox, oy) => {
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
        ctx.stroke();
      });
    }
    return c;
  },

  // tight curls
  wool(size, r) {
    const { c, ctx } = canvas(size);
    for (let i = 0; i < 260; i += 1) {
      const x = r() * size;
      const y = r() * size;
      const rad = 4 + r() * 6;
      const tone = 200 + r() * 25;
      wrap(size, (ox, oy) => {
        ctx.strokeStyle = gray(tone - 8, 0.4);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, rad, 0.3, Math.PI * 1.7);
        ctx.stroke();
        ctx.fillStyle = gray(255, 0.35);
        ctx.beginPath();
        ctx.arc(x + ox - rad * 0.25, y + oy - rad * 0.25, rad * 0.45, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    speckle(ctx, size, r, 8);
    return c;
  },

  // woven cloth
  fabric(size, r) {
    const { c, ctx } = canvas(size);
    const step = 4;
    for (let y = 0; y < size; y += step) {
      ctx.fillStyle = gray(222 + r() * 12, 0.6);
      ctx.fillRect(0, y, size, step / 2);
    }
    for (let x = 0; x < size; x += step) {
      ctx.fillStyle = gray(225 + r() * 12, 0.35);
      ctx.fillRect(x, 0, step / 2, size);
    }
    mottle(ctx, size, r, 10, 0.04);
    speckle(ctx, size, r, 8);
    return c;
  },

  // painted sheet metal: faint horizontal brushing + soft wear
  metal(size, r) {
    const { c, ctx } = canvas(size);
    for (let i = 0; i < 160; i += 1) {
      const y = r() * size;
      ctx.fillStyle = r() < 0.5 ? gray(225, 0.12) : gray(255, 0.25);
      ctx.fillRect(0, y, size, 0.6 + r() * 1.2);
    }
    mottle(ctx, size, r, 12, 0.035);
    return c;
  },

  // overlapping little leaves
  leaf(size, r) {
    const { c, ctx } = canvas(size);
    for (let i = 0; i < 420; i += 1) {
      const x = r() * size;
      const y = r() * size;
      const s = 5 + r() * 7;
      const a = r() * Math.PI * 2;
      const v = 205 + r() * 50;
      wrap(size, (ox, oy) => {
        ctx.save();
        ctx.translate(x + ox, y + oy);
        ctx.rotate(a);
        ctx.fillStyle = gray(Math.min(255, v), 0.55);
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = gray(175, 0.35);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.lineTo(s, 0);
        ctx.stroke();
        ctx.restore();
      });
    }
    return c;
  },

  // vertical bark ridges
  bark(size, r) {
    const { c, ctx } = canvas(size);
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i += 1) {
      const x = r() * size;
      const y = r() * size;
      const len = 30 + r() * 70;
      ctx.strokeStyle = gray(140 + r() * 60, 0.35);
      ctx.lineWidth = 1.5 + r() * 2.5;
      const end = (r() - 0.5) * 4;
      wrap(size, (ox, oy) => {
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.bezierCurveTo(x + ox + 4, y + oy + len / 3, x + ox - 4, y + oy + len * 0.66, x + ox + end, y + oy + len);
        ctx.stroke();
      });
    }
    speckle(ctx, size, r, 12);
    return c;
  },

  // road asphalt: dense fine grit
  asphalt(size, r) {
    const { c, ctx } = canvas(size);
    for (let i = 0; i < 2600; i += 1) {
      ctx.fillStyle = r() < 0.5 ? gray(190 + r() * 40, 0.5) : gray(255, 0.5);
      ctx.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
    }
    mottle(ctx, size, r, 12, 0.05);
    return c;
  },
};

// Tile size in WORLD units (the shader scales object coords by the object's
// world scale, so a brick is a brick on a cottage and on the town hall) and
// relief strength.
export const TEXTURE_KINDS = {
  wood: { tile: 1.6, bump: 0.6 },
  planks: { tile: 1.4, bump: 1.2 },
  brick: { tile: 1.3, bump: 1.4 },
  roofTile: { tile: 1.3, bump: 1.6 },
  shingle: { tile: 1.3, bump: 1.2 },
  straw: { tile: 1.0, bump: 0.8, tri: true },
  plaster: { tile: 2.4, bump: 0.5, tri: true },
  stone: { tile: 1.2, bump: 1.4 },
  fur: { tile: 0.8, bump: 0.8, tri: true },
  wool: { tile: 0.7, bump: 0.7, tri: true },
  fabric: { tile: 0.5, bump: 0.4, tri: true },
  metal: { tile: 2.0, bump: 0.2, tri: true },
  leaf: { tile: 0.9, bump: 0.9, tri: true },
  bark: { tile: 0.8, bump: 1.0, tri: true },
  asphalt: { tile: 1.5, bump: 0.4, tri: true },
};

const textures = new Map();

export function getMaterialTexture(kind) {
  if (!textures.has(kind)) {
    const gen = GEN[kind];
    if (!gen) throw new Error(`unknown texture kind "${kind}"`);
    const tex = new THREE.CanvasTexture(gen(256, seeded(kind.length * 97 + kind.charCodeAt(0))));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    textures.set(kind, tex);
  }
  return textures.get(kind);
}

// ?tex=0 turns material textures off (comparison, very weak GPUs).
export const texturesEnabled = typeof window === 'undefined'
  || new URLSearchParams(window.location.search).get('tex') !== '0';

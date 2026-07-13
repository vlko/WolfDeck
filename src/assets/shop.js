import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, blobShadow, applyAnimation,
} from './helpers.js';

// The shop pack, built from the "shop.png" reference sheet: the corner shop
// with its striped scalloped awning, a market stall, produce crates and
// baskets, flour sacks, a bread shelf, a swinging hanging sign, a shopping
// cart, a weighing scale, potted flowers — and big-headed shopkeepers.

const PRODUCE_COLORS = {
  fruit: [palette.strawGold, palette.tanBrown, palette.roseMauve],
  greens: [palette.sage, palette.pine],
  plums: [palette.roseMauve, palette.dustyRose],
};

function produceBall(color, size, seed) {
  return paperMesh(new THREE.IcosahedronGeometry(size, 0), color, seed, 0.08);
}

// ── shopBuilding ────────────────────────────────────────────────────────────
// Cream shop with a duck-egg skirting and the signature striped scalloped
// awning. options: seed, width, wallColor, awningColor, stripeColor
function shopBuilding(options = {}) {
  const seed = options.seed ?? 0;
  const width = options.width ?? 4.2;
  const depth = width * 0.55;
  const wallH = 2.4;
  const wallColor = options.wallColor ?? palette.cream;
  const awningColor = options.awningColor ?? palette.sage;
  const stripeColor = options.stripeColor ?? palette.paperWhite;

  const group = new THREE.Group();

  const body = paperMesh(new THREE.BoxGeometry(width, wallH, depth), wallColor, seed, 0.04);
  body.position.y = wallH / 2;
  group.add(body);

  // duck-egg skirting band
  const skirt = paperMesh(new THREE.BoxGeometry(width + 0.04, 0.5, depth + 0.04), palette.duckEggBlue, seed + 1, 0.05);
  skirt.position.y = 0.25;
  group.add(skirt);

  const front = depth / 2 + 0.01;

  // dark plank door
  const door = paperMesh(new THREE.BoxGeometry(0.85, 1.5, 0.07), palette.deepBrown, seed + 2, 0.04);
  door.position.set(-width * 0.22, 0.78, front);
  group.add(door);
  const knob = paperMesh(new THREE.IcosahedronGeometry(0.045, 0), palette.charcoal, seed + 3);
  knob.position.set(-width * 0.22 + 0.3, 0.82, front + 0.05);
  group.add(knob);

  // four-pane window
  const winFrame = paperMesh(new THREE.BoxGeometry(1.05, 0.95, 0.06), palette.paperWhite, seed + 4, 0.03);
  winFrame.position.set(width * 0.2, 1.25, front);
  group.add(winFrame);
  for (const px of [-1, 1]) {
    for (const py of [-1, 1]) {
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.36),
        new THREE.MeshBasicMaterial({ color: palette.charcoal }),
      );
      pane.position.set(width * 0.2 + px * 0.24, 1.25 + py * 0.22, front + 0.04);
      group.add(pane);
    }
  }

  // striped awning roof: alternating sloped stripes + scallop tips
  const awning = new THREE.Group();
  const slope = 0.5; // radians
  const awningW = width + 0.9;
  const stripeW = awningW / Math.round(awningW / 0.55);
  const stripeLen = depth * 0.9 + 0.7;
  const count = Math.round(awningW / stripeW);
  for (let i = 0; i < count; i += 1) {
    const color = i % 2 ? stripeColor : awningColor;
    const x = -awningW / 2 + stripeW * (i + 0.5);
    const stripe = paperMesh(new THREE.BoxGeometry(stripeW, 0.07, stripeLen), color, seed + 10 + i, 0.05);
    stripe.position.set(x, 0, 0);
    awning.add(stripe);
    // scallop: half-disc hanging from the stripe's front edge
    const scallop = paperMesh(
      new THREE.CylinderGeometry(stripeW / 2, stripeW / 2, 0.06, 8, 1, false, Math.PI / 2, Math.PI),
      color, seed + 30 + i, 0.05,
    );
    scallop.rotation.z = Math.PI / 2;
    scallop.rotation.y = Math.PI / 2;
    scallop.position.set(x, -0.02, stripeLen / 2);
    awning.add(scallop);
  }
  awning.rotation.x = slope;
  // place so the scalloped front edge overhangs the facade by ~0.4
  awning.position.set(
    0,
    wallH + 0.55,
    depth / 2 + 0.4 - (stripeLen / 2) * Math.cos(slope),
  );
  group.add(awning);

  group.add(blobShadow(width * 0.62));
  return group;
}

// ── marketStall ─────────────────────────────────────────────────────────────
// Brick-based stall with a counter, side posts, a flat canopy, a produce
// basket and a little register on the counter. options: seed, canopyColor
function marketStall(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();

  // brick base — heavy facet jitter sells the brick pattern
  const base = paperMesh(new THREE.BoxGeometry(3.0, 1.1, 1.1, 4, 2, 1), palette.parchment, seed, 0.12);
  base.position.y = 0.55;
  group.add(base);
  const counter = paperMesh(new THREE.BoxGeometry(3.3, 0.12, 1.3), palette.tanBrown, seed + 1, 0.05);
  counter.position.y = 1.16;
  group.add(counter);

  for (const side of [-1, 1]) {
    const post = paperMesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), palette.barkBrown, seed + 2 + side);
    post.position.set(side * 1.45, 1.22 + 0.75, -0.35);
    group.add(post);
  }
  const canopy = paperMesh(new THREE.BoxGeometry(3.7, 0.12, 1.7), palette.parchment, seed + 5, 0.06);
  canopy.position.set(0, 2.75, -0.1);
  canopy.rotation.x = 0.1;
  group.add(canopy);

  // basket of produce on the counter
  const basketMesh = paperMesh(new THREE.CylinderGeometry(0.3, 0.22, 0.3, 9), palette.tanBrown, seed + 6, 0.07);
  basketMesh.position.set(-0.9, 1.36, 0.1);
  group.add(basketMesh);
  const r = rng(seed + 7);
  for (let i = 0; i < 4; i += 1) {
    const ball = produceBall(PRODUCE_COLORS.fruit[i % 3], 0.11, seed + 8 + i);
    ball.position.set(-0.9 + (r() - 0.5) * 0.3, 1.55, 0.1 + (r() - 0.5) * 0.25);
    group.add(ball);
  }

  // tiny register
  const regBase = paperMesh(new THREE.BoxGeometry(0.5, 0.28, 0.35), palette.duckEggBlue, seed + 20, 0.05);
  regBase.position.set(0.9, 1.36, 0.05);
  group.add(regBase);
  const regTop = paperMesh(new THREE.BoxGeometry(0.34, 0.22, 0.3), palette.paperWhite, seed + 21, 0.04);
  regTop.position.set(0.9, 1.6, 0.02);
  regTop.rotation.x = -0.2;
  group.add(regTop);

  group.add(blobShadow(1.7));
  return group;
}

// ── shopSign ────────────────────────────────────────────────────────────────
// Post with a crossbar and a wooden sign hanging on two straps — it swings.
// options: seed, color, animation: "swing"|"none"
function shopSign(options = {}) {
  const seed = options.seed ?? 0;
  const color = options.color ?? palette.barkBrown;
  const group = new THREE.Group();

  const post = paperMesh(new THREE.BoxGeometry(0.14, 2.7, 0.14), color, seed, 0.05);
  post.position.y = 1.35;
  group.add(post);
  const arm = paperMesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), color, seed + 1, 0.05);
  arm.position.set(0.5, 2.62, 0);
  group.add(arm);

  // hanging assembly pivots at the arm
  const hanger = new THREE.Group();
  for (const side of [-1, 1]) {
    const strap = paperMesh(new THREE.BoxGeometry(0.05, 0.4, 0.04), palette.deepBrown, seed + 2);
    strap.position.set(0.55 + side * 0.35, -0.2, 0);
    hanger.add(strap);
  }
  const board = paperMesh(new THREE.BoxGeometry(1.05, 0.6, 0.09), color, seed + 3, 0.06);
  board.position.set(0.55, -0.68, 0);
  hanger.add(board);
  const inner = paperMesh(new THREE.BoxGeometry(0.85, 0.42, 0.03), palette.parchment, seed + 4, 0.04);
  inner.position.set(0.55, -0.68, 0.05);
  hanger.add(inner);
  hanger.position.set(0, 2.62, 0);
  group.add(hanger);

  group.add(blobShadow(0.4));

  applyAnimation(group, {
    swing: (t, dt, ctx) => {
      hanger.rotation.z = Math.sin(t * 1.4 + ctx.phase) * 0.06 + Math.sin(t * 3.7 + ctx.phase) * 0.015;
    },
  }, options, 'swing', 'shopSign');

  return group;
}

// ── shoppingCart ────────────────────────────────────────────────────────────
// Wire-basket cart: tapered frame of thin bars, handle, four little wheels.
// options: seed
function shoppingCart(options = {}) {
  const seed = options.seed ?? 0;
  const group = new THREE.Group();
  const gray = palette.slateGray;
  const bar = (w, h, d, s) => paperMesh(new THREE.BoxGeometry(w, h, d), gray, seed + s, 0.04);

  const bottom = bar(1.0, 0.05, 0.6, 1);
  bottom.position.y = 0.45;
  group.add(bottom);
  // tapered corner posts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = bar(0.05, 0.62, 0.05, 2 + sx + sz);
      post.position.set(sx * 0.52, 0.75, sz * 0.31);
      post.rotation.z = -sx * 0.16;
      post.rotation.x = sz * 0.12;
      group.add(post);
    }
  }
  // rims and lattice
  for (const sz of [-1, 1]) {
    const rim = bar(1.2, 0.05, 0.05, 6);
    rim.position.set(0, 1.05, sz * 0.36);
    group.add(rim);
    for (let i = 0; i < 3; i += 1) {
      const lat = bar(1.05, 0.03, 0.03, 7 + i);
      lat.position.set(0, 0.6 + i * 0.15, sz * (0.32 + i * 0.013));
      group.add(lat);
    }
  }
  for (const sx of [-1, 1]) {
    const rimEnd = bar(0.05, 0.05, 0.72, 9 + sx);
    rimEnd.position.set(sx * 0.58, 1.05, 0);
    group.add(rimEnd);
  }
  // handle
  const handle = bar(0.06, 0.5, 0.06, 12);
  handle.position.set(-0.72, 0.95, 0.25);
  handle.rotation.z = 0.5;
  group.add(handle);
  const handle2 = bar(0.06, 0.5, 0.06, 13);
  handle2.position.set(-0.72, 0.95, -0.25);
  handle2.rotation.z = 0.5;
  group.add(handle2);
  const grip = bar(0.08, 0.08, 0.62, 14);
  grip.position.set(-0.84, 1.16, 0);
  group.add(grip);

  // four little wheels
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = paperMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), palette.charcoal, seed + 20, 0.05);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(sx * 0.42, 0.09, sz * 0.26);
      group.add(wheel);
    }
  }

  group.add(blobShadow(0.6));
  return group;
}

// ── crate ───────────────────────────────────────────────────────────────────
// Wooden slat crate heaped with produce. options: seed,
// produce: "fruit"|"greens"|"plums"|"empty"
function crate(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const produce = PRODUCE_COLORS[options.produce] ? options.produce : (options.produce === 'empty' ? 'empty' : 'fruit');
  const group = new THREE.Group();

  const w = 1.1;
  const h = 0.62;
  const d = 0.8;
  // slats
  for (const face of [-1, 1]) {
    for (let i = 0; i < 2; i += 1) {
      const slat = paperMesh(new THREE.BoxGeometry(w, 0.22, 0.06), palette.plankBrown, seed + i + face, 0.07);
      slat.position.set(0, 0.16 + i * 0.3, face * d / 2);
      group.add(slat);
    }
    const end = paperMesh(new THREE.BoxGeometry(0.06, h, d), palette.barkBrown, seed + 5 + face, 0.07);
    end.position.set(face * w / 2, h / 2, 0);
    group.add(end);
  }
  const inner = paperMesh(new THREE.BoxGeometry(w - 0.1, 0.5, d - 0.1), palette.deepBrown, seed + 8, 0.04);
  inner.position.y = 0.28;
  group.add(inner);

  if (produce !== 'empty') {
    if (produce === 'greens') {
      // leafy bunches: clusters of little cones poking up
      for (let i = 0; i < 5; i += 1) {
        const leaf = paperMesh(new THREE.ConeGeometry(0.09, 0.34, 4), PRODUCE_COLORS.greens[i % 2], seed + 10 + i, 0.07);
        leaf.position.set((r() - 0.5) * (w - 0.4), 0.62, (r() - 0.5) * (d - 0.4));
        leaf.rotation.z = (r() - 0.5) * 0.5;
        group.add(leaf);
      }
    } else {
      const colors = PRODUCE_COLORS[produce];
      for (let i = 0; i < 6; i += 1) {
        const ball = produceBall(colors[i % colors.length], 0.13, seed + 10 + i);
        ball.position.set((r() - 0.5) * (w - 0.45), 0.56 + (i > 3 ? 0.16 : 0), (r() - 0.5) * (d - 0.45));
        group.add(ball);
      }
    }
  }

  group.add(blobShadow(0.6));
  return group;
}

// ── basket ──────────────────────────────────────────────────────────────────
// Round market basket with a handle and fruit. options: seed, empty (bool)
function basket(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const group = new THREE.Group();

  const body = paperMesh(new THREE.CylinderGeometry(0.34, 0.24, 0.34, 9), palette.tanBrown, seed, 0.09);
  body.position.y = 0.17;
  group.add(body);
  const handle = paperMesh(new THREE.TorusGeometry(0.3, 0.035, 5, 10, Math.PI), palette.barkBrown, seed + 1, 0.05);
  handle.position.y = 0.34;
  group.add(handle);
  if (!options.empty) {
    for (let i = 0; i < 4; i += 1) {
      const ball = produceBall(PRODUCE_COLORS.fruit[i % 3], 0.11, seed + 2 + i);
      ball.position.set((r() - 0.5) * 0.3, 0.4, (r() - 0.5) * 0.3);
      group.add(ball);
    }
  }
  group.add(blobShadow(0.35));
  return group;
}

// ── flourSack ───────────────────────────────────────────────────────────────
// Big faceted sack with a tied neck. options: seed, color ("cream"/"tan"/hex)
function flourSack(options = {}) {
  const seed = options.seed ?? 0;
  const color = options.color === 'tan' ? palette.strawGold
    : options.color === 'cream' || !options.color ? palette.cream : options.color;
  const group = new THREE.Group();

  const bodyGeo = new THREE.IcosahedronGeometry(0.62, 0);
  bodyGeo.scale(1, 1.15, 0.9);
  const body = paperMesh(bodyGeo, color, seed, 0.07);
  body.position.y = 0.62;
  group.add(body);
  const neck = paperMesh(new THREE.CylinderGeometry(0.14, 0.22, 0.3, 6), color, seed + 1, 0.07);
  neck.position.y = 1.28;
  group.add(neck);
  const tie = paperMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 6), palette.barkBrown, seed + 2);
  tie.position.y = 1.2;
  group.add(tie);
  const top = paperMesh(new THREE.ConeGeometry(0.2, 0.24, 5), color, seed + 3, 0.07);
  top.position.y = 1.48;
  group.add(top);

  group.add(blobShadow(0.6));
  return group;
}

// ── breadShelf ──────────────────────────────────────────────────────────────
// Two-level wooden shelf: upright baguettes above, round loaves below.
// options: seed
function breadShelf(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const group = new THREE.Group();

  const w = 1.5;
  const h = 1.7;
  const d = 0.6;
  const wood = palette.barkBrown;
  const back = paperMesh(new THREE.BoxGeometry(w, h, 0.06), wood, seed, 0.06);
  back.position.set(0, h / 2, -d / 2);
  group.add(back);
  for (const sx of [-1, 1]) {
    const side = paperMesh(new THREE.BoxGeometry(0.08, h, d), wood, seed + sx, 0.06);
    side.position.set(sx * (w / 2 - 0.04), h / 2, 0);
    group.add(side);
  }
  for (const sy of [0.06, 0.85, h]) {
    const board = paperMesh(new THREE.BoxGeometry(w - 0.1, 0.08, d), wood, seed + sy * 10, 0.06);
    board.position.set(0, sy, 0);
    group.add(board);
  }
  // baguettes standing on the top shelf
  for (let i = 0; i < 3; i += 1) {
    const bagGeo = new THREE.CapsuleGeometry(0.11, 0.55, 2, 5);
    const baguette = paperMesh(bagGeo, palette.strawGold, seed + 10 + i, 0.09);
    baguette.position.set(-0.4 + i * 0.4, 1.3, 0.02);
    baguette.rotation.z = (r() - 0.5) * 0.14;
    group.add(baguette);
  }
  // round loaves on the lower shelf
  for (let i = 0; i < 2; i += 1) {
    const loafGeo = new THREE.IcosahedronGeometry(0.22, 0);
    loafGeo.scale(1.25, 0.8, 1);
    const loaf = paperMesh(loafGeo, palette.tanBrown, seed + 20 + i, 0.08);
    loaf.position.set(-0.3 + i * 0.6, 0.3, 0.05);
    group.add(loaf);
  }

  group.add(blobShadow(0.8));
  return group;
}

// ── scale ───────────────────────────────────────────────────────────────────
// Sage weighing scale with a produce tray and a wiggling dial needle.
// options: seed, color, animation: "weigh"|"none"
function scale(options = {}) {
  const seed = options.seed ?? 0;
  const color = options.color ?? palette.sage;
  const group = new THREE.Group();

  const base = paperMesh(new THREE.BoxGeometry(0.7, 0.16, 0.5), color, seed, 0.06);
  base.position.y = 0.08;
  group.add(base);
  const column = paperMesh(new THREE.CylinderGeometry(0.16, 0.22, 0.55, 4), color, seed + 1, 0.07);
  column.rotation.y = Math.PI / 4;
  column.position.y = 0.44;
  group.add(column);
  // dial
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12), new THREE.MeshBasicMaterial({ color: palette.paperWhite }));
  dial.position.set(0, 0.48, 0.26);
  group.add(dial);
  const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.13), new THREE.MeshBasicMaterial({ color: palette.charcoal }));
  needle.geometry.translate(0, 0.055, 0);
  needle.position.set(0, 0.48, 0.27);
  group.add(needle);
  // tray with fruit
  const tray = paperMesh(new THREE.CylinderGeometry(0.4, 0.28, 0.14, 9), color, seed + 2, 0.07);
  tray.position.y = 0.82;
  group.add(tray);
  const fruit = produceBall(PRODUCE_COLORS.fruit[0], 0.11, seed + 3);
  fruit.position.set(0.05, 0.95, 0);
  group.add(fruit);

  group.add(blobShadow(0.4));

  applyAnimation(group, {
    weigh: (t, dt, ctx) => {
      needle.rotation.z = Math.sin(t * 2.2 + ctx.phase) * 0.5 * Math.max(0, Math.sin(t * 0.4 + ctx.phase))
        + Math.sin(t * 6 + ctx.phase) * 0.04;
    },
  }, options, 'weigh', 'scale');

  return group;
}

// ── flowerPot ───────────────────────────────────────────────────────────────
// Little pot with two faceted blossoms. options: seed, colors
function flowerPot(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const group = new THREE.Group();

  const pot = paperMesh(new THREE.CylinderGeometry(0.2, 0.14, 0.3, 7), palette.tanBrown, seed, 0.07);
  pot.position.y = 0.15;
  group.add(pot);

  const heads = [];
  const colors = options.colors ?? [palette.roseMauve, palette.paperWhite];
  for (let i = 0; i < 2; i += 1) {
    const lean = (i - 0.5) * 0.5 + (r() - 0.5) * 0.2;
    const hgt = 0.45 + r() * 0.2;
    const stem = paperMesh(new THREE.BoxGeometry(0.035, hgt, 0.035), palette.pine, seed + i);
    stem.position.set(lean * 0.3, 0.3 + hgt / 2, 0);
    stem.rotation.z = -lean * 0.5;
    group.add(stem);
    const bloom = paperMesh(new THREE.OctahedronGeometry(0.13, 0), colors[i % colors.length], seed + 5 + i, 0.07);
    bloom.position.set(lean * 0.3 - Math.sin(lean * 0.5) * hgt * 0.5, 0.32 + hgt, 0);
    group.add(bloom);
    const heart = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), new THREE.MeshBasicMaterial({ color: palette.sunGold }));
    heart.position.copy(bloom.position);
    heart.position.z += 0.12;
    group.add(heart);
    heads.push({ stem, bloom, heart });
    const leaf = paperMesh(new THREE.ConeGeometry(0.06, 0.2, 4), palette.sage, seed + 10 + i, 0.06);
    leaf.position.set(lean * 0.2, 0.42, 0.04);
    leaf.rotation.z = lean;
    group.add(leaf);
  }
  group.add(blobShadow(0.25));

  applyAnimation(group, {
    sway: (t, dt, ctx) => {
      for (let i = 0; i < heads.length; i += 1) {
        const k = Math.sin(t * 1.3 + ctx.phase + i) * 0.05;
        heads[i].bloom.rotation.z = k * 2;
        heads[i].stem.rotation.z += (k - heads[i].stem.rotation.z) * 0.1;
      }
    },
  }, options, 'sway', 'flowerPot');

  return group;
}

// ── shopkeeper ──────────────────────────────────────────────────────────────
// Big-headed standing shopkeepers from the sheet. options: seed,
// animal: "wolf"|"bear"|"panda", dressColor, animation: "idle"|"none"
const KEEPERS = {
  wolf: { head: palette.wolfGray, muzzle: palette.cream, ears: 'pointy', earColor: palette.wolfGrayDark, dress: palette.sage },
  bear: { head: palette.sage, muzzle: palette.cream, ears: 'roundSmall', earColor: palette.sage, dress: palette.sageDark },
  panda: { head: palette.paperWhite, muzzle: null, ears: 'roundBig', earColor: palette.roseMauve, cheeksBig: true, dress: palette.waterTeal },
  fox: { fox: true, dress: palette.sageDark }, // fully custom angular head, see below
};

// The fox keeper's head has its own layout, per the sheet's bottom-left
// character: a wide inverted-pentagon face tapering to the chin, cream
// inner mask, tall pointed ears with dark inners, nose at the chin point.
function foxHead(seed) {
  const head = new THREE.Group();

  const faceGeo = new THREE.ConeGeometry(0.52, 0.66, 5);
  faceGeo.rotateX(Math.PI); // point the apex down — chin
  faceGeo.rotateY(Math.PI / 5); // flat edge up for the brow
  faceGeo.scale(1.15, 1, 0.5);
  const skull = paperMesh(faceGeo, palette.wolfGray, seed + 2, 0.06);
  head.add(skull);

  const maskGeo = new THREE.ConeGeometry(0.34, 0.52, 5);
  maskGeo.rotateX(Math.PI);
  maskGeo.rotateY(Math.PI / 5);
  maskGeo.scale(1, 1, 0.42);
  const mask = paperMesh(maskGeo, palette.cream, seed + 3, 0.04);
  mask.position.set(0, -0.05, 0.06);
  head.add(mask);

  for (const side of [-1, 1]) {
    const ear = paperMesh(new THREE.ConeGeometry(0.13, 0.52, 4), palette.wolfGrayDark, seed + 4, 0.06);
    ear.position.set(side * 0.3, 0.5, -0.02);
    ear.rotation.z = -side * 0.1;
    head.add(ear);
    const inner = paperMesh(new THREE.ConeGeometry(0.06, 0.26, 4), palette.deepBrown, seed + 5, 0.04);
    inner.position.set(side * 0.29, 0.44, 0.05);
    inner.rotation.z = -side * 0.1;
    head.add(inner);

    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.04, 8), new THREE.MeshBasicMaterial({ color: palette.charcoal }));
    eye.position.set(side * 0.2, 0.09, 0.24);
    head.add(eye);
    head.userData[side === -1 ? 'eyeL' : 'eyeR'] = eye;
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 8),
      new THREE.MeshBasicMaterial({ color: palette.cheekPink, transparent: true, opacity: 0.9 }),
    );
    cheek.position.set(side * 0.3, -0.04, 0.2);
    head.add(cheek);
  }
  const nose = new THREE.Mesh(new THREE.CircleGeometry(0.045, 6), new THREE.MeshBasicMaterial({ color: palette.charcoal }));
  nose.position.set(0, -0.2, 0.19);
  head.add(nose);

  return head;
}

function shopkeeper(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const animal = KEEPERS[options.animal] ? options.animal : 'panda';
  const spec = KEEPERS[animal];
  const group = new THREE.Group();

  // dress body + stub feet
  const bodyGeo = new THREE.IcosahedronGeometry(0.42, 0);
  bodyGeo.scale(1, 1.1, 0.75);
  const body = paperMesh(bodyGeo, options.dressColor ?? spec.dress, seed, 0.07);
  body.position.y = 0.52;
  group.add(body);
  for (const side of [-1, 1]) {
    const foot = paperMesh(new THREE.BoxGeometry(0.13, 0.18, 0.15), palette.cream, seed + side);
    foot.position.set(side * 0.14, 0.09, 0.02);
    group.add(foot);
  }

  let head;
  if (spec.fox) {
    head = foxHead(seed);
    const headRestY = 1.36;
    head.position.y = headRestY;
    group.add(head);
    group.add(blobShadow(0.42));
    attachKeeperIdle(group, body, head, headRestY, r, options);
    return group;
  }
  head = new THREE.Group();
  const skullGeo = new THREE.IcosahedronGeometry(0.48, 1);
  skullGeo.scale(1, 0.95, 0.75);
  const skull = paperMesh(skullGeo, spec.head, seed + 2, 0.05);
  head.add(skull);
  if (spec.muzzle) {
    const muzzle = paperMesh(new THREE.ConeGeometry(0.17, 0.42, 4), spec.muzzle, seed + 3, 0.04);
    muzzle.rotation.x = Math.PI;
    muzzle.position.set(0, 0.02, 0.3);
    head.add(muzzle);
    const nose = new THREE.Mesh(new THREE.CircleGeometry(0.045, 6), new THREE.MeshBasicMaterial({ color: palette.charcoal }));
    nose.position.set(0, -0.05, 0.395);
    head.add(nose);
  }
  for (const side of [-1, 1]) {
    let ear;
    if (spec.ears === 'pointy') {
      ear = paperMesh(new THREE.ConeGeometry(0.14, 0.36, 4), spec.earColor, seed + 4, 0.06);
      ear.position.set(side * 0.28, 0.5, -0.02);
    } else {
      const big = spec.ears === 'roundBig';
      const earGeo = new THREE.CylinderGeometry(big ? 0.17 : 0.12, big ? 0.17 : 0.12, 0.08, 10);
      earGeo.rotateX(Math.PI / 2);
      ear = paperMesh(earGeo, spec.earColor, seed + 4, 0.06);
      ear.position.set(side * (big ? 0.42 : 0.36), big ? 0.4 : 0.42, -0.04);
    }
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.04, 8), new THREE.MeshBasicMaterial({ color: palette.charcoal }));
    eye.position.set(side * 0.17, 0.08, 0.365);
    head.add(eye);
    head.userData[side === -1 ? 'eyeL' : 'eyeR'] = eye;
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(spec.cheeksBig ? 0.13 : 0.08, 10),
      new THREE.MeshBasicMaterial({ color: spec.cheeksBig ? palette.dustyRose : palette.cheekPink, transparent: true, opacity: 0.9 }),
    );
    cheek.position.set(side * 0.28, -0.05, 0.345);
    head.add(cheek);
  }
  if (!spec.muzzle) {
    const nose = new THREE.Mesh(new THREE.CircleGeometry(0.04, 8), new THREE.MeshBasicMaterial({ color: palette.charcoal }));
    nose.position.set(0, 0, 0.37);
    head.add(nose);
  }

  const headRestY = 1.32;
  head.position.y = headRestY;
  group.add(head);
  group.add(blobShadow(0.42));
  attachKeeperIdle(group, body, head, headRestY, r, options);
  return group;
}

// Shared idle: breathing, slow head turns, auto-blink.
function attachKeeperIdle(group, body, head, headRestY, r, options) {
  let nextBlink = 1.5 + r() * 3;
  applyAnimation(group, {
    idle: (t, dt, ctx) => {
      body.scale.setScalar(1 + Math.sin(t * 1.7 + ctx.phase) * 0.015);
      head.position.y = headRestY + Math.sin(t * 1.7 + ctx.phase) * 0.025;
      head.rotation.z = Math.sin(t * 0.5 + ctx.phase) * 0.06;
      head.rotation.y = Math.sin(t * 0.33 + ctx.phase * 1.6) * 0.14;
      nextBlink -= dt;
      if (nextBlink < 0) nextBlink = 2 + r() * 3.5;
      const s = nextBlink < 0.1 ? 0.12 : 1;
      head.userData.eyeL.scale.y = s;
      head.userData.eyeR.scale.y = s;
    },
  }, options, 'idle', 'shopkeeper');
}

register('shopBuilding', shopBuilding);
register('marketStall', marketStall);
register('shopSign', shopSign);
register('shoppingCart', shoppingCart);
register('crate', crate);
register('basket', basket);
register('flourSack', flourSack);
register('breadShelf', breadShelf);
register('scale', scale);
register('flowerPot', flowerPot);
register('shopkeeper', shopkeeper);

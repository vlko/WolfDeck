import * as THREE from 'three';
import { register } from './registry.js';
import { palette } from './palette.js';
import {
  rng, paperMesh, blobShadow, applyAnimation,
} from './helpers.js';

// The finance pack — the town-treasury set: a
// round-door vault, stacks of gold coins, a tied money sack with a euro
// sign, a cute piggy bank and an open ledger book.

// Faceted straw-gold coin, lying flat (axis up).
function coin(radius, thickness, seed) {
  return paperMesh(new THREE.CylinderGeometry(radius, radius, thickness, 7), palette.strawGold, seed, 0.07);
}

// ── vault ───────────────────────────────────────────────────────────────────
// Round-door safe: slate body on a charcoal plinth, riveted stone ring
// around the opening, big rosette handle on the door. With `open` the door
// swings out on its hinge and gold coins peek from the dark inside.
// options: seed, open (bool)
function vault(options = {}) {
  const seed = options.seed ?? 0;
  const open = options.open ?? false;
  const group = new THREE.Group();

  const w = 1.5;
  const h = 1.6;
  const d = 1.3;

  const plinth = paperMesh(new THREE.BoxGeometry(w + 0.14, 0.16, d + 0.14), palette.charcoal, seed, 0.04);
  plinth.position.y = 0.08;
  group.add(plinth);
  const body = paperMesh(new THREE.BoxGeometry(w, h, d), palette.slateGray, seed + 1, 0.05);
  body.position.y = 0.16 + h / 2;
  group.add(body);
  const lid = paperMesh(new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1), palette.charcoal, seed + 2, 0.04);
  lid.position.y = 0.16 + h + 0.06;
  group.add(lid);

  const doorR = 0.5;
  const doorY = 0.16 + h / 2;
  const front = d / 2;

  // dark opening + stone ring with rivets
  const mouth = paperMesh(new THREE.CircleGeometry(doorR, 12), palette.charcoal, seed + 3, 0.02);
  mouth.position.set(0, doorY, front + 0.01);
  group.add(mouth);
  const ring = paperMesh(new THREE.RingGeometry(doorR, doorR + 0.12, 12), palette.stoneGray, seed + 4, 0.04);
  ring.position.set(0, doorY, front + 0.015);
  group.add(ring);
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const rivet = paperMesh(new THREE.IcosahedronGeometry(0.035, 0), palette.charcoal, seed + 5 + i);
    rivet.position.set(Math.cos(a) * (doorR + 0.06), doorY + Math.sin(a) * (doorR + 0.06), front + 0.03);
    group.add(rivet);
  }

  // hinge blocks on the right of the ring
  for (const sy of [-1, 1]) {
    const hinge = paperMesh(new THREE.BoxGeometry(0.09, 0.13, 0.12), palette.charcoal, seed + 11 + sy);
    hinge.position.set(doorR + 0.08, doorY + sy * 0.28, front + 0.02);
    group.add(hinge);
  }

  // the door swings on a pivot at the hinge edge
  const pivot = new THREE.Group();
  pivot.position.set(doorR + 0.06, doorY, front + 0.03);
  group.add(pivot);
  const cx = -(doorR + 0.06); // door center, relative to the pivot

  const doorGeo = new THREE.CylinderGeometry(doorR - 0.02, doorR - 0.02, 0.12, 12);
  doorGeo.rotateX(Math.PI / 2);
  const door = paperMesh(doorGeo, palette.slateGray, seed + 14, 0.05);
  door.position.set(cx, 0, 0.06);
  pivot.add(door);

  // rosette handle: tapered hub, three crossed spokes, outer rim
  const hubGeo = new THREE.CylinderGeometry(0.05, 0.09, 0.12, 8);
  hubGeo.rotateX(Math.PI / 2);
  const hub = paperMesh(hubGeo, palette.charcoal, seed + 15);
  hub.position.set(cx, 0, 0.15);
  pivot.add(hub);
  for (let i = 0; i < 3; i += 1) {
    const spoke = paperMesh(new THREE.BoxGeometry(0.5, 0.045, 0.045), palette.charcoal, seed + 16 + i);
    spoke.position.set(cx, 0, 0.19);
    spoke.rotation.z = (i / 3) * Math.PI;
    pivot.add(spoke);
  }
  const rim = paperMesh(new THREE.TorusGeometry(0.25, 0.028, 5, 10), palette.charcoal, seed + 19, 0.04);
  rim.position.set(cx, 0, 0.19);
  pivot.add(rim);

  if (open) {
    pivot.rotation.y = 1.9;
    // gold peeking out of the dark opening
    for (let i = 0; i < 2; i += 1) {
      const c = coin(0.12, 0.05, seed + 20 + i);
      c.position.set(0.1 - i * 0.16, doorY - 0.36 + (i === 0 ? 0.05 : 0.025), front + 0.04);
      group.add(c);
    }
  }

  group.add(blobShadow(1.05));
  return group;
}

// ── coinStack ───────────────────────────────────────────────────────────────
// 2–4 piles of straw-gold faceted coins of varying height, with a couple of
// loose coins spilled beside them. options: seed, height (tallest pile,
// world units)
function coinStack(options = {}) {
  const seed = options.seed ?? 0;
  const height = options.height ?? 0.7;
  const r = rng(seed);
  const group = new THREE.Group();

  const coinR = 0.16;
  const coinH = 0.055;
  const piles = 2 + Math.floor(r() * 3); // 2–4
  for (let p = 0; p < piles; p += 1) {
    const a = (p / piles) * Math.PI * 2 + r() * 1.2;
    const px = Math.cos(a) * (0.16 + r() * 0.12);
    const pz = Math.sin(a) * (0.16 + r() * 0.12);
    // the first pile carries the full height, the rest vary
    const pileH = height * (p === 0 ? 1 : 0.35 + r() * 0.5);
    const n = Math.max(2, Math.round(pileH / coinH));
    for (let i = 0; i < n; i += 1) {
      const c = coin(coinR, coinH, seed + p * 20 + i);
      c.position.set(px + (r() - 0.5) * 0.035, coinH / 2 + i * coinH, pz + (r() - 0.5) * 0.035);
      c.rotation.y = r() * Math.PI;
      group.add(c);
    }
  }
  // loose coins spilled around the piles
  for (let i = 0; i < 2; i += 1) {
    const c = coin(coinR * 0.9, coinH * 0.9, seed + 90 + i);
    const a = r() * Math.PI * 2;
    c.position.set(Math.cos(a) * 0.38, coinH * 0.45, Math.sin(a) * 0.38);
    c.rotation.y = r() * Math.PI;
    group.add(c);
  }

  group.add(blobShadow(0.55));
  return group;
}

// ── moneyBag ────────────────────────────────────────────────────────────────
// Tied tan sack with an embossed € sign on the front. options: seed
function moneyBag(options = {}) {
  const seed = options.seed ?? 0;
  const tan = palette.tanBrown;
  const group = new THREE.Group();

  const bodyGeo = new THREE.IcosahedronGeometry(0.35, 0);
  bodyGeo.scale(1, 1.05, 0.88);
  const body = paperMesh(bodyGeo, tan, seed, 0.07);
  body.position.y = 0.37;
  group.add(body);
  const neck = paperMesh(new THREE.CylinderGeometry(0.085, 0.14, 0.18, 6), tan, seed + 1, 0.07);
  neck.position.y = 0.76;
  group.add(neck);
  const tie = paperMesh(new THREE.CylinderGeometry(0.105, 0.105, 0.06, 6), palette.deepBrown, seed + 2);
  tie.position.y = 0.7;
  group.add(tie);
  const top = paperMesh(new THREE.ConeGeometry(0.13, 0.15, 5), tan, seed + 3, 0.07);
  top.position.y = 0.9;
  group.add(top);

  // embossed € — a C arc (gap facing right) plus two crossbars
  const euro = new THREE.Group();
  const arcGeo = new THREE.TorusGeometry(0.11, 0.02, 5, 10, Math.PI * 2 - 1.3);
  arcGeo.rotateZ(0.65);
  euro.add(paperMesh(arcGeo, palette.deepBrown, seed + 4, 0.03));
  for (const sy of [-1, 1]) {
    const bar = paperMesh(new THREE.BoxGeometry(0.15, 0.026, 0.024), palette.deepBrown, seed + 5, 0.03);
    bar.position.set(-0.03, sy * 0.034, 0);
    euro.add(bar);
  }
  euro.position.set(0, 0.4, 0.3);
  euro.rotation.x = -0.08;
  group.add(euro);

  group.add(blobShadow(0.5));
  return group;
}

// ── piggyBank ───────────────────────────────────────────────────────────────
// Dusty-rose faceted pig on stub legs: snout, curly tail, coin slot on the
// back with a gold coin half inserted. options: seed,
// animation: "idle"|"none" (idle = ear wiggle + blink, default)
function piggyBank(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const rose = palette.dustyRose;
  const group = new THREE.Group();

  const bodyGeo = new THREE.IcosahedronGeometry(0.34, 0);
  bodyGeo.scale(1.25, 1, 0.95);
  const body = paperMesh(bodyGeo, rose, seed, 0.06);
  body.position.y = 0.5;
  group.add(body);

  // stub legs
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = paperMesh(new THREE.CylinderGeometry(0.07, 0.08, 0.22, 6), rose, seed + sx + sz * 2, 0.05);
      leg.position.set(sx * 0.2, 0.11, sz * 0.14);
      group.add(leg);
    }
  }

  // snout + nostrils (pig faces +z)
  const snoutGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.1, 8);
  snoutGeo.rotateX(Math.PI / 2);
  const snout = paperMesh(snoutGeo, palette.cheekPink, seed + 5, 0.04);
  snout.position.set(0, 0.52, 0.34);
  group.add(snout);
  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.CircleGeometry(0.018, 6), new THREE.MeshBasicMaterial({ color: palette.charcoal }));
    nostril.position.set(side * 0.04, 0.52, 0.395);
    group.add(nostril);
  }

  // eyes + cheeks, shopkeeper style
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.032, 8), new THREE.MeshBasicMaterial({ color: palette.charcoal }));
    eye.position.set(side * 0.13, 0.62, 0.3);
    group.add(eye);
    eyes.push(eye);
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.06, 8),
      new THREE.MeshBasicMaterial({ color: palette.cheekPink, transparent: true, opacity: 0.9 }),
    );
    cheek.position.set(side * 0.24, 0.5, 0.27);
    group.add(cheek);
  }

  // ears — cones pivoting at their base so they can wiggle
  const ears = [];
  for (const side of [-1, 1]) {
    const earGeo = new THREE.ConeGeometry(0.09, 0.22, 4);
    earGeo.translate(0, 0.11, 0);
    const ear = paperMesh(earGeo, palette.roseMauve, seed + 8 + side, 0.05);
    ear.position.set(side * 0.17, 0.76, 0.12);
    ear.rotation.z = -side * 0.3;
    group.add(ear);
    ears.push({ mesh: ear, rest: -side * 0.3, side });
  }

  // coin slot on the back + a gold coin half inserted
  const slot = paperMesh(new THREE.BoxGeometry(0.05, 0.03, 0.16), palette.charcoal, seed + 12, 0.02);
  slot.position.set(0, 0.83, -0.06);
  group.add(slot);
  const slotCoinGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.026, 7);
  slotCoinGeo.rotateZ(Math.PI / 2);
  const slotCoin = paperMesh(slotCoinGeo, palette.strawGold, seed + 13, 0.06);
  slotCoin.position.set(0, 0.87, -0.06);
  group.add(slotCoin);

  // curly tail
  const tailGeo = new THREE.TorusGeometry(0.055, 0.018, 5, 8, 4.6);
  tailGeo.rotateY(Math.PI / 2);
  const tail = paperMesh(tailGeo, palette.roseMauve, seed + 14, 0.05);
  tail.position.set(0, 0.55, -0.42);
  group.add(tail);

  group.add(blobShadow(0.5));

  let nextBlink = 1.5 + r() * 3;
  applyAnimation(group, {
    idle: (t, dt, ctx) => {
      body.scale.setScalar(1 + Math.sin(t * 1.8 + ctx.phase) * 0.012);
      // intermittent ear wiggle
      const wiggle = Math.max(0, Math.sin(t * 0.6 + ctx.phase)) * Math.sin(t * 9 + ctx.phase) * 0.1;
      for (const ear of ears) {
        ear.mesh.rotation.z = ear.rest + wiggle * ear.side;
      }
      // auto-blink
      nextBlink -= dt;
      if (nextBlink < 0) nextBlink = 2 + r() * 3.5;
      const s = nextBlink < 0.1 ? 0.12 : 1;
      for (const eye of eyes) eye.scale.y = s;
    },
    none: () => {},
  }, options, 'idle', 'piggyBank');

  return group;
}

// ── ledger ──────────────────────────────────────────────────────────────────
// Open book lying flat: deep-brown covers, parchment page blocks, and
// columns of entries — description lines by the spine, amount figures at
// the outer edge, a straw-gold header rule, a dusty-rose bookmark ribbon.
// options: seed
function ledger(options = {}) {
  const seed = options.seed ?? 0;
  const r = rng(seed);
  const group = new THREE.Group();

  const halfW = 0.28;
  const depth = 0.42;

  const spine = paperMesh(new THREE.BoxGeometry(0.07, 0.035, depth + 0.03), palette.deepBrown, seed, 0.04);
  spine.position.y = 0.02;
  group.add(spine);

  for (const side of [-1, 1]) {
    const half = new THREE.Group();
    const pcx = side * (halfW / 2); // page-block center x
    const cover = paperMesh(new THREE.BoxGeometry(halfW + 0.03, 0.03, depth + 0.03), palette.deepBrown, seed + 100 + side, 0.05);
    cover.position.set(pcx + side * 0.008, 0.015, 0);
    half.add(cover);
    const pages = paperMesh(new THREE.BoxGeometry(halfW - 0.02, 0.05, depth - 0.03), palette.parchment, seed + 103 + side, 0.04);
    pages.position.set(pcx, 0.055, 0);
    half.add(pages);
    const page = paperMesh(new THREE.BoxGeometry(halfW - 0.04, 0.012, depth - 0.05), palette.paperWhite, seed + 106 + side, 0.03);
    page.position.set(pcx, 0.086, 0);
    half.add(page);

    // straw-gold header rule, then rows: description line + amount figure
    const header = paperMesh(new THREE.BoxGeometry(halfW - 0.09, 0.008, 0.018), palette.strawGold, seed + 109 + side, 0.02);
    header.position.set(pcx, 0.096, -depth / 2 + 0.06);
    half.add(header);
    for (let i = 0; i < 5; i += 1) {
      const z = -depth / 2 + 0.12 + i * 0.055;
      const len = 0.08 + r() * 0.05;
      const entry = paperMesh(new THREE.BoxGeometry(len, 0.007, 0.014), palette.charcoal, seed + side * 100 + 20 + i, 0.02);
      entry.position.set(pcx - side * (0.1 - len / 2), 0.096, z);
      half.add(entry);
      const amount = paperMesh(new THREE.BoxGeometry(0.045, 0.007, 0.014), palette.charcoal, seed + side * 100 + 40 + i, 0.02);
      amount.position.set(pcx + side * 0.08, 0.096, z);
      half.add(amount);
    }

    // shallow V: outer edges lift slightly toward the spine valley
    half.rotation.z = side * 0.12;
    half.position.y = 0.01;
    group.add(half);
  }

  // bookmark ribbon draped over the front edge
  const ribbon = paperMesh(new THREE.BoxGeometry(0.045, 0.008, 0.16), palette.dustyRose, seed + 60, 0.03);
  ribbon.position.set(0.04, 0.06, depth / 2 + 0.03);
  ribbon.rotation.x = 0.55;
  group.add(ribbon);

  group.add(blobShadow(0.4));
  return group;
}

register('vault', vault);
register('coinStack', coinStack);
register('moneyBag', moneyBag);
register('piggyBank', piggyBank);
register('ledger', ledger);

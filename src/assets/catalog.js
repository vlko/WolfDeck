import * as THREE from 'three';
import { register } from './registry.js';
import { makeStandee, makeGlow, contactShadow, hasSprite, spriteNames } from './sprites.js';
import { hasModel } from '../models/registry.js';
import { addVehicle, driveVehicle } from '../core/traffic.js';
import { rng, applyAnimation, paperMesh } from './helpers.js';
import { palette } from './palette.js';
import { getGrainCanvas } from './materials.js';

// The asset catalog. Every asset is a sprite standee cut from the reference
// sheets; an asset TYPE groups one or more sprites (variants) with a default
// world height and an allowed set of animations. Variants are chosen by
// `options.variant` (or the type's own option such as `animal`/`shape`), by
// `options.color` (nearest variant color), or else by `options.seed`.
//
// Every individual sprite is ALSO registered under its own name (e.g.
// "pine4", "carMint", "koalaWorker"), so authors can pick exact pieces.

// ── animations (act on the standee's pivot) ───────────────────────────────

const sp = (ctx) => ctx.group.userData.sprite;

const ANIM = {
  // Trees and plants: the card rocks gently about its foot.
  sway: (t, dt, ctx) => {
    sp(ctx).pivot.rotation.z = Math.sin(t * 0.9 + ctx.phase) * 0.022 + Math.sin(t * 2.3 + ctx.phase) * 0.006;
  },
  // Characters: a soft breathing squash plus the odd little hop of joy.
  idle: (t, dt, ctx) => {
    const { pivot } = sp(ctx);
    const b = Math.sin(t * 2.1 + ctx.phase);
    let y = 0;
    const cycle = (t + ctx.phase * 3) % 7.5;
    if (cycle < 0.42) y = Math.sin((cycle / 0.42) * Math.PI) * 0.16;
    pivot.scale.set(1 - b * 0.008, 1 + b * 0.016, 1);
    pivot.position.y = y;
    pivot.rotation.z = Math.sin(t * 0.7 + ctx.phase) * 0.025;
  },
  // Grazing: every few seconds the card bows forward to nibble.
  graze: (t, dt, ctx) => {
    const { pivot, flip } = sp(ctx);
    const cycle = (t + ctx.phase * 2) % 6;
    const k = cycle < 2 ? Math.sin((cycle / 2) * Math.PI) : 0;
    pivot.rotation.z = -k * 0.12 * Math.sign(flip.scale.x || 1);
    const b = Math.sin(t * 2 + ctx.phase);
    pivot.scale.set(1, 1 + b * 0.012, 1);
  },
  // Hanging signs: swing with a faint tremble.
  swing: (t, dt, ctx) => {
    sp(ctx).pivot.rotation.z = Math.sin(t * 1.4 + ctx.phase) * 0.04 + Math.sin(t * 7 + ctx.phase) * 0.004;
  },
  // Small props: a shy wobble now and then.
  wobble: (t, dt, ctx) => {
    const cycle = (t + ctx.phase * 2) % 5;
    sp(ctx).pivot.rotation.z = cycle < 0.8 ? Math.sin(cycle * Math.PI * 5) * 0.05 * (1 - cycle / 0.8) : 0;
  },
  // Busy work (builders): quick rhythmic bobbing.
  work: (t, dt, ctx) => {
    const { pivot } = sp(ctx);
    const k = Math.max(0, Math.sin(t * 6 + ctx.phase));
    pivot.rotation.z = -k * 0.08;
    pivot.position.y = k * 0.05;
  },
};

// Legacy animation names from the old procedural library, accepted silently.
const LEGACY_ANIMS = {
  windSway: 'sway', blink: 'idle', look: 'idle', hammer: 'work', crankTurn: 'none',
  windowGlow: 'none', swivel: 'none', steam: 'none', flicker: 'none', smoke: 'smoke',
  needle: 'wobble', bob: 'wobble', spin: 'wobble', dig: 'work', slew: 'none', wave: 'idle',
  sleep: 'idle', rock: 'idle', bounce: 'wobble', cycle: 'cycle', drive: 'drive', swing: 'swing',
  glow: 'none', sway: 'sway', idle: 'idle', graze: 'graze', walk: 'idle', sit: 'idle',
};

// ── extras (lights, smoke, driving) ───────────────────────────────────────

// A lamp halo at (fx, fy) — fractions of the card width/height from its foot.
function addGlow(group, fx, fy, size, color = palette.lampGlow) {
  const { w, h, flip } = group.userData.sprite;
  const g = makeGlow(size, color, 0.75);
  g.position.set(fx * w, fy * h, 0.06);
  flip.add(g);
  return g;
}

function lampExtra(fy, size = 1.4) {
  return (group, opts, anims) => {
    const glow = addGlow(group, 0, fy, size * group.userData.sprite.h / 3.2);
    anims.always = (t, dt, ctx) => {
      glow.material.opacity = 0.62 + Math.sin(t * 3.1 + ctx.phase) * 0.05 + (Math.sin(t * 17 + ctx.phase) > 0.97 ? -0.2 : 0);
    };
  };
}

// Traffic light: three halos over the printed lamps, cycling red → green → amber.
function trafficExtra(group, opts, anims) {
  const h = group.userData.sprite.h;
  const lights = [
    addGlow(group, 0.01, 0.885, h * 0.24, '#ff8a6a'),
    addGlow(group, 0.01, 0.745, h * 0.24, '#ffd27a'),
    addGlow(group, 0.01, 0.62, h * 0.24, '#9fe0a0'),
  ];
  const set = (i) => lights.forEach((l, j) => { l.visible = i === j; });
  set(0);
  anims.cycle = (t, dt, ctx) => {
    const c = (t + ctx.phase) % 5.8;
    set(c < 2.6 ? 0 : c < 5 ? 2 : 1);
  };
}

// Paper smoke puffs drifting up from a chimney at (fx, fy).
function smokeExtra(fx, fy) {
  return (group, opts, anims) => {
    const { w, h, flip } = group.userData.sprite;
    const puffs = [];
    for (let i = 0; i < 5; i += 1) {
      const puff = paperMesh(new THREE.CircleGeometry(0.32, 7), palette.cloud, i + 3, 0.06, { unlit: true, transparent: true });
      puff.material = puff.material.clone();
      flip.add(puff);
      puffs.push(puff);
    }
    anims.smoke = (t, dt, ctx) => {
      puffs.forEach((p, i) => {
        const k = ((t * 0.22 + i / puffs.length + ctx.phase) % 1);
        p.position.set(fx * w + Math.sin(k * 5 + i) * 0.25 + k * 0.9, fy * h + k * 3.2, 0.02);
        p.scale.setScalar(0.5 + k * 1.3);
        p.material.opacity = Math.min(1, (1 - k) * 1.6) * 0.92;
        p.rotation.z = k * 2 + i;
      });
    };
  };
}

// Vehicles: ping-pong along options.path (prop-local x range), turning by
// flipping the card like a paper puppet; a little bounce while rolling.
function driveExtra(group, opts, anims, def) {
  const sp3 = group.userData.sprite;
  const { pivot } = sp3;
  // Vehicles join the road traffic (core/traffic.js): two lanes, U-turns,
  // keeping their distance and braking for the wolf.
  const f = group.userData.footprint3d ?? { w: sp3.w, d: 0.6 };
  group.userData.drives = true;
  const veh = addVehicle(group, pivot, opts, {
    len: f.w, width: Math.max(f.d, 0.5), speed: def.speed ?? 2.6,
    wheels: sp3.rig?.parts?.wheels ?? [],
    wheelR: (sp3.rig?.parts?.wheelRadius ?? 10) * (sp3.h / 100),
  });
  // models are built with the front at +x; a model built facing −x is
  // turned round once inside the pivot
  if (def.facing === -1 && sp3.flip) sp3.flip.rotation.y = Math.PI;
  const shadow = group.children.find((c) => c !== pivot);
  anims.drive = (t, dt, ctx) => {
    driveVehicle(veh, dt);
    pivot.position.y = Math.abs(Math.sin(t * 9 + ctx.phase)) * 0.025 * (veh.v > 0.05 ? 1 : 0);
    if (shadow) { shadow.position.x = pivot.position.x; shadow.position.z = pivot.position.z; }
  };
}

// ── fence: drawn in code in the sheet's picket style ──────────────────────

let grainData = null;
function grainPixels() {
  if (!grainData) grainData = getGrainCanvas().getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 256, 256).data;
  return grainData;
}

function fenceTexture(length, seed) {
  const PXU = 110;
  const W = Math.round(length * PXU);
  const H = Math.round(1.45 * PXU);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const r = rng(seed + 11);
  const woods = ['#7a5f45', '#8f7256', '#a88a66', '#c2a37a', '#6c5440', '#9a8170'];
  const railY = [0.42, 0.7].map((f) => H * f);
  // rails behind the pickets
  for (const y of railY) {
    ctx.fillStyle = '#6c5440';
    ctx.fillRect(0, y, W, H * 0.09);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, y, W, H * 0.03);
  }
  const step = 0.36 * PXU;
  for (let x = step * 0.3; x < W - step * 0.3; x += step) {
    const pw = step * (0.62 + r() * 0.12);
    const ph = H * (0.72 + r() * 0.24);
    const col = woods[Math.floor(r() * woods.length)];
    const top = H - ph;
    const flat = r() < 0.3; // some posts are square-topped, as on the sheet
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - pw / 2, H);
    ctx.lineTo(x - pw / 2, top + (flat ? 0 : pw * 0.7));
    if (flat) ctx.lineTo(x + pw / 2, top);
    else ctx.lineTo(x, top);
    ctx.lineTo(x + pw / 2, top + (flat ? 0 : pw * 0.7));
    ctx.lineTo(x + pw / 2, H);
    ctx.closePath();
    ctx.fill();
    // folded-paper half shading: right half darker
    ctx.fillStyle = 'rgba(40,30,20,0.16)';
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x, top + (flat ? 0 : 0));
    ctx.lineTo(x + pw / 2, top + (flat ? 0 : pw * 0.7));
    ctx.lineTo(x + pw / 2, H);
    ctx.closePath();
    ctx.fill();
  }
  // paper tooth, multiplied into the painted pickets only
  const img = ctx.getImageData(0, 0, W, H);
  const grain = grainPixels();
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      const g = grain[((y % 256) * 256 + (x % 256)) * 4] / 255;
      img.data[i] *= g; img.data[i + 1] *= g; img.data[i + 2] *= g;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function buildFence(options = {}) {
  const length = options.length ?? 5;
  const h = 1.45;
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  const flip = new THREE.Group();
  pivot.add(flip);
  group.add(pivot);
  const tex = fenceTexture(length, options.seed ?? 0);
  const geo = new THREE.PlaneGeometry(length, h).translate(0, h / 2 - 0.06, 0);
  const mat = (color) => new THREE.MeshBasicMaterial({
    map: tex, color, alphaTest: 0.45, alphaToCoverage: true, side: THREE.DoubleSide,
  });
  const edge = new THREE.Mesh(geo, mat('#5a4f40'));
  edge.position.set(0.03, -0.01, -0.035);
  flip.add(edge);
  flip.add(new THREE.Mesh(geo, mat('#ffffff')));
  group.add(contactShadow(length * 1.02, 0.5, 0.16));
  group.userData.sprite = { name: 'fence', w: length, h, pivot, flip };
  return group;
}

// ── mountain backdrop: faceted paper ridges, light/dark halves like the
// trees on the sheet ────────────────────────────────────────────────────────

function buildMountains(options = {}) {
  const width = options.width ?? 30;
  const height = options.height ?? 6;
  const r = rng((options.seed ?? 0) + 3);
  const group = new THREE.Group();
  const layers = [
    // a step darker than the horizon ridges, so it sits in front of them
    { z: -4.2, scale: 1, light: '#c9d0bf', dark: '#bbc4b0' },
    { z: -2.2, scale: 0.74, light: '#b5bfaa', dark: '#a7b29c' },
    { z: 0, scale: 0.5, light: '#a3af97', dark: '#95a289' },
  ];
  layers.forEach((L, li) => {
    const peaks = Math.max(3, Math.round(width / (height * 1.1)) + li);
    for (let i = 0; i < peaks; i += 1) {
      const cx = -width / 2 + (width * (i + 0.5 + (r() - 0.5) * 0.5)) / peaks;
      const ph = height * L.scale * (0.7 + r() * 0.45);
      const pw = ph * (1.5 + r() * 0.6);
      const tipX = cx + (r() - 0.5) * pw * 0.2;
      for (const [x0, col] of [[cx - pw / 2, L.light], [cx + pw / 2, L.dark]]) {
        const shape = new THREE.Shape();
        shape.moveTo(x0, 0);
        shape.lineTo(tipX, ph);
        shape.lineTo(tipX, 0);
        shape.closePath();
        const mesh = paperMesh(new THREE.ShapeGeometry(shape), col, i * 7 + li, 0.03, { unlit: true, side: THREE.DoubleSide });
        mesh.position.z = L.z + i * 0.01;
        group.add(mesh);
      }
      // snowless paper cap: a pale fold near the tip on the light side
      if (ph > height * 0.75) {
        const cap = new THREE.Shape();
        const k = 0.22;
        cap.moveTo(tipX - (tipX - (cx - pw / 2)) * k, ph * (1 - k));
        cap.lineTo(tipX, ph);
        cap.lineTo(tipX, ph * (1 - k * 1.2));
        cap.closePath();
        const m = paperMesh(new THREE.ShapeGeometry(cap), palette.ivory, i, 0.02, { unlit: true, side: THREE.DoubleSide });
        m.position.z = L.z + i * 0.01 + 0.005;
        group.add(m);
      }
    }
  });
  group.position.y = -0.3;
  return group;
}

// ── catalog ───────────────────────────────────────────────────────────────
// sprites: [name] or { variantKey: name | [names] }
// height: default world height (number, or { spriteName: h })
// pick: option name that selects a variant key (default "variant")
// colors: { spriteName: representative color } for options.color matching

const TYPES = {
  // nature
  pineTree: { sprites: ['pine1', 'pine2', 'pine3', 'pine4', 'pine5', 'pine6', 'pine7', 'pine8', 'pineSlate', 'stackTree'], height: 4.8, anim: 'sway' },
  coneTree: { sprites: ['coneTreeMint', 'coneTreeSlate', 'coneTreeMauve', 'coneTreeTall', 'coneTreeSage', 'slimTree', 'slimTree2', 'gemTree'], height: 4, anim: 'sway' },
  parkTree: {
    pick: 'shape',
    sprites: {
      cone: ['potCone', 'potCone2'], ball: ['potRound'], poplar: ['potConeSlate', 'coneTreeTall'],
      round: ['roundTree', 'goldTree'], diamond: ['potGemTree', 'potTreeHex'], trio: ['potTreeTrio'],
    },
    height: { potCone: 2.3, potCone2: 2.3, potRound: 2.5, potConeSlate: 3, coneTreeTall: 3.6, roundTree: 3.4, goldTree: 3.2, potGemTree: 2.6, potTreeHex: 2.8, potTreeTrio: 3 },
    anim: 'sway',
  },
  sheep: { sprites: ['sheep'], height: 1.9, anim: 'idle', anims: ['idle', 'graze'] },
  lamb: { sprites: ['sheep'], height: 1.2, anim: 'idle', anims: ['idle', 'graze'] },
  haystack: { sprites: ['haystack'], height: 2.5 },
  hut: { sprites: ['hut'], height: 4.1 },
  well: { sprites: ['well'], height: 2.9 },
  flowerPot: { sprites: ['flowerPot'], height: 1.1, anim: 'sway' },
  officePlant: { sprites: ['plant'], height: 1.5, anim: 'sway' },
  cabbage: { sprites: ['cabbage', 'cabbage2'], height: 0.5 },
  ball: { sprites: ['ball'], height: 0.35, anim: 'bounce' },

  // village & town buildings
  cottage: {
    sprites: { timber: 'cottageTimber', plain: 'cottageGable', roundWindow: 'cottageRound', rose: 'cottageRose', cabin: 'cabin' },
    height: { cottageTimber: 3.9, cottageGable: 3.9, cottageRound: 3.9, cottageRose: 4.3, cabin: 3.6 },
  },
  barn: { sprites: ['barn'], height: 3.9 },
  townhouse: {
    sprites: { awning: 'townhouseRose', steep: 'chapel', timber: 'cabin', cream: 'townhouseA', cream2: 'townhouseB' },
    height: { townhouseRose: 4.6, chapel: 4.4, cabin: 3.8, townhouseA: 4.2, townhouseB: 4.2 },
  },
  schoolhouse: { sprites: ['schoolhouse'], height: 4.6 },
  kindergarten: { sprites: ['kindergarten'], height: 3.6 },
  slide: { sprites: ['slide'], height: 1.6 },
  churchTower: { sprites: ['churchNamestovo'], height: 7.5 },
  chapel: { sprites: ['chapel'], height: 4.4 },
  townHall: { sprites: ['townHall'], height: 5.2 },
  apartmentBlock: { sprites: ['apartmentBlock'], height: 4.6 },
  chalet: { sprites: ['chalet', 'stoneCottage'], height: { chalet: 4.2, stoneCottage: 3.4 } },
  faceHouse: { sprites: ['faceHouse'], height: 3.6 },
  lake: { sprites: ['oravaLake'], height: 4.2, shadow: false },
  roundabout: { sprites: ['roundabout', 'flowerIsland'], height: 1.6 },
  signpost: { sprites: ['cycleSign', 'signTangle'], height: 2.4 },
  cemetery: { sprites: ['cemetery'], height: 3.4 },
  landfill: { sprites: ['landfill'], height: 3 },
  skip: { sprites: ['skip', 'skipBig'], height: 1.2 },
  shed: { sprites: ['shed'], height: 2.6 },
  officeTower: {
    sprites: ['towerSmallA', 'towerSmallB', 'towerTall', 'towerSage', 'towerSpire', 'towerMauve', 'towerSlate', 'towerIvory'],
    height: { towerSmallA: 5.4, towerSmallB: 5.4, towerTall: 7.6, towerSage: 8, towerSpire: 8, towerMauve: 8, towerSlate: 8.4, towerIvory: 8.4 },
    colors: {
      towerSmallA: '#a8b3a4', towerSmallB: '#a8b3a4', towerTall: '#a4ada3', towerSage: '#9eab9b',
      towerSpire: '#e3dac8', towerMauve: '#a98289', towerSlate: '#6f7a74', towerIvory: '#e6dccb',
    },
  },
  zevoPlant: { sprites: ['zevoPlant'], height: 6, anim: 'smoke' },
  zevoChimney: { sprites: ['zevoChimney'], height: 8 },
  shopBuilding: { sprites: ['shop'], height: 3.8 },
  marketStall: { sprites: ['stall'], height: 3 },
  vault: { sprites: ['vault'], height: 1.9 },

  // street furniture
  streetlamp: { sprites: ['streetlamp', 'lantern'], height: 3.2, extra: (g, o, a) => lampExtra(g.userData.sprite.name === 'lantern' ? 0.8 : 0.86)(g, o, a) },
  trafficLight: { sprites: ['trafficLight'], height: 3.3, anim: 'cycle', extra: trafficExtra },
  bench: { sprites: ['bench'], height: 0.95 },
  hydrant: { sprites: ['hydrantRed', 'hydrant'], height: 0.75 },
  busStop: { sprites: ['busStop', 'postbox'], height: 2.6 },
  recyclingBin: { sprites: ['recyclingBin', 'recyclingBin2', 'recyclingBin3'], height: 0.9 },
  signalPole: { sprites: ['signalPole', 'stripedPost'], height: 3 },
  trafficCone: { sprites: ['trafficCone', 'trafficCone2', 'trafficCone3'], height: 0.55 },
  crane: { sprites: ['crane'], height: 7 },
  scaffold: { sprites: ['scaffold'], height: 2.8 },
  roadBarrier: { sprites: ['stripedBarrier', 'barrierLow', 'roadBarrier'], height: 0.9 },
  bricks: { sprites: ['bricks'], height: 0.7 },
  cementMixer: { sprites: ['cementMixer'], height: 1.8 },
  footballGoal: { sprites: ['smallGoal', 'bigGoal', 'footballGoal'], height: 1.2 },
  runningTrack: { sprites: ['runningTrack'], height: 0.6, shadow: false },
  stadiumStand: { sprites: ['stadiumStand', 'bowlStadium'], height: { stadiumStand: 1.6, bowlStadium: 1.8 } },
  cinema: { sprites: ['cinema'], height: 4.2 },
  stage: { sprites: ['stage'], height: 2.8 },
  lighthouse: { sprites: ['lighthouse'], height: 3.6 },
  climbFrame: { sprites: ['climbFrame'], height: 2.4 },
  filmCamera: { sprites: ['filmCamera'], height: 1.1 },
  seniorHome: { sprites: ['seniorHome'], height: 3.8 },
  wheelchair: { sprites: ['wheelchair'], height: 1.1 },
  stairLift: { sprites: ['stairLift'], height: 2.2 },
  cane: { sprites: ['cane', 'crutch'], height: 1.0 },

  // vehicles (facing: +1 = printed pointing right)
  car: { sprites: ['carSage', 'carSage2', 'carMint', 'carMint2'], height: 1.25, anim: 'drive', extra: driveExtra, speed: 3.2 },
  bus: { sprites: ['busGray', 'busCream'], height: 1.8, anim: 'drive', extra: driveExtra, speed: 2.4 },
  schoolBus: { sprites: ['schoolBus'], height: 1.9, anim: 'drive', extra: driveExtra, speed: 2.4 },
  garbageTruck: { sprites: ['garbageTruck'], height: 1.8, anim: 'drive', extra: driveExtra, speed: 2 },
  snowPlough: { sprites: ['snowPlough'], height: 1.7, anim: 'drive', extra: driveExtra, speed: 1.6 },
  lawnMower: { sprites: ['lawnMower'], height: 1.3, anim: 'drive', extra: driveExtra, speed: 1.4 },
  bucketTruck: { sprites: ['bucketTruck'], height: 2.6 },
  excavator: { sprites: ['excavator'], height: 3.0, anim: 'dig' },
  roadRoller: { sprites: ['roadRoller', 'drumRoller'], height: 1.3, anim: 'drive', extra: driveExtra, speed: 1.2 },

  // characters
  citizen: { sprites: ['fox', 'kit', 'bearDog'], height: 1.6, anim: 'idle' },
  pupil: { pick: 'animal', sprites: { bunny: 'bunnyPupil', bear: 'bearPupil', cat: 'catPupil', fox: 'kit', panda: 'pandaKid' }, height: 1.35, anim: 'idle' },
  teacher: { sprites: ['foxTeacher'], height: 1.8, anim: 'idle' },
  elder: { pick: 'variant', sprites: { bench: 'grandparentsBench', badger: 'badger' }, height: { grandparentsBench: 1.9, badger: 1.4 }, anim: 'idle' },
  athlete: { pick: 'animal', sprites: { panda: 'pandaRunner' }, height: 1.9, anim: 'idle' },
  musician: { pick: 'animal', sprites: { fox: 'foxViolinist' }, height: 1.9, anim: 'idle' },
  family: { sprites: ['bearFamily', 'lambBalloon'], height: { bearFamily: 2.0, lambBalloon: 1.5 }, anim: 'idle' },
  carer: { sprites: ['bunnyNurse'], height: 1.8, anim: 'idle' },
  builder: { pick: 'animal', sprites: { bear: 'builderBear', foreman: 'foremanBear', boar: 'boar' }, height: { builderBear: 1.6, foremanBear: 2.4, boar: 1.6 }, anim: 'idle', anims: ['idle', 'work'] },
  officeWorker: {
    pick: 'animal',
    sprites: { bear: 'bearWorker', cat: 'catWorker', hamster: 'koalaWorker', koala: 'koalaWorker', badger: 'badger', boss: 'bearBoss', accountant: 'accountantBear' },
    height: { bearWorker: 2.1, catWorker: 2.1, koalaWorker: 2.1, badger: 1.6, bearBoss: 2.3, accountantBear: 2.0 },
    anim: 'idle',
  },
  shopkeeper: {
    pick: 'animal',
    sprites: { wolf: 'wolfShopkeeper', bear: 'boar', boar: 'boar', panda: 'pandaGirl', pandaKid: 'pandaKid', fox: 'fox' },
    height: 1.8,
    anim: 'idle',
  },
  mascot: { pick: 'animal', sprites: { badger: 'badger', wolf: 'wolfHead', panda: 'panda' }, height: 2.4, anim: 'idle' },

  // office
  desk: { sprites: ['desk'], height: 1.85 },
  schoolDesk: { sprites: ['schoolDesk'], height: 0.9 },
  canteenCounter: { sprites: ['canteenCounter'], height: 1.2 },
  piano: { sprites: ['piano'], height: 1.5 },
  musicStand: { sprites: ['musicStand'], height: 1.3 },
  officeChair: { sprites: ['officeChair'], height: 1.3 },
  bookshelf: { sprites: ['bookshelf', 'bookshelfTall'], height: 2.2 },
  whiteboard: { sprites: ['flipchart'], height: 2.3 },
  blackboard: { sprites: ['blackboard'], height: 1.7 },
  meetingTable: { sprites: ['meetingTable', 'longTable'], height: { meetingTable: 1.45, longTable: 1.9 } },
  table: { sprites: ['meetingTable'], height: 1.45 },
  filingCabinet: { sprites: ['filingCabinet'], height: 1.9 },
  deskLamp: { sprites: ['deskLamp'], height: 1, extra: lampExtra(0.5, 1.0) },
  mug: { sprites: ['mug'], height: 0.55, shadow: false },
  paperStack: { sprites: ['papers', 'bookStack'], height: { papers: 0.6, bookStack: 0.4 } },
  ledger: { sprites: ['ledger'], height: 0.6 },
  calculator: { sprites: ['calculator'], height: 0.6 },
  umbrella: { sprites: ['umbrellaDesk', 'umbrellaClosed'], height: { umbrellaDesk: 2.2, umbrellaClosed: 1.4 } },
  safetyNet: { sprites: ['safetyNet'], height: 1.2 },
  brakeLever: { sprites: ['brakeLever'], height: 1.2 },
  wasteBasket: { sprites: ['wasteBasket', 'bin'], height: 0.6 },
  clock: { sprites: ['clock'], height: 0.8, shadow: false },

  // shop & money
  crate: { sprites: ['greensCrate', 'produce'], height: { greensCrate: 0.9, produce: 1.4 } },
  basket: { sprites: ['basket', 'vegBasket'], height: 0.75 },
  flourSack: { sprites: ['flourSack'], height: 1.6 },
  breadShelf: { sprites: ['breadShelf', 'breadCrate'], height: 1.7 },
  shopSign: { sprites: ['hangingSign', 'signBoard'], height: 1.7, anim: 'swing' },
  shoppingCart: { sprites: ['cart', 'cart2'], height: 1.2 },
  pram: { sprites: ['pram'], height: 1.2 },
  scale: { sprites: ['scale'], height: 1, anim: 'wobble' },
  moneyBag: { sprites: ['moneyBag'], height: 1 },
  coinStack: { sprites: ['coinStack'], height: 0.8 },
  piggyBank: { pick: 'variant', sprites: { whole: 'piggyBank', cracked: 'crackedPiggy' }, height: 0.95 },
  gem: { sprites: ['coinGold', 'gemRose', 'gemSlate', 'gemTan', 'plum'], height: 0.8 },
};

// ── builder ───────────────────────────────────────────────────────────────

function hexDist(a, b) {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return (ca.r - cb.r) ** 2 + (ca.g - cb.g) ** 2 + (ca.b - cb.b) ** 2;
}

function chooseSprite(def, options, r) {
  if (Array.isArray(def.sprites)) {
    if (options.color && def.colors) {
      return def.sprites.reduce((best, s) => (hexDist(def.colors[s], options.color) < hexDist(def.colors[best], options.color) ? s : best), def.sprites[0]);
    }
    if (options.variant && def.sprites.includes(options.variant)) return options.variant;
    return def.sprites[Math.floor(r() * def.sprites.length)];
  }
  const key = options[def.pick ?? 'variant'];
  let entry = key != null ? def.sprites[key] : null;
  if (!entry) {
    const keys = Object.keys(def.sprites);
    entry = def.sprites[keys[Math.floor(r() * keys.length)]];
  }
  return Array.isArray(entry) ? entry[Math.floor(r() * entry.length)] : entry;
}

function heightFor(def, name, options) {
  const base = typeof def.height === 'object' ? (def.height[name] ?? 2) : (def.height ?? 2);
  if (typeof options.height === 'number') return options.height;
  // Old knobs that implied size still scale the card sensibly.
  if (typeof options.tiers === 'number') return base * (0.55 + options.tiers * 0.11);
  if (typeof options.floors === 'number') return Math.max(base * 0.7, options.floors * 1.15 + 1.2);
  if (typeof options.width === 'number' && def.widthRef) return base * (options.width / def.widthRef);
  return base;
}

function buildType(typeName, def, options = {}) {
  const r = rng((options.seed ?? 0) * 7 + typeName.length);
  const name = chooseSprite(def, options, r);
  // seeded height drift keeps rows of the same asset from looking stamped
  const drift = def.anim === 'sway' && typeof options.height !== 'number' ? 0.9 + r() * 0.2 : 1;
  const group = makeStandee(name, {
    height: heightFor(def, name, options) * drift,
    flip: options.flip ?? (def.extra === driveExtra ? false : r() < 0.5),
    shadow: def.shadow,
  });
  const own = group.userData.modelAnims;
  const ownNames = own ? Object.keys(own).filter((k) => k !== 'always') : [];
  const anims = {};
  // generic card motions only for pieces without a rig of their own
  if (!ownNames.length) {
    for (const a of def.anims ?? (def.anim && ANIM[def.anim] ? [def.anim] : [])) anims[a] = ANIM[a];
  }
  if (def.extra) def.extra(group, options, anims, def);
  // A 3D model brings its own rigged animations (blinking, waving, wagging…).
  let fallback = def.anim ?? null;
  if (own) {
    const always = [anims.always, own.always].filter(Boolean);
    Object.assign(anims, own);
    if (always.length > 1) anims.always = (t, dt, ctx) => { for (const f of always) f(t, dt, ctx); };
    if (!fallback || !anims[fallback]) fallback = ['idle', 'sway', ...ownNames].find((k) => anims[k]) ?? fallback;
    // a deck asking for a motion this rig doesn't have gets the rig's default
    const asked = anims[options.animation] ? options.animation : (LEGACY_ANIMS[options.animation] ?? options.animation);
    if (asked && asked !== 'none' && !anims[asked]) options = { ...options, animation: fallback };
  }
  applyAnimation(group, anims, options, fallback, typeName, LEGACY_ANIMS);
  return group;
}

for (const [typeName, def] of Object.entries(TYPES)) {
  register(typeName, (options) => buildType(typeName, def, options));
}

register('fence', (options = {}) => {
  // the 3D picket fence model; the painted card is the fallback
  if (!hasModel('fence3d')) return buildFence(options);
  const g = makeStandee('fence3d', { ...options, height: 1.45, shadow: false });
  g.add(contactShadow((options.length ?? 5) * 1.02, 0.5, 0.16));
  return g;
});
register('mountainBackdrop', buildMountains);

// Every sprite by its own name — exact piece, sensible default height.
const SPRITE_HEIGHT = {};
for (const def of Object.values(TYPES)) {
  const names = Array.isArray(def.sprites) ? def.sprites : Object.values(def.sprites).flat();
  for (const n of names) if (!SPRITE_HEIGHT[n]) SPRITE_HEIGHT[n] = { def, h: typeof def.height === 'object' ? def.height[n] : def.height };
}
SPRITE_HEIGHT.wolf = { def: { anim: 'idle' }, h: 2.2 };
for (const n of spriteNames()) {
  if (TYPES[n] || n === 'wolf' || !hasSprite(n)) continue;
  const known = SPRITE_HEIGHT[n];
  const def = { ...(known?.def ?? {}), sprites: [n], height: known?.h ?? 2 };
  register(n, (options) => buildType(n, def, options));
}

// Default world height of a sprite / model by name (the lab uses it to show
// material textures at their real scale).
export function spriteHeight(name) {
  return SPRITE_HEIGHT[name]?.h ?? 2;
}

export const assetTypes = Object.keys(TYPES).concat(['fence', 'mountainBackdrop']);

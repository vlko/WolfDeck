// Model lab (dev only): compare every hand-built model with its sprite.
//   /lab.html                       — pick an environment in the toolbar
//   /lab.html?env=office            — open on one environment
//   /lab.html?m=wolf,sheep          — exactly these models
//   &t=2.5 freezes time, &anim=walk picks an animation
//   &pack=city1 loads only that model module (verify scripts use it so edits
//   to other packs don't hot-reload the page mid-screenshot)
// Each row: the reference sprite | the 3D model front-on (orthographic) |
// the model at three-quarters (perspective) | from the side.
import * as THREE from 'three';
import { preloadSprites } from './assets/sprites.js';
import { buildModel, hasModel, modelNames, modelInfo, setPack } from './models/registry.js';
import { loadFonts } from './parts/fonts.js';
import { addSceneLights } from './engine/lights.js';

const urls = import.meta.glob('./sprites/*.webp', { eager: true, query: '?url', import: 'default' });
const url = (n) => urls[`./sprites/${n}.webp`];

const q = new URLSearchParams(location.search);

// Model modules, in dependency order (trees before the packs that reuse them).
const PACKS = ['visual', 'village', 'trees', 'city1', 'city2', 'office', 'shop', 'construction', 'school', 'sport', 'social', 'services', 'money', 'namestovo', 'extras', 'vehicles'];
const modules = import.meta.glob('./models/*.js');
for (const pack of q.get('pack') ? [q.get('pack')] : PACKS) {
  setPack(pack);
  await modules[`./models/${pack}.js`]();
}
setPack(null);

// Environments — where an object belongs in a deck. Most follow the sheet
// it was cut from; the extras (objects no sheet has) are sorted by theme.
const ENVS = [
  ['village', 'Dedina a lúka'],
  ['trees', 'Stromy a rastliny'],
  ['city', 'Mesto a ulica'],
  ['vehicles', 'Vozidlá'],
  ['folk', 'Postavičky'],
  ['office', 'Kancelária'],
  ['shop', 'Obchod a trh'],
  ['school', 'Škola a šport'],
  ['finance', 'Financie'],
  ['construction', 'Stavba'],
  ['services', 'Služby mesta'],
  ['town', 'Námestovo'],
];
const BY_NAME = {
  folk: ['wolf', 'sheep', 'badger', 'wolfHead', 'bearDog', 'fox', 'kit', 'panda', 'bearBoss', 'catWorker', 'koalaWorker', 'bearWorker', 'wolfShopkeeper', 'boar', 'pandaKid', 'pandaGirl', 'foremanBear', 'builderBear', 'bunnyPupil', 'bearPupil', 'catPupil', 'foxTeacher', 'grandparentsBench', 'bunnyNurse', 'bearFamily', 'lambBalloon', 'pandaRunner', 'foxViolinist', 'wasteBear', 'accountantBear'],
  vehicles: ['carSage', 'carSage2', 'busCream', 'carMint', 'carMint2', 'pickup', 'busGray', 'garbageTruck', 'excavator', 'roadRoller', 'drumRoller', 'cementMixer', 'schoolBus', 'snowPlough', 'lawnMower', 'bucketTruck'],
  trees: ['coneTreeSlate', 'coneTreeSage', 'coneTreeMauve', 'potConeSlate', 'potTreeHex', 'potTreeTrio', 'potGemTree', 'stackTree', 'stackTreeTiers', 'pineSlate', 'roundTree', 'goldTree', 'potCone', 'potCone2', 'potRound', 'coneTreeTall', 'gemTree', 'coneTreeMint', 'slimTree', 'slimTree2', 'plant', 'flowerPot'],
  school: ['schoolhouse', 'blackboard', 'footballGoal', 'ball', 'kindergarten', 'slide', 'schoolDesk', 'canteenCounter', 'musicStand', 'piano', 'bunnyPupil', 'bearPupil', 'catPupil', 'foxTeacher', 'schoolBus', 'runningTrack', 'stadiumStand', 'bigGoal', 'smallGoal', 'footballDark', 'cinema', 'bowlStadium', 'climbFrame', 'lighthouse', 'pandaRunner', 'stage', 'filmCamera', 'foxViolinist'],
  finance: ['piggyBank', 'coinStack', 'vault', 'ledger', 'coinGold', 'gemRose', 'gemSlate', 'moneyBag', 'gemTan', 'townHall', 'umbrellaDesk', 'safetyNet', 'calculator', 'brakeLever', 'crackedPiggy', 'umbrellaClosed', 'accountantBear'],
  construction: ['crane', 'excavator', 'scaffold', 'trafficCone', 'trafficCone2', 'trafficCone3', 'roadRoller', 'drumRoller', 'roadBarrier', 'stripedBarrier', 'barrierLow', 'bricks', 'cementMixer', 'foremanBear', 'builderBear', 'signalPole', 'stripedPost', 'shed'],
  services: ['garbageTruck', 'recyclingBin', 'zevoPlant', 'pram', 'bin', 'hydrant', 'hydrantRed', 'postbox', 'seniorHome', 'cane', 'grandparentsBench', 'bunnyNurse', 'wheelchair', 'crutch', 'bearFamily', 'lambBalloon', 'stairLift', 'snowPlough', 'lawnMower', 'bucketTruck', 'skipBig', 'skip', 'recyclingBin2', 'recyclingBin3', 'landfill', 'wasteBear', 'zevoChimney', 'cemetery'],
  office: ['deskLamp'],
  town: ['churchNamestovo', 'oravaLake', 'faceHouse', 'stoneCottage', 'flowerIsland', 'roundabout', 'cycleSign', 'apartmentBlock', 'signTangle', 'chalet'],
};
const PACK_ENV = { visual: 'village', village: 'village', trees: 'trees', city1: 'city', city2: 'city', office: 'office', shop: 'shop' };
function envsOf(name) {
  const envs = Object.entries(BY_NAME).filter(([, list]) => list.includes(name)).map(([e]) => e);
  if (!envs.length || (envs.length === 1 && envs[0] === 'folk')) envs.push(PACK_ENV[modelInfo(name).pack] ?? 'services');
  return envs;
}

await Promise.all([preloadSprites(), loadFonts()]);

// ── toolbar ──────────────────────────────────────────────────────────────
const bar = document.getElementById('bar');
const counts = Object.fromEntries(ENVS.map(([e]) => [e, modelNames().filter((n) => envsOf(n).includes(e)).length]));
let env = q.get('env') ?? (q.has('m') ? null : 'village');
let search = '';
bar.innerHTML = ENVS.map(([e, label]) => `<button data-env="${e}">${label} <span>${counts[e]}</span></button>`).join('')
  + `<button data-env="all">Všetko <span>${modelNames().length}</span></button><input id="search" placeholder="hľadať…">`;
bar.addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  env = b.dataset.env;
  search = '';
  document.getElementById('search').value = '';
  rebuild();
});
document.getElementById('search').addEventListener('input', (ev) => { search = ev.target.value.trim().toLowerCase(); rebuild(); });

// ── rows ─────────────────────────────────────────────────────────────────
const tFixed = q.has('t') ? +q.get('t') : null;
const animName = q.get('anim');
const rowsEl = document.getElementById('rows');
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
addSceneLights(scene);

let items = [];
function selected() {
  if (q.has('m') && env === null) return q.get('m').split(',').filter(Boolean);
  return modelNames().filter((n) => (search ? n.toLowerCase().includes(search) : env === 'all' || envsOf(n).includes(env)));
}
function rebuild() {
  for (const it of items) if (it.group) scene.remove(it.group);
  rowsEl.innerHTML = '';
  for (const b of bar.querySelectorAll('button')) b.classList.toggle('on', !search && b.dataset.env === env);
  items = selected().map((name) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<div class="cell"><span class="label">${name} — sprite</span>${url(name) ? `<img src="${url(name)}">` : '<span class="none">bez predlohy</span>'}</div>
      <div class="cell"><span class="label">front</span></div><div class="cell"><span class="label">3/4</span></div><div class="cell"><span class="label">side</span></div>`;
    rowsEl.appendChild(row);
    if (!hasModel(name)) return { name, row };
    const { group } = buildModel(name, { height: 100, seed: 1 });
    scene.add(group);
    return { name, row, group, anims: group.userData.modelAnims, ctx: { group, phase: 1.3 } };
  });
  window.scrollTo(0, 0);
}
rebuild();

const ortho = new THREE.OrthographicCamera(-60, 60, 60, -60, -500, 500);
const persp = new THREE.PerspectiveCamera(30, 1, 1, 2000);

function frame(t) {
  canvas.style.height = `${innerHeight}px`;
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setScissorTest(true);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  const top = bar.getBoundingClientRect().bottom;
  for (const it of items) {
    if (!it.group) continue;
    const r = it.row.getBoundingClientRect();
    if (r.bottom < top || r.top > innerHeight) continue; // off screen
    for (const o of items) if (o.group) o.group.visible = o === it;
    if (it.anims) {
      const fn = it.anims[animName] ?? it.anims[Object.keys(it.anims).find((k) => k !== 'always')];
      it.anims.always?.(t, 1 / 60, it.ctx);
      fn?.(t, 1 / 60, it.ctx);
    }
    const cw = r.width / 4;
    // wide pieces: back the perspective cameras off so nothing is cropped
    const k = Math.max(1, (it.group.userData.sprite.w / 100) * 0.85);
    const views = [
      [1, () => { ortho.position.set(0, 50, 200); ortho.lookAt(0, 50, 0); return ortho; }],
      [2, () => { persp.position.set(160 * k, 120 * k, 260 * k); persp.lookAt(0, 45, 0); return persp; }],
      [3, () => { persp.position.set(320 * k, 70, 0); persp.lookAt(0, 45, 0); return persp; }],
    ];
    for (const [i, cam] of views) {
      const x = r.left + cw * i;
      const y = innerHeight - r.bottom;
      const visH = Math.min(r.bottom, innerHeight) - Math.max(r.top, top);
      renderer.setViewport(x, y, cw, r.height);
      renderer.setScissor(x, innerHeight - Math.min(r.bottom, innerHeight), cw, Math.max(visH, 0));
      const aspect = cw / r.height;
      // wide pieces (tables, vehicles) get a wider frame so nothing is cropped
      const half = 55 * Math.max(1, (it.group.userData.sprite.w / 100) / (aspect * 1.05));
      ortho.left = -half * aspect; ortho.right = half * aspect;
      ortho.top = half; ortho.bottom = -half;
      ortho.updateProjectionMatrix();
      persp.aspect = aspect; persp.updateProjectionMatrix();
      renderer.render(scene, cam());
    }
  }
}

const t0 = performance.now();
function loop() {
  frame(tFixed ?? (performance.now() - t0) / 1000);
  requestAnimationFrame(loop);
}
loop();
window.labReady = true;

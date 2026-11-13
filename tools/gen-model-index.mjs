// Writes src/models/packs.json: which pack (src/models/<pack>.js) holds each
// 3D model. The deck reads it to download only the packs its props use.
//
//   node tools/gen-model-index.mjs        (npm run model-index)
//
// The dev server and the build run it by themselves (vite.config.js), also
// whenever a model file changes. It imports the packs in plain Node — they
// only REGISTER builders at import time, nothing is built.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/models');
const NOT_PACKS = new Set(['index', 'kit', 'registry', 'order']);

// the few browser globals module top-levels touch
globalThis.window ??= { location: { search: '' } };
globalThis.document ??= { createElement: () => ({ getContext: () => null }) };

const load = (f) => import(pathToFileURL(path.join(dir, f)).href);
const { PACK_ORDER } = await load('order.js');
const { setPack, modelNames, modelInfo } = await load('registry.js');

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3))
  .filter((f) => !NOT_PACKS.has(f));
const unlisted = files.filter((f) => !PACK_ORDER.includes(f)).sort();
if (unlisted.length) console.warn(`[model-index] not in src/models/order.js (loaded last): ${unlisted.join(', ')}`);

for (const pack of [...PACK_ORDER.filter((p) => files.includes(p)), ...unlisted]) {
  setPack(pack);
  await load(`${pack}.js`);
}

// name → the LAST pack that defined it (the one whose model wins)
const models = Object.fromEntries(modelNames().map((n) => [n, modelInfo(n).pack]));
const out = `${JSON.stringify({ models }, null, 1)}\n`;
const file = path.join(dir, 'packs.json');
if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== out) {
  fs.writeFileSync(file, out);
  console.log(`[model-index] ${Object.keys(models).length} models in ${new Set(Object.values(models)).size} packs → src/models/packs.json`);
}

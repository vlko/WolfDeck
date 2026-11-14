// One lab cell of a model at several animation times, tiled — to follow a
// whole loop: node tools/verify/labtimes.mjs <pack> <name> <anim> <t0,t1,…> [out.png] [view=1]
import fs from 'fs';
import sharp from 'sharp';
import { launch, BASE } from './browser.mjs';
const [,, pack, name, anim, times, out = `tools/out/labtimes-${name}.png`, view = '1'] = process.argv;
const { browser, page } = await launch({ width: 1600, height: 640 });
const shots = [];
for (const t of times.split(',')) {
  await page.goto(`${BASE}/lab.html?m=${name}&t=${t}&anim=${anim}&pack=${pack}`, { timeout: 180000 });
  await page.waitForFunction(() => window.labReady, null, { timeout: 180000 });
  await page.waitForTimeout(1200);
  const box = await page.evaluate(() => document.querySelector('.row').getBoundingClientRect().toJSON());
  const w = box.width / 4;
  shots.push(await page.screenshot({ clip: { x: box.left + w * +view, y: box.top, width: w, height: box.height } }));
}
const tw = 300;
const th = Math.round(tw * 420 / 400);
const tiles = await Promise.all(shots.map(async (b, i) => ({ input: await sharp(b).resize(tw, th).toBuffer(), left: i * tw, top: 0 })));
await sharp({ create: { width: tw * shots.length, height: th, channels: 3, background: '#fff' } }).composite(tiles).png().toFile(out);
console.log(out);
await browser.close();
void fs;

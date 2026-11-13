// Film strip of an animation: slows the page's clock so that a screenshot
// (about a second in the headless shell) lands every few dozen ms of deck
// time, presses a key, and tiles the frames (left to right, top to bottom).
//
//   node tools/verify/filmstrip.mjs "<url path>" out.png [keys=Space] [frames=8] [slow=0.07] [clip=x,y,w,h]
import sharp from 'sharp';
import { launch, BASE } from './browser.mjs';

const [,, path, out = 'tools/out/filmstrip.png', key = 'Space', frames = '8', slow = '0.07', clip = '0,0,1600,620'] = process.argv;
const [x, y, width, height] = clip.split(',').map(Number);
const { browser, page } = await launch({ width: 1600, height: 900 });
await page.addInitScript((k) => {
  const now = performance.now.bind(performance);
  const raf = window.requestAnimationFrame.bind(window);
  performance.now = () => now() * k;
  window.requestAnimationFrame = (cb) => raf((t) => cb(t * k));
}, +slow);
await page.goto(`${BASE}${path}`, { timeout: 120000 });
await page.waitForFunction(() => window.wolfdeck, null, { timeout: 60000 });
await page.waitForTimeout(Math.min(40000, 1500 / +slow)); // let the arrival settle
// several keys ("Space,Space"): all but the last are pressed and left to
// finish first — the strip films the last one
const keys = key.split(',');
for (const k of keys.slice(0, -1)) {
  await page.keyboard.press(k);
  await page.waitForTimeout(Math.min(40000, 1500 / +slow));
}
await page.keyboard.press(keys.at(-1));
const shots = [];
for (let i = 0; i < +frames; i += 1) shots.push(await page.screenshot({ clip: { x, y, width, height } }));
const cols = 4;
const tw = 560;
const th = Math.round((tw * height) / width);
const tiles = await Promise.all(shots.map(async (buf, i) => ({
  input: await sharp(buf).resize(tw, th).toBuffer(), left: (i % cols) * tw, top: Math.floor(i / cols) * th,
})));
await sharp({ create: { width: cols * tw, height: Math.ceil(shots.length / cols) * th, channels: 3, background: '#fff' } })
  .composite(tiles).png().toFile(out);
console.log('filmstrip →', out);
await browser.close();

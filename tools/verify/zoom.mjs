// Zoomed lab view of one model: node tools/verify/zoom.mjs name view [out.png] [t]
// view: 1 front, 2 3/4, 3 side. Renders the lab row at 3× pixel density and
// clips to that one cell — for checking small details (windows, seams).
import { chromium } from 'playwright-core';
import { BASE, cachedShell } from './browser.mjs';
const [,, name, view = '2', out = `tools/out/zoom-${name}-${view}.png`, t = '1.0'] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? cachedShell(),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 640 }, deviceScaleFactor: 3 });
const extra = process.env.LAB_QS ?? '';
await page.goto(`${BASE}/lab.html?m=${name}&t=${t}${extra}`);
await page.waitForFunction(() => window.labReady, null, { timeout: 120000 });
await page.waitForTimeout(1500);
const box = await page.evaluate(() => document.querySelector('.row').getBoundingClientRect().toJSON());
const w = box.width / 4;
await page.screenshot({ path: out, clip: { x: box.left + w * +view, y: box.top, width: w, height: box.height } });
await browser.close();

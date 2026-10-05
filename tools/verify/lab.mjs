// Model lab screenshot: node tools/verify/lab.mjs wolf,pine1 [out.png] [t] [anim]
// Rows: sprite | front | 3/4 | side  (see lab.html). LAB_PACK=city1 loads
// only src/models/city1.js (isolates the page from edits to other packs).
import { launch, BASE } from './browser.mjs';
const [,, names, out = 'tools/out/lab.png', t = '1.0', anim = ''] = process.argv;
const n = names.split(',').length;
const { browser, page } = await launch({ width: 1600, height: 420 * n + 110 }); // + toolbar (may wrap to two lines)
const pack = process.env.LAB_PACK ? `&pack=${process.env.LAB_PACK}` : '';
await page.goto(`${BASE}/lab.html?m=${names}&t=${t}${anim ? `&anim=${anim}` : ''}${pack}`);
await page.waitForFunction(() => window.labReady, null, { timeout: 30000 }).catch(() => console.log('lab not ready'));
// fit the window to the whole page (the toolbar wraps as filters are added);
// a spacer under the last row keeps it clear of the bottom edge
await page.evaluate(() => { const d = document.createElement('div'); d.style.height = '140px'; document.getElementById('rows').appendChild(d); });
const full = await page.evaluate(() => document.documentElement.scrollHeight);
await page.setViewportSize({ width: 1600, height: full });
await page.waitForTimeout(1200);
await page.screenshot({ path: out });
await browser.close();

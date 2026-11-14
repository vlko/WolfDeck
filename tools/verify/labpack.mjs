// Lab screenshots of a whole pack: node tools/verify/labpack.mjs <pack> [outPrefix] [t] [perShot]
// One browser, <perShot> models per image (sprite | front | 3/4 | side).
import fs from 'fs';
import { launch, BASE } from './browser.mjs';
const [,, pack, out = `tools/out/labpack-${pack}`, t = '1.0', per = '3'] = process.argv;
const types = JSON.parse(fs.readFileSync(`src/models/${pack}.types.json`, 'utf8'));
const names = [...new Set(Object.values(types).flatMap((d) => (Array.isArray(d.sprites) ? d.sprites : Object.values(d.sprites).flat())))];
const { browser, page } = await launch({ width: 1600, height: 420 * +per + 110 });
for (let i = 0; i < names.length; i += +per) {
  const group = names.slice(i, i + +per);
  await page.goto(`${BASE}/lab.html?m=${group.join(',')}&t=${t}&pack=${pack}`, { timeout: 180000 });
  await page.waitForFunction(() => window.labReady, null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}-${i / +per}.png` });
  console.log(`${out}-${i / +per}.png`, group.join(','));
}
await browser.close();

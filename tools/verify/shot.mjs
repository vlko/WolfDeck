// Deck screenshots: node tools/verify/shot.mjs "<url path>" out.png key key wait500 shot ...
// "shot" saves out-<n>.png mid-sequence; the final state goes to out.png.
import { launch, BASE } from './browser.mjs';
const [,, path, out, ...keys] = process.argv;
const { browser, page } = await launch();
await page.goto(`${BASE}${path}`);
await page.waitForTimeout(4000);
let i = 0;
for (const k of keys) {
  if (k.startsWith('wait')) await page.waitForTimeout(+k.slice(4));
  else if (k === 'shot') await page.screenshot({ path: out.replace('.png', `-${i++}.png`) });
  else await page.keyboard.press(k);
}
await page.screenshot({ path: out });
await browser.close();

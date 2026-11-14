// node tools/verify/tour.mjs deck.json outPrefix id[:P][:n][:waitMs] ...  → screenshot per slide id
// (n = extra Space presses after landing on the slide, waitMs = settle time before the shot)
import { launch, BASE } from './browser.mjs';
const [,, deck, out, ...ids] = process.argv;
const { browser, page } = await launch();
await page.goto(`${BASE}/?deck=${deck}`, { timeout: 120000 });
await page.waitForFunction(() => window.wolfdeck, null, { timeout: 120000 }); // the dev server's first load is slow
await page.waitForTimeout(3000);
for (const spec of ids) {
  const [id, mode, extra, wait] = spec.split(':');
  await page.evaluate((h) => { location.hash = h; }, id);
  await page.waitForTimeout(2500);
  for (let i = 0; i < (+extra || 0); i += 1) { await page.keyboard.press('Space'); await page.waitForTimeout(900); }
  if (+wait) await page.waitForTimeout(+wait);
  if (mode === 'P') { await page.keyboard.press('p'); await page.waitForTimeout(1500); }
  await page.screenshot({ path: `${out}-${id}${mode || ''}${+extra ? `-${extra}` : ''}.png` });
  if (mode === 'P') { await page.keyboard.press('p'); await page.waitForTimeout(500); }
}
await browser.close();

// node tools/verify/tour.mjs deck.json outPrefix id[:P][:n] ...  → screenshot per slide id
import { launch, BASE } from './browser.mjs';
const [,, deck, out, ...ids] = process.argv;
const { browser, page } = await launch();
await page.goto(`${BASE}/?deck=${deck}`);
await page.waitForTimeout(5000);
for (const spec of ids) {
  const [id, mode, extra] = spec.split(':');
  await page.evaluate((h) => { location.hash = h; }, id);
  await page.waitForTimeout(2500);
  for (let i = 0; i < (+extra || 0); i += 1) { await page.keyboard.press('Space'); await page.waitForTimeout(900); }
  if (mode === 'P') { await page.keyboard.press('p'); await page.waitForTimeout(1500); }
  await page.screenshot({ path: `${out}-${id}${mode || ''}.png` });
  if (mode === 'P') { await page.keyboard.press('p'); await page.waitForTimeout(500); }
}
await browser.close();

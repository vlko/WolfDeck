// N forward then N back must land where it started, for every shipped deck.
import { launch, BASE } from './browser.mjs';
const { browser, page } = await launch({ width: 1280, height: 720 });
for (const deck of ['presentation.json', 'rozpocet-2025.json', 'showcase.json', 'test-props.json']) {
  await page.goto(`${BASE}/?deck=${deck}`);
  await page.waitForTimeout(4000);
  const st = () => page.evaluate(() => JSON.stringify(window.wolfdeck.stepMachine.state));
  const s0 = await st();
  for (let i = 0; i < 12; i += 1) { await page.keyboard.press('Space'); await page.waitForTimeout(i % 3 ? 300 : 1800); }
  await page.waitForTimeout(4000);
  const mid = await st();
  for (let i = 0; i < 12; i += 1) { await page.keyboard.press('Backspace'); await page.waitForTimeout(i % 3 ? 300 : 1800); }
  await page.waitForTimeout(4000);
  const end = await st();
  console.log(s0 === end ? 'OK  ' : 'FAIL', deck, s0, '->', mid, '->', end);
}
await browser.close();

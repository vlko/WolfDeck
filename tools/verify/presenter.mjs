// Presenter mode check: node tools/verify/presenter.mjs [deck.json] [out.png]
// Starts presenting (headless: no fullscreen, just the presenter window),
// then asserts the state/notes/next text arrive, the thumbnail is a real
// picture, and the presenter's keys drive the deck — N forward, N back.
import sharp from 'sharp';
import { launch, BASE } from './browser.mjs';

const [,, deck = 'rozpocet-2025.json', out = 'tools/out/presenter.png'] = process.argv;
const { browser, page } = await launch();
let failed = 0;
const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) failed += 1; };

await page.goto(`${BASE}/?deck=${deck}`, { timeout: 120000 });
await page.waitForFunction(() => window.wolfdeck, null, { timeout: 30000 });
await page.waitForTimeout(1500);

const popupP = page.context().waitForEvent('page');
await page.keyboard.press('KeyF');
const pop = await popupP;
pop.on('console', (m) => { if (m.type() === 'error') console.log('POPUP CONSOLE', m.text().slice(0, 300)); });
pop.on('pageerror', (e) => { console.log('POPUP PAGEERROR', e.message); failed += 1; });
await pop.setViewportSize({ width: 1280, height: 800 });
await pop.waitForSelector('.pv-frame img', { timeout: 15000 });
await pop.waitForTimeout(800);

const state = () => page.evaluate(() => window.wolfdeck.stepMachine.state);
const text = (sel) => pop.locator(sel).innerText();
check(await page.evaluate(() => window.wolfdeck.presenter.connected), 'presenter window connected');
check(/Slide 1 \/ \d+/.test(await text('.pv-count')), `slide counter: ${await text('.pv-count')}`);
check((await text('.pv-title')).length > 0, `current title: ${await text('.pv-title')}`);
check((await text('.pv-next')).length > 8, `next: ${(await text('.pv-next')).replace(/\n+/g, ' | ').slice(0, 120)}`);
const hasNotes = await page.evaluate(() => !!window.wolfdeck.presenter.stateMessage().notes);
check(!hasNotes || !(await pop.locator('.pv-notes-text.empty').count()), `notes shown (deck has notes here: ${hasNotes})`);

// the thumbnail must be a picture, not a blank buffer
const b64 = await pop.evaluate(async () => {
  const blob = await (await fetch(document.querySelector('.pv-frame img').src)).blob();
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.readAsDataURL(blob); });
});
const stats = await sharp(Buffer.from(b64, 'base64')).stats();
const spread = Math.max(...stats.channels.map((c) => c.stdev));
check(spread > 8, `thumbnail has content (stdev ${spread.toFixed(1)})`);

// keys in the presenter window drive the deck; N forward, N back is home
const start = await state();
const N = 9;
const seen = [];
for (let i = 0; i < N; i += 1) {
  await pop.keyboard.press('Space');
  await pop.waitForTimeout(350);
  await page.waitForFunction(() => !window.wolfdeck.hero.walking, null, { timeout: 30000 });
  await pop.waitForTimeout(150);
  seen.push(`${await text('.pv-count')}`);
}
const far = await state();
check(far.scene !== start.scene || far.step !== start.step, `Space ×${N} moved the deck to ${JSON.stringify(far)}`);
check(new Set(seen).size > 1, `counter followed: ${[...new Set(seen)].join(' → ')}`);
await pop.waitForTimeout(600);
await pop.screenshot({ path: out });
for (let i = 0; i < N; i += 1) {
  await pop.keyboard.press('Backspace');
  await pop.waitForTimeout(350);
  await page.waitForFunction(() => !window.wolfdeck.hero.walking, null, { timeout: 30000 });
  await pop.waitForTimeout(150);
}
const back = await state();
check(back.scene === start.scene && back.step === start.step, `Backspace ×${N} returned to ${JSON.stringify(back)}`);
check(/Slide 1 \//.test(await text('.pv-count')), 'counter back on slide 1');

// P from the presenter toggles the flat view
await pop.keyboard.press('KeyP');
await pop.waitForTimeout(300);
check(await page.evaluate(() => window.wolfdeck.focus.active), 'P in the presenter window toggles presentation mode');
await pop.waitForTimeout(1200);
await pop.screenshot({ path: out.replace('.png', '-2d.png') });

console.log(failed ? `${failed} check(s) failed` : 'all checks passed', '→', out);
await browser.close();
process.exit(failed ? 1 : 0);

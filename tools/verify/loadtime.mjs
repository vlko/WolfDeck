// Startup profile: how long the page takes to its first frame, where the
// time goes (network vs. scripting) and which requests are the slow ones.
//   node tools/verify/loadtime.mjs [deck.json] [runs]
import { launch, BASE } from './browser.mjs';

const deck = process.argv[2] ?? 'codecon-2026.json';
const runs = Number(process.argv[3] ?? 2);

for (let run = 1; run <= runs; run++) {
  const { browser, page } = await launch();
  const reqs = new Map();
  const done = [];
  page.on('request', (r) => reqs.set(r, Date.now()));
  page.on('requestfinished', (r) => done.push({ url: r.url().replace(BASE, ''), ms: Date.now() - reqs.get(r), type: r.resourceType() }));
  const t0 = Date.now();
  await page.goto(`${BASE}/?deck=${deck}`, { waitUntil: 'commit', timeout: 300000 });
  await page.waitForFunction(() => performance.getEntriesByName('boot:total').length, null, { timeout: 300000 });
  const total = Date.now() - t0;
  const marks = await page.evaluate(() => performance.getEntriesByType('measure').map((m) => [m.name, Math.round(m.duration)]));
  const byType = {};
  for (const d of done) { (byType[d.type] ??= { n: 0 }).n++; }
  const last = Math.max(...done.map((d) => reqs.get([...reqs.keys()].find((r) => r.url().endsWith(d.url))) + d.ms)) - t0;
  console.log(`\nrun ${run}: ready in ${total} ms · ${done.length} requests · last response at ${last} ms`);
  console.log('  by type:', Object.entries(byType).map(([k, v]) => `${k} ${v.n}`).join(', '));
  for (const [n, d] of marks) console.log(`  ${String(d).padStart(6)} ms  ${n.replace('boot:', '')}`);
  console.log('  slowest:', done.sort((a, b) => b.ms - a.ms).slice(0, 6).map((d) => `${d.ms} ${d.url.slice(0, 60)}`).join('\n           '));
  await browser.close();
}

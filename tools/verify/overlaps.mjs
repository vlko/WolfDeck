// Reports, per deck: props standing on a road, and pairs of props whose
// ground footprints overlap a lot (on the walkable rows, z −4 … 6).
// node tools/verify/overlaps.mjs [deck.json …]
import { launch, BASE } from './browser.mjs';
const decks = process.argv.slice(2).length ? process.argv.slice(2) : ['presentation.json', 'rozpocet-2025.json', 'showcase.json', 'test-props.json'];
const { browser, page } = await launch({ width: 800, height: 450 });
for (const deck of decks) {
  await page.goto(`${BASE}/?deck=${deck}`);
  await page.waitForFunction(() => window.wolfdeck, null, { timeout: 30000 });
  const report = await page.evaluate(() => {
    const w = window.wolfdeck.world;
    const obs = w.allObstacles();
    const roads = window.wolfdeck.deck.meta.roads ?? [];
    const out = [];
    // world-axis bounding box of an oriented rect
    const box = (o) => {
      const ex = Math.abs(o.hw * o.cos) + Math.abs(o.hd * o.sin);
      const ez = Math.abs(o.hw * o.sin) + Math.abs(o.hd * o.cos);
      return { x0: o.x - ex, x1: o.x + ex, z0: o.z - ez, z1: o.z + ez };
    };
    for (const o of obs) {
      const b = box(o);
      for (const r of roads) {
        if (b.x1 > r.from && b.x0 < r.to && b.z1 > r.z - r.width / 2 && b.z0 < r.z + r.width / 2) {
          out.push(`ROAD   ${o.scene}: ${o.type} at x=${o.x.toFixed(1)} z=${o.z.toFixed(1)} (road z=${r.z}±${r.width / 2})`);
        }
      }
    }
    for (let i = 0; i < obs.length; i += 1) {
      for (let j = i + 1; j < obs.length; j += 1) {
        const a = obs[i]; const c = obs[j];
        if (a.scene !== c.scene) continue;
        const A = box(a); const B = box(c);
        const ix = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0);
        const iz = Math.min(A.z1, B.z1) - Math.max(A.z0, B.z0);
        if (ix <= 0 || iz <= 0) continue;
        const area = ix * iz;
        const small = Math.min((A.x1 - A.x0) * (A.z1 - A.z0), (B.x1 - B.x0) * (B.z1 - B.z0));
        if (area / small > 0.25) out.push(`OVERLAP ${a.scene}: ${a.type}@${a.x.toFixed(1)},${a.z.toFixed(1)} × ${c.type}@${c.x.toFixed(1)},${c.z.toFixed(1)} (${Math.round((area / small) * 100)}%)`);
      }
    }
    return out;
  });
  console.log(`== ${deck}: ${report.length} issue(s)`);
  for (const l of report) console.log('  ', l);
}
await browser.close();

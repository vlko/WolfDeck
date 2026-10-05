// Traffic sanity: over ~20 s no two vehicles may overlap, and a wolf placed
// on the road must make the vehicles stop short of him.
import { launch, BASE } from './browser.mjs';
const { browser, page } = await launch({ width: 1280, height: 720 });
await page.goto(`${BASE}/#city`);
await page.waitForFunction(() => window.wolfdeck, null, { timeout: 30000 });
await page.waitForTimeout(2500);
let worstOverlap = 0;
let minWolfGap = Infinity;
for (let i = 0; i < 40; i += 1) {
  if (i === 15) {
    // walk the wolf onto the road (near lane) with S held
    await page.keyboard.down('s'); await page.waitForTimeout(1600); await page.keyboard.up('s');
  }
  const r = await page.evaluate(() => {
    const vs = [...window.wolfdeck.traffic.worldVehicles()].filter((v) => v.base);
    let ov = 0;
    for (let a = 0; a < vs.length; a += 1) for (let b = a + 1; b < vs.length; b += 1) {
      const A = vs[a]; const B = vs[b];
      const dx = Math.abs(A.wx - B.wx) - A.half - B.half;
      const dz = Math.abs(A.wz - B.wz) - (A.width + B.width) / 2;
      if (dx < 0 && dz < 0) ov = Math.max(ov, Math.min(-dx, -dz));
    }
    const h = window.wolfdeck.hero;
    let gap = Infinity;
    for (const v of vs) {
      if (Math.abs(v.wz - h.group.position.z) < v.width / 2 + 0.45) gap = Math.min(gap, Math.abs(v.wx - h.x) - v.half - 0.45);
    }
    return { ov, gap, z: h.group.position.z };
  });
  worstOverlap = Math.max(worstOverlap, r.ov);
  if (r.z > 3) minWolfGap = Math.min(minWolfGap, r.gap);
  await page.waitForTimeout(500);
}
console.log(`worst vehicle overlap: ${worstOverlap.toFixed(3)}  closest approach to wolf on road: ${minWolfGap.toFixed(2)}`);
await browser.close();

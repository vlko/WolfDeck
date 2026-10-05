// Average color of 7×7 patches: node tools/verify/colors.mjs sprite gx,gy ...
// (gx, gy in 0–10 grid units of the sprite's width / height)
import sharp from 'sharp';
const [,, name, ...pts] = process.argv;
const { data, info } = await sharp(`src/sprites/${name}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (const p of pts) {
  const [gx, gy] = p.split(',').map(Number);
  const X = Math.round((gx / 10) * (info.width - 1));
  const Y = Math.round((gy / 10) * (info.height - 1));
  let r = 0; let g = 0; let b = 0; let n = 0;
  for (let dy = -3; dy <= 3; dy += 1) {
    for (let dx = -3; dx <= 3; dx += 1) {
      const x = X + dx; const y = Y + dy;
      if (x < 0 || y < 0 || x >= info.width || y >= info.height) continue;
      const i = (y * info.width + x) * 4;
      if (data[i + 3] < 200) continue;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
    }
  }
  console.log(p, n ? `#${[r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('')}` : '(transparent)');
}

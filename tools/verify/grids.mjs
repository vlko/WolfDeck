// Sprites side by side with a 10 % grid (for measuring when modeling):
// node tools/verify/grids.mjs out.png name1 name2 ...
import sharp from 'sharp';
const [,, out, ...names] = process.argv;
const H = 400;
const tiles = [];
let x = 0;
for (const n of names) {
  const src = `src/sprites/${n}.webp`;
  const m = await sharp(src).metadata();
  const w = Math.round((m.width * H) / m.height);
  let svg = `<svg width="${w}" height="${H + 20}" xmlns="http://www.w3.org/2000/svg">`;
  for (let i = 1; i < 10; i += 1) {
    svg += `<line x1="${(w * i) / 10}" y1="0" x2="${(w * i) / 10}" y2="${H}" stroke="red" stroke-opacity="0.6"/>`
      + `<line y1="${(H * i) / 10}" x1="0" y2="${(H * i) / 10}" x2="${w}" stroke="red" stroke-opacity="0.6"/>`
      + `<text x="${(w * i) / 10 + 1}" y="10" font-size="10" fill="red">${i}</text><text y="${(H * i) / 10 - 1}" x="1" font-size="10" fill="red">${i}</text>`;
  }
  svg += `<text x="2" y="${H + 15}" font-size="13">${n}</text></svg>`;
  tiles.push({ input: await sharp(src).resize(w, H).png().toBuffer(), left: x, top: 0 }, { input: Buffer.from(svg), left: x, top: 0 });
  x += w + 12;
}
await sharp({ create: { width: x, height: H + 22, channels: 3, background: '#9aa88a' } }).composite(tiles).png().toFile(out);

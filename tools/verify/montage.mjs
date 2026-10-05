// node tools/verify/montage.mjs out.png a.png b.png ...  (2 columns, 960×540 tiles)
import sharp from 'sharp';
const [,, out, ...files] = process.argv;
const W = 960; const H = 540; const cols = 2;
const tiles = await Promise.all(files.map(async (f, i) => ({
  input: await sharp(f).resize(W, H, { fit: 'contain', background: '#fff' }).png().toBuffer(), left: (i % cols) * W, top: Math.floor(i / cols) * H,
})));
await sharp({ create: { width: W * cols, height: H * Math.ceil(files.length / cols), channels: 3, background: '#fff' } }).composite(tiles).png().toFile(out);

// QR codes for a deck's closing slide, in the deck's paper colors.
//   node tools/gen-qr.mjs <name> <url> [<name> <url> …]
// writes public/images/qr-<name>.png (use it with an "image" part).
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (!args.length || args.length % 2) {
  console.error('usage: node tools/gen-qr.mjs <name> <url> [<name> <url> …]');
  process.exit(1);
}
for (let i = 0; i < args.length; i += 2) {
  const file = path.join(root, 'public/images', `qr-${args[i]}.png`);
  await QRCode.toFile(file, args[i + 1], {
    errorCorrectionLevel: 'M', margin: 2, width: 720,
    color: { dark: '#2f3431', light: '#fbf8f1' }, // palette.ink on palette.panel
  });
  console.log(`[qr] ${args[i + 1]} → public/images/qr-${args[i]}.png`);
}

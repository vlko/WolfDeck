import * as THREE from 'three';
import { makeSlab, wrapLines, FONT_STACK, PX } from './card.js';
import { plainColors } from '../assets/materials.js';
import { palette } from '../assets/palette.js';
import { warn } from '../config.js';

// ── image ── fields: src (under public/), caption?, width?
// A paper mat with the picture inset and an optional caption strip.
// Missing image → magenta face + console warning (deck keeps running).

const loader = new THREE.TextureLoader();

export function imagePart(def) {
  const w = def.width ?? 5;
  const mat = 0.35; // paper border around the picture
  const capH = def.caption ? 0.72 : 0;

  const group = new THREE.Group();
  // Assume 4:3 until the texture arrives, then rescale the picture plane.
  let picW = w - mat * 2;
  let picH = picW * 0.72;
  const h = picH + mat * 2 + capH;

  group.add(makeSlab(w, h, { color: palette.paperWhite }));

  const picGeo = plainColors(new THREE.PlaneGeometry(1, 1));
  const picMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
  const pic = new THREE.Mesh(picGeo, picMat);
  pic.scale.set(picW, picH, 1);
  pic.position.set(0, capH / 2, 0.006);
  group.add(pic);

  if (def.src) {
    loader.load(
      def.src,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        picMat.color.set(0xffffff);
        picMat.map = tex;
        picMat.needsUpdate = true;
        // Fit the image's aspect inside the mat without growing the card.
        const aspect = tex.image.width / tex.image.height;
        let fw = picW;
        let fh = fw / aspect;
        if (fh > picH) { fh = picH; fw = fh * aspect; }
        pic.scale.set(fw, fh, 1);
      },
      undefined,
      () => warn(`image part: could not load "${def.src}" — magenta placeholder shown`),
    );
  } else {
    warn('image part: missing "src"');
  }

  if (def.caption) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * PX);
    canvas.height = Math.round(capH * PX);
    const ctx = canvas.getContext('2d');
    ctx.font = `italic 400 ${0.3 * PX}px ${FONT_STACK}`;
    ctx.fillStyle = palette.deepBrown;
    ctx.textAlign = 'center';
    const lines = wrapLines(ctx, def.caption, (w - 0.8) * PX);
    lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, 0.42 * PX + i * 0.4 * PX));
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const cap = new THREE.Mesh(
      plainColors(new THREE.PlaneGeometry(w - 0.2, capH)),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    );
    cap.position.set(0, -(h / 2) + capH / 2 + 0.12, 0.006);
    group.add(cap);
  }

  return group;
}

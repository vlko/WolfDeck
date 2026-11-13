// Shared bits for the slide styles.
import * as THREE from 'three';

// Rounded rectangle outline (centered), as a THREE.Path / Shape.
export function roundedRect(w, h, r, Ctor = THREE.Shape) {
  const s = new Ctor();
  const x = w / 2;
  const y = h / 2;
  const rr = Math.min(r, x, y);
  s.moveTo(-x + rr, -y);
  s.lineTo(x - rr, -y);
  s.quadraticCurveTo(x, -y, x, -y + rr);
  s.lineTo(x, y - rr);
  s.quadraticCurveTo(x, y, x - rr, y);
  s.lineTo(-x + rr, y);
  s.quadraticCurveTo(-x, y, -x, y - rr);
  s.lineTo(-x, -y + rr);
  s.quadraticCurveTo(-x, -y, -x + rr, -y);
  return s;
}

// A flat ring: outer rounded rect with an inner rounded-rect hole.
export function ringShape(wo, ho, ro, wi, hi, ri) {
  const s = roundedRect(wo, ho, ro);
  s.holes.push(roundedRect(wi, hi, ri, THREE.Path));
  return s;
}

export function flat(geometry, color, z = 0, extra = {}) {
  const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, ...extra }));
  m.position.z = z;
  return m;
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A soft blurred rectangle in the panel's own proportions (halo / shadow).
// Returns { texture, W, H } — the plane size that carries it.
export function blurRect(w, h, pad, blur, px = 36) {
  const W = w + pad * 2;
  const H = h + pad * 2;
  const texture = canvasTexture(Math.round(W * px), Math.round(H * px), (ctx) => {
    ctx.filter = `blur(${Math.max(1, Math.round(px * blur))}px)`;
    ctx.fillStyle = '#fff';
    ctx.fillRect(pad * px, pad * px, w * px, h * px);
  });
  return { texture, W, H };
}

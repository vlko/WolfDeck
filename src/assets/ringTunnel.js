import * as THREE from 'three';
import { register } from './registry.js';
import { applyAnimation } from './helpers.js';

// ringTunnel — a funnel of concentric rings hanging in the air, each one a
// step deeper than the one around it, closing on a dark disc: the end card
// of a cartoon, built in space so the camera's parallax shows the depth.
// Loaded only by decks that use it (see main.js). The prop's position is the
// CENTRE of the outermost ring.
//   options: radius (outer, default 5), rings (default 7), gap (depth step
//   between rings, default 0.28), well (how far behind the last ring the
//   centre disc sits, default 1.1), color / deepColor (ring shades, inner →
//   outer), centerColor, overlay (true: cover the scene, floor and all —
//   see below), animation: "pulse" (default) | "none".
// Unlit and fog-free on purpose — it has to glow in any mood.

// A flat annulus shaded across its width: `inner` colour on the inside edge,
// `outer` on the outside.
function band(r0, r1, inner, outer) {
  const geo = r0 > 0 ? new THREE.RingGeometry(r0, r1, 72, 1) : new THREE.CircleGeometry(r1, 72);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    c.copy(inner).lerp(outer, r1 > r0 ? (r - r0) / (r1 - r0) : 0);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }));
}

register('ringTunnel', (options = {}) => {
  const group = new THREE.Group();
  const R = options.radius ?? 5;
  const count = Math.max(2, Math.round(options.rings ?? 7));
  const gap = options.gap ?? 0.28;
  const hot = new THREE.Color(options.color ?? '#d6264f'); // the innermost ring's bright edge
  const deep = new THREE.Color(options.deepColor ?? '#8c0712'); // the outermost ring's
  // ring i spans radius(i) … radius(i + 1); 0 is the innermost
  const radius = (i) => R * (0.26 + 0.74 * (i / count) ** 1.12);

  const rings = [];
  for (let i = 0; i < count; i += 1) {
    const bright = hot.clone().lerp(deep, i / (count - 1));
    const dark = bright.clone().multiplyScalar(0.3);
    // a little overlap under the next ring out, so no seam shows from the side
    const mesh = band(radius(i), radius(i + 1) + (i < count - 1 ? R * 0.03 : 0), bright, dark);
    mesh.position.z = -(count - 1 - i) * gap;
    group.add(mesh);
    rings.push({ mesh, i, z: mesh.position.z });
  }
  // the dark well the rings close on
  const center = new THREE.Color(options.centerColor ?? '#0c3f84');
  const well = band(0, radius(0) * 1.35, center, center.clone().multiplyScalar(0.4));
  well.position.z = -(count - 1) * gap - (options.well ?? 1.1);
  group.add(well);

  // overlay: the rings paint over everything drawn so far — the floor
  // included (the deck draws the ground first) — and leave their own depth
  // behind, so what stands in front of them, or inside the well, still shows.
  // That is what lets a tunnel bigger than the stage cover the whole screen.
  if (options.overlay) {
    const order = [well, ...rings.map((r) => r.mesh)]; // deepest first
    order.forEach((m, i) => {
      m.material.depthFunc = THREE.AlwaysDepth;
      m.renderOrder = -1000 + i;
    });
  }

  group.userData.noObstacle = true;
  // where something can sit inside the hole (prop-local): for decks and tools
  group.userData.hole = { r: radius(0), z: -(count - 1) * gap, wellZ: well.position.z };

  const anims = {
    // a swell runs from the middle outwards, ring after ring
    pulse: (t) => {
      for (const r of rings) {
        const p = Math.sin(t * 2.1 - r.i * 0.75);
        r.mesh.scale.setScalar(1 + p * 0.022);
        r.mesh.position.z = r.z + p * gap * 0.35;
      }
    },
  };
  applyAnimation(group, anims, options, 'pulse', 'ringTunnel');
  return group;
});

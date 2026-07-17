# crane

Tower crane looming over the construction scenes — the pack's skyline piece,
sized like `officeTower`.

## Look

- Slate concrete base slab; straw-gold lattice mast (four corner posts,
  brace rings and alternating diagonals per segment) in `strawGold` /
  `slateGray`.
- Slewing top: `duckEggBlue` cab with a dark window, straw-gold peak
  pyramid, lattice jib with vertical struts, short counter-jib with a
  `slateGray` counterweight, deep-brown tie bars.
- Charcoal trolley and cable hanging from the jib, ending in a slate block
  with a charcoal hook.
- Blob shadow.

## Dimensions & origin

≈ 7 tall (with `height` ≈ 6.5–7.7 by seed) × jib reach ≈ 4–5. Origin at
ground-center of the base slab.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | deterministic height/jib variation, facet jitter |
| `height` | number | ≈ 6.5–7.7 (seeded) | overall tower height |
| `animation` | string | `armSwing` | see below |

## Animations

| name | description |
| ---- | ----------- |
| `armSwing` | the whole top slowly yaws ±0.4 rad (~12 s loop); the hook sways a beat behind (default) |
| `none` | static |

Select with `"options": { "animation": "<name>" }`. Default: `armSwing`.
Unknown names warn in the console and fall back to the default.

# scaffold

Wooden scaffolding frame — dresses building fronts in the construction
scenes.

## Look

- Four `barkBrown` uprights on `slateGray` foot pads.
- `tanBrown` ledgers ringing every level; three `plankBrown` walk boards
  per level, each seeded with a slight shift and skew.
- A bark-brown diagonal brace on the front face per level, direction
  alternating; a spare plank leaning against the frame.
- Blob shadow.

## Dimensions & origin

≈ 2.2 wide × 0.9 deep × 2.5 tall at `levels: 2` (each level adds ≈ 1.2).
Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | board misalignment, facet jitter |
| `levels` | number | 2 | number of walk-board levels (min 1) |

## Animations

| name | description |
| ---- | ----------- |
| — | `animations: none` for fully static assets |

Select with `"options": { "animation": "<name>" }`. Default: `none`.
Unknown names warn in the console and fall back to the default.

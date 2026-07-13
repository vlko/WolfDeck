# fence

Rustic picket fence running along x. Seeded post lean and height jitter make
it hand-built rather than machined.

## Look

- Plank posts (`plankBrown`) with darker pyramid tips, each slightly leaning
  and slightly different height.
- Two horizontal rails, faintly tilted.

## Dimensions & origin

`length` wide (default 5) × ≈ 1.3 tall × 0.15 deep. Origin at ground-center
of the run — the fence extends `length/2` to each side.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | lean/height jitter |
| `length` | number | 5 | run length along x (posts every ~0.75) |
| `color` | color | `plankBrown` | |

## Animations

`animations: none` — static asset.

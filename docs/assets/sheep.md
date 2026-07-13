# sheep

Round fluffy meadow sheep, front-facing, endlessly content.

## Look

- **Body** — one chunky faceted icosahedron "wool cloud" (`paperWhite`),
  slightly widened.
- **Head** — flat wool halo disc behind a parchment face disc; charcoal dot
  eyes (auto-blink), pink cheeks (`cheekPink`), tiny triangle nose, droopy
  capsule ears.
- **Legs** — four tan stubs (`tanBrown`).
- Soft blob shadow underneath.

## Dimensions & origin

≈ 2.0 wide × 1.9 tall × 1.5 deep. Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | facet-jitter + blink timing variation |
| `color` | color | `paperWhite` | wool color |
| `animation` | string | `idle` | see below |

## Animations

| name | description |
| ---- | ----------- |
| `idle` | gentle breathing, slight head bob and tilt, auto-blinks |
| `graze` | head dips toward the grass and back up on a slow cycle |
| `blink` | static pose, blinking only |
| `none` | frozen |

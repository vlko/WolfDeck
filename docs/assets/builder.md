# builder

Big-headed animal construction worker in a hard hat and hi-vis vest —
populates the site scenes.

## Look

- Boxy `strawGold` vest body with a `paperWhite` stripe band, `slateGray`
  work-boot legs, cream arms.
- Right arm is a shoulder pivot holding a hammer (`plankBrown` handle,
  `slateGray` head).
- Big animal head with charcoal dot eyes (auto-blink), blush cheeks and a
  straw-gold hard hat (dome + brim). Variants: `bear` (tan, round ears,
  cream muzzle), `fox` (straw-gold, pointy ears, cream muzzle), `badger`
  (cream, round ears, bark-brown muzzle).
- Blob shadow.

## Dimensions & origin

≈ 0.7 wide × 1.6 tall (hat top). Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | seeded animal pick, blink timing, facet jitter |
| `animal` | string | seeded pick | `"bear"`, `"fox"` or `"badger"` |
| `animation` | string | `idle` | see below |

## Animations

| name | description |
| ---- | ----------- |
| `idle` | breathing, gentle head tilt and look-around, auto-blinks (default) |
| `hammer` | gentle tap-tap with the hammer arm, head nodding along, still blinking |
| `none` | frozen |

Select with `"options": { "animation": "<name>" }`. Default: `idle`.
Unknown names warn in the console and fall back to the default.

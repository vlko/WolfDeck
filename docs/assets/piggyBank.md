# piggyBank

Cute faceted piggy bank — the finance pack's one animated prop.

## Look

- Faceted `dustyRose` body (squashed icosahedron) on four stub legs.
- `cheekPink` snout with charcoal nostrils, charcoal dot eyes,
  `cheekPink` cheeks (shopkeeper face style).
- `roseMauve` cone ears (pivot at the base so they wiggle) and a curly
  `roseMauve` tail.
- `charcoal` coin slot on the back with a `strawGold` coin half inserted.
- Blob shadow.

## Dimensions & origin

≈ 0.85 wide × 1.0 tall (to the ear tips) × 0.9 deep. Origin at
ground-center; the pig faces +z.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | facet jitter, blink timing |
| `animation` | string | `idle` | see below |

## Animations

| name | description |
| ---- | ----------- |
| `idle` | gentle breathing, intermittent ear wiggle, auto-blink (default) |
| `none` | static |

Select with `"options": { "animation": "<name>" }`. Default: `idle`.
Unknown names warn in the console and fall back to the default.

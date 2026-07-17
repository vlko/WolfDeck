# elder

Small stooped senior townsperson — pairs with `carer` in the social-care
scenes.

## Look

Slightly forward-leaning big-headed character with a cream face, blush
cheeks and dot eyes (auto-blink). Variants:

- `"cane"` — slate-gray coat, wisps of paper-white hair, bark-brown cane
  with a deep-brown grip at the side.
- `"headscarf"` — rose-mauve coat and a dusty-rose headscarf with a knot
  at the nape.

Deep-brown stub feet, blob shadow.

## Dimensions & origin

≈ 0.9 wide × 1.3 tall. Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | blink timing, jitter |
| `variant` | `"cane"` \| `"headscarf"` | `cane` | |

## Animations

| name | description |
| ---- | ----------- |
| `idle` | slow nod, hint of sway, auto-blinks (default) |
| `none` | frozen |

Select with `"options": { "animation": "<name>" }`. Default: `idle`.
Unknown names warn in the console and fall back to the default.

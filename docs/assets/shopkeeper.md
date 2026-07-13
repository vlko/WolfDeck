# shopkeeper

Big-headed standing shopkeeper in a faceted dress with stub feet — the
market characters from the reference sheet.

## Look

| animal | head |
| ------ | ---- |
| `wolf` | gray round head, cream muzzle, pointy dark ears, sage dress |
| `bear` | sage head and small round ears, cream muzzle, dark-sage dress |
| `panda` | paper-white head, **big mauve round ears and big mauve cheek patches**, teal dress |
| `fox` | **its own angular layout**: wide inverted-pentagon face tapering to the chin, cream inner mask, tall pointed ears with dark inners, nose at the chin point, dark-sage dress |

All: charcoal dot eyes (auto-blink), dot nose, faceted icosahedron dress
body, cream stub feet.

## Dimensions & origin

≈ 1.0 wide × 1.8 tall. Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | blink timing, jitter |
| `animal` | string | `panda` | `wolf` \| `bear` \| `panda` \| `fox` |
| `dressColor` | color | per animal | |

## Animations

| name | description |
| ---- | ----------- |
| `idle` | breathing, slow head turns and tilts, auto-blinks (default) |
| `none` | frozen |

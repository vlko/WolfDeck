# carer

Gentle care worker (nurse) — staffs the civic scenes beside `elder` and
the pram.

## Look

Big-headed standing animal in the citizen/shopkeeper mold: cream body
under a `duckEggBlue` apron panel and waist band, duck-egg cap with a tiny
paper-white cross; charcoal dot eyes (auto-blink), blush cheeks, stub
feet. Animal picks the head: white long-eared bunny (default), cream
pointy-eared cat, or tan round-eared bear. Blob shadow.

## Dimensions & origin

≈ 0.9 wide × 1.5 tall (≈ 1.9 with bunny ears). Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | blink timing, jitter |
| `animal` | `"bunny"` \| `"cat"` \| `"bear"` | `bunny` | head/ears variant |

## Animations

| name | description |
| ---- | ----------- |
| `idle` | breathing, slow look-around, auto-blinks (default) |
| `none` | frozen |

Select with `"options": { "animation": "<name>" }`. Default: `idle`.
Unknown names warn in the console and fall back to the default.

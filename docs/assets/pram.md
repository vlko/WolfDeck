# pram

Parent pushing a hooded pram — a strolling family vignette, arranged
side-on like the vehicles.

## Look

Sage-dressed big-headed parent (tan bear head, blush cheeks, auto-blink)
with arms tipped forward onto a deep-brown handle; dusty-rose bassinet
with a rose-mauve half-cylinder hood tipped back toward the parent, four
small charcoal wheels. The pair faces +x. Blob shadow under the whole
vignette.

## Dimensions & origin

≈ 1.55 long × 1.6 tall. Origin at ground-center (between parent and
pram).

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | blink timing, jitter |

## Animations

| name | description |
| ---- | ----------- |
| `stroll` | pram rocks gently in place, parent bobs, watches the pram and blinks (default) |
| `none` | frozen |

Select with `"options": { "animation": "<name>" }`. Default: `stroll`.
Unknown names warn in the console and fall back to the default.

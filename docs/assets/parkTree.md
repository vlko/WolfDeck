# parkTree

City greenery — mostly potted, per the reference sheets.

## Look

Five shapes: `cone` (faceted cone in a pot), `ball` (icosahedron crown on a
short trunk in a pot), `poplar` (tall skinny cone in a pot), `round` (big
faceted sphere crown on a full trunk, no pot; occasionally straw-gold),
`diamond` (big faceted diamond crown on a trunk, no pot — from the shop
sheet). Pots are parchment tapered cylinders. Blob shadow.

## Dimensions & origin

cone/ball ≈ 2.1 tall · poplar ≈ 3 · round ≈ 2.6. Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | shape pick, color drift |
| `shape` | string | seeded | `cone` \| `ball` \| `poplar` \| `round` \| `diamond` |
| `color` | color | `sage` (round is sometimes `strawGold`) | |
| `pot` | bool | true except `round` | |

## Animations

| name | description |
| ---- | ----------- |
| `windSway` | crown leans gently in the breeze (default) |
| `none` | static |

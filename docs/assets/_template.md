# assetName

One-line role of the asset in the diorama.

## Look

Parts breakdown (matched to the reference sheet `visual.png`) and the palette
color names used (see `src/assets/palette.js`).

## Dimensions & origin

Approximate bounding size in world units at `scale: 1`. Origin is always
**ground-center**: `y = 0` means standing on the terrain (the framework lifts
every prop onto the ground surface automatically).

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | deterministic shape/color variation |

## Animations

| name | description |
| ---- | ----------- |
| — | `animations: none` for fully static assets |

Select with `"options": { "animation": "<name>" }`. Default: `<name or none>`.
Unknown names warn in the console and fall back to the default.

# trafficCone

Little striped traffic cone — scatter a few to mark off roadworks and site
edges.

## Look

Square `dustyRose` base slab, dusty-rose lower frustum, `paperWhite` band,
dusty-rose tip — a 7-sided faceted paper cone. Blob shadow.

## Dimensions & origin

≈ 0.34 wide × 0.46 tall. Origin at ground-center of the base.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | facet jitter |

## Animations

| name | description |
| ---- | ----------- |
| — | `animations: none` for fully static assets |

Select with `"options": { "animation": "<name>" }`. Default: `none`.
Unknown names warn in the console and fall back to the default.

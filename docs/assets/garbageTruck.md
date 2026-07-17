# garbageTruck

Boxy municipal garbage truck on its collection round — the civic pack's
road vehicle.

## Look

Sage boxy cargo body with a cream roof strip and a darker (`sageDark`)
rear gate leaning off the tail, sage cab with dark windshield and side
windows, charcoal chassis rail, six charcoal wheels with stone-gray hubs
and warm headlight dots — windows, lights and wheels exist on **both
sides**, so the truck reads correctly in either driving direction. Blob
shadow.

## Dimensions & origin

≈ 2.4 long × 1.55 tall × 0.75 deep. Origin at ground-center; place it on
a road lane (numeric `layer` equal to the road's `z`, see `meta.roads`).

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | facet jitter |
| `color` | color | `sage` | body/cab color |
| `path` | `[x1, x2]` | `[-6, 6]` | prop-local x range it patrols |
| `speed` | number | 2.2 | units/second |
| `startAt` | 0–1 | random | starting point along the path |
| `direction` | 1 \| −1 | 1 | initial direction |

## Animations

| name | description |
| ---- | ----------- |
| `drive` | ping-pongs along `path`, wheels spin, turns around at the ends (default) |
| `none` | parked |

Select with `"options": { "animation": "<name>" }`. Default: `drive`.
Unknown names warn in the console and fall back to the default.

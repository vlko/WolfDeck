# car

Cute rounded city car, side view — drives its stretch of road on its own.

## Look

Rounded lozenge silhouette (extruded side profile like the reference
sheet): curved bumpers, hood, domed cabin. Two dark side windows separated
by a pillar, a warm headlight dot at the nose, and four charcoal wheels with
stone-gray hubs — windows, lights and wheels exist on **both sides**, so the
car reads correctly in either driving direction. Blob shadow.

## Dimensions & origin

≈ 1.9 long × 1.3 tall. Origin at ground-center; place it on a road lane
(numeric `layer` equal to the road's `z`, see `meta.roads`).

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | facet jitter |
| `color` | color | `sage` | |
| `path` | `[x1, x2]` | `[-6, 6]` | prop-local x range it patrols |
| `speed` | number | 3.2 | units/second |
| `startAt` | 0–1 | random | starting point along the path |
| `direction` | 1 \| −1 | 1 | initial direction |

## Animations

| name | description |
| ---- | ----------- |
| `drive` | ping-pongs along `path`, wheels spin, turns around at the ends (default) |
| `none` | parked |

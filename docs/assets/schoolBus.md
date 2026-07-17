# schoolBus

Straw-gold school bus — drives its stretch of road on its own, same drive
contract as `bus`/`car`.

## Look

Tall rounded lozenge (extruded side profile) in `strawGold` with a lighter
`cream` band along the sides, a row of four dark windows above the band, a
dark door up front and a warm headlight dot at the nose. Four charcoal
wheels with stone-gray hubs. Windows, door, lights and wheels exist on
**both sides**, so the bus reads correctly in either driving direction.
Blob shadow.

## Dimensions & origin

≈ 3.4 long × 1.5 tall. Origin at ground-center; place it on a road lane
(numeric `layer` equal to the road's `z`, see `meta.roads`).

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | facet jitter |
| `color` | color | `strawGold` | body color |
| `path` | `[x1, x2]` | `[-6, 6]` | prop-local x range it patrols |
| `speed` | number | 2.4 | units/second |
| `startAt` | 0–1 | random | starting point along the path |
| `direction` | 1 \| −1 | 1 | initial direction |

## Animations

| name | description |
| ---- | ----------- |
| `drive` | ping-pongs along `path`, wheels spin, turns around at the ends (default) |
| `none` | parked |

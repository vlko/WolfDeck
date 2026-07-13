# well

Stone village well with a crank, rope and bucket — the framework's one
animated *prop* in the reference set.

## Look

- 9-sided faceted stone ring (`stoneGray`, strong facet jitter for a
  bricky read) with a slate rim and a dark water disc inside.
- Two plank posts carrying a small gabled roof (`plankBrown`).
- Wooden crank axle across the posts with a side handle; rope hangs down to
  a little bucket over the water.
- Blob shadow.

## Dimensions & origin

≈ 2.6 wide × 2.9 tall × 1.5 deep. Origin at ground-center of the ring.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | facet jitter |
| `roofColor` | color | `plankBrown` | |
| `animation` | string | `none` | see below |

## Animations

| name | description |
| ---- | ----------- |
| `crankTurn` | the crank slowly turns; the rope stretches and the bucket bobs |
| `none` | static (default) |

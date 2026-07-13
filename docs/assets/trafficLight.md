# trafficLight

City intersection light that actually runs its cycle.

## Look

Slate pole, charcoal rounded head, three round lamps in the palette's
signal colors: dusty rose (stop), straw gold (wait), sage (go). Inactive
lamps are dimmed to ~30 %. Blob shadow.

## Dimensions & origin

≈ 3.3 tall. Origin at ground-center of the pole.

## Options

| option | type | default |
| ------ | ---- | ------- |
| `seed` | number | 0 |

## Animations

| name | description |
| ---- | ----------- |
| `cycle` | red 2.6 s → green 2.4 s → amber 0.8 s → … (default) |
| `none` | static (red lit) |

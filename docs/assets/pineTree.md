# pineTree

The tiered evergreen from the reference sheet — the workhorse of scene
dressing. Place several with different seeds; no two look alike.

## Look

- 3–8 stacked faceted cones (6–7 radial segments, jittered rims), wider at
  the bottom, each tier slightly lighter toward the top. Base color `pine`
  with seeded hue/lightness drift, so a row reads sage-to-slate varied like
  the reference.
- Square-section trunk (`barkBrown`).
- Soft blob shadow underneath.

## Dimensions & origin

Height ≈ 4–7 depending on `tiers`/seed; canopy width ≈ 40 % of height.
Origin at ground-center of the trunk.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | tier count, silhouette, color drift |
| `tiers` | number | seeded 3–5 | cone tiers (3–8 sensible) |
| `height` | number | seeded | total height in world units |
| `color` | color | `pine` | canopy base color |
| `animation` | string | `windSway` | see below |

## Animations

| name | description |
| ---- | ----------- |
| `windSway` | the whole canopy leans in a slow two-axis breeze |
| `none` | static |

# ball

Small faceted football — drop it in front of `footballGoal`.

## Look

Cream faceted icosahedron with sage pentagon panels stuck to the surface,
seeded spin so no two balls show the same face. Blob shadow that shrinks
as the ball rises.

## Dimensions & origin

≈ 0.35 across. Origin at ground-center (rests on the terrain).

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | panel orientation, jitter |

## Animations

| name | description |
| ---- | ----------- |
| `bounce` | happy little hops with a squash on landing; shadow breathes with it (default) |
| `none` | at rest |

Select with `"options": { "animation": "<name>" }`. Default: `bounce`.
Unknown names warn in the console and fall back to the default.

# mountainBackdrop

Wide layered mountain-ridge silhouette band — distance scenery for the very
back of a scene (Oravská Magura behind Námestovo).

## Look

1–4 jagged extruded ridge layers, each a seeded zigzag of peaks and saddles.
Farther layers are lighter and desaturated (distance haze), the nearest is
full `sage`. Flat papercraft slabs, 0.3 thick, spaced 2.2 apart in z. No
shadow blob — it reads as horizon, not prop.

## Dimensions & origin

≈ `width` wide × `height` tall; layers extend ≈ 4.4 behind the origin z.
Origin at ground-center of the **nearest** layer. Place on the `back` row or
a deeper numeric layer (e.g. `-9`) so cottages and pines overlap it.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | peak layout per layer |
| `width` | number | 26 | band width in world units |
| `height` | number | 5 | tallest peaks of the nearest layer |
| `layers` | number | 3 | 1–4 ridge layers |
| `color` | color | `sage` | nearest layer; farther layers fade from it |

## Animations

`animations: none` — static asset.

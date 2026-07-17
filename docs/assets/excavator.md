# excavator

Small digger working the construction site — the pack's animated vehicle
prop (parked, not driving).

## Look

- Two `charcoal` track pads with `slateGray` roller guards, slate deck slab.
- `duckEggBlue` cab with a dark front window and a duck-egg engine block
  behind.
- Articulated arm facing +x: straw-gold boom and stick, `slateGray` bucket
  scoop at the end. Boom, stick and bucket are pivot groups.
- Blob shadow.

## Dimensions & origin

≈ 1.9 long × 1.3 tall × 1.1 wide. Origin at ground-center between the
tracks; the arm reaches forward along +x.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | facet jitter |
| `animation` | string | `dig` | see below |

## Animations

| name | description |
| ---- | ----------- |
| `dig` | slow digging loop — the boom dips, the stick swings, the bucket curls (~11 s, default) |
| `none` | arm frozen in the raised rest pose |

Select with `"options": { "animation": "<name>" }`. Default: `dig`.
Unknown names warn in the console and fall back to the default.

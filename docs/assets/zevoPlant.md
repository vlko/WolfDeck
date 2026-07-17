# zevoPlant

Waste-to-energy (ZEVO) plant — a back-row industrial anchor, scale-mate to
`officeTower`.

## Look

- Long stone-gray gabled hall (`towerSlate` roof) with a `waterTeal`
  intake door and a seeded lit/dark window band.
- Slate-gray boiler annex joining the hall to the chimney.
- Tall paper-white chimney with a dusty-rose band near the top.
- Two–three tiny `cloudWhite` faceted puffs rising from the chimney.
- Blob shadow.

## Dimensions & origin

≈ 6 wide × 3.6 tall hall, chimney ≈ 6 tall. Origin at ground-center;
meant for the `back` row.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | window pattern, puff sizes, jitter |

## Animations

| name | description |
| ---- | ----------- |
| `smoke` | tiny puffs loop up from the chimney — rise, drift, shrink, reset; subtle and slow (default) |
| `none` | still air |

Select with `"options": { "animation": "<name>" }`. Default: `smoke`.
Unknown names warn in the console and fall back to the default.

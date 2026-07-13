# officeTower

Faceted city tower — the skyline anchor of the city pack (reference:
`city 1.png` / `city 2.png`).

## Look

- Tall faceted block in one of the sheet's tower colors: light sage, slate
  (`towerSlate`), rose mauve or parchment; strong per-facet jitter.
- Grid of punched square windows on the front — a seeded mix of warm **lit**
  (`windowLit`) and dark panes; charcoal door.
- Tapered 4-sided faceted cap.
- Blob shadow.

## Dimensions & origin

`floors × 1.05 + ~1.2` tall (5 floors ≈ 6.5), ~2.6–3.1 wide. Origin at
ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | window pattern, color pick, jitter |
| `floors` | number | seeded 4–6 | 3–8 sensible |
| `width` | number | seeded ~2.6–3.1 | |
| `color` | color | seeded from tower palette | |

## Animations

| name | description |
| ---- | ----------- |
| `windowGlow` | every couple of seconds one random window flips lit/dark — the city breathes (default) |
| `none` | static |

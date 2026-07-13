# desk

Teal work desk with keyboard, mouse and a monitor whose screen flickers —
someone is clearly mid-task. Reference: `office.png`.

## Look

Water-teal top on slightly splayed legs; parchment keyboard and mouse;
cream-framed monitor on a stand with a dark screen.

## Dimensions & origin

≈ 2.4 wide × 1.75 tall (with monitor) × 1.1 deep. Origin at ground-center.
**Desk top surface ≈ y 1.05** (× prop scale) — stack `mug`/`paperStack`
props at that height.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | jitter, flicker timing |
| `color` | color | `waterTeal` | desk color |
| `monitor` | bool | true | set false for a bare desk |

## Animations

| name | description |
| ---- | ----------- |
| `screenGlow` | the screen breathes faintly and blips brighter now and then (default) |
| `none` | static dark screen |

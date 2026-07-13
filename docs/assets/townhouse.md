# townhouse

Two-story storybook city house — three front variants from the city sheets.

## Look

Common: box body, gabled prism roof, chimney, plank door, blob shadow.

| variant | front |
| ------- | ----- |
| `awning` | cream walls, dusty-rose awning slanting over the door, three windows (lit/dark mix) |
| `steep` | tall steep rose-mauve gable, minimal dark window |
| `timber` | duck-egg walls, cream A-frame gable with a tan tie beam, one lit window |

## Dimensions & origin

≈ 2.6 wide × 4–4.6 tall × 1.8 deep. Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | variant pick, jitter |
| `variant` | string | seeded | `awning` \| `steep` \| `timber` |
| `wallColor`, `roofColor`, `awningColor` | color | per variant | |
| `width` | number | 2.6 | |

## Animations

`animations: none` — static asset.

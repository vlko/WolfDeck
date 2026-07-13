# cottage

Village house with a gabled roof — three front variants matching the three
small houses on the reference sheet.

## Look

Common: box body, prism roof with eaves overhang (`barkBrown`), plank door
with lintel, usually a chimney (`slateGray`), blob shadow.

| variant | front |
| ------- | ----- |
| `timber` | cream walls, exposed A-truss timber gable (rakes, struts, tie beam in `tanBrown`), small round window right of the door |
| `plain` | duck-egg blue walls, twin gable peaks poking above the roof, woodpile by the door |
| `roundWindow` | paper-white walls, one big round gable window with a dark frame |

## Dimensions & origin

≈ 3.4 wide × 3.9 tall × 2.1 deep at defaults. Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | chimney placement/presence, facet jitter |
| `variant` | string | seeded | `timber` \| `plain` \| `roundWindow` |
| `wallColor` | color | per variant | |
| `roofColor` | color | `barkBrown` | |
| `width` | number | 3.4 | body width (depth and roof follow) |
| `height` | number | 2.1 | wall height |

## Animations

`animations: none` — static asset.

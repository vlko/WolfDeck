# officeWorker

Big-headed animal colleague in a faceted suit with a tie — the round-headed
characters from the office reference sheet.

## Look

- **Body** — faceted icosahedron diamond in a suit color, small dark tie
  cone at the collar.
- **Head** — big faceted sphere, animal-specific: `bear` (slate head, cream
  V muzzle, round dark ears), `cat` (cream face, gray cap and pointy ears),
  `hamster` (cream, small tan round ears), `badger` (cream, brown muzzle
  and ears).
- Charcoal dot eyes (auto-blink), blush-pink cheek discs, dot nose.

## Dimensions & origin

≈ 1.0 wide × 2.05 tall. Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | blink timing, jitter |
| `animal` | string | `bear` | `bear` \| `cat` \| `hamster` \| `badger` |
| `suitColor` | color | per animal | |

## Animations

| name | description |
| ---- | ----------- |
| `idle` | breathing, slow head turns and tilts, auto-blinks (default) |
| `none` | frozen |

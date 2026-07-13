# wolf

The hero — a cute origami gray wolf. One is created automatically as the
presenter and trots between scenes; extra wolves can be placed as ordinary
props.

## Look

Faceted folded-paper quadruped, front-facing at rest:

- **Head** — big hexagonal wedge: cream face mask (`cream`) under an angular
  gray brow cap (`wolfGray`), 4-sided muzzle, round charcoal nose.
- **Ears** — two triangular cones (`wolfGrayDark`) with dark inner triangles
  (`deepBrown`), pivoted at the base so they can twitch.
- **Face** — charcoal dot eyes (auto-blink), dusty pink cheek discs
  (`cheekPink`).
- **Body** — cream chest tapering toward the feet, gray back cape, two slate
  belly slots (per the reference sheet).
- **Legs** — four hip-pivoted stubs, cream in front / gray behind, dark paws.
- **Tail** — two-tone folded wedge (`wolfGray` + `slateGray`), base-pivoted.
- Soft blob shadow underneath.

## Dimensions & origin

≈ 1.0 wide × 2.2 tall × 0.9 deep. Origin at ground-center between the paws.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | facet-jitter variation |
| `color` | color | `wolfGray` | main fur color (cap, cape, tail) |
| `animation` | string | `idle` | see below |

## Animations

| name | description |
| ---- | ----------- |
| `idle` | breathing, slow tail sway, head tilt, auto-blinks and ear twitches |
| `walk` | quadruped trot — diagonal leg pairs swing in anti-phase, body/head bob, tail counter-sway |
| `sit` | sitting back on the haunches, hind legs folded, tail wagging |
| `none` | frozen rest pose |

The **hero instance** ignores the `animation` option — the framework drives
it: trot while traveling (body and head yawed to the walk direction),
squash-stretch **hop** at the ends of the deck, `idle` when standing.

While the presentation is idle, the hero also entertains himself: every few
seconds he randomly **sits down for a while**, **looks left and right**, or
**trots toward the viewer, pauses, and trots back**. Any keypress cancels the
behavior instantly and the presentation takes over.

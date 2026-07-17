# pupil

Big-headed schoolkid with a backpack — smaller than `citizen`, fills the
schoolyard scenes.

## Look

Shirt-colored box body with short arms, stubby `deepBrown` legs, and a big
faceted round head with dot eyes (auto-blink), blush-pink cheeks and a tiny
nose. Backpack with flap and shoulder straps on the back. Blob shadow.

| animal | head | ears | shirt / backpack |
| ------ | ---- | ---- | ---------------- |
| `fox` | `strawGold`, cream muzzle | pointy | `dustyRose` / `sage` |
| `bunny` | `paperWhite` | long upright | `duckEggBlue` / `dustyRose` |
| `bear` | `tanBrown`, cream muzzle | round `deepBrown` | `sage` / `strawGold` |
| `cat` | `wolfGray` | pointy `wolfGrayDark` | `roseMauve` / `duckEggBlue` |

## Dimensions & origin

≈ 0.55 wide × 1.3 tall (bunny ears a touch more). Origin at ground-center.

## Options

| option | type | default | notes |
| ------ | ---- | ------- | ----- |
| `seed` | number | 0 | animal pick (if unset), blink/look timing, jitter |
| `animal` | string | seeded | `fox` \| `bunny` \| `bear` \| `cat` |

## Animations

| name | description |
| ---- | ----------- |
| `idle` | breathing, auto-blinks, head eases toward a new look direction every few seconds (default) |
| `wiggle` | gentle side-to-side body sway, still blinking |
| `none` | frozen |

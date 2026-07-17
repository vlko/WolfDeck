# WolfDeck — Framework Specification

WolfDeck is a WebGL presentation framework styled as a **3D low-poly
papercraft diorama**. Every scene is a little faceted world in a cozy
storybook palette — sage meadows, cream skies, dusty-rose accents — matching
the reference sheet `visual.png`. A cute origami gray wolf trots from scene to
scene; your content (a floating 3D title plus text, bullets, images and 3D
charts on papercraft cards) **floats in place inside the diorama** at
positions and depths you choose, so scenery can genuinely pass in front of it.

You author a presentation **entirely in one JSON file** — no code required.

---

## 1. Quick start

```bash
npm install          # once
npm run dev          # presents at http://localhost:3000
```

Edit `public/presentation.json`, save, and refresh the browser — that file
*is* your presentation.

For a shareable static build:

```bash
npm run build        # emits dist/ — host it on any static web server
npm run preview      # test the built bundle locally
```

## 2. Controls

| Input | Action |
| ----- | ------ |
| `Space` / `→` | Next step: reveal the next part, or walk to the next scene when the current scene is done |
| `Backspace` / `←` | Previous step: hide the last part, or walk back to the previous scene |
| Hold mouse + drag | Peek around the diorama (orbit left/right/up/down, clamped). Release and the camera glides back to exactly the default framing — presentation state never changes |
| `W` `A` `S` `D` | Walk the wolf freely: `A` left, `D` right, `W` back (away from the viewer), `S` front (toward the viewer); combine for diagonals. Five seconds after the last movement key he trots back to his presenter post by himself. Pure showmanship — presentation state never changes |
| URL hash | The address bar always carries the current scene (`#<scene-id>`) — a shareable deep link. Editing the hash (an id, or a 1-based number like `#4`), browser Back/Forward, or opening a link with one **jumps** straight to that scene with the reveal state replayed correctly |

Behavior details:

- **Reveals queue; walks buffer one.** Presses during reveals queue and
  execute in order. While the wolf is **walking**, only the next keystroke
  is buffered — extra presses are ignored, so a long transition never fires
  a burst of reveals on arrival.
- **Hurry.** A same-direction press mid-walk kicks the wolf into a 2.5× run
  (and is the one buffered press).
- **Exact reversal.** Stepping N forward then N back always returns to the
  same state — hides mirror reveals one for one.
- **Fast-forward.** Mashing keys snaps running reveal/chart animations to
  their end state instead of dropping presses.
- At the ends of the deck the wolf does a little squash-stretch hop instead
  of moving.
- Keys are ignored while an input field has focus.

## 3. The coordinate model: x, y, and depth rows

The camera is a perspective camera pitched **20° downward**, looking at the
action row from the front — the classic diorama view. As the wolf walks
sideways, nearer rows sweep past faster than farther ones: **parallax comes
free from perspective**, nothing is scripted.

- **x** — screen right. The wolf walks along x; scene `i` is centered at
  `i × sceneSpacing`. Useful range **about −10 … +10 per scene** (at 16:9,
  roughly ±13 is visible at the action row, more in the back rows).
- **y** — up, **relative to the terrain surface** (0 = standing on the
  ground). The framework samples the terrain height under every prop and
  lifts it onto the surface, so props sit naturally on the rolling meadow.
- **layer** — the named depth row a prop stands in:

| layer | z | what goes there |
| ----- | -- | --------------- |
| `back` | −7 | tall scenery: trees, buildings |
| `mid` | −3.5 | medium props: wells, fences, haystacks |
| `action` | 0 | where the wolf walks: animals, characters |
| `front` | +3 | foreground props that can overlap content |

A raw number instead of a name gives you any depth in between. Back rows sit
higher on screen and move slower; front rows sit lower and sweep faster.

**Framing facts** (16:9 window): the visible frame is ~15 world units tall at
the action row; the screen top is at **y ≈ 10.2** at every depth (a happy
consequence of tilt = half-fov). Keep part tops below ~9.8 so their float bob
never clips.

### The ground

One continuous low-poly terrain ribbon runs under the whole deck — gentle
seeded bumps (damped to near-flat along the wolf's walk path), faceted sage
coloring, and a parchment **front skirt** that reads as the cut edge of the
diorama slab. Behind everything: cream sky, a faceted paper sun, drifting
low-poly clouds at deep z (slow parallax).

**Rivers**: `meta.rivers` inlays winding water bands into the terrain — the
bed dips and the facets turn teal. Rivers run in z (across the stage) at a
world x you give; place one between two scenes and the wolf fords it on his
walk.

**Roads**: `meta.roads` grades an asphalt band into the terrain, running
along x within a world-x range, at the z lane you give — put `car`/`bus`
props on the same lane (numeric `layer` = the road's `z`) and they drive it:

```jsonc
"meta": {
  "rivers": [ { "x": 17, "width": 3 } ],
  "roads":  [ { "z": 2, "width": 2.4, "from": 21, "to": 47 } ]
}
```

## 4. The presentation file

`public/presentation.json`:

```jsonc
{
  "meta": {
    "title": "Q3 Review",            // browser tab title
    "sceneSpacing": 34,              // optional distance between scenes (world units)
    "walkSpeed": 8,                  // optional wolf speed (units/second)
    "seed": 1,                       // optional terrain seed
    "rivers": [ { "x": 17, "width": 3 } ]   // optional water inlays (world x)
  },
  "scenes": [
    {
      "id": "intro",                 // optional identifier (URL hash deep link + warnings)
      "title": "Welcome!",           // floating 3D papercraft title
      "kicker": "Part 1 · Intro",    // optional small uppercase strapline above the title
      "subtitle": "Why we are here", // optional wrapped line below the title
      "props": [ /* see §5 */ ],
      "steps": [ /* see §6 */ ]
    }
  ]
}
```

Validation is lenient: typos produce console warnings and magenta
placeholders, never a crash. Only unparseable JSON is fatal (shown as a
readable overlay).

Another deck in `public/` can be presented without touching the demo:
`http://localhost:3000/?deck=my-deck.json`. The shipped
`public/showcase.json` exercises every part type and styling option — a
handy live reference — and `public/rozpocet-2025.json` is a full
real-world deck (12 data-heavy scenes). Combine with the URL hash to
deep-link a scene: `?deck=rozpocet-2025.json#rezervy`.

## 5. Props — populating a scene

```jsonc
{
  "type": "pineTree",          // asset name (catalog below)
  "position": [x, y, dz],      // x = sideways (scene-local), y = height above
                               // ground (usually 0), dz = optional small offset
                               // WITHIN the row (±1) to avoid z-fighting
  "layer": "back",             // back | mid | action | front — or a number (z)
  "scale": 1.2,                // uniform, or [x, y, z]
  "rotation": 15,              // degrees of yaw — real 3D, turns the object
  "options": { }               // per-asset options (see its doc file)
}
```

Placement tips:

- Stagger several props in one row with small `dz` offsets (`0.5`, `0.9`).
- Every asset accepts `{ "seed": n }` — same seed, same shape, every load.
- Animated assets take `{ "animation": "<name>" }`; each asset's allowed
  animation names are listed in its doc file (and in the table below).
  Unknown names warn and fall back to the asset's default.

### Asset catalog

Every asset has a **full description file** in [`docs/assets/`](docs/assets/)
— look, dimensions, options, allowed animations. Summary:

| Type | Key options | Animations (default first) |
| ---- | ----------- | -------------------------- |
| [`wolf`](docs/assets/wolf.md) | `color` | `idle`, `walk`, `sit`, `none` — the hero is framework-driven |
| [`sheep`](docs/assets/sheep.md) | `color` | `idle`, `graze`, `blink`, `none` |
| [`lamb`](docs/assets/lamb.md) | `color` | `idle`, `graze`, `blink`, `none` |
| [`pineTree`](docs/assets/pineTree.md) | `tiers`, `height`, `color` | `windSway`, `none` |
| [`cottage`](docs/assets/cottage.md) | `variant: timber\|plain\|roundWindow`, `wallColor`, `roofColor`, `width` | none (static) |
| [`barn`](docs/assets/barn.md) | `wallColor`, `roofColor`, `width` | none (static) |
| [`fence`](docs/assets/fence.md) | `length`, `color` | none (static) |
| [`haystack`](docs/assets/haystack.md) | `color` | none (static) |
| [`hut`](docs/assets/hut.md) | `color`, `height` | none (static) |
| [`well`](docs/assets/well.md) | `roofColor` | `none`, `crankTurn` |

**City pack** (reference: `city 1.png` / `city 2.png`):

| Type | Key options | Animations (default first) |
| ---- | ----------- | -------------------------- |
| [`officeTower`](docs/assets/officeTower.md) | `floors`, `width`, `color` | `windowGlow`, `none` |
| [`townhouse`](docs/assets/townhouse.md) | `variant: awning\|steep\|timber`, `wallColor`, `roofColor` | none (static) |
| [`parkTree`](docs/assets/parkTree.md) | `shape: cone\|ball\|poplar\|round`, `pot`, `color` | `windSway`, `none` |
| [`streetlamp`](docs/assets/streetlamp.md) | | `glow`, `none` |
| [`trafficLight`](docs/assets/trafficLight.md) | | `cycle`, `none` |
| [`bench`](docs/assets/bench.md) | `color` | none (static) |
| [`hydrant`](docs/assets/hydrant.md) | `color` | none (static) |
| [`busStop`](docs/assets/busStop.md) | | none (static) |
| [`car`](docs/assets/car.md) | `color`, `path: [x1, x2]`, `speed`, `startAt`, `direction` | `drive`, `none` |
| [`bus`](docs/assets/bus.md) | same as `car` | `drive`, `none` |
| [`citizen`](docs/assets/citizen.md) | `color` | `idle`, `none` |

**Office pack** (reference: `office.png`):

| Type | Key options | Animations (default first) |
| ---- | ----------- | -------------------------- |
| [`desk`](docs/assets/desk.md) | `color`, `monitor` — top ≈ y 1.05 for stacking | `screenGlow`, `none` |
| [`officeChair`](docs/assets/officeChair.md) | `color` | `none`, `swivel` |
| [`bookshelf`](docs/assets/bookshelf.md) | `color`, `shelves` | none (static) |
| [`whiteboard`](docs/assets/whiteboard.md) | `seed` (scribbles) | none (static) |
| [`meetingTable`](docs/assets/meetingTable.md) | `color`, `chairColor`, `chairs` — top ≈ y 1.07 | none (static) |
| [`officePlant`](docs/assets/officePlant.md) | `color`, `potColor` | `leafSway`, `none` |
| [`deskLamp`](docs/assets/deskLamp.md) | `shadeColor` — stack on tables via `y` | `glow`, `none` |
| [`filingCabinet`](docs/assets/filingCabinet.md) | `color` | none (static) |
| [`mug`](docs/assets/mug.md) | `color` — stack on desks via `y` | `steam`, `none` |
| [`paperStack`](docs/assets/paperStack.md) | `seed` | none (static) |
| [`wasteBasket`](docs/assets/wasteBasket.md) | `color` | none (static) |
| [`officeWorker`](docs/assets/officeWorker.md) | `animal: bear\|cat\|hamster\|badger`, `suitColor` | `idle`, `none` |

**Shop pack** (reference: `shop.png`):

| Type | Key options | Animations (default first) |
| ---- | ----------- | -------------------------- |
| [`shopBuilding`](docs/assets/shopBuilding.md) | `width`, `wallColor`, `awningColor`, `stripeColor` | none (static) |
| [`marketStall`](docs/assets/marketStall.md) | `seed` | none (static) |
| [`shopSign`](docs/assets/shopSign.md) | `color` | `swing`, `none` |
| [`shoppingCart`](docs/assets/shoppingCart.md) | `seed` | none (static) |
| [`crate`](docs/assets/crate.md) | `produce: fruit\|greens\|plums\|empty` | none (static) |
| [`basket`](docs/assets/basket.md) | `empty` | none (static) |
| [`flourSack`](docs/assets/flourSack.md) | `color: cream\|tan\|hex` | none (static) |
| [`breadShelf`](docs/assets/breadShelf.md) | `seed` | none (static) |
| [`scale`](docs/assets/scale.md) | `color` | `weigh`, `none` |
| [`flowerPot`](docs/assets/flowerPot.md) | `colors` | `sway`, `none` |
| [`shopkeeper`](docs/assets/shopkeeper.md) | `animal: wolf\|bear\|panda\|fox`, `dressColor` | `idle`, `none` |

(The city pack's [`parkTree`](docs/assets/parkTree.md) also gained a
`diamond` shape — the faceted diamond-crown tree from the shop sheet.)

**School pack**:

| Type | Key options | Animations (default first) |
| ---- | ----------- | -------------------------- |
| [`schoolhouse`](docs/assets/schoolhouse.md) | `wallColor`, `roofColor` | none (static) |
| [`blackboard`](docs/assets/blackboard.md) | `variant: lines\|figures` | none (static) |
| [`schoolDesk`](docs/assets/schoolDesk.md) | | none (static) |
| [`pupil`](docs/assets/pupil.md) | `animal: fox\|bunny\|bear\|cat` | `idle`, `wiggle`, `none` |
| [`schoolBus`](docs/assets/schoolBus.md) | `color`, `path: [x1, x2]`, `speed`, `startAt`, `direction` | `drive`, `none` |

**Finance pack**:

| Type | Key options | Animations (default first) |
| ---- | ----------- | -------------------------- |
| [`vault`](docs/assets/vault.md) | `open` | none (static) |
| [`coinStack`](docs/assets/coinStack.md) | `height` | none (static) |
| [`moneyBag`](docs/assets/moneyBag.md) | | none (static) |
| [`piggyBank`](docs/assets/piggyBank.md) | | `idle`, `none` |
| [`ledger`](docs/assets/ledger.md) | | none (static) |

**Construction pack**:

| Type | Key options | Animations (default first) |
| ---- | ----------- | -------------------------- |
| [`crane`](docs/assets/crane.md) | `height` | `armSwing`, `none` |
| [`excavator`](docs/assets/excavator.md) | | `dig`, `none` |
| [`scaffold`](docs/assets/scaffold.md) | `levels` | none (static) |
| [`trafficCone`](docs/assets/trafficCone.md) | | none (static) |
| [`builder`](docs/assets/builder.md) | `animal: bear\|fox\|badger` | `idle`, `hammer`, `none` |

**Civic pack** (town services, sport, demographics):

| Type | Key options | Animations (default first) |
| ---- | ----------- | -------------------------- |
| [`garbageTruck`](docs/assets/garbageTruck.md) | `color`, `path: [x1, x2]`, `speed`, `startAt`, `direction` | `drive`, `none` |
| [`recyclingBin`](docs/assets/recyclingBin.md) | `color` | none (static) |
| [`zevoPlant`](docs/assets/zevoPlant.md) | | `smoke`, `none` |
| [`carer`](docs/assets/carer.md) | `animal: bunny\|cat\|bear` | `idle`, `none` |
| [`elder`](docs/assets/elder.md) | `variant: cane\|headscarf` | `idle`, `none` |
| [`footballGoal`](docs/assets/footballGoal.md) | | none (static) |
| [`ball`](docs/assets/ball.md) | | `bounce`, `none` |
| [`pram`](docs/assets/pram.md) | | `stroll`, `none` |

**Landmarks** (in the village/nature modules):

| Type | Key options | Animations (default first) |
| ---- | ----------- | -------------------------- |
| [`churchTower`](docs/assets/churchTower.md) | `wallColor`, `spireColor`, `height` | none (static) |
| [`mountainBackdrop`](docs/assets/mountainBackdrop.md) | `width`, `height`, `layers`, `color` — place on a deep layer (e.g. `-9`) | none (static) |

The hero wolf is added automatically — you never declare it. Extra wolves can
be placed as props. On every scene arrival the wolf announces himself with a
little papercraft **speech bubble** (a random phrase + the scene number).

## 6. Steps — revealing content with in-place parts

`steps` is the ordered list of reveals for the scene. Each step brings in one
**part** — a papercraft panel that **floats in place inside the diorama** at
the position and depth you give it. Parts grow in with a little overshoot,
bob gently while shown, and shrink away when you step back — the exact
reverse.

```jsonc
"steps": [
  { "part": { "type": "text", "title": "Hello", "body": "Line one.\nLine two.",
              "position": [-4.5, 5], "depth": "mid", "tilt": -2 } },
  { "part": { "type": "bullets", "title": "Agenda", "items": ["One", "Two", "Three"],
              "position": [3.5, 5.4], "depth": "action" } },
  { "part": { "type": "image", "src": "images/team.png", "caption": "The team",
              "position": [-9.5, 6], "depth": "back", "width": 4.4 } },
  { "part": { "type": "chart", "chart": "bar", "title": "Revenue",
              "data": [ { "label": "Q1", "value": 40 }, { "label": "Q2", "value": 65 } ],
              "position": [8.5, 5.6], "depth": "mid" } }
]
```

### Part types

| Type | Fields |
| ---- | ------ |
| `text` | `title?`, `body?` (supports `\n`) |
| `bullets` | `title?`, `items: [string]` |
| `stat` | `value` (e.g. `"16 553 897 €"`), `label?`, `note?` — a KPI tile with an accent top strip; the number **counts up** as the tile lands |
| `numbered` | `title?`, `items: [{title?, text} \| string]`, `start?` — 01/02/03 circle badges, items fade in one after another |
| `callout` | `text` (or `body`), `title?`, `tone: "info"\|"positive"\|"warning"` — accent-edged banner with a → / ✓ / ! icon |
| `table` | `title?`, `columns: [string]`, `rows: [[cell]]`, `align?: ["left"\|"right"]` — numeric-looking columns right-align automatically; fonts shrink rather than let columns collide |
| `image` | `src` (path under `public/`), `caption?` |
| `chart` | `chart: "bar"\|"barh"\|"line"\|"pie"`, `title?`, `data: [{label, value, plan?, display?}]`, `colors?`, `valueLabels?` — plus grouped bars and donuts, below |

Charts are **real 3D papercraft**: bars are faceted blocks rising one after
another, pie slices are extruded wedges popping in around the circle, lines
are a drawn-on ribbon with faceted dots. They grow in after the card lands;
stepping back resets them.

**Chart variants:**

- `"chart": "barh"` — horizontal bars with the value printed past each bar's
  end (`"valueLabels": false` to hide). A datum's `display` string overrides
  the printed value.
- **Plan vs. actual** — in a `barh`, give a datum `plan`: a muted
  full-length backing bar shows the plan, the colored bar the actual, and
  the label becomes `value (pct %)`.
- **Grouped bars** — in a `bar`, replace `data` with
  `"labels": ["Q1", "Q2"]` and
  `"series": [{ "name": "Plan", "values": [40, 55] }, …]`; a color legend is
  drawn under the title (wrapping to more rows as needed).
- **Donut** — in a `pie`, `"donut": true` (or an inner-radius fraction like
  `0.6`) cuts a hole; `centerLabel` / `centerSub` float in it (the label
  shrinks to fit). `"legendValues": true` appends each share's percentage to
  the legend.

### Fields common to every part

**Automatic cascade (the default).** Steps that give no `position`/`depth`
are placed on an ordered cascade spanning the diorama **from the mid row
level to the front row level** (z −3 … +3 — never as deep as the trees and
buildings in the back row): step *k* lands at `x = −6 + 2.1·k`, `y ≈ 4.2`
(alternating slightly up/down so earlier titles stay visible),
`z = −3 + 1.2·k` — **every new panel lands in front of the older ones**,
early panels behind the wolf, later ones reaching the foreground, with
generous z-gaps for the 3D chart elements that stand proud of each card.
Give an explicit `position`/`depth` to any step to opt out and place it
yourself.

| Field | Meaning |
| ----- | ------- |
| `position` | `[x, y]` — scene-local x, and height of the part's center above the terrain. Useful y range ≈ 3–8. Omit for the automatic cascade |
| `depth` | Row name (`back`/`mid`/`action`/`front`) or a number. The part lives at that depth **inside the diorama** — props in nearer rows genuinely pass in front of it. Omit for the automatic cascade (each step nearer than the last); explicit values let scenery overlap a card on purpose. Panels of one page that share the same depth never sit in one plane: each later step is automatically nudged 0.5 closer to the camera, in reveal order, so overlapping cards occlude cleanly |
| `scale` | Uniform size multiplier |
| `tilt` | Degrees of in-plane roll — a few degrees makes cards read as placed paper, not UI |
| `width` | Panel width in world units (default 5.5, image 5, charts 6) — height follows content |
| `height` | Override the derived panel height (world units) |
| `fontScale` | Multiplies the panel's type sizes (e.g. `0.85` for a dense card, `1.3` for a headline) |
| `align` | `"center"` centers a `text` part's typography |
| `cardColor` | CSS color for the papercraft slab |
| `accentColor` | CSS color for a thin strip along the card's top edge (the `stat` tile draws one by default) |
| `card` | `false` removes the slab — the content floats free |

**Overlap is a feature.** Parts can overlap each other and be overlapped by
scenery — order and depth are yours. Put a big card at `mid` behind the
action, tuck a small one at `front` behind a foreground tree for a reveal
with drama.

Parts from *previous* scenes stay revealed — they simply scroll off-screen,
which is what makes going backward perfectly symmetric.

### Pages within a scene: `clears`

A content-heavy scene can present in pages. Mark a step with
`"clears": true` (next to `part`, not inside it):

```jsonc
"steps": [
  { "part": { "type": "text", "title": "Page one" } },
  { "part": { "type": "bullets", "items": ["…"] } },
  { "clears": true, "part": { "type": "text", "title": "Page two" } }
]
```

When the clearing step reveals, every panel of the previous page shrinks
away; stepping back over it brings them back — forward/back stays perfectly
symmetric. The automatic cascade restarts at each page, so page two's panels
land on the same comfortable spots page one used.

### The 3D title

`scene.title` becomes extruded papercraft letters floating at the top of the
scene, gently bobbing. It is parked **behind the panel zone** (between the
mid and back rows, z −6.5), so revealed panels always pass in front of it.
It scales in when the wolf arrives at the scene and away when he leaves, in
both directions. `scene.kicker` floats as a small uppercase strapline above
the letters and `scene.subtitle` as a wrapped line below — both ride the
same show/hide, and both **fade aside when the scene's first panel reveals**
(they return when you step back to the empty scene).

Titles support full Latin-Extended text (Slovak diacritics included): the
base letters are extruded and small folded-paper accent marks (´ ˇ ^ ¨) are
laid over the right glyphs.

## 7. Scenes, transitions, camera

- Advancing past a scene's last step trots the wolf to the next scene; the
  camera **trails the wolf** with damped easing, so every depth row slides at
  its natural parallax speed during the walk.
- On arrival the wolf pops a small 3D **speech bubble** (a random phrase +
  the scene number) that holds for about a second and folds away.
- While you talk over a slide, the wolf stays alive on his own: every few
  seconds he sits down for a while, glances left and right, or trots toward
  the viewer and back. Any keypress cancels the behavior immediately.
- A scene with no steps is a pure walk-through beat — good pacing.
- Scenes more than ~1.5 scene-widths from the camera pause their animations
  (they resume seamlessly when you come back).

## 8. Project layout (for developers)

```
public/presentation.json      the demo deck (edit this, or add your own .json
                              next to it and present it with ?deck=<file>)
public/showcase.json          live reference deck: every part type + styling
public/rozpocet-2025.json     a full real-world deck (12 scenes, Slovak)
public/images/                your image-part files
docs/assets/*.md              per-asset description files (look + animations)
src/config.js                 rows, camera tilt/fov, spacing, speeds
src/engine/                   renderer, camera rig, ticker, tween
src/core/                     loader, deck assembly, step machine, hero,
                              input, URL-hash navigation, speech bubble
src/environment/              terrain ribbon, sun, clouds
src/assets/                   palette, paper materials, helpers, registry;
                              wolf / animals / buildings / nature builders +
                              city / office / shop / school / finance /
                              construction / civic packs
src/parts/                    card base, text/bullets/image, stat/numbered/callout/table, 3D charts, title
```

`window.wolfdeck` exposes live engine objects for console debugging.

### Extending the asset library

1. Write a builder `(options) => THREE.Group` in `src/assets/` — compose
   `paperMesh(geometry, color, seed)` pieces (flat-shaded, facet-jittered,
   paper-grain material) and add a `blobShadow(radius)`. Origin at
   ground-center; y = 0 is standing on the terrain.
2. Give it named animations with
   `applyAnimation(group, { name: (t, dt, ctx) => {…} }, options, defaultName, assetName)`
   — this wires the JSON `animation` option, warning on unknown names.
   Animations tick only while the scene is near the camera.
3. Register it: `register('myThing', myThing)` and import the module from
   `src/main.js`.
4. Add `docs/assets/myThing.md` from `_template.md` — look, dimensions,
   options, allowed animations.
5. Determinism rule: use `rng(seed)` from helpers, never `Math.random()`, for
   anything that affects shape (random is fine for blink phases).

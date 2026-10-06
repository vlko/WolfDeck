# WolfDeck — Framework Specification

WolfDeck is a WebGL presentation framework styled as a **paper-theatre
diorama**. Every tree, house, car and animal is a piece cut straight out of
the illustrated reference sheets (`visual.png`, `city 1.png`, `city 2.png`,
`office.png`, `shop.png`) and stood upright on a faceted paper meadow like a
cardboard theatre figure. Sky, hills, panels and charts are drawn in code in
the same nine-swatch palette (printed on `shop.png`) with the same paper
grain, so everything reads as one illustration. A cute origami wolf trots
from scene to scene; your content (a floating layered-paper title plus text,
bullets, images and 3D charts on paper cards) **floats in place inside the
diorama** at positions and depths you choose, so scenery can genuinely pass
in front of it.

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
| `Space` / `→` | Next: reveal the next panel group, advance to the next slide, or walk to the next scene when the current scene is done |
| `Backspace` / `←` | Previous: hide the last group, step back a slide, or walk back to the previous scene |
| `L` | Open the **slide menu** ("Stránky"): a scrollable list of every slide (kicker + title). Click, or arrow ↑↓ and press Enter, to jump straight to any slide. `L` or `Esc` closes it |
| `P` | Presentation (focus) mode: the camera flattens to a straight-on orthographic view anchored to the ground — the diorama reads as a 2D paper theatre along the bottom of the screen, everything stays visible and keeps animating. The active slide's title moves to the top; panels keep their authored arrangement and are only nudged apart where they overlap. On exit everything returns to its exact 3D spot |
| Hold mouse + drag | Peek around the diorama (orbit left/right/up/down, clamped). Release and the camera glides back to exactly the default framing — presentation state never changes |
| `W` `A` `S` `D` | Walk the wolf freely: `A` left, `D` right, `W` back (away from the viewer), `S` front (toward the viewer); combine for diagonals. Five seconds after the last movement key he trots back to his presenter post by himself. Pure showmanship — presentation state never changes |
| URL hash | The address bar always carries the current **slide** (`#<slide-id>`) — a shareable deep link. Editing the hash (a slide id, a scene id, or a 1-based number like `#4`), browser Back/Forward, or opening a link with one **jumps** straight there with the reveal state replayed correctly |

Behavior details:

- **Reveals queue; scene transitions don't buffer.** Presses during reveals
  queue and execute in order. While the wolf is **walking between scenes**,
  presses are *not* buffered — the transition ends firmly at the new scene's
  first slide (title + subtitle), never bursting into a panel on arrival.
  Use the slide menu (`L`) or the URL for fast jumps.
- **Hurry.** A same-direction press mid-walk kicks the wolf into a 2.5× run.
- **Staggered reveal.** A group's panels appear one after another (a short
  delay apart), not all at once; mashing forward snaps the whole stagger.
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

One continuous paper meadow runs under the whole deck — gentle seeded bumps
(damped to near-flat along the wolf's walk path), softly faceted sage washed
with a watercolor texture and fading toward the horizon, and a layered-card
**front edge** (sage lip, kraft line, cream board) that reads as the cut edge
of the diorama slab. Behind everything: a washed-paper sky, three bands of
faceted paper hills (each peak split into a light and a shaded half, like
the sheet's trees), a two-tone paper sun and drifting cut-paper clouds at
deep z (slow parallax). Everything is unlit — shading is baked in, exactly
like on the printed sprites.

**Rivers**: `meta.rivers` lays a winding duck-egg paper ribbon across the
terrain (the bed dips a little under it). Rivers run in z (across the stage) at a
world x you give; place one between two scenes and the wolf fords it on his
walk.

**Roads**: `meta.roads` grades a flat paper-gray band into the terrain,
running along x within a world-x range, at the z lane you give. Roads are
**two-lane**: put `car` / `bus` / `schoolBus` / `garbageTruck` props on the
road (numeric `layer` = the road's `z`) and they drive rightward in the near
lane and leftward in the far lane, ping-ponging along their `path` (an
x range relative to the prop) and U-turning across the road at the ends.
Vehicles keep their distance, brake to a stop for whatever is ahead of them
in their lane (another vehicle, one mid-U-turn, the wolf stepping onto the
road) and only U-turn when the far lane is clear — they never drive through
each other. Use `width: 4` and keep the road clear of props: the usual spot
is `z: 4.4`, in front of the characters' row (1.5). `node
tools/verify/overlaps.mjs` lists props standing on a road and props whose
footprints overlap.

**Walking around things**: every prop's ground footprint is an obstacle.
The wolf plans his route between scenes (and back to his post after free
roaming) with A* around them, slides along props when you steer him with
W/A/S/D, and only trots toward the viewer when the way is clear.

```jsonc
"meta": {
  "rivers": [ { "x": 17, "width": 3 } ],
  "roads":  [ { "z": 4.4, "width": 4, "from": 21, "to": 47 } ]
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
      "id": "intro",                 // scene identifier (diorama the wolf walks to)
      "kicker": "Part 1 · Intro",    // small uppercase strapline above each slide's title
      "props": [ /* see §5 */ ],
      "slides": [ /* see §6 */ ]     // the virtual slides shown in this diorama
    }
  ]
}
```

**Scene → Slide → group.** A *scene* is a diorama the wolf walks to. Inside
it live one or more **virtual slides** — each with its own `title`,
`subtitle` and `id` — and advancing between slides swaps the floating 3D
title/subtitle **without a walk**. Each slide holds one or more **groups**
of panels (§6). So the hierarchy is:

```
Deck → Scene (diorama, kicker, props) → Slide (title, subtitle, id) → Group (≤4 panels)
```

Every slide is addressable: it has its own URL hash (`#intro`) and its own
row in the slide menu (press **L**). The wolf walks only between scenes.

Validation is lenient: typos produce console warnings and magenta
placeholders, never a crash. Only unparseable JSON is fatal (shown as a
readable overlay). (A scene given a legacy `steps[]`/`title` instead of
`slides[]` still loads as a single implicit slide.)

Another deck in `public/` can be presented without touching the demo:
`http://localhost:3000/?deck=my-deck.json`. The shipped
`public/showcase.json` exercises every part type and styling option, and
`public/rozpocet-2025.json` is a full real-world deck (15 scenes, 33
slides). Combine with the URL hash to deep-link a slide:
`?deck=rozpocet-2025.json#rezervy`.

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

The full catalog — every type, its sprite variants, default height and
animations, plus a contact sheet of all sprites — lives in
[`docs/assets/README.md`](docs/assets/README.md) (generated from the code).
In short:

- **Every asset is a sprite standee** cut from the reference sheets: an
  upright die-cut card with a sliver of cardboard edge and a soft contact
  shadow. It has no back and no sides — that is the paper-theatre look.
  `rotation` therefore only leans a card a little (±35°); yaw past 90°
  mirrors it instead.
- **Types group variants.** `cottage` has `variant: timber | plain |
  roundWindow | rose | cabin`; `officeWorker` has `animal: bear | cat |
  hamster | badger | boss`; `parkTree` has `shape: cone | ball | poplar |
  round | diamond | trio`; `officeTower` also picks by nearest `color`;
  otherwise `seed` picks. Every sprite is also a type by its own name
  (`"type": "koalaWorker"`).
- **Size** comes from each type's default height; `height` overrides it,
  `scale` multiplies it, and the legacy `tiers` / `floors` knobs still work.
- **Animations** are what a paper cut-out can do: `sway` (trees),
  `idle` / `graze` (characters, sheep), `swing` (signs), `wobble`, `work`,
  `drive` (vehicles on `path`), `cycle` (traffic light), `smoke`.
  Lamps always glow.

| Group | Types |
| ----- | ----- |
| nature | `pineTree` `coneTree` `parkTree` `sheep` `lamb` `haystack` `hut` `well` `flowerPot` `officePlant` `cabbage` `ball` `fence` `mountainBackdrop` |
| buildings | `cottage` `barn` `townhouse` `schoolhouse` `churchTower` `shed` `officeTower` `zevoPlant` `shopBuilding` `marketStall` `vault` |
| street | `streetlamp` `trafficLight` `bench` `hydrant` `busStop` `recyclingBin` `signalPole` `trafficCone` `crane` `scaffold` `footballGoal` |
| vehicles | `car` `bus` `schoolBus` `garbageTruck` `excavator` |
| characters | `citizen` `pupil` `elder` `carer` `builder` `officeWorker` `shopkeeper` `mascot` `wolf` |
| office | `desk` `schoolDesk` `officeChair` `bookshelf` `whiteboard` `blackboard` `meetingTable` `table` `filingCabinet` `deskLamp` `mug` `paperStack` `ledger` `wasteBasket` `clock` |
| shop & money | `crate` `basket` `flourSack` `breadShelf` `shopSign` `shoppingCart` `pram` `scale` `moneyBag` `coinStack` `piggyBank` `gem` |

The sheets have no crane, excavator or football goal, so those types map to
the nearest printed piece (a striped construction pole, the pickup truck,
a bench) — decks written for the old procedural library still load without
warnings.

The hero wolf is added automatically — you never declare it. Extra wolves can
be placed as props. On every scene arrival the wolf announces himself with a
little paper **speech bubble** (a random phrase + the scene number).

## 6. Slides & groups — revealing content with in-place parts

A scene holds **slides**; a slide holds **groups**; a group holds **parts** —
papercraft panels that **float in place inside the diorama** at the position
and depth you give them. Parts grow in with a little overshoot, bob gently
while shown, and shrink away when you step back — the exact reverse.

```jsonc
"slides": [
  { "id": "cover", "title": "Welcome!", "subtitle": "Why we are here" },  // title-only
  {
    "id": "revenue", "title": "Revenue", "subtitle": "Q1–Q2 in detail",
    "groups": [
      { "parts": [
          { "type": "chart", "chart": "bar", "title": "Revenue",
            "data": [ { "label": "Q1", "value": 40 }, { "label": "Q2", "value": 65 } ],
            "position": [-3.5, 5], "depth": "mid" },
          { "type": "stat", "value": "65", "label": "Best quarter", "position": [5, 5], "depth": "front" }
      ] }
    ]
  }
]
```

- A **slide** carries `id`, `title`, `subtitle?` (and an optional `kicker`
  overriding the scene's). With no `groups` it's a **title-only slide** — a
  section divider / cover that shows just the big 3D title + subtitle.
- A **group** (`{ "parts": [...] }`) reveals its panels together on one
  `Space` (staggered, one after another), and folds them away on `Backspace`.
- **Groups clear each other** — advancing shows one group at a time, keeping
  the frame uncluttered. Advancing to a new *slide* clears the previous
  slide's panels **and swaps the 3D title/subtitle** (no wolf walk). The wolf
  walks only between *scenes*.
- Each slide has a URL hash (`#revenue`) and a row in the **L** menu.

A group with a single panel may use `{ "part": {…} }` for brevity.

**Closeups.** For the few numbers the talk hinges on, a group can ask the
camera to move in once its panels have landed:

```jsonc
{ "closeup": { "part": 3 }, "parts": [ … ] }   // frame the group's 4th panel
```

That group's step reveals the panels and then the camera dollies slowly in
(after the panels land) to frame the target; the **next** step only pulls
the camera back — the panels stay — and the deck continues normally.
Backspace reverses both exactly. Targets: `"part": i` (default 0 — the
group's own panel), `"prop": i` (the scene's i-th prop) or
`"at": [x, y, depth]` with an optional `"size": [w, h]`. `"zoom": 2`
forces a distance (twice as close as the normal view) instead of fitting
the target; `"delay"` overrides the wait before moving in. Closeups are
skipped in the flat presentation view (P) and while the wolf walks. Use
them sparingly — a closeup is an exclamation mark (`rozpocet-2025.json` has
six in 33 slides).

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

**Automatic cascade (the default).** Parts that give no `position`/`depth`
are placed on an ordered cascade spanning the diorama **from the mid row
level to the front row level** (z −3 … +3 — never as deep as the trees and
buildings in the back row): part *k* lands at `x = −6 + 2.1·k`, `y ≈ 4.2`
(alternating slightly up/down), `z = −3 + 1.2·k` — **each new panel lands in
front of the older ones**. Give an explicit `position`/`depth` to place it
yourself (the data decks position everything explicitly for clean 2D too).

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
scenery — order and depth are yours. Panels of one group that share a depth
never sit in one plane: each later one is nudged 0.5 closer to the camera,
in reveal order, so overlapping cards occlude cleanly.

Parts from *previous* scenes stay revealed off-screen, which is what makes
going backward perfectly symmetric.

### Slides vs. groups — the deck rhythm

- **A group** reveals its ≤4 panels together (staggered). Split a busy slide
  into several groups so only ≤4 panels are ever on screen; advancing shows
  one group at a time (the previous clears, the title stays).
- **A slide** is the addressable unit — its own title, subtitle, URL and menu
  row. Advancing to the next slide clears the previous panels and swaps the
  3D title/subtitle in place (no walk).
- **A title-only slide** (`"groups": []` or omitted) is a section
  divider/cover: just the big title + subtitle until you advance.

The shipped `rozpocet-2025.json` is authored this way: 15 scenes (dioramas),
33 slides (one per source slide, each with its heading), ~42 groups.

### The 3D title

Each slide's `title` becomes a layered paper heading floating at the top of
the scene — slate-ink letters lifted a little in front of a sand-colored
backing layer (orbit the camera and the layers part) — gently bobbing,
parked **behind the panel zone** (z −6.5) so panels always pass in front.
Long headings **shrink to fit** the frame width; only very long ones wrap
onto a second line. The slide's `kicker` floats as a small uppercase
strapline above the letters and its `subtitle` as a wrapped line below —
both on small ivory paper labels so they read over the hills; the
subtitle **fades aside as the slide's first panel group reveals** (and
returns when you step back). Moving to the next slide scales the old title
out and the new one in.

All text — titles, panels, charts, the slide menu — is set in **Nunito**
(bundled, rounded and friendly like the cut-paper shapes), which covers
Latin Extended, so Slovak diacritics render natively.

## 7. Scenes, transitions, camera

- Advancing past a scene's last slide trots the wolf to the next scene; the
  camera **trails the wolf** with damped easing, so every depth row slides at
  its natural parallax speed during the walk. Advancing between slides *within*
  a scene never walks — the 3D title just swaps.
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
docs/assets/README.md         asset catalog (generated) + sprites.jpg contact sheet
*.png (repo root)             the reference sheets every sprite is cut from
tools/extract-sprites.mjs     cuts the sheets into src/sprites/ (npm run sprites)
tools/sprites.config.js       the cut list: sprite name → sheet + rectangle
tools/gen-asset-docs.mjs      regenerates docs/assets/README.md
src/config.js                 rows, camera tilt/fov, spacing, speeds
src/engine/                   renderer, camera rig, ticker, tween
src/core/                     loader, deck assembly, step machine, hero,
                              input, URL-hash navigation, speech bubble
src/environment/              paper meadow, rivers/roads, sky, hills, sun, clouds
src/sprites/                  the cut-out sprites (.webp) + manifest.json
src/assets/                   palette (sheet swatches), paper textures and
                              materials, sprite standees, the asset catalog,
                              the wolf puppet, registry
src/parts/                    card base, text/bullets/image, stat/numbered/callout/table, 3D charts, title
```

`window.wolfdeck` exposes live engine objects for console debugging.

### Extending the asset library

New art comes from new reference sheets — generate them with the recipe in
[midjourney.md](midjourney.md) so they match, then:

1. Put the sheet (white background) in the repo root and add it to
   `sheets` in `tools/sprites.config.js`.
2. Add a cut line per piece: `[name, sheet, [x0, y0, x1, y1]]`, the rect in
   the sheet's 2000-px-wide preview space (cut options: `maxH`, `tight`,
   `hull`, `hardShadow`, `keepAll` — see the file's comments).
3. `npm run sprites` — cuts `src/sprites/<name>.webp`, updates the manifest,
   the contact sheet `docs/assets/sprites.jpg` and the catalog doc. Look at
   the contact sheet (it's on meadow green, so fringes and bites show).
4. The sprite is immediately usable as `"type": "<name>"`. To group variants
   into a type with a default height and animations, add an entry to
   `TYPES` in `src/assets/catalog.js`, then `npm run asset-docs`.
5. Determinism rule: use `rng(seed)` from helpers, never `Math.random()`, for
   anything that affects what is shown (random is fine for animation phase).

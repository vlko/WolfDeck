# WolfDeck — Framework Specification

WolfDeck is a WebGL presentation framework styled as a **paper-theatre
diorama**. Every tree, house, car and animal is a piece cut straight out of
the illustrated reference sheets (`RawSources/sheets/`: `visual.png`, `city 1.png`,
`city 2.png`, `office.png`, `shop.png` …) and stood upright on a faceted paper meadow like a
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
| `F` | **Present**: this window goes fullscreen and a **presenter window** opens — timer (pause / reset) and clock, the slide's speaker `notes`, a live thumbnail of the audience view, and the text the next `Space` will bring. With several screens (Chrome / Edge, which ask for the *window management* permission once) a picker asks where the deck should go; the presenter window takes the other screen. Elsewhere the deck goes fullscreen where it is and you place the two windows by hand — drag the deck to the projector first. `Space` / `Backspace` / `←` `→` / `P` work in either window. `F` again leaves / re-enters fullscreen; `Esc` leaves it |
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
  delay apart), not all at once.
- **Exact reversal.** Stepping N forward then N back always returns to the
  same state — hides mirror reveals one for one.
- **Never blocked by animations.** Within a scene every press moves the
  state at once — reveal, hide, chart and closeup animations run on their
  own and are interrupted mid-way when the presenter clicks on (a panel
  that hasn't popped in yet simply never does). Clicking quickly (presses
  < 0.9 s apart) clears the outgoing panels 3× faster, and a closeup that is
  clicked past never moves the camera. So fast clicks land exactly where
  the presenter is heading.
- At the ends of the deck the wolf does a little squash-stretch hop instead
  of moving.
- Keys are ignored while an input field has focus.
- **Touch devices** (coarse pointer) get four corner buttons — slide menu,
  presentation mode, back, next — and touch-and-hold on the scene walks the
  wolf.

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
`public/rozpocet-2025.json` is a full real-world deck (15 scenes, 34
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
  "options": { },              // per-asset options (see its doc file)
  "id": "cheese"               // optional name — lets a moving prop refer to it
}
```

Placement tips:

- Stagger several props in one row with small `dz` offsets (`0.5`, `0.9`).
- Every asset accepts `{ "seed": n }` — same seed, same shape, every load.
- Animated assets take `{ "animation": "<name>" }`; each asset's allowed
  animation names are listed in its doc file (and in the table below).
  Unknown names warn and fall back to the asset's default.

### Moving props

A prop travels through its scene by itself when its options carry `move`.
The mover positions it every frame, turns it to face where it is going
(models are built front = +x), spins `rig.parts.wheels`, and plays the rig's
moving animation (`drive` / `run` / `roll` / `glide`…) while it travels and
its still one (`idle` / `sniff`…) while it rests. Coordinates are
scene-local `[x, z]`. Moving props are no obstacle for the wolf; a chaser
arcs round him and a crossing prop drifts aside when he stands in its way.

| `move.kind` | Fields | Does |
|---|---|---|
| `loop` | `oval: [cx, cz, halfStraight, radius]` or `points: [[x, z], …]` (≥ 3, rounded into a smooth closed curve), `speed`, `startAt` (0–1), `lane` (sideways offset), `clockwise` | Laps a closed circuit — race cars |
| `cross` | `from: [x, z]`, `to: [x, z]`, `speed`, `pause` (seconds between runs), `startAt` | Crosses the scene again and again, shrinking away at the far end — a tumbleweed, a paper plane |
| `chase` | `target: "<prop id>"`, `speed`, `reach`, `think` (seconds it looks around when the target has moved) | Runs after another prop |
| `flee` | `from: "<prop id>"`, `spots: [[x, z], …]`, `near` (how close the chaser may get), `hop` (jump height), `air` (seconds in the air) | Rests on a spot until the chaser is near, then hops to the spot farthest from it |

`"anims": { "move": "run", "still": "sniff" }` overrides the animation pick.

```jsonc
{ "type": "cheese", "id": "cheese", "position": [-8, 0], "layer": "action",
  "options": { "move": { "kind": "flee", "from": "mouse", "spots": [[-8, 2], [8, 2], [0, 3.4]] } } },
{ "type": "mouse", "id": "mouse", "position": [6, 0], "layer": "action",
  "options": { "move": { "kind": "chase", "target": "cheese", "speed": 3.6 } } }
```

### Lamps

`"type": "light"` is an invisible lamp that lights the 3D models around it —
a pool of light on a `night` stage, a warm corner in the `gloom`. Place it
with `"position": [x, height]`; options `color`, `intensity` (default 2.2),
`distance` (reach, default 9). Panels and titles are unlit and unaffected.
Use a few per deck, not dozens — every lamp is computed for every model.

### 3D lettering

`"type": "text3d"` stands real extruded letters in the scene — a sign, a
closing title. Options: `text` (`\n` starts a new row), `size` (cap height,
default 1.4), `depth`, `color` or `colors: [..]` (cycled per letter),
`sideColor`, `arc` (degrees the row bends over), `glow` (0–1, for dark
moods), `animation`: `wave` (default) / `pop` / `none`. The font (Optimer
Bold) has no diacritics — keep to plain Latin. The font is downloaded only
by decks that use the prop.

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
Give him lines of his own with `"quips": ["…", "…"]` — on a scene (what he
may say on arriving there) or in `meta` (for every scene without its own);
one is picked at random each time. Keep them short: the bubble is one line.

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

- A **slide** carries `id`, `title`, `subtitle?`, `notes?`, `style?` (and an
  optional `kicker` overriding the scene's). With no `groups` it's a **title-only slide** — a
  section divider / cover that shows just the big 3D title + subtitle.
- A **group** (`{ "parts": [...] }`) reveals its panels together on one
  `Space` (staggered, one after another), and folds them away on `Backspace`.
- **Groups clear each other** — advancing shows one group at a time, keeping
  the frame uncluttered. Advancing to a new *slide* clears the previous
  slide's panels **and swaps the 3D title/subtitle** (no wolf walk). The wolf
  walks only between *scenes*.
- Each slide has a URL hash (`#revenue`) and a row in the **L** menu.
- `notes` (a string, or an array of paragraphs) are the slide's **speaker
  notes**: never drawn in the deck, shown only in the presenter window (`F`).

A group with a single panel may use `{ "part": {…} }` for brevity.

**Building a slide up: `keep`.** A group with `"keep": true` adds its
panels to the ones already shown instead of clearing them, so a slide can
bring in one element on its own and still end with the full layout. A group
with `"subtitle": true` keeps the slide's subtitle visible (e.g. a portrait
that goes with it).

**Slide parts.** `"parts"` directly on a slide (the same objects as in a
group) are panels that belong to the slide itself: they are there as soon as
its title is and leave with it, without a step of their own — a byline, a
logo, a QR code.

**Key message.** `"message": true` on a slide makes its subtitle the slide's
key message: the same label, set large in the middle of the screen, drawn
over the scenery and kept through all of the slide's groups (place their
panels beside it). A slide with no subtitle promotes its **heading** instead
— it hangs mid-screen, as large as fits. The wolf steps off his post and
turns toward the text; `"heroSide"` says where he stands: `"left"` (default),
`"right"`, or his exact offset from the scene's centre (e.g. `-4.2`).

```jsonc
{ "id": "cover", "title": "How to become…", "subtitle": "…the speaker an AI picked",
  "message": true, "heroSide": "left",
  "groups": [{ "parts": [{ "type": "text", "position": [7.5, 2.5], "depth": "front", "title": "Jane Doe" }] }] }
```

**Closeups.** An interesting element can make an entrance: put it in a group
of its own with `"closeup"` and the camera moves in on it **as it appears**;
the next step pulls the camera back while that step's content comes in.

```jsonc
{ "parts": [ statPanel ] },                                  // the context
{ "keep": true, "closeup": {}, "parts": [ keyExplainer ] },  // alone, camera in
{ "keep": true, "parts": [ noteCallout ] }                   // camera out, note in
```

Backspace reverses it exactly. Target: the group's first panel by default,
or `"part": i`, `"prop": i` (the scene's i-th prop) or `"at": [x, y, depth]`
with an optional `"size": [w, h]`; `"zoom": 2` forces a distance (twice as
close as the normal view) instead of fitting the target, `"delay"` the wait
before the move. Closeups are skipped in the flat presentation view (P) and
while the wolf walks. Give them to the element each slide hinges on —
`rozpocet-2025.json` has 26 across its 34 slides (the speaker, what a
municipal budget is, the result of the year, the 0 € debt, the QR code…).

### Slide styles

`"style"` on a slide chooses how its **panels, heading, kicker and subtitle**
look and how they **enter** — the title block comes in the same way as the
panels (stepping back plays the entrance in reverse). The content of the
panels is the same in every style.

| `style` | Look | Entrance |
| ------- | ---- | -------- |
| `paper` | The default: an ivory paper card on a kraft board, cut-paper title | Grows in with a small overshoot |
| `tear` | A rip in the paper world — a thin torn edge with white fibres and curls of paper, a flat white page behind; titles are torn-open strips | The tear runs left to right while the torn paper rolls up in front of it and drops away |
| `screen` | A glowing display in a thin graphite bezel, with a soft halo; titles sit on slim strips of the same glass | Switches on: a line of light spreads sideways, then opens |
| `cyber` | A cyberpunk display — black frame with cut corners, magenta and cyan neon, a hazard tab, a scan bar; titles are neon signage | Boots with a glitch: flickers, jumps, snaps into register |
| `sticker` | A comic sticker that always faces the viewer squarely — ink outline, white border, contact shadow; titles are die-cut lettering | Flies down from above, askew, and is pressed on |

```jsonc
{ "meta": { "style": "screen" },                 // deck default (optional)
  "scenes": [ { "id": "intro", "style": "tear",  // scene default (optional)
    "slides": [
      { "id": "a", "title": "Torn open" },                      // tear (from the scene)
      { "id": "b", "title": "On a sticker", "style": "sticker" } // its own
    ] } ] }
```

- The nearest setting wins: slide, then scene, then `meta.style`, then
  `paper`. An unknown name warns and falls back.
- Only the styles a deck uses are downloaded.
- `?style=<name>` in the URL dresses **every** slide in one style — handy for
  trying a style on an existing deck (`?deck=rozpocet-2025.json&style=cyber`).
- `public/showcase.json` has a scene with one slide per style
  (`?deck=showcase.json#style-paper`).
- Styles live in `src/styles/<name>.js` and are listed in
  `src/styles/index.js`. A style module exports a panel style (backing,
  face, `update`, `reveal`) and a `title` style (heading layers, label
  painter, colors) — the hooks are documented at `setPanelStyle` in
  `src/parts/card.js` and `setTitleStyle` in `src/parts/title.js`.

### Part types

| Type | Fields |
| ---- | ------ |
| `text` | `title?`, `body?` (supports `\n`) |
| `bullets` | `title?`, `items: [string]` |
| `stat` | `value` (e.g. `"16 553 897 €"`), `label?`, `note?` — a KPI tile with an accent top strip; the number **counts up** as the tile lands |
| `numbered` | `title?`, `items: [{title?, text} \| string]`, `start?` — 01/02/03 circle badges, items fade in one after another |
| `callout` | `text` (or `body`), `title?`, `tone: "info"\|"positive"\|"warning"` — accent-edged banner with a → / ✓ / ! icon |
| `table` | `title?`, `columns: [string]`, `rows: [[cell]]`, `align?: ["left"\|"right"]` — numeric-looking columns right-align automatically; fonts shrink rather than let columns collide |
| `image` | `src` (path under `public/`), `caption?`, `aspect?` (width ÷ height of the picture — gives a wide or tall image a frame that fits; default ≈ 4:3) |
| `chart` | `chart: "bar"\|"barh"\|"line"\|"pie"`, `title?`, `data: [{label, value, plan?, display?}]`, `colors?`, `valueLabels?` — plus grouped bars and donuts, below |
| `diff` | `title?`, `lines: [string]`, `before?`, `after?` — a console diff: a dark terminal pane in a monospace face; a line starting with `-` is a removal (red), `+` an addition (green), `@` a hunk header, anything else context. `before` / `after` are short captions for the two sides shown in the title bar. Lines type themselves in one after another |

**Struck-through text.** In `text`, `bullets`, `numbered` and `callout`
parts, `~~like this~~` is drawn dimmed and crossed out — also across a line
wrap.

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
34 slides (one per source slide, each with its heading), ~42 groups.

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

### Mood and ground

A scene can change the weather and what it stands on:

```jsonc
{ "id": "fear", "mood": "gloom", "ground": "barren", "props": [ … ], "slides": [
  { "id": "fear", "title": "FEAR" },
  { "id": "hope", "title": "What now?", "mood": "dawn" }   // a slide may override the mood
] }
```

| `mood` | The world becomes |
|---|---|
| `day` | The storybook day (default) |
| `gloom` | Overcast and heavy: dark sky and hills, close fog, dim light, no sun |
| `dawn` | Warm first light |
| `dusk` | A warm evening |
| `night` | Dark blue with stars — lamps, screens and other glowing parts shine |

The sky, hills, clouds, ground, fog and the lights on the 3D models ease
toward a scene's mood as the camera walks there and back to the next one's
as it leaves; a slide's own `mood` takes over while that slide is on screen.
Panels and titles are unlit and stay readable in every mood. Presets live
in `src/environment/moods.js`.

| `ground` | The scene stands on |
|---|---|
| `meadow` | The paper meadow (default) |
| `asphalt` | Level warm-grey tarmac — a paddock, a car park |
| `floor` | A level two-tone tiled floor — indoors |
| `barren` | Rough, dried-out earth |
| `stage` | Level stage boards |

Each kind covers the scene's own stretch of terrain and meets its
neighbours in a ragged paper seam. Kinds live in `GROUNDS` in
`src/environment/ground.js`.

### The walk

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
public/rozpocet-2025.json     a full real-world deck (15 scenes, Slovak)
public/images/                your image-part files
docs/assets/README.md         asset catalog (generated) + sprites.jpg contact sheet
RawSources/sheets/*.png       the reference sheets every sprite is cut from
RawSources/talks/             the talks the shipped decks were written from
tools/extract-sprites.mjs     cuts the sheets into src/sprites/ (npm run sprites)
tools/sprites.config.js       the cut list: sprite name → sheet + rectangle
tools/gen-asset-docs.mjs      regenerates docs/assets/README.md
tools/gen-model-index.mjs     regenerates src/models/packs.json (model → pack)
src/models/                   the hand-built 3D models, in lazily loaded packs
src/config.js                 rows, camera tilt/fov, spacing, speeds
src/engine/                   renderer, camera rig, ticker, tween
src/core/                     loader, deck assembly, step machine, hero,
                              input, URL-hash navigation, speech bubble,
                              presenter mode (fullscreen + presenter window)
presenter.html, src/presenter/ the presenter window: timer, notes, preview, next
tools/verify/presenter.mjs    headless check of the presenter mode
tools/verify/loadtime.mjs     startup profile: time per loading phase, slowest requests
src/environment/              paper meadow, rivers/roads, sky, hills, sun, clouds
src/sprites/                  the cut-out sprites (.webp) + manifest.json
src/assets/                   palette (sheet swatches), paper textures and
                              materials, sprite standees, the asset catalog,
                              the wolf puppet, registry
src/parts/                    card base, text/bullets/image, stat/numbered/callout/table, 3D charts, title
src/styles/                   slide styles (tear, screen, cyber, sticker), loaded on demand
```

`window.wolfdeck` exposes live engine objects for console debugging.

### Extending the asset library

New art comes from new reference sheets — generate them with the recipe in
[docs/prompts/midjourney.md](docs/prompts/midjourney.md) so they match, then:

1. Put the sheet (white background) in `RawSources/sheets/` and add it to
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

**Objects no sheet has** can be *drawn*: put an SVG in
`tools/sprites-src/<pack>/<name>.svg` (transparent, in the sheets' flat
origami style) and run `npm run svg-sprites` — it becomes
`src/sprites/<name>.webp` like any cut-out, and is the reference the 3D
model is then built from. A model pack can bring its own asset types in
`src/models/<pack>.types.json` (the same entries as `TYPES`: `sprites`,
`height`, `anim`, `anims`, `shadow`, plus `obstacle: false` for flat things
the wolf may walk over), so adding a pack needs no edit to the catalog.

### Models, textures and paper staging

- **Models.** Every piece on the reference sheets is modeled in
  `src/models/` as a rigged, faceted paper object that matches the
  illustration from the front and makes physical sense from every side:
  characters blink, turn their heads, wave and flick their ears; the wolf
  walks on four legs with his tail streaming behind (sitting, it wraps round
  his flank as on the sheet); vehicles have four turning wheels and U-turn;
  trees bend in the wind; chimneys smoke; the crane slews, the excavator
  digs, the well's crank hauls the bucket. Objects no sheet has (crane,
  excavator, schoolhouse, vault, piggy bank…) are modeled in the same style.
  Compare a model with its sprite at `/lab.html?m=<name>`.
- **Material textures** (`src/assets/materialTextures.js`) — five woods
  (knotty grain, fine joinery grain, horizontal planks, vertical
  board-and-batten, logs), seven stones (cobble courses, dressed ashlar,
  fieldstone rubble, concrete, paving slabs, granite, roughcast plinth
  render), bricks, clay tiles, shingles, thatch, plaster, fur, wool, cloth,
  sheet metal, leaves, bark and asphalt. They are drawn procedurally at
  start-up as gray tiles that multiply the model's own color, so the palette
  stays intact. A part opts in with
  `mesh(geo, color, x, y, z, { tex: 'brick' })`; the texture is projected
  onto each flat facet in world units, so brick courses run level and a
  brick is the same size on a cottage and on the town hall. `texRotate`
  turns the pattern 90° (grain down a roof board). Windows on folded fronts
  use `foldPanel()` so they bend with the wall. `?tex=0` (or the lab's
  *Textúry* button) turns textures off;
  `node tools/verify/zoom.mjs <model> <1|2|3>` renders one lab view at 3×.
- **Sprites as the fallback.** An object without a model stands as a
  die-cut card cut from the sheets by `tools/extract-sprites.mjs`
  (background and soft shadows removed), with a sliver of cardboard edge and
  a soft contact shadow. Cards sway, breathe, hop, graze or swing according
  to their type, and a vehicle card turns round by flipping.
- **The wolf** trots, squashes to sit, hops, and left alone sits for a
  while, glances around, or trots up to the viewer and back.
- **Old decks load unchanged:** every asset name of the earlier procedural
  library maps to its nearest current piece.

### What a deck downloads

A deck fetches only what its own props are built from, however large the
library grows:

- **3D models** live in *packs* — one module per reference sheet,
  `src/models/<pack>.js`, each its own file in the build. Before the first
  frame the deck works out which model every prop will use (the same seeded
  variant pick the builder makes) and imports just those packs
  (`loadModelsFor` in `src/models/index.js`). The model lab loads all of them.
- `src/models/packs.json` maps every model to its pack. It is **generated**
  (`npm run model-index`) — the dev server and the build refresh it by
  themselves, also whenever a file in `src/models/` changes. Commit it.
- A new pack is a new file in `src/models/`; list it in
  `src/models/order.js` (a later pack's model replaces an earlier one of the
  same name — the shared vehicles come last). An unlisted pack still works,
  it just registers last.
- **Slide styles** (`src/styles/`) are separate modules too; a deck imports
  only the ones its slides name.
- **Sprites** (`.webp`) are fetched only for objects that have no 3D model;
  the deck waits for those few images before its first frame.

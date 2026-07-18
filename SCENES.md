# Authoring Scenes — Tutorial & Templates

This guide shows how to describe your presentation in
`public/presentation.json`, using the shipped demo deck as the worked
example. For the full reference (every field, every asset option), see
[SPECIFICATION.md](SPECIFICATION.md); each asset's look and allowed
animations live in [docs/assets/](docs/assets/).

Three decks ship with the framework, and you can present any of them (or
your own file in `public/`) with `?deck=<file>.json`:

- `presentation.json` — the annotated demo this guide walks through.
- `showcase.json` — every part type and styling option, live.
- `rozpocet-2025.json` — a full real-world deck: 12 data-heavy scenes of a
  municipal budget, built with pages, stat tiles, tables and every chart
  kind. Steal from it freely.

## Think of each scene as a diorama on a shelf

A scene = one low-poly papercraft world built from three ingredients:

1. **A floating 3D title** — your slide heading, hovering over the scene.
2. **Props** — faceted papercraft assets standing on the rolling meadow in
   depth rows.
3. **Steps** — your content, revealed one `Space` press at a time as cards
   **floating in place** inside the diorama.

The wolf trots left→right through the scenes in order: intro first,
thank-you last.

## The stage in one picture

```
──────────────  cream sky · paper sun · drifting clouds (deep, slow)  ──────────────

                        「 The Meadow 」          ← 3D title (kicker above,
                                                    subtitle below) — parked
                                                    BEHIND the panel zone
   back   row (z −7):    🌲 🌲  🏠  🏚   🌲       tall scenery, slow parallax
   mid    row (z −3.5):    ⛲  🪵fence  🌾        medium props
   action row (z 0):      🐺 → 🐑 🐑              the wolf's row
   front  row (z +3):    🌲        🪵             foreground, fast, can cover parts

   ~~~~~~ rolling low-poly meadow, seeded bumps, river fords ~~~~~~
  ▓▓▓▓▓▓▓▓▓▓▓ parchment front skirt — the diorama's cut edge ▓▓▓▓▓▓▓▓▓▓▓
```

- **x** is screen-right, scene-local (about −10 … +10 usable); **y** is height
  **above the terrain** (0 = standing on it) — the framework lifts every prop
  onto the ground surface automatically.
- Parts (your content) float at any `[x, y]` and any `depth` — put one at
  `back` and the mid-row cottage will pass in front of it. Keep part tops
  below y ≈ 9.8 (frame ceiling ≈ 10.2).
- Give several props in one row small third-coordinate offsets
  (`"position": [x, 0, 0.7]`) so they never z-fight.

## The demo deck, annotated

The shipped `public/presentation.json` is the template. Scene 1, `meadow`,
recreates the reference sheet. (The prop/position concepts below are current;
for the exact reveal wrapper the deck now uses `slides` → `groups` as shown
in "Slides & groups within a scene" further down, not the older `steps`.)

```jsonc
{
  "id": "meadow",
  "title": "The Meadow",                       // 3D letters over the scene
  "props": [
    // Back row — the skyline: a pine cluster left, buildings center-right.
    { "type": "pineTree", "position": [-11, 0],       "layer": "back", "scale": 1.25,
      "options": { "seed": 3, "tiers": 6 } },
    { "type": "pineTree", "position": [-9, 0, 0.7],   "layer": "back", "options": { "seed": 7 } },
    { "type": "pineTree", "position": [-12.5, 0, 1.2],"layer": "back", "scale": 0.85, "options": { "seed": 12 } },
    { "type": "cottage",  "position": [-4, 0],  "layer": "back", "options": { "variant": "timber", "seed": 2 } },
    { "type": "barn",     "position": [8, 0],   "layer": "back", "options": { "seed": 1 } },
    { "type": "hut",      "position": [15, 0, 0.6], "layer": "back", "options": { "seed": 4 } },
    { "type": "pineTree", "position": [18, 0],  "layer": "back", "options": { "seed": 9, "tiers": 5 } },

    // Mid row — village life; the well is the scene's one animated prop.
    { "type": "cottage",  "position": [2.5, 0], "layer": "mid", "scale": 0.85,
      "options": { "variant": "roundWindow", "seed": 8 } },
    { "type": "well",     "position": [-7.5, 0], "layer": "mid", "options": { "seed": 5, "animation": "crankTurn" } },
    { "type": "haystack", "position": [11.5, 0], "layer": "mid", "options": { "seed": 6 } },
    { "type": "fence",    "position": [-1.5, 0, 0.9], "layer": "mid", "options": { "length": 6, "seed": 2 } },

    // The flock — alive: the sheep grazes, the lamb idles and blinks.
    // Note the NUMERIC layer 1.5: one step in front of the action row, so
    // they never collide with the wolf walking along z 0.
    { "type": "sheep", "position": [4.5, 0], "layer": 1.5, "options": { "seed": 3, "animation": "graze" } },
    { "type": "lamb",  "position": [6.2, 0], "layer": 1.5, "options": { "seed": 4 } },

    // Front row — frames the shot and can pass IN FRONT of parts.
    { "type": "pineTree", "position": [-13.5, 0], "layer": "front", "scale": 0.6, "options": { "seed": 11 } },
    { "type": "fence",    "position": [12, 0],    "layer": "front", "scale": 0.9, "options": { "length": 4, "seed": 9 } }
  ],
  "steps": [
    // No positions given — the parts land on the AUTOMATIC CASCADE: each new
    // panel appears IN FRONT of the older ones, fanned rightward and
    // alternating slightly up/down, at wolf level, close to the viewer.
    // Give any step an explicit "position"/"depth" to place it yourself.
    { "part": { "type": "text", "title": "Hello!",
                "body": "A presentation that lives\ninside a papercraft diorama.", "tilt": -2 } },
    { "part": { "type": "bullets", "title": "How it works",
                "items": ["Everything is one JSON file", "Space reveals the next idea", "Backspace rewinds it exactly"],
                "tilt": 1.5 } },
    { "part": { "type": "image", "src": "images/demo.png",
                "caption": "Images float in the scene too", "width": 4.4 } },
    // The three chart kinds: 3D bars, extruded pie, drawn line ribbon.
    { "part": { "type": "chart", "chart": "bar", "title": "Sheep counted",
                "data": [ { "label": "Mon", "value": 12 }, { "label": "Tue", "value": 19 }, { "label": "Wed", "value": 31 } ],
                "tilt": 2 } },
    { "part": { "type": "chart", "chart": "pie", "title": "Flock mood",
                "data": [ { "label": "Cozy", "value": 70 }, { "label": "Curious", "value": 20 }, { "label": "Baa", "value": 10 } ],
                "tilt": -3 } },
    { "part": { "type": "chart", "chart": "line", "title": "Grass, over time",
                "data": [ { "label": "Q1", "value": 5 }, { "label": "Q2", "value": 9 }, { "label": "Q3", "value": 7 }, { "label": "Q4", "value": 12 } ] } }
  ]
}
```

Why it's laid out this way:

- **Skyline first.** Big silhouettes (`back`) establish the composition:
  cluster, gap, cluster. The gap over the wolf's arrival spot (x ≈ 0) is
  deliberate — parts drop into it.
- **Animals off the rail.** The wolf owns z 0; putting the flock at layer
  `1.5` keeps them close to the action without ever intersecting him.
- **One moving prop per row is plenty.** The well cranks, the sheep grazes —
  more than that competes with your content.
- **Seeds everywhere.** Three pines with three seeds look like a forest;
  three identical pines look like a rubber stamp.
- **Reveal order tells a story arc**: greeting → how-to → proof (image) →
  numbers (charts). Six steps is about the comfortable maximum per scene.
- **The cascade keeps content ordered.** Later panels always land in front
  of earlier ones with z-room for the 3D graphs, and older titles stay
  peeking out. Explicit `position`/`depth` (row names, numbers, behind a
  front-row prop) is still there when you *want* a card embedded in the
  world — overlap is a tool, not an accident.
- Watch the wolf while you talk: left alone he sits down, glances around, or
  trots up to the viewer and back. Any keypress snaps him back to work.

The deck's `meta` also inlays a **river** between the two scenes
(`"rivers": [ { "x": 17, "width": 3 } ]` — world x, halfway between scene 0
at x 0 and scene 1 at x 34), so the wolf fords it mid-walk.

## The city slide (scene 2 of the demo)

The deck's second scene shows the **city pack** — copy it for urban chapters.
The recipe: towers and townhouses build the skyline (`back`), street
furniture fills `mid`, a citizen stands in `action`, and vehicles live on a
**road lane** — an asphalt band graded into the terrain via `meta.roads`
(`{ "z": 2, "width": 2.4, "from": 21, "to": 47 }` in world x), with `car`
and `bus` props placed at numeric `layer: 2` (= the road's z) so they patrol
it, wheels spinning, turning at the ends. Everything idles on its own:
tower windows flicker (`windowGlow`), the traffic light cycles, streetlamps
breathe, the fox citizen blinks. Its four steps (text → bullets → bar → pie)
land on the automatic cascade.

## The office slide (scene 3 of the demo)

Scene 3 shows the **office pack** — furniture arranged like a toy playset on
the meadow. Two things worth copying: **stacking** — the mug sits on the
desk (`"position": [-6.5, 1.42, 0.3]`, y = desk-top height × the desk's
scale) and the lamp on the meeting table the same way; and **scale** —
furniture is scaled 1.3–1.7× so it holds the frame like the buildings do in
other scenes. Everything idles: the monitor flickers (`screenGlow`), the
chair swivels, the mug steams, the lamp glows, plants sway, and the animal
colleagues (`officeWorker`, variants bear/cat/hamster/badger) breathe,
blink and glance around.

## The market slide (scene 4 of the demo)

Scene 4 shows the **shop pack**. The shop building's striped scalloped
awning anchors the composition at the left; the market stall (with its
basket and register already dressed on the counter) holds the right. Small
goods — crates (`produce: fruit/greens`), baskets, flour sacks, the bread
shelf — cluster in `mid` like spilled toys, shopkeepers (`panda`, `bear`)
stand in the action rows, and flower pots + the shopping cart frame the
foreground. Three things move on their own: the hanging `shopSign` swings,
the `scale` needle wiggles as it weighs, and the flowers sway while the
keepers blink.

## More packs: school, finance, construction, civic, landmarks

Four more themed packs (plus two landmark props) cover civic storytelling —
`rozpocet-2025.json` shows each one composed into a scene:

- **School** (`#skolstvo`): the bell-gabled `schoolhouse` anchors the back,
  a `blackboard` and `schoolDesk`s dress the yard, `pupil`s (fox / bunny /
  bear / cat) stand off the wolf's rail at layer `1.5`, and a `schoolBus`
  drives a `meta.roads` lane exactly like the city `bus`.
- **Finance** (`#rezervy`): a `vault` and `coinStack`s make a treasury;
  the `piggyBank` blinks on its own; `moneyBag` and `ledger` are small
  set-dressing for mid rows.
- **Construction** (`#investicie`): the `crane` is back-row scenery on the
  officeTower scale, its jib slowly slewing; the `excavator` digs on loop;
  `scaffold`, `trafficCone`s and a hammering `builder` fill the site.
- **Civic** (`#technicke`, `#buducnost`): a `garbageTruck` patrols a road
  lane, `recyclingBin`s take a per-bin `color`, the `zevoPlant` puffs paper
  smoke on the horizon; `carer` + `elder` make a care-home beat, and
  `footballGoal` + bouncing `ball` a sports field; a parent with a `pram`
  strolls for demographic scenes.
- **Landmarks**: `churchTower` gives a town its silhouette;
  `mountainBackdrop` is a wide layered ridge band for the very back — place
  it on a deep numeric layer (`-9`) so all scenery overlaps it.

## Data-heavy slides: stat, numbered, callout, table

Beyond text/bullets/image/chart, four info parts carry dense content (all
demonstrated in `showcase.json`):

```jsonc
{ "part": { "type": "stat", "value": "16 553 897 €", "label": "Plnenie príjmov",
            "note": "94,3 % z rozpočtu po zmenách" } },        // number counts up
{ "part": { "type": "numbered", "items": [ { "title": "First", "text": "…" } ] } },
{ "part": { "type": "callout", "tone": "positive", "text": "Good news…" } },
{ "part": { "type": "table", "columns": ["Fond", "€"], "rows": [["Rezervný", "1 069 996"]] } }
```

Charts grew variants to match: `"chart": "barh"` (horizontal, value labels
at the bar ends), plan-vs-actual (`plan` per datum → muted backing bar +
percentage), grouped series (`labels` + `series`), and donuts
(`donut: true`, `centerLabel`, `legendValues`). Every card takes `width`,
`height`, `fontScale`, `align`, `cardColor`, `accentColor` and `card: false`
— see SPECIFICATION.md §6 for the full field tables.

Three stat tiles in a row make a great slide opener:

```jsonc
{ "part": { "type": "stat", "value": "7,55 M€", "label": "…", "position": [-4.8, 6], "depth": "mid" } },
{ "part": { "type": "stat", "value": "54 %",    "label": "…", "position": [0, 6],    "depth": "mid" } },
{ "part": { "type": "stat", "value": "98,6 %",  "label": "…", "position": [4.8, 6],  "depth": "mid" } }
```

Panels of one page that share a depth never share a *plane*: each later
step is nudged 0.5 closer to the camera automatically, so when they overlap
they occlude cleanly, in reveal order.

## Slides & groups within a scene

One diorama (scene) can carry many **slides** — each with its own title +
subtitle + URL — and each slide holds one or more **groups** of panels:

```jsonc
{ "id": "dane", "kicker": "Časť 1 · Mestský rozpočet", "props": [ … ],
  "slides": [
    { "id": "dane-cover", "title": "Dane a príjmy",
      "subtitle": "Odkiaľ prichádzajú peniaze mesta" },      // title-only beat
    { "id": "odkial", "title": "Odkiaľ mesto získava peniaze?",
      "groups": [
        { "parts": [ { "type": "stat", … }, { "type": "stat", … }, { "type": "chart", … } ] },
        { "parts": [ { "type": "bullets", … }, { "type": "callout", … } ] }
      ] }
  ] }
```

The rhythm: arrive at the scene → the first slide's title + subtitle → each
`Space` reveals the next group (the previous clears; ≤4 panels on screen) →
when the slide's groups are done, the next `Space` swaps to the next slide's
title (no walk) → past the last slide, the wolf walks to the next scene.

- **Group** = a batch of ≤4 panels revealed together (staggered). Split a
  busy slide into several groups instead of crowding one.
- **Slide** = the addressable unit: `#slide-id` in the URL, a row in the `L`
  menu, a title-swap when you reach it. A `groups`-less slide is a
  title-only divider/cover.
- The kicker/subtitle greet while the diorama is clean, then the subtitle
  fades as the slide's first group reveals. The title is parked behind the
  panels, shrinks to fit long headings, and renders Slovak diacritics as
  folded-paper accents.

`rozpocet-2025.json` is authored exactly this way — 15 scenes, 33 slides
(one per source slide, headings preserved), ~42 groups.

## A minimal scene skeleton

```json
{
  "id": "my-scene",
  "kicker": "Chapter One",
  "props": [
    { "type": "pineTree", "position": [-9, 0], "layer": "back", "options": { "seed": 1 } },
    { "type": "cottage",  "position": [5, 0],  "layer": "back", "options": { "seed": 2 } },
    { "type": "fence",    "position": [0, 0],  "layer": "mid",  "options": { "length": 5 } },
    { "type": "sheep",    "position": [3, 0],  "layer": "action", "options": { "animation": "graze" } }
  ],
  "slides": [
    { "id": "hello", "title": "Chapter One", "subtitle": "How it begins" },
    { "id": "idea", "title": "The idea",
      "groups": [ { "parts": [ { "type": "text", "title": "One idea", "body": "Per group.", "position": [-4, 5] } ] } ] }
  ]
}
```

## Writing good slides

- **One idea per part.** Short titles, short bodies; `\n` for line breaks.
- **Place parts in the sky gaps** you left between silhouettes; y ≈ 4–7 for
  main content, higher (7–8, smaller `scale`) for a second row.
- **Use `depth` for theater.** `mid` behind the fence feels embedded;
  `front` pops at the viewer; behind a front-row prop = a curtain reveal.
- **A degree or three of `tilt`** makes cards look hand-placed.
- One diorama can carry several slides — give each its own heading. Keep each
  group ≤4 panels; split a busy slide into 2–3 groups rather than crowding.
  A `groups`-less slide is a pure title beat (cover / section divider).
- **Long notes make tall cards.** A `stat` with a three-line note is ~2.5
  units tall — leave that much vertical room between stacked tiles, or trim
  with `fontScale`.

## Checklist before presenting

1. `npm run dev`, walk the whole deck with `Space`, then all the way back
   with `Backspace` — it must land exactly where it started.
2. Watch the browser console — WolfDeck warns about typos (unknown asset →
   magenta box, unknown part type → magenta card, unknown layer/animation,
   chart without data, missing image).
3. Check every scene at your projector's aspect ratio (resize the window;
   narrow windows automatically pull the camera back).
4. While tuning one scene, deep-link straight to it — the URL hash carries
   the scene id (`?deck=my-deck.json#my-scene`), and editing the hash jumps
   there with earlier scenes revealed as if presented.
5. `npm run build && npm run preview` if you present from a static host.

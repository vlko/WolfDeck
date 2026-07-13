# Authoring Scenes — Tutorial & Templates

This guide shows how to describe your presentation in
`public/presentation.json`, using the shipped demo deck as the worked
example. For the full reference (every field, every asset option), see
[SPECIFICATION.md](SPECIFICATION.md); each asset's look and allowed
animations live in [docs/assets/](docs/assets/).

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

                        「 The Meadow 」          ← 3D title, y ≈ 9

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
recreates the reference sheet:

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

## A minimal scene skeleton

```json
{
  "id": "my-scene",
  "title": "Chapter One",
  "props": [
    { "type": "pineTree", "position": [-9, 0], "layer": "back", "options": { "seed": 1 } },
    { "type": "cottage",  "position": [5, 0],  "layer": "back", "options": { "seed": 2 } },
    { "type": "fence",    "position": [0, 0],  "layer": "mid",  "options": { "length": 5 } },
    { "type": "sheep",    "position": [3, 0],  "layer": "action", "options": { "animation": "graze" } }
  ],
  "steps": [
    { "part": { "type": "text", "title": "One idea", "body": "Per part.", "position": [-4, 5] } }
  ]
}
```

## Writing good steps

- **One idea per part.** Short titles, short bodies; `\n` for line breaks.
- **Place parts in the sky gaps** you left between silhouettes; y ≈ 4–7 for
  main content, higher (7–8, smaller `scale`) for a second row.
- **Use `depth` for theater.** `mid` behind the fence feels embedded;
  `front` pops at the viewer; behind a front-row prop = a curtain reveal.
- **A degree or three of `tilt`** makes cards look hand-placed.
- 1–3 steps per scene keeps a nice walking rhythm; a scene with **no** steps
  is a pure walk-through beat.

## Checklist before presenting

1. `npm run dev`, walk the whole deck with `Space`, then all the way back
   with `Backspace` — it must land exactly where it started.
2. Watch the browser console — WolfDeck warns about typos (unknown asset →
   magenta box, unknown part type → magenta card, unknown layer/animation,
   chart without data, missing image).
3. Check every scene at your projector's aspect ratio (resize the window;
   narrow windows automatically pull the camera back).
4. `npm run build && npm run preview` if you present from a static host.

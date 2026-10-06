# 🐺 WolfDeck

A WebGL presentation framework styled as a **paper-theatre diorama**. Every
tree, house, car and animal is cut straight out of the illustrated reference
sheets in this repo and stood upright on a faceted paper meadow like a
cardboard theatre figure; a cute origami wolf trots between your slides, and
your content — a layered paper title, text, bullets, images and real 3D
charts — floats in place inside the diorama at any depth you choose.

The art *is* the reference sheets — `visual.png`, `city 1.png`,
`city 2.png`, `office.png`, `shop.png`: flat faceted shapes, watercolor paper
grain, and the nine-swatch sage / sand / mauve palette printed on
`shop.png`. Sky, hills, panels and charts are drawn in code in that same
palette and grain, so the whole stage reads as one illustration.

![stack](https://img.shields.io/badge/three.js-r178-blue) ![build](https://img.shields.io/badge/vite-6-purple)

## Run it

```bash
npm install
npm run dev      # present at http://localhost:3000
```

Press `Space` to advance, `Backspace` to go back — N forward, N back always
lands where you started. A scene holds several **slides** (each with its own
title, subtitle and shareable `#slide-id`); advancing between them swaps the
floating title in place, and the wolf only walks when you cross into the next
scene. `L` opens a scrollable **slide menu** to jump anywhere; `P` toggles
**presentation mode**: the camera flattens to a straight-on 2D view with the
meadow along the bottom edge — a paper theatre — while the active slide's
title moves up top and your panels, keeping the arrangement you authored,
separate just enough to be fully visible. A second `P` restores the 3D view. A second `Space` mid-walk makes the wolf run;
while he walks, only your next keystroke is buffered, so a long transition
never bursts through several reveals on arrival. Hold the mouse button and drag to peek around
the diorama; let go and the camera glides back to its place. `W`/`A`/`S`/`D`
walk the wolf around freely — five seconds after you stop, he trots back to
his post on his own.

## Author your deck

Everything lives in **`public/presentation.json`** — scenes → slides →
groups of floating parts. No code needed. Any other `.json` in `public/`
presents with `?deck=my-deck.json`; the shipped `public/showcase.json` demos
every part type live, and `public/rozpocet-2025.json` is a full real-world
deck (15 scenes, 33 slides). Every slide has a shareable deep link
(`#<slide-id>` in the URL) and a row in the `L` menu.

- [SPECIFICATION.md](SPECIFICATION.md) — full reference: JSON schema, the
  depth-row model, controls, part types, extending the asset library.
- [SCENES.md](SCENES.md) — authoring tutorial, built around the shipped demo
  deck with the reasoning annotated.
- [docs/assets/](docs/assets/README.md) — the asset catalog: every type,
  its sprite variants, default height and **allowed animations**, plus a
  contact sheet of all sprites.
- [midjourney.md](midjourney.md) — prompt recipe for generating new
  reference sheets in the same style (then cut them with `npm run sprites`).

## What's in the box

- **Hand-built 3D models of every sprite** — each piece on the sheets is
  modeled in `src/models/` as a rigged, faceted paper object that matches the
  illustration from the front and makes physical sense from every side:
  characters blink, turn their heads, wave and flick their ears; the wolf
  walks on four legs with his tail streaming behind (sitting, it wraps round
  his flank as on the sheet); vehicles have four turning wheels and U-turn;
  trees bend in the wind; chimneys smoke; the crane slews, the excavator
  digs, the well's crank hauls the bucket. Compare a model with its sprite at
  `/lab.html?m=<name>`. Objects no sheet has (crane, excavator, schoolhouse,
  vault, piggy bank…) are modeled in the same style.
- **Material textures** — five woods (knotty grain, fine joinery grain,
  horizontal planks, vertical board-and-batten, logs), seven stones (cobble
  courses, dressed ashlar, fieldstone rubble, concrete, paving slabs,
  granite, roughcast plinth render), bricks, clay tiles, shingles, thatch,
  plaster, fur, wool, cloth, sheet metal, leaves, bark and asphalt, drawn
  procedurally at start-up (`src/assets/materialTextures.js`)
  as gray tiles that multiply the model's own color, so the palette stays
  intact. A part opts in with `mesh(geo, color, x, y, z, { tex: 'brick' })`;
  the texture is projected onto each flat facet in world units, so brick
  courses run level and a brick is the same size on a cottage and on the
  town hall; `texRotate` turns the pattern 90° (grain down a roof board).
  Windows on folded fronts use `foldPanel()` so they bend with the wall.
  `?tex=0` (or the lab's *Textúry* button) turns them off;
  `node tools/verify/zoom.mjs <model> <1|2|3>` renders one lab view at 3×.
- **120 cut-out sprites** (the fallback for anything without a model) — pines and cone trees, cottages, barn, hut,
  well, haystack, sheep; towers, townhouses, chapel, park trees, lamps,
  traffic light, benches, cars and buses; desks, bookshelves, flipchart,
  meeting tables, filing cabinet, mug and plant; the striped-awning shop,
  market stall, crates, baskets, bread shelves, sacks, scale; and a whole
  cast of animal townsfolk (bears, panda, koala, cat, fox, boar, badger…).
  `tools/extract-sprites.mjs` cuts them from the sheets — background and
  soft shadows removed — and `npm run sprites` re-cuts after you add a
  sheet. Catalog: [docs/assets/](docs/assets/README.md).
- **Paper-theatre staging** — each sprite is a die-cut card with a sliver of
  cardboard edge and a soft contact shadow. Trees sway about their foot,
  characters breathe and hop, sheep graze, signs swing, vehicles drive a
  road and turn by flipping their card, lamps glow, the traffic light
  cycles. The wolf is a puppet: a waddling trot, a squash to sit, a hop,
  and a card flip to turn around. Left alone he sits for a while, glances
  around, or trots up to the viewer and back.
- **A paper world** — a softly faceted, watercolor-washed meadow with a
  layered-card front edge, smooth paper rivers and roads, three bands of
  faceted hills, a two-tone paper sun and cut-paper clouds. Everything is
  unlit with baked shading, exactly like the printed sprites.
- **Natural parallax** — a perspective camera pitched 20° down trails the
  walking wolf; back rows drift, front rows sweep. Nothing scripted.
- **In-place presentation parts** — text, bullets, images, KPI stat tiles
  with counting numbers, numbered lists, tone callouts, data tables and 3D
  charts (rising bars, horizontal plan-vs-actual bars, grouped series,
  popping pie/donut wedges, drawn line ribbons) on ivory paper cards with a
  kraft board edge and a collage shadow, floating *inside* the scene;
  foreground props can genuinely pass in front of them. Cards take custom
  widths, heights, font scales and colors; a step can `clears` the previous
  panels to start a fresh "page" mid-scene. See `public/showcase.json`
  (`?deck=showcase.json`) for all of it live.
- **Presenter-proof navigation** — presses queue during walks, mashing
  fast-forwards animations, forward/back is perfectly symmetric, deck ends
  answer with a hop. The URL always carries the current slide (`#slide-id`)
  as a shareable deep link, and the wolf announces each arrival with a
  little paper speech bubble.
- **Titles that speak your language** — everything is set in Nunito
  (bundled, Latin Extended), so á č š ž ľ ô render natively. Slide titles
  take a kicker and a subtitle and float behind your panels, never over
  them.
- **Lenient by design** — typos become magenta placeholders and console
  warnings, never a crash. Decks written for the old procedural asset
  library load unchanged: every old asset name maps to its nearest sprite.

## Build for a venue

```bash
npm run build    # static bundle in dist/
npm run preview  # sanity-check it
```

The bundle is fully static and uses relative asset URLs, so it runs from any
subfolder — a USB stick, a venue laptop, or a web host.

## Publish it

Pushing to `main` deploys to <https://vlko.github.io/WolfDeck/> via
`.github/workflows/pages.yml`. One-time setup: **Settings → Pages → Source:
GitHub Actions**.

Keep the trailing slash when you share the link — deck JSON is fetched relative
to the document URL.

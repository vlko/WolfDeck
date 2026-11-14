# 🐺 WolfDeck

A WebGL presentation framework styled as a **paper-theatre diorama**. Your
slides — a paper title, text, bullets, images and real 3D charts — float
inside a hand-modelled papercraft world, and a small origami wolf walks from
scene to scene as you present. Decks are plain JSON; no code needed.

![stack](https://img.shields.io/badge/three.js-r178-blue) ![build](https://img.shields.io/badge/vite-6-purple)

**Live demo:** <https://vlko.github.io/WolfDeck/>

## Contents

- [Quick start](#quick-start)
- [Controls](#controls)
- [Presenting](#presenting)
- [Author your deck](#author-your-deck)
- [Features](#features)
- [Assets](#assets)
- [Project layout](#project-layout)
- [Scripts](#scripts)
- [Build and publish](#build-and-publish)
- [Documentation](#documentation)

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

The page presents `public/presentation.json`. Any other deck in `public/`
opens with `?deck=<file>`:

| Deck | What it is |
| ---- | ---------- |
| `presentation.json` | The demo deck — a short tour of the meadow (default) |
| `showcase.json` | Every part type, styling option and slide style, live |
| `rozpocet-2025.json` | A full real-world talk: 15 scenes, 34 slides, speaker notes (Slovak) |
| `codecon-2026.json` | A conference talk using moods, grounds, moving props, the `diff` part and all five styles (Slovak; written from `tools/decks/codecon-2026.mjs`) |

## Controls

| Input | Action |
| ----- | ------ |
| `Space` / `→` | Next: reveal the next group, the next slide, or walk to the next scene |
| `Backspace` / `←` | Previous — the exact reverse |
| `L` | Slide menu: jump to any slide (click, or `↑` `↓` + `Enter`) |
| `P` | Presentation mode: a flat, straight-on 2D view with the panels up front; `P` again returns to 3D |
| `F` | Present: fullscreen + a presenter window ([below](#presenting)) |
| `W` `A` `S` `D` | Walk the wolf around freely; he trots back by himself |
| Hold mouse + drag | Peek around the diorama; release and the camera glides back |
| `#slide-id` in the URL | Deep link to a slide — the address bar always carries the current one |

- **N forward, N back** always lands exactly where you started.
- **Animations never block a click.** Fast clicks go straight to the slide
  you are heading for; a second `Space` during a walk makes the wolf run.
- **Touch devices** get corner buttons (menu, presentation mode, back,
  next), and touch-and-hold walks the wolf.

## Presenting

Press `F`. The deck goes fullscreen and a **presenter window** opens with:

- a **timer** (pause / reset) and the clock,
- the slide's **speaker notes**,
- a **live preview** of what the audience sees,
- the **text of what the next `Space` brings**.

With several screens, Chrome and Edge ask once for the *window management*
permission and then let you pick the screen for the deck; the presenter
window takes the other one. In other browsers the deck goes fullscreen where
it is — drag it to the projector first. `Space`, `Backspace`, the arrows and
`P` work in either window.

Notes are a `notes` field on a slide (see below); they never show in the deck.

## Author your deck

A deck is one JSON file: **scenes** (dioramas the wolf walks between) hold
**slides** (title + subtitle, swapped in place), slides hold **groups**
(revealed one `Space` at a time), and groups hold **parts** (the panels).
Scenes are dressed with **props** — trees, houses, animals, vehicles.

```json
{
  "meta": { "title": "Q3 Review" },
  "scenes": [
    {
      "id": "intro",
      "kicker": "Part 1 · Intro",
      "props": [
        { "type": "pineTree", "position": [-9, 0], "layer": "back" },
        { "type": "cottage", "position": [11, 0], "layer": "mid" },
        { "type": "sheep", "position": [3, 0], "layer": "front" }
      ],
      "slides": [
        { "id": "cover", "title": "Welcome!", "subtitle": "Why we are here" },
        {
          "id": "revenue", "title": "Revenue", "subtitle": "Q1–Q2 in detail",
          "notes": "Start with the trend, then name the best quarter.",
          "groups": [
            { "parts": [
              { "type": "chart", "chart": "bar", "title": "Revenue",
                "data": [ { "label": "Q1", "value": 40 }, { "label": "Q2", "value": 65 } ],
                "position": [-3.5, 5], "depth": "mid" },
              { "type": "stat", "value": "65", "label": "Best quarter",
                "position": [5, 5], "depth": "front" }
            ] }
          ]
        }
      ]
    }
  ]
}
```

| Part type | Shows |
| --------- | ----- |
| `text` | A title and a paragraph |
| `bullets` | A title and a bullet list |
| `numbered` | Numbered steps, each with a title and text |
| `stat` | One big number with a label (counts up as it appears) |
| `callout` | A highlighted note in a tone color |
| `table` | A small data table |
| `image` | A picture with a caption |
| `chart` | 3D bar, grouped, horizontal, line, pie or donut chart |
| `diff` | A console diff — removed lines red, added lines green, typed in line by line |

In text parts `~~words~~` are struck through.

A slide can also pick a **style** — the look of its panels and titles and
how the panels enter:

| `"style"` | Look |
| --------- | ---- |
| `paper` | Ivory paper card, cut-paper title (default) |
| `tear` | A rip in the paper world with a white page behind; tears open |
| `screen` | A glowing display in a graphite bezel; switches on |
| `cyber` | Cyberpunk display with neon and cut corners; glitches in |
| `sticker` | Comic sticker facing the viewer; flies in and sticks |

Set it per slide (`{ "id": "revenue", "style": "screen", … }`), per scene, or
for the whole deck in `meta.style`. Add `?style=cyber` to the URL to try one
style on every slide. `?deck=showcase.json#style-paper` shows all five.

A scene can also set its **mood** (`day`, `gloom`, `dawn`, `dusk`, `night` —
sky, fog and light change as the wolf walks in) and its **ground** (`meadow`,
`asphalt`, `floor`, `barren`, `stage`), and props can **move** by themselves:
lap a circuit, cross the scene, chase or flee one another
(`"options": { "move": { "kind": "loop", … } }`). `"type": "text3d"` stands
extruded lettering in the scene.

Where to go next:

- [SCENES.md](SCENES.md) — the authoring tutorial, built around the demo deck.
- [SPECIFICATION.md](SPECIFICATION.md) — the full reference: every field,
  the depth-row model, part options, closeups.

## Features

### The world

- **A paper world** — a faceted, watercolor-washed meadow with paper rivers
  and roads, three bands of hills, a paper sun and cut-paper clouds, all in
  one sage / sand / mauve palette.
- **Hand-built 3D models** — over 200 rigged papercraft objects that match
  the illustrated reference sheets from the front and make sense from every
  side: characters blink and wave, vehicles drive the roads on turning
  wheels, trees bend in the wind, chimneys smoke, the crane slews.
- **Material textures** — wood, stone, brick, tiles, thatch, fur and more,
  drawn procedurally and kept at the same real-world scale on every model.
- **Natural parallax** — a perspective camera trails the walking wolf, so
  back rows drift and front rows sweep. Nothing is scripted.

### Your content

- **Panels inside the scene** — parts float at the position and depth you
  give them; foreground props can genuinely pass in front of them.
- **3D charts** — rising bars, plan-vs-actual bars, grouped series, popping
  pie and donut wedges, drawn line ribbons.
- **Slide styles** — each slide can wear its own look, with matching titles
  and its own entrance: the default paper card, a tear in the paper world,
  a glowing screen, a cyberpunk display, or a comic sticker.
- **Closeups** — the camera can move in on one key panel or prop as it
  appears; the next step pulls back.
- **Titles in your language** — everything is set in Nunito (bundled, Latin
  Extended), so á č š ž ľ ô render natively.

### Presenting

- **Presenter view** — timer, notes, live preview and next-step text on
  your own screen while the audience sees the deck fullscreen.
- **Presenter-proof navigation** — symmetric forward / back, clicks that
  never wait for animations, a hop at either end of the deck.
- **Deep links** — every slide has its own `#slide-id` URL and a row in the
  slide menu.
- **Lenient by design** — typos become magenta placeholders and console
  warnings, never a crash.

## Assets

- **Models** live in *packs*, one module per reference sheet
  (`src/models/<pack>.js`). A deck downloads only the packs its own props
  are built from, so the library can keep growing.
- **Sprites** — the 205 pieces cut from the reference sheets
  (`src/sprites/`) — are the fallback for an object without a model, and are
  fetched only when one is used.
- **The lab** — `/lab.html?m=<name>` shows a model next to its sprite from
  three sides (dev server only).
- **Catalog** — [docs/assets/](docs/assets/README.md) lists every asset
  type, its variants, default height and allowed animations.
- **Adding art** — generate a reference sheet with the recipe in
  [midjourney.md](docs/prompts/midjourney.md), cut it with `npm run sprites`, then model
  the pieces; see *Extending the asset library* in
  [SPECIFICATION.md](SPECIFICATION.md).

## Project layout

```
public/            decks (*.json) and the images they use
src/core/          deck loader and assembly, step machine, input, menu,
                   URL hash, presenter mode
src/engine/        renderer, camera rig, ticker, tweens
src/environment/   meadow, rivers and roads, sky, hills, sun, clouds
src/parts/         panels: text, bullets, stat, table, charts, title…
src/styles/        slide styles: tear, screen, cyber, sticker
src/assets/        asset catalog, palette, materials, textures, sprites
src/models/        the 3D models, in lazily loaded packs
src/sprites/       the cut-out sprites and their manifest
src/presenter/     the presenter window (presenter.html)
tools/             sprite cutting, doc and index generators, verify scripts
docs/assets/       the generated asset catalog
*.png              the reference sheets the art comes from
```

## Scripts

| Command | Does |
| ------- | ---- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Static bundle in `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run sprites` | Re-cut the sprites from the sheets and refresh the catalog |
| `npm run svg-sprites` | Render the drawn reference sprites in `tools/sprites-src/` |
| `npm run asset-docs` | Regenerate `docs/assets/README.md` |
| `npm run model-index` | Regenerate `src/models/packs.json` (dev and build do it by themselves) |

## Build and publish

```bash
npm run build    # static bundle in dist/
npm run preview  # sanity-check it
```

The bundle is fully static and uses relative URLs, so it runs from any
subfolder — a USB stick, a venue laptop, or a web host.

Pushing to `main` deploys to <https://vlko.github.io/WolfDeck/> through
`.github/workflows/pages.yml` (one-time setup: **Settings → Pages → Source:
GitHub Actions**). Keep the trailing slash when you share the link — the deck
JSON is fetched relative to the page URL.

## Documentation

- [SPECIFICATION.md](SPECIFICATION.md) — full reference
- [SCENES.md](SCENES.md) — authoring tutorial
- [docs/assets/](docs/assets/README.md) — asset catalog
- [docs/prompts/midjourney.md](docs/prompts/midjourney.md) — prompt recipe for new reference sheets

Licensed under the [MIT License](LICENSE).

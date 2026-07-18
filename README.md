# 🐺 WolfDeck

A WebGL presentation framework styled as a **3D low-poly papercraft
diorama**. Faceted paper-toy scenes in a cozy storybook palette stand on a
rolling meadow; a cute origami gray wolf trots between your slides, and your
content — a floating 3D title, text, bullets, images and real 3D charts —
floats in place inside the diorama at any depth you choose.

The visual target is `visual.png`: flat faceted shapes, adorable wolf and
sheep, triangular pines, tiny village props, paper-grain texture, sage /
cream / dusty-rose palette.

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
- [docs/assets/](docs/assets/) — one file per asset: look, dimensions,
  options and **allowed animations** (e.g. sheep: `idle`, `graze`, `blink`).
- [midjourney.md](midjourney.md) — prompt recipe for generating new asset
  concepts in the exact `visual.png` style.

## What's in the box

- **True 3D papercraft assets** — all procedural, no art files: tiered
  pines, three cottage variants, the big mauve-roofed barn, thatched hut,
  stone well (with turning crank), picket fence, haystack, sheep, lamb — and
  the wolf hero with trot, idle, blink, ear-twitch and hop. Left alone, he
  sits down for a while, glances around, or trots up to the viewer and back.
- **A city pack** — faceted towers with flickering lit windows, townhouses,
  potted park trees, glowing streetlamps, a cycling traffic light, bench,
  hydrant, bus stop, a fox citizen — and cars and a bus that drive a real
  asphalt road graded into the terrain (`meta.roads`).
- **An office pack** — teal desk with a flickering monitor, swivel chair,
  bookshelves with colorful spines, scribbled easel whiteboards, meeting
  table, faceted plants, warm desk lamp, filing cabinet, a steaming mug —
  and big-headed animal colleagues in suits who blink and look around.
- **A shop pack** — the corner shop with its striped scalloped awning, a
  market stall, produce crates and baskets, flour sacks, a bread shelf, a
  swinging hanging sign, a shopping cart, a weighing scale with a wiggling
  needle, swaying potted flowers — and panda, bear and wolf shopkeepers.
- **School, finance, construction & civic packs** — a bell-gabled
  schoolhouse, blackboard, pupil desks, backpacked animal pupils and a
  driving school bus; a round-door vault, coin stacks, money bag, blinking
  piggy bank and ledger; a slewing tower crane, digging excavator, scaffold,
  cones and a hammering builder; a garbage truck, recycling bins, a
  waste-to-energy plant puffing paper smoke, carer and elder characters, a
  football goal with a bouncing ball, and a parent with a pram — plus a
  white church tower and layered mountain-ridge backdrops for town skylines.
- **Natural parallax** — a perspective camera pitched 20° down trails the
  walking wolf; back rows drift, front rows sweep. Nothing scripted.
- **In-place presentation parts** — text, bullets, images, KPI stat tiles
  with counting numbers, numbered lists, tone callouts, data tables and 3D
  charts (rising bars, horizontal plan-vs-actual bars, grouped series,
  popping pie/donut wedges, drawn line ribbons) on papercraft cards that
  float *inside* the scene; foreground props can genuinely pass in front of
  them. Cards take custom widths, heights, font scales and colors; a step
  can `clears` the previous panels to start a fresh "page" mid-scene. See
  `public/showcase.json` (`?deck=showcase.json`) for all of it live.
- **A rolling low-poly world** — seeded terrain ribbon with a parchment
  diorama edge, river fords the wolf splashes through, paper sun, drifting
  faceted clouds.
- **Presenter-proof navigation** — presses queue during walks, mashing
  fast-forwards animations, forward/back is perfectly symmetric, deck ends
  answer with a hop. The URL always carries the current scene (`#scene-id`)
  as a shareable deep link, and the wolf announces each arrival with a
  little papercraft speech bubble.
- **Titles that speak your language** — scene titles take a kicker and
  subtitle, render full diacritics (á č š ž …) as folded-paper accents over
  the extruded letters, and float behind your panels, never over them.
- **Lenient by design** — typos become magenta placeholders and console
  warnings, never a crash.

## Build for a venue

```bash
npm run build    # static bundle in dist/
npm run preview  # sanity-check it
```

# Prompts for the missing objects

Every shipped deck (`presentation`, `rozpocet-2025`, `showcase`,
`test-props`) was checked against the five reference sheets. This file lists
what the decks need but no sheet shows, and gives a ready-to-paste
Midjourney prompt for each new sheet. The recipe and the reasoning behind
every style phrase are in [`midjourney.md`](../../midjourney.md).

Once a sheet is generated: put it in the repo root, add one cut rectangle
per piece to `tools/sprites.config.js`, run `npm run sprites`, then model the
piece in `src/models/` against its new sprite (`/lab.html`).

## What is missing

### A — used in decks, but no sheet art

These have no printed reference, so each is either a 3D model invented in
the same style or a stand-in borrowed from another piece.

| Object | Used in | Today |
| ------ | ------- | ----- |
| `crane` | rozpocet #investicie, test-props #construction | invented model (`extras.js`) |
| `excavator` | rozpocet #investicie, test-props | invented model |
| `scaffold` | rozpocet #investicie, test-props | invented model |
| `trafficCone` | rozpocet #technicke #investicie | invented model |
| `builder` (worker in a hard hat) | rozpocet #technicke #investicie #odpady | stand-in: the boar shopkeeper |
| `schoolhouse` | rozpocet #programy #skolstvo | invented model |
| `blackboard` | rozpocet #skolstvo | invented model |
| `schoolDesk` (pupil's desk + bench) | rozpocet #skolstvo | stand-in: office desk, scaled down |
| `pupil` (bunny / bear) | rozpocet #skolstvo #sport-kultura | stand-in: panda kid |
| `schoolBus` (yellow) | rozpocet #skolstvo | stand-in: cream city bus |
| `footballGoal`, `ball` | rozpocet #sport-kultura | invented models |
| `piggyBank`, `coinStack`, `vault`, `ledger` | rozpocet #rezervy #dane | invented models |
| `garbageTruck` | rozpocet #technicke #odpady | invented model |
| `recyclingBin` | rozpocet #technicke #odpady | invented model |
| `zevoPlant` (waste-to-energy plant) | rozpocet #odpady | invented model |
| `pram` | rozpocet #socialne #realita #rizika | invented model |
| `carer` (nurse) | rozpocet #socialne | stand-in: panda girl shopkeeper |
| `elder` (granny / grandpa with a cane) | rozpocet #socialne | stand-in: the badger |
| `churchTower` | rozpocet #uvod #zaver | stand-in: the small mauve chapel |
| `deskLamp` | rozpocet #prehlad #rezervy #buducnost | invented model |
| `mountainBackdrop` | rozpocet #uvod #rizika #zaver | drawn in code |

### B — what the slides talk about, with nothing on stage yet

Read off the slide texts of `rozpocet-2025` (the demo decks have no gaps):

| Scene | The slide talks about | Missing objects |
| ----- | --------------------- | --------------- |
| uvod / zaver | Námestovo | the town's landmark church (tall white tower, green onion spire), Orava lake with a little island, a lakeside pier, the town hall |
| skolstvo | 3 kindergartens, 2 primary schools, art school (ZUŠ), school canteens | kindergarten with a playground, canteen counter with trays, art-school piano / music stand / easel |
| socialne | Centre of social services (seniors' home), evacuation lift, family support | seniors' home building, wheelchair, nurse, grandparents on a bench, family with a child |
| technicke | winter road maintenance, mowing parks, street lighting, cemeteries, collection yard | snow plough, ride-on lawn mower, bucket truck with a lamp-post worker, cemetery corner (gate, candles, cypress), collection-yard skips |
| sport-kultura | athletics track (World Athletics), club grants, cultural house, cinema tech, stage, amphitheatre, the "Maják" (lighthouse) play element | running track with lanes and hurdles, stadium stand, cultural house with a cinema marquee, small open-air stage, lighthouse climbing frame, film projector |
| investicie | roundabout + street rebuild, educational trail, cycle path and pier, canteen energy upgrade | road roller, asphalt paver, roundabout island with flowers, wooden trail sign, cyclist, pier with a rowing boat, solar panels on a roof |
| rezervy | reserve fund, debt brake, loans | a "safety net" (circus net), an umbrella, a big brake lever / handbrake, a calculator, a bank building |
| realita / rizika | consolidated accounts, shared taxes, demographic collapse | an apartment block, an ageing crowd vs. a few children, a cracked piggy bank, a downward arrow sign |
| odpady | waste savings, landfill vs. ZEVO | landfill heap with a bulldozer, sorted-waste containers (paper / glass / plastic) |
| buducnost | fragmentation of municipalities, Denmark / Poland / High Tatras | small village signs joined into one, a town-hall merger, flag pennants, a mountain-resort chalet |

## Style block (append to every prompt)

```
, flat faceted shapes, paper craft texture overlay, cozy storybook palette,
isolated on white, origami folded-paper construction, geometric triangulated
facets with soft watercolor paper grain, matte gouache shading, every object
split into a lit left half and a shaded right half, front-facing orthographic
view, big-headed cute proportions with round blush-pink cheeks and tiny dot
eyes, soft ambient occlusion shadow under each object, objects well apart on
pure white, no outlines, no gradients, no text, no background scenery,
color palette #a5817f #bd9662 #d6b386 #e9e2d1 #ebe7d7 #a4b1a2 #798877
#6d7a6c #7b6548 --style raw --ar 16:9 --sref <URL-of-the-closest-sheet>
--sw 400 --no photorealism, glossy, neon, dark shadows, cartoon outlines,
watermark
```

The nine hex values are the swatches printed on `shop.png` — the palette
the whole deck is built from. For `--sref` use the sheet closest to the new
pack (noted with each prompt). Keep each sheet to 8–12 objects so they come
out well apart (the cutter needs white between them).

## The prompts

Each prompt is `low poly 2D game asset collection, <subject>` + the style
block above.

### 1. Construction site — `--sref city 1.png` — ✅ done (`construction.png`)

```
low poly 2D game asset collection, construction site set: yellow tower crane
with a lattice mast and a hook, small yellow excavator with tracks and a
digging arm, road roller, asphalt paver, metal scaffolding with planks and a
ladder, orange-and-white traffic cones, striped road barrier, pile of bricks,
cement mixer, cute bear construction worker in a yellow hard hat and
hi-vis vest holding a hammer
```

### 2. School and kindergarten — `--sref visual.png` — ✅ done (`school.png`)

```
low poly 2D game asset collection, school set: small cream schoolhouse with a
bell gable and a clock, kindergarten building with a colorful slide,
green chalkboard on an easel with chalk sums, pupil's wooden desk with a bench,
school canteen counter with trays, upright piano, music stand, yellow school
bus in side view, cute bunny pupil with a backpack, cute bear pupil with a
backpack, cute fox teacher holding a book
```

### 3. Sport and culture — `--sref city 2.png` — ✅ done (`sport-culture.png`)

```
low poly 2D game asset collection, sport and culture set: running track
segment with white lanes and a hurdle, small stadium stand with benches,
football goal with a net, football, cultural house building with a cinema
marquee, small open-air amphitheatre stage with curtains, wooden lighthouse
climbing frame for kids, old film projector, cute panda runner in a jersey,
cute fox musician with a violin
```

### 4. Social services — `--sref visual.png` — ✅ done (`social.png`)

```
low poly 2D game asset collection, care and family set: one-storey seniors'
home with a ramp and flower boxes, wheelchair, walking cane, park bench with a
cute grandma and grandpa badger sitting together, cute bunny nurse in a white
apron, cute bear mother pushing a pram, cute little lamb child holding a
balloon, evacuation stair-lift chair
```

### 5. Town services and waste — `--sref city 1.png` — ✅ done (`town-service.png`)

```
low poly 2D game asset collection, town services set: garbage truck with a
bin lift, snow plough truck with a front blade, ride-on lawn mower, bucket
truck lifting a worker to a street lamp, three sorted recycling bins in sage,
ochre and mauve, big skip container, landfill heap with a small bulldozer,
waste-to-energy plant with a tall white chimney, cemetery corner with a little
gate, a cypress and two candles
```

### 6. Money and the town hall — `--sref office.png` — ✅ done (`money.png`)

```
low poly 2D game asset collection, town finance set: town hall building with a
clock tower and a flag, round steel vault door, pink piggy bank, stacks of
gold coins, money bag, open ledger book, desk calculator, circus safety net,
umbrella, big brake lever, cracked piggy bank, cute bear accountant with
round glasses
```

### 7. Námestovo and Orava — `--sref visual.png` — ✅ done (`namestovo.png`)

```
low poly 2D game asset collection, lakeside town set: tall white church with
a slim tower and a green onion spire, calm Orava lake with a small island and
a chapel, wooden pier with a rowing boat, cycle path sign, educational trail
signpost, roundabout island with flowers, four-storey apartment block with
balconies, mountain chalet, three village signposts tied together with a ribbon
```

## Single objects

To regenerate just one object (e.g. a better wolf pose, or one missing prop),
swap `low poly 2D game asset collection, <subject>` for
`single game asset, centered, <object>` and use `--ar 1:1`. For characters,
add `--oref <crop of the wolf from visual.png>` to keep the cast consistent.

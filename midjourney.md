# Midjourney prompts for WolfDeck assets

Recipe for generating new asset art in the exact style of the project's
reference sheet [`visual.png`](visual.png) — papercraft low-poly, cozy
storybook palette. Use it to concept new props/characters before modeling
them procedurally, or to produce reference sheets for whole new environment
packs (city, office, shop…).

---

## The base prompt

Replace `{SUBJECT}` with what you want generated (see examples below):

```
low poly 2D game asset collection, {SUBJECT}, flat faceted shapes, adorable
wolf and sheep characters, simple triangular trees, tiny village props,
paper craft texture overlay, cozy storybook palette, isolated on white,
style reference sheet, origami folded-paper construction, geometric
triangulated facets with soft watercolor paper grain, matte gouache shading,
front-facing orthographic view, big-headed cute proportions with round
blush-pink cheeks and tiny dot eyes, muted sage green and cream and dusty
rose and warm tan color scheme, soft ambient occlusion shadows under each
object, even spacing grid layout, no outlines, no gradients, no background
scenery --style raw --ar 16:9 --sref <URL-of-visual.png> --sw 400
--no photorealism, glossy, neon, dark shadows, cartoon outlines, text, watermark
```

Notes:

- Keep the original core phrase (`low poly 2D game asset collection … style
  reference sheet`) intact — it anchors the composition; `{SUBJECT}` narrows
  it to what you actually need.
- **`--sref <URL-of-visual.png>`** is the strongest lever: upload
  `visual.png` to Midjourney (or any public URL) and paste its URL there so
  the style is matched from the actual reference, not just from words.
  `--sw 400` weights the style reference firmly; raise toward `700` if
  results drift, lower toward `200` if everything looks like copies of the
  wolf sheet. On v7 you can additionally pass `--oref` with a crop of one
  character for identity consistency across sheets.
- If a single object (not a sheet) is wanted, swap `style reference sheet,
  even spacing grid layout` for `single game asset, centered`.

## Why each style phrase (matched to visual.png)

| Phrase | What it reproduces from the reference |
| ------ | ------------------------------------- |
| `origami folded-paper construction` | the wolf/sheep read as folded paper wedges, not smooth 3D |
| `geometric triangulated facets` | every surface split into visible flat triangles (trees, roofs, haystack bands) |
| `soft watercolor paper grain` | the subtle fibrous paper texture over every fill |
| `matte gouache shading` | flat tonal steps per facet, zero specular shine |
| `front-facing orthographic view` | all sheet items face the camera squarely, minimal perspective |
| `big-headed cute proportions, blush-pink cheeks, tiny dot eyes` | the wolf, sheep and lamb faces |
| `muted sage green / cream / dusty rose / warm tan` | the exact palette (see swatches below) |
| `soft ambient occlusion shadows` | the faint grounded shadow blob under every asset |
| `no outlines, no gradients` | shapes are separated by color/facet only, never by line work |

## Palette to name in prompts (from `src/assets/palette.js`)

sage green `#7d8b74` · light sage `#a3b096` · pine `#6a7d68` · cream
`#efe9dc` · parchment `#e3dac8` · dusty rose `#c9a1a6` · rose mauve
`#a98289` · cheek pink `#d9a8ad` · straw gold `#c8ab74` · warm tan
`#b39a77` · bark brown `#8a7359` · wolf gray `#9aa0a0` · slate `#8b9494`
· duck-egg blue `#a9c0b4` · water teal `#8fb0a5`

Midjourney accepts hex values in-prompt: e.g. append
`color palette #7d8b74 #efe9dc #c9a1a6 #b39a77 #9aa0a0`.

## `{SUBJECT}` examples

| Goal | `{SUBJECT}` |
| ---- | ----------- |
| City pack sheet | `city environment set: faceted office towers with punched square windows, little cars and bus, striped traffic light, streetlamp, park bench, potted street tree` |
| Office pack sheet | `office interior set: tiny desk with monitor, swivel chair, bookshelf, whiteboard on stand, potted plant, steaming coffee mug` |
| Shop pack sheet | `market set: small shop building with striped scalloped awning, market stall, wooden crates with vegetables, cash register, shopping cart` |
| New character | `cute low poly fox character, same construction as the wolf, sitting front-facing, gray-orange paper facets` |
| Character poses | `adorable gray wolf character turnaround: front view, side walking view, sitting view, same character all poses` |
| Single prop | `stone bridge over a small river, faceted stone blocks` (+ swap to `single game asset, centered`) |
| River & fish | `winding teal river band with jumping paper fish, splash shapes` |

## Workflow tips

1. Generate at `--ar 16:9` for sheets, `--ar 1:1` for single assets.
2. Ask for **one pack per run** — mixed packs drift off-palette.
3. Re-roll with the same prompt + `--seed` once a composition works; vary
   only `{SUBJECT}`.
4. Upscale, then cut assets out on the white background (the `isolated on
   white, soft ambient occlusion shadows` combo keeps edges clean).
5. Generated art is **concept reference** for WolfDeck: model the winning
   designs procedurally in `src/assets/` (see SPECIFICATION.md §“Extending
   the asset library”) so they stay seeded, animated and palette-exact.

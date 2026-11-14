# RawSources

The raw material WolfDeck and its shipped decks were made from. Nothing here
is loaded by the app — the build reads `src/` and `public/` only.

| Folder / file | What it is | Used by |
| --- | --- | --- |
| `sheets/*.png` | The illustrated reference sheets every sprite is cut from (and every 3D model recreates) | `npm run sprites` (`tools/extract-sprites.mjs`, cut list in `tools/sprites.config.js`) |
| `talks/CodeCon2026ZA.md` | Outline of the CodeCon 2026 talk | `public/codecon-2026.json`, written by `tools/decks/codecon-2026.mjs` |
| `talks/prezentacia-rozpocet-2025.html` | The original HTML presentation of the 2025 town budget | `public/rozpocet-2025.json` |
| `vlko.jpg` | Working copy of the presenter photo (git-ignored; the decks use `public/images/vlko.jpg`) | — |

New sheets are generated with the recipe in
[`docs/prompts/midjourney.md`](../docs/prompts/midjourney.md). Objects no sheet
has are drawn as SVG instead — those live in `tools/sprites-src/`.

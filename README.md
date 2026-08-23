# Portfolio Gallery

A dynamic, image-driven portfolio site. Every page in your Google Sheet becomes a tile in a masonry gallery grid, grouped by category, with full-bleed category divider sections between groups. No book, no page-turn — the design work is the whole interface.

## Architecture

```
js/data.js  — Sheets fetch/parse/validate + category/relation grouping logic
js/main.js  — renders header, category dividers, and the tile grid from that data
css/style.css — teal/bone/charcoal palette, Rubik + Roboto Mono
```

Both scripts are classic (non-module) — no build step, no bundler, no Three.js. Just static files.

## Sheet schema

| column | required | notes |
|---|---|---|
| `page_no` (or `page No.`) | yes | sort order |
| `category` | yes | top-level section — becomes a divider + groups its rows into one grid block, in first-appearance order |
| `source` (or `image`) | yes | filename in `/images`, or a full URL. `.mp4`/`.webm`/`.mov` render as autoplaying muted video tiles |
| `relation` | no | rows sharing the same value stay adjacent in the grid (e.g. multiple shots of one project). Leave blank for a standalone tile |
| `text` | no | optional caption, overlaid on the tile |
| `year` | no | shown in a small metadata tag on hover |
| `page_enable` | no | set to `no` to hide a row from the site. Blank or anything else = visible |

**Grouping logic**, concretely: rows are bucketed by `category` first (in the order categories first appear in the sheet). Within each category's bucket, any rows sharing a non-empty `relation` value are pulled together and rendered as consecutive tiles; rows with no `relation` render as standalone tiles, in `page_no` order.

This was built on an assumption worth flagging: related tiles currently render as plain adjacent grid tiles (with a thin bone-colored outline connecting them visually), not as a distinct grouped component like a mini-carousel. If you want tighter visual grouping later, this is a contained change in `main.js`'s `makeTile`/`render` functions.

## Visual system

- **Bone** `#E9E8E3` — light canvas
- **Teal** `#134455` — primary ink/accent
- **Charcoal** `#252829` — dark sections (category dividers alternate bone/charcoal for rhythm)
- **Rubik** — headers, category divider titles, brand mark
- **Roboto Mono** — captions, metadata, nav, everything utility

No shadows, no gradients beyond a single caption scrim — flat, editorial, image-led.

## Images

Drop files into `images/`, named exactly as referenced in `source`.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo → Settings → Pages → Deploy from branch → `main` / root.
3. Live at `https://<username>.github.io/<repo>/`.

**Local testing** (this fetches the sheet at runtime, so `file://` won't work due to CORS):

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Debugging

Console log trail prefixed `[Portfolio Gallery]` — fetch start, URL, HTTP status, raw response preview, parsed columns, which rows were valid/hidden/skipped and why. If the sheet import fails for any reason, a visible banner explains why and the site falls back to sample placeholder tiles so layout/behavior can still be checked.

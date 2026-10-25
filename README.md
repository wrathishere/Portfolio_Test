# Graphic Design Portfolio

A static, dependency-free portfolio (plain HTML, CSS and ES modules) driven by a Google Sheet. No build step, no backend, no API keys.

**Pages built:** Branding, Social Media Work (plus a placeholder Home).
**Ready for later:** Packaging & Misc, Motion, About.

## Structure

```
index.html            Home (placeholder)
branding.html         Branding (tabs: logo + branding)
social-media.html     Social Media Work (tab: social)
logo-designs.html     Redirect to branding.html (keeps old links working)
assets/css/           base.css (tokens, type) · components.css
assets/js/
  config.js           Sheet ID, tabs, image folders, nav, site name, footer/CTA copy
  shell.js            Header, footer, CTA band, skip link
  data/               sheetsClient.js (fetch CSV, snapshot fallback)
  domain/             normalizeRows → buildProjects → loadProjects · socialItems (format model)
  components/         siteNav, projectCard, projectDetail, imageTile, multiFilter, lightbox, masonry …
  pages/              brandingPage.js · socialPage.js (+ branding.js / socialMedia.js controllers)
  utils/              csv, paths (image URLs), imageFallback, text, dom
data/*.snapshot.csv   Offline fallback copies of sheet tabs
Images/               Logo Designs/ · Social Media/ · Misc/ · Motion/ · Packaging/
```

Data flow: `sheetsClient` (fetch) → `normalizeRows` (validate) → `buildProjects` (sort/ids) → page controller → components.

## Sheet format

One **row = one project** (Branding) or **one campaign** (Social). Columns are matched by header name, in any order; every column is optional except that a row needs at least one image filename.

| Tab | Columns |
| --- | --- |
| `logo`, `branding` | `Project Name · category · sub-category · year · text · order · Featured · thumbnail · image1 … image9` |
| `social` | `category · sub-category · year · text · order · Featured · client · image1 … image9` |

- **Sorting:** by `order` ascending (rows without a number go last). On Branding, the `logo` and `branding` tabs are merged; ties keep `logo` first.
- **Branding:** the gallery shows only each project's `thumbnail` (falls back to `image1`). Clicking opens the project view with the thumbnail followed by `image1…N` in column order. A file listed twice is shown once. Name = `Project Name`, else `sub-category`.
- **Social:** `category` is the **format**: `Portrait(4:5)`, `Square(1:1)` or `Story(9:16)` (case/spacing flexible; anything else lands in an "Other" section). `sub-category` is the **campaign**, `client` the client. Every `imageN` becomes its own grid cell.
- **Featured:** parsed as TRUE/yes/1 and stored for the future Home page.
- Rows without any image are skipped (console warning with the sheet row number). Missing text/year are simply not shown. If one tab fails to load, the others still render.

### Access (read-only, no credentials)

Share the sheet as **Anyone with the link → Viewer**. The site reads Google's public CSV export. Optionally paste a "Publish to web → CSV" URL into `SHEET.csvUrlOverrides` in `config.js`. Never add API keys to this repo.

### Offline snapshots

If Google can't be reached, a tab falls back to `data/<tab>.snapshot.csv` when it exists (`logo` and `social` are included; add `branding.snapshot.csv` the same way). Refresh with:

```bash
curl -L "https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=social" -o data/social.snapshot.csv
```

## Images (WebP only)

Filenames in the sheet are the exact `.webp` files; there is no separate original. For each category, `IMAGE_FOLDERS` in `config.js` lists where to look, in order:

1. `Images/<Category>/Thumbnail/` (where the repo keeps its WebP files today)
2. `Images/<Category>/`

The first folder that serves a file is remembered for that category, so the second is only tried if the first misses. Branding uses `Images/Logo Designs/`; Social uses `Images/Social Media/`. Folder and file names are case-sensitive on GitHub Pages; spaces and parentheses are fine.

All images are lazy-loaded (the gallery downloads covers only; a project's other images load in its view). A file that can't be found shows an "Image unavailable" tile naming it, plus a console warning.

## Social Media page

- Sections **Portrait 4:5 → Square 1:1 → Story 9:16**, each a symmetric three-column grid with cells fixed to that ratio (stays three columns on phones).
- Filters **Format / Client / Campaign** combine and cascade (options that would give no result are hidden). A filter with only one possible value is hidden.
- Clicking an image opens just that image in the lightbox, with campaign, client · year and description.

## Branding page

- Uniform card grid (cover ratio set by `--card-ratio` in `components.css`, default 4:3). Category tabs appear when the tabs hold two or more distinct `category` values.
- Project view: `branding.html#project/<id>` (shareable, works with the back button). `<id>` is the slugified project name.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000/branding.html
```

## Deploy to GitHub Pages

1. Push this folder to the repo root (`index.html` at the top level).
2. **Settings → Pages → Deploy from a branch → `main` / (root)**.
3. Visit `https://<user>.github.io/<repo>/branding.html`.

All links and image URLs are resolved from `assets/js/config.js`'s own location, so project-site subpaths (`/<repo>/`) and custom domains work unchanged.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| "The work couldn't be loaded" | Sheet not shared as "Anyone with the link", or tab renamed. See the console. |
| A tab's projects are missing | That tab failed (console says which); the other tab still shows. |
| "Image unavailable" tiles | Filename/case differs from the sheet, or the `.webp` isn't in the category folder. |
| Old data after editing the sheet | Google caches CSV for a few minutes; hard-refresh. |
| Blank page locally | Opened via `file://`; use the local server. |

## Customising

- Name, nav, header note, footer tagline, CTA band: `SITE` in `assets/js/config.js`.
- Colors, type, spacing: CSS variables at the top of `assets/css/base.css`.
- Hero image (optional): set `data-hero-image="file.webp"` on `#hero` in the page's HTML.

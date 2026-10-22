# Graphic Design Portfolio

A static, dependency-free portfolio site (plain HTML, CSS and ES modules) that reads its content from a Google Sheet. No build step, no backend, no API keys.

**Built so far:** Logo Designs page (plus a placeholder Home page).
**Ready for later:** Social Media Work, Packaging & Misc, Motion, About.

## Project structure

```
index.html                  Home (placeholder)
logo-designs.html           Logo Designs page
assets/
  css/base.css              Design tokens, reset, typography
  css/components.css        Nav, hero, projects, gallery, lightbox, states
  js/config.js              Sheet ID, tab names, image folders, navigation, site name
  js/shell.js               Mounts shared header + footer on every page
  js/data/sheetsClient.js   Fetches CSV from Google Sheets (with snapshot fallback)
  js/domain/                normalizeRows → groupProjects → loadProjects (pure logic)
  js/components/            siteNav, imageTile, masonry, projectSection, lightbox, states…
  js/pages/categoryPage.js  Reusable gallery-page controller
  js/pages/logoDesigns.js   Logo page = categoryPage configured for the "logo" tab
data/logo.snapshot.csv      Offline fallback copy of the sheet's logo tab
Images/
  Logo Designs/  Social Media/  Misc/  Motion/  Packaging/
```

Data flow: `sheetsClient` (fetch) → `normalizeRows` (validate/clean) → `groupProjects` (group + sort) → components (render). Each layer is independent.

## How the sheet is read

- Tab: `logo`. Columns: `image | category | sub-category | year | text | order | Featured`.
- Rows are grouped by `sub-category` (one group = one project).
- Projects are sorted by `order` (lowest value in the group). Projects without a valid `order` go last.
- Images inside a project keep the spreadsheet row order.
- Year and description come from the first row in the group that has them, so only the first row needs filling in.
- `Featured` is parsed as a Boolean (TRUE/yes/1) and stored for the future Home page.
- Rows without an `image` filename are skipped (a warning is logged in the browser console with the sheet row number). Missing descriptions or years are simply not shown.

### Sheet access (read-only, no credentials)

The site uses Google's public CSV export. The sheet must be shared as **Anyone with the link → Viewer** (it currently is). Alternatively, use **File → Share → Publish to web → CSV** for the `logo` tab and paste that URL into `SHEET.csvUrlOverrides.logo` in `assets/js/config.js`.

Never add an API key or service-account file to this repo.

### Fallback snapshot

If the live sheet can't be reached, the page falls back to `data/logo.snapshot.csv`. To refresh it after you edit the sheet:

```bash
curl -L "https://docs.google.com/spreadsheets/d/1EIJz_W2_cMMuK1-RlyINFOGgGybd0uHkx2ncyyX6mF0/gviz/tq?tqx=out:csv&sheet=logo" -o data/logo.snapshot.csv
```

Delete the file if you'd rather show an error than possibly-stale content. When the snapshot is used, `<html data-content-source="snapshot">` is set.

## Images

Place logo images in `Images/Logo Designs/`, using the **exact** filenames from the `image` column.

- GitHub Pages is case-sensitive: `Logo.JPG` and `logo.jpg` are different files.
- Spaces and parentheses (e.g. `kynn_logo (1).jpg`) work; the site encodes them automatically.
- Missing/mistyped files show an "Image unavailable" tile with the filename, plus a console warning.
- Optional hero image: set `data-hero-image="yourfile.jpg"` on `#hero` in `logo-designs.html`.

Note: `Images/*/.gitkeep` placeholder files are included so empty folders are committed. They can be removed once the folders contain images.

## Run locally

ES modules need HTTP (opening the file directly won't work):

```bash
python3 -m http.server 8000
# open http://localhost:8000/logo-designs.html
```

## Deploy to GitHub Pages

1. Create a GitHub repository and push the contents of this folder to the `main` branch (the `index.html` must be at the repo root).
2. In the repo go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then **Save**.
4. After a minute the site is live at `https://<username>.github.io/<repo>/` (project site) or `https://<username>.github.io/` if the repo is named `<username>.github.io`.
5. Open `/logo-designs.html` and confirm the projects and images load.

**Subpath support:** all HTML asset links are relative, and every JS-generated link and image URL is resolved from the location of `assets/js/config.js` (`import.meta.url`), so nothing assumes the domain root. No configuration is needed for `/<repo>/` deployments or custom domains.

For a custom domain: **Settings → Pages → Custom domain**, then add the DNS records GitHub lists.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| "The work couldn't be loaded" | Sheet isn't shared as "Anyone with the link", or the tab was renamed. Check the browser console. |
| Image tiles say "Image unavailable" | Filename in the sheet doesn't match the file exactly (case!), or the file isn't in `Images/Logo Designs/`. |
| Old content after editing the sheet | Google caches CSV exports for a few minutes; hard-refresh. |
| Blank page locally | Opened via `file://`; use the local server above. |

## Adding the next page (e.g. Social Media Work)

1. Copy `logo-designs.html` to `social-media.html` and edit the intro copy and title.
2. Create `assets/js/pages/social.js`:
   ```js
   import { mountCategoryPage } from './categoryPage.js';
   mountCategoryPage({ activeKey: 'social', tab: 'social', folderKey: 'social' });
   ```
   and point the new HTML page's script tag at it.
3. In `assets/js/config.js`, set `href: 'social-media.html'` on the matching `SITE.nav` item.
4. Add `data/social.snapshot.csv` if you want the offline fallback.
5. Pass `masonry: { minColWidth, maxCols }` to `mountCategoryPage` if a category needs a different column rhythm.

## Customising

- **Name/branding:** `SITE.name` in `assets/js/config.js` (currently "Portfolio").
- **Colors, type, spacing:** CSS variables at the top of `assets/css/base.css`.
- **Fonts:** Instrument Serif and Inter load from Google Fonts in each HTML `<head>`; remove those links to use the system fallbacks.

# Interactive Book Portfolio — Three.js Edition

A graphic design portfolio presented as a real physical book, rendered with **Three.js/WebGL** — actual 3D geometry, per-vertex paper curl deformation, matte lighting and shadow mapping. This replaces the earlier StPageFlip (canvas 2D) implementation.

## Architecture

```
js/data.js    — Google Sheets fetch/parse/validate (unchanged behavior from before)
js/book3d.js  — the 3D engine: scene, camera, lights, geometry, curl deformation, interaction, state machine
js/main.js    — orchestration: wires data → engine → nav UI (module entry point)
```

`data.js` is a classic script (sets `window.PortfolioData`). `book3d.js` and `main.js` are ES modules (`<script type="module">`), which is how `book3d.js` imports Three.js directly from a CDN with no build step.

## Sheet schema — unchanged

Only two columns matter: `page_no` and `source` (image filename in `/images`). The lowest `page_no` becomes the front cover, the highest becomes the back cover — both rendered as rigid covers automatically. Everything in between is an internal page. See the in-code comments in `data.js` for the full fetch/parse/logging behavior (identical to the previous implementation — untouched per your instructions).

## How the book works

**States:** `closed → opening → open → turning → closing`, all driven by `book3d.js`'s internal state machine. Nothing else can interact with the book mid-animation (nav buttons disable themselves during `opening`/`closing`/`turning`).

**Closed state:** front cover rendered as a rigid box mesh at a slight three-quarter angle, spine and back cover visible, soft ground-shadow via a real shadow-mapped light. Click anywhere on the closed book to open it.

**Opening:** front cover rotates rigidly around the spine hinge (it does not bend — only internal pages do), camera dollies to a reading position, page block (stacks + first spread) fades into place as the cover clears it.

**Page turning — the core interaction:** the active turning page is a subdivided plane (`SEG_X × SEG_Y` segments) whose vertices are displaced every frame by `applyCurl()` in `book3d.js`. This composes two things:
1. A rigid hinge rotation (`theta`, 0→π) around the spine — same as any page swinging open.
2. A local bend superimposed on top, peaking at `theta = π/2` (mid-turn) and vanishing at both rest positions — this is what produces actual paper curvature instead of a flat rotating rectangle.

The turning page has **two separate meshes sharing the same deformed geometry** — one `FrontSide` material, one `BackSide` material, each with its own texture and its own UV mapping (the back mesh's U coordinate is pre-flipped so its texture reads correctly, not mirrored, once the page lands). This is what correctly shows two different portfolio pages on the front/back of a single turning sheet.

**Interaction:** pointerdown in the lower-left or lower-right "corner zone" of the visible page starts a drag; horizontal drag distance maps directly to `theta`, so the curl visibly follows the cursor. Release past 50% of the sweep completes the turn (eased tween to the far side); short of that, it eases back. A plain click in a corner zone (no drag) plays the full programmatic turn. Keyboard arrows and the nav buttons trigger the same programmatic path — there's exactly one turning code path, not a separate "instant swap" for buttons.

**Mobile:** single visible page at a time (no left/right spread), same curl mechanics, camera reframed to center that single page. Forward and backward both operate correctly since the underlying page-index math treats mobile as always occupying the "right slot" for both the current and target page — this needed a specific fix versus the naive desktop left/right pairing, since mobile spreads never populate a left slot.

## Materials & lighting

Matte only, deliberately — `MeshStandardMaterial` with `roughness: 0.92, metalness: 0`, one soft ambient light + one key directional light (shadow-casting) + one dim fill light. No specular hot spots, no metallic look. This directly addresses the "chrome/silver" complaint from the StPageFlip version, which came from its canvas-drawn CSS-style gradient shadow, not from real lighting.

## Texture management

Textures are cached by URL (`textureCache` in `book3d.js`) so nothing loads twice. On load, the two covers plus the ±2 pages around the current position are fetched; every completed turn preloads the next couple of neighbors. Given the ~25-page scale this project is scoped to, no eviction/unloading is implemented — flagged in code as a place to revisit if the page count grows substantially.

## Tuning

All the "does this look right" constants live at the top of `js/book3d.js`:

```js
PAGE_W, PAGE_H       // page size (world units, A4 ratio)
MAX_CURL             // how tightly the page bends at peak curl
CURL_RADIUS          // roll tightness
DROOP                // vertical sag during the curl
FLIP_MS, OPEN_MS      // animation durations
DRAG_COMMIT_THRESHOLD // how far a drag must go before release completes it
```

**Important caveat:** this was built and syntax-checked but not visually rendered in the environment it was built in (no GPU/browser available there). The geometry math was hand-verified against known reference points (flat at rest, correct front/back visibility at each end of the sweep), but the *aesthetic* result — exactly how tight/soft the curl looks, camera framing, lighting balance — needs your eyes on the live page to confirm and tune. Treat the first run as a review pass, not a finished result.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo → Settings → Pages → Deploy from branch → `main` / root.
3. Live at `https://<username>.github.io/<repo>/`.

**Local testing:** run a local server (this fetches the sheet at runtime, so `file://` won't work due to CORS):

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Debugging

Same console log trail as before, prefixed `[Portfolio Book]` — fetch start, URL, HTTP status, raw response preview, parsed columns, valid/skipped rows. Additionally, `book3d.js` logs every state transition (`State → opening`, etc.) so you can see exactly where in the closed/opening/open/turning/closing cycle something goes wrong if it does.

# Interactive 3D Portfolio Book

A Vite, React, TypeScript, Three.js, React Three Fiber, drei, and GSAP portfolio site where the portfolio is a physical 3D book. The application starts closed, opens through a hinged cover, shows page stacks and a spine, and turns portfolio image pages with a deformable curled mesh driven by click, drag, touch, keyboard, and navigation controls.

## Installation

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Environment

Copy `.env.example` to `.env.local`:

```text
VITE_GOOGLE_SHEET_ID=
VITE_GOOGLE_SHEET_TAB=Portfolio
VITE_USE_DEMO_DATA=true
```

Set `VITE_USE_DEMO_DATA=false` in production so missing Sheet configuration becomes a visible error instead of local demo content.

## Google Sheets setup

Create a public Google Sheet with one row per physical portfolio page. Required columns:

| Column | Purpose |
| --- | --- |
| `id` | Unique page ID |
| `page_order` | Numeric sort order |
| `image_url` | Hosted image for this page |
| `page_type` | `cover`, `page`, or `back_cover` |
| `project` | Optional project label |
| `title` | Optional title/alt label |
| `enabled` | `TRUE` to publish; `FALSE` to hide |

Share the sheet as **Anyone with the link can view**. The Sheet ID is the long string in `/spreadsheets/d/<ID>/edit`. The tab name should match `VITE_GOOGLE_SHEET_TAB`. Add a page by adding a row with a unique order. Disable a page by setting `enabled` to `FALSE`. Pages are sorted by `page_order`; disabled or invalid rows are ignored with development warnings.

## Image recommendations

Use one finished image per portfolio page. Recommended page artwork is portrait 3:4, such as 1200×1600 or 1800×2400. Use WebP or AVIF for best quality/size; JPEG is fine for photographic work. Keep individual images near 300–700 KB when possible and host them with CORS-friendly public URLs.

## Architecture

```text
Google Sheets → Data Layer → Book Controller → Three.js Renderer
```

- `src/data/googleSheets.ts` fetches CSV output, validates rows, filters disabled content, and sorts page order.
- `src/data/portfolioData.ts` contains explicit demo data and maps ordered pages into physical sheets.
- `src/book/BookController.ts` is the central state machine for `CLOSED`, `OPENING`, `OPEN`, `TURNING_FORWARD`, `TURNING_BACKWARD`, and `CLOSING` behavior.
- `src/book/pageDeformation.ts` deforms the active page mesh from progress `0` to `1`, adding lift, curl, leading-edge travel, and flattening.
- `src/book/Book.tsx` renders separate covers, spine, page stacks, visible pages, active turning page, lighting, shadows, and camera transitions.

## Controls and fallback

Click/tap the closed book to open. Click or drag the right side to go forward and the left side to go backward. Arrow keys and the minimal external controls drive the same state machine. If WebGL is unavailable, the site renders an accessible image gallery in page order.

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

Copy `.env.example` to `.env.local`. The included defaults target the shared **Portfolio Main** sheet:

```text
VITE_GOOGLE_SHEET_ID=1EUhk_-_uWbQkyMQkdimEscjaun1v7lgWm5f5XDWYlo0
VITE_GOOGLE_SHEET_TAB=Portfolio Main
VITE_PORTFOLIO_IMAGE_BASE_URL=/portfolio/
VITE_USE_DEMO_DATA=false
```

`VITE_PORTFOLIO_IMAGE_BASE_URL` is used when the sheet `source` value is a filename such as `cover.jpg` instead of a full URL. With the default value, put those files in `public/portfolio/`.

## Google Sheets setup

The app supports the provided sheet format and the more explicit production schema. Each row still represents one physical book page and each page is rendered from one image/poster source.

### Provided sheet columns

| Column | Purpose |
| --- | --- |
| `page No.` | Numeric page order |
| `category` | Project/category label and fallback page title |
| `source` | Image URL, relative filename, or video filename |
| `year` | Optional year metadata |

Rows with an empty `source` are ignored, so pre-numbered blank rows do not break the book.

### Optional production columns

| Column | Purpose |
| --- | --- |
| `id` | Unique page ID; otherwise `page-{page No.}` is generated |
| `page_type` | Optional `cover`, `page`, or `back_cover`; otherwise the first row or cover-like filename becomes the cover |
| `enabled` | Optional publish flag; `FALSE`, `0`, `NO`, or `disabled` hides the row |
| `image_url` | Alias for `source` |
| `page_order` | Alias for `page No.` |
| `project` / `title` | Optional richer labels |

Share the sheet as **Anyone with the link can view**. The Sheet ID is the long string in `/spreadsheets/d/<ID>/edit`. The tab name should match `VITE_GOOGLE_SHEET_TAB`. Add a page by adding a row with a unique page number. Disable a page by setting `enabled` to `FALSE`. Pages are sorted numerically by page number/order; disabled or invalid rows are ignored with development warnings.

## Image recommendations

Use one finished image per portfolio page. Recommended page artwork is portrait 3:4, such as 1200×1600 or 1800×2400. Use WebP or AVIF for best quality/size; JPEG and PNG are also supported. Keep individual images near 300–700 KB when possible and host them with CORS-friendly public URLs.

If your sheet uses local filenames (`cover.jpg`, `test.jpg`), put those files in `public/portfolio/` or set `VITE_PORTFOLIO_IMAGE_BASE_URL` to the public folder/CDN where they live. Video filenames such as `test.mp4` are accepted and represented by generated matte poster pages in the WebGL book; provide a matching poster image when final artwork should appear in the book.

## Architecture

```text
Google Sheets → Data Layer → Book Controller → Three.js Renderer
```

- `src/data/googleSheets.ts` fetches CSV output, validates flexible required columns, filters disabled/blank content, resolves filenames, and sorts page order.
- `src/data/portfolioData.ts` contains explicit demo data and maps ordered pages into physical sheets.
- `src/book/BookController.ts` is the central state machine for `CLOSED`, `OPENING`, `OPEN`, `TURNING_FORWARD`, `TURNING_BACKWARD`, and `CLOSING` behavior.
- `src/book/pageDeformation.ts` deforms the active page mesh from progress `0` to `1`, adding lift, curl, leading-edge travel, and flattening.
- `src/book/Book.tsx` renders separate rigid covers, spine, page stacks, visible pages, two-sided active turning page, lighting, shadows, and camera transitions.

## Controls and fallback

Click/tap the closed book to open. Click or drag the right side to go forward and the left side to go backward. Arrow keys and the minimal external controls drive the same state machine. If WebGL is unavailable, the site renders an accessible image gallery in page order.

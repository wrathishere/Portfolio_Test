/**
 * Portfolio site: the one script every page loads (<script type="module" src="assets/js/main.js">).
 * Each page's <body data-page="..."> picks which section below runs; see BOOT at the bottom.
 *
 *   1. CONFIG        sheet ID, tabs, image folders, navigation, site name, PDF viewer library
 *   2. UTILITIES     DOM helper, text, CSV parser, image/PDF URLs, image loader
 *   3. DATA          Google Sheets fetch -> normalise rows -> projects (and social items)
 *   4. SHARED UI     header, footer, call-to-action, states, tiles, filters, lightbox, PDF modal
 *   5. PAGES         HOME, BRANDING, SOCIAL MEDIA
 *   6. BOOT
 */

/* ==========================================================================
   1. CONFIG
   ========================================================================== */

/**
 * Site-wide configuration. This is the only file you should need to edit for
 * content-source changes (sheet, folders, navigation, site name).
 *
 * Nothing here is secret: the sheet ID is only usable to READ a sheet that you
 * have already shared as "Anyone with the link → Viewer". No API keys or
 * credentials are used anywhere in this project.
 */

/**
 * Absolute URL of the site root, derived from where this file is served from.
 * Because it is computed from `import.meta.url`, every link and image path
 * works from a GitHub Pages subpath (https://user.github.io/repo/) as well as
 * from a custom domain or `localhost`.
 */
const ROOT = new URL('../../', import.meta.url);

const SITE = {
  // TODO: replace with your name / studio name (shown on mobile and for screen readers).
  name: 'Portfolio',

  /**
   * Primary navigation. `href: null` renders a non-interactive "coming soon"
   * placeholder. When you build a page, give it an `href` and it becomes a link.
   */
  nav: [
    { key: 'home', label: 'Home', href: 'index.html' },
    { key: 'branding', label: 'Branding', href: 'branding.html' },
    { key: 'social', label: 'Social Media Work', href: 'social-media.html' },
    { key: 'packaging', label: 'Packaging And Misc', href: null },
    { key: 'about', label: 'About', href: null },
  ],

  /**
   * Closing call-to-action band (used on pages that include <div id="site-cta">).
   * - `href`: where the band links. `null` = a non-clickable band (set this once
   *   your About/Contact page or a mailto: link exists).
   * - `image`: optional path relative to the site root, e.g. 'Images/cta.jpg'.
   */
  cta: {
    eyebrow: 'Have a project in mind?',
    text: 'Let’s create something meaningful together.',
    href: null,
    image: null,
  },
};

const SHEET = {
  id: '1EIJz_W2_cMMuK1-RlyINFOGgGybd0uHkx2ncyyX6mF0',

  /** Tab names exactly as they appear in the spreadsheet. */
  tabs: {
    logo: 'logo',
    branding: 'branding',
    social: 'social',
    misc: 'misc',
    motion: 'motion',
    packaging: 'packaging',
  },

  /**
   * Optional: per-tab "Publish to web → CSV" URLs. If set, they take priority
   * over the default Google Visualization endpoint. Leave empty to use the
   * default (works with "Anyone with the link → Viewer").
   */
  csvUrlOverrides: {
    // logo: 'https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv',
  },

  timeoutMs: 12000,
};

/**
 * Where each category's WebP files live, relative to the site root. Images are
 * WebP-only: the sheet names the exact .webp file and there is no separate
 * original. Each category lists folders in the order to try them; the first
 * one that serves a file is remembered for the rest of the page, so a wrong
 * guess costs at most one failed request. Folder names are case-sensitive on
 * GitHub Pages.
 *
 * The repo currently keeps its WebP files in "<category>/Thumbnail/", so that
 * is tried first; "<category>/" is the fallback if you move them up a level.
 * The Branding page shows both the `logo` and `branding` tabs, whose images
 * share the Logo Designs folder.
 */
const withThumbs = (folder) => [`${folder}Thumbnail/`, folder];

/**
 * PDF viewer library, loaded on demand the first time a PDF modal is opened
 * (nothing is downloaded for visitors who never open one). Pinned version.
 * To self-host instead, copy pdf.min.js and pdf.worker.min.js from the
 * "pdfjs-dist@3.11.174" package into assets/vendor/ and point these at them.
 */
const PDFJS = {
  lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
};

const IMAGE_FOLDERS = {
  logo: withThumbs('Images/Logo Designs/'),
  branding: withThumbs('Images/Logo Designs/'),
  social: withThumbs('Images/Social Media/'),
  misc: withThumbs('Images/Misc/'),
  motion: withThumbs('Images/Motion/'),
  packaging: withThumbs('Images/Packaging/'),
};

/* ==========================================================================
   2. UTILITIES
   ========================================================================== */

/**
 * Tiny element factory. Children that are strings are inserted as text nodes
 * (never HTML), so content coming from the spreadsheet can't inject markup.
 */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else el.setAttribute(key, value === true ? '' : value);
  }

  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return el;
}

function slugify(value) {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'project';
}

/**
 * Sheet cells often contain hard-wrapped lines. A blank line separates
 * paragraphs; a single line break is treated as a space.
 */
function splitParagraphs(text) {
  return String(text ?? '')
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}


/**
 * Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, embedded
 * newlines, CRLF, BOM). Descriptions in the sheet contain line breaks, so a
 * naive split(',') / split('\n') would corrupt them.
 */
function parseCSV(input) {
  let text = String(input ?? '');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "Sub-Category", "sub_category", "subcategory " → "subcategory" */
function normalizeHeader(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[\s_\-]+/g, '')
    .trim();
}

/**
 * Parses CSV text into `{ headers, records }`. Each record is keyed by the
 * normalized header and carries `__row`, its 1-based row number in the sheet
 * (header = row 1), which is handy for diagnostics. Fully blank rows are dropped.
 */
function readTable(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { headers: [], records: [] };

  const headers = rows[0].map(normalizeHeader);
  const records = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.every((cell) => String(cell).trim() === '')) continue;
    const rec = { __row: r + 1 };
    headers.forEach((key, i) => {
      if (key) rec[key] = cells[i] ?? '';
    });
    records.push(rec);
  }
  return { headers, records };
}

/** Absolute URL for a path relative to the site root (subpath-safe). */
function siteUrl(path) {
  return new URL(path, ROOT).href;
}

/**
 * Percent-encodes each path segment of a sheet filename. Leading slashes and
 * "." / ".." segments are dropped so a sheet cell can never point outside the
 * intended folder. Case is preserved (GitHub Pages is case-sensitive).
 */
function encodeFilename(filename) {
  return String(filename ?? '')
    .trim()
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .map(encodeURIComponent)
    .join('/');
}

function folderBases(folderKey) {
  const folders = IMAGE_FOLDERS[folderKey];
  if (!folders) throw new Error(`Unknown image folder key: "${folderKey}"`);
  return [].concat(folders).map((path) => new URL(path, ROOT)); // spaces in folder names are encoded
}

// folderKey -> index of the folder that last served an image successfully.
const preferred = new Map();

/**
 * Candidate URLs for a WebP file named in the sheet, best guess first (the
 * folder that already worked for this category, then the others in config order).
 * Returns [] for a blank filename.
 */
function imageSources(folderKey, filename) {
  const name = encodeFilename(filename);
  if (!name) return [];
  const bases = folderBases(folderKey);
  const first = preferred.get(folderKey) ?? 0;
  const order = bases.map((_, i) => i).sort((a, b) => (a === first ? -1 : b === first ? 1 : a - b));
  return order.map((i) => new URL(name, bases[i]).href);
}

/**
 * URL of a non-image file such as a PDF. PDFs live in the category folder itself
 * (the last entry of IMAGE_FOLDERS, e.g. "Images/Logo Designs/Aaksha.pdf"),
 * not in its Thumbnail/ subfolder. Returns '' for a blank filename.
 */
function fileUrl(folderKey, filename) {
  const name = encodeFilename(filename);
  if (!name) return '';
  const bases = folderBases(folderKey);
  return new URL(name, bases[bases.length - 1]).href;
}

/** Remember which folder served `url`, so later images try it first. */
function rememberFolder(folderKey, url) {
  const bases = folderBases(folderKey);
  let best = -1;
  bases.forEach((base, i) => {
    if (url.startsWith(base.href) && (best === -1 || base.href.length > bases[best].href.length)) best = i;
  });
  if (best !== -1) preferred.set(folderKey, best);
}

/**
 * Loads a sheet-named WebP into an <img>, trying each candidate folder in turn
 * (see IMAGE_FOLDERS) until one works. Listeners are attached once, so the same
 * <img> can be reused for many files (the lightbox does this).
 *
 * @param {HTMLImageElement} img
 * @param {object} [o]
 * @param {string} [o.folderKey]  default folder key (can be overridden per load)
 * @param {(url: string) => void} [o.onLoad]
 * @param {(url: string) => void} [o.onFallback]  a candidate failed; trying the next
 * @param {(urls: string[]) => void} [o.onFail]   every candidate failed (or no filename)
 */
function createImageLoader(img, { folderKey: defaultKey, onLoad, onFallback, onFail } = {}) {
  let key = defaultKey;
  let sources = [];
  let i = 0;

  img.addEventListener('load', () => {
    rememberFolder(key, sources[i]);
    onLoad?.(sources[i]);
  });
  img.addEventListener('error', () => {
    if (i + 1 < sources.length) {
      i += 1;
      onFallback?.(sources[i]);
      img.src = sources[i];
    } else {
      onFail?.(sources);
    }
  });

  return {
    load(file, folderKey = defaultKey) {
      key = folderKey;
      sources = imageSources(key, file);
      i = 0;
      if (!sources.length) {
        onFail?.(sources);
        return;
      }
      img.src = sources[0];
    },
  };
}

/* ==========================================================================
   3. DATA
   ========================================================================== */

/**
 * Data fetching only. Knows how to get CSV text for a sheet tab; knows nothing
 * about projects or the DOM.
 *
 * Read-only, credential-free: uses Google's public CSV export of a sheet that
 * is shared as "Anyone with the link → Viewer" (or published to the web).
 */
const looksLikeHTML = (text) => /^\s*<(!doctype|html)/i.test(text);

function liveCsvUrl(tab) {
  const override = SHEET.csvUrlOverrides?.[tab];
  if (override) return override;
  const sheetName = SHEET.tabs[tab] ?? tab;
  return (
    `https://docs.google.com/spreadsheets/d/${SHEET.id}/gviz/tq` +
    `?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
  );
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // A private sheet answers with an HTML sign-in page instead of CSV.
    if (looksLikeHTML(text)) throw new Error('Received a web page instead of CSV (is the sheet shared?)');
    return text;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** @returns {Promise<string>} CSV text of one tab */
async function loadTabCSV(tab) {
  try {
    return await fetchText(liveCsvUrl(tab), SHEET.timeoutMs);
  } catch (err) {
    throw new Error(`Could not load the "${tab}" sheet: ${err.message}.`);
  }
}

/**
 * Turns a parsed sheet tab into clean, typed project rows and reports the ones
 * that can't be used. Pure functions — no DOM, no network.
 *
 * One ROW = one PROJECT (logo / branding) or one CAMPAIGN (social). Columns,
 * matched by header name (case/space-insensitive, any order):
 *
 *   Project Name | category | sub-category | year | text | order | Featured |
 *   client | thumbnail | image1 … imageN | pdf
 *
 * Every column is optional except that a row needs at least one image filename.
 * `thumbnail` is the project's cover; image1…N are its other images.
 * A project's PDF may be named in a `pdf` column OR in any of thumbnail /
 * image1…N (anything ending in ".pdf" is treated as the PDF, never as an image).
 */
class SheetSchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SheetSchemaError';
  }
}

const IMAGE_COLUMN = /^image(\d+)$/;
const PDF_FILE = /\.pdf$/i;
const TRUTHY = /^(true|yes|y|1|✓|✔|x)$/i;

const clean = (v) => String(v ?? '').trim();

function parseOrder(value) {
  const n = Number.parseFloat(clean(value));
  return Number.isFinite(n) ? n : null;
}

/** "2025", "2025.0" (number-formatted cell) → "2025" */
const parseYear = (value) => clean(value).replace(/\.0+$/, '');

/**
 * @param {{ headers: string[], records: object[] }} table  from utils/csv.js readTable()
 * @param {{ tab?: string }} [options]
 * @returns {{ rows: ProjectRow[], invalid: { row: number, reason: string }[] }}
 */
function normalizeProjectRows(table, { tab = '' } = {}) {
  const imageColumns = table.headers
    .map((name) => ({ name, n: Number(IMAGE_COLUMN.exec(name)?.[1]) }))
    .filter((c) => c.n)
    .sort((a, b) => a.n - b.n)
    .map((c) => c.name);

  if (!imageColumns.length && !table.headers.includes('thumbnail') && !table.headers.includes('pdf')) {
    // gviz silently returns the FIRST tab when a tab name doesn't exist, which
    // can also surface here as unexpected columns.
    throw new SheetSchemaError(
      `The "${tab}" sheet has no image columns. Expected a header row such as ` +
        `Project Name | category | sub-category | year | text | order | Featured | thumbnail | image1 | image2 …`,
    );
  }

  const rows = [];
  const invalid = [];

  table.records.forEach((rec, position) => {
    const cells = [clean(rec.thumbnail), ...imageColumns.map((col) => clean(rec[col]))].filter(Boolean);
    const pdf = [clean(rec.pdf), ...cells].find((value) => PDF_FILE.test(value)) ?? '';
    const files = cells.filter((value) => !PDF_FILE.test(value));
    const thumbnail = PDF_FILE.test(clean(rec.thumbnail)) ? '' : clean(rec.thumbnail);
    // Cover first, then image1…N; a file named twice is shown once.
    const images = [...new Set([thumbnail, ...files].filter(Boolean))];

    if (!images.length) {
      invalid.push({ row: rec.__row, reason: 'no image filenames' });
      return;
    }

    const subcategory = clean(rec.subcategory);
    rows.push({
      sheetRow: rec.__row,
      position,
      tab,
      name: clean(rec.projectname) || subcategory || 'Untitled project',
      subcategory,
      category: clean(rec.category),
      client: clean(rec.client),
      year: parseYear(rec.year),
      text: clean(rec.text),
      order: parseOrder(rec.order),
      featured: TRUTHY.test(clean(rec.featured)),
      cover: thumbnail || images[0],
      images,
      pdf,
    });
  });

  return { rows, invalid };
}

/**
 * @typedef {object} ProjectRow
 * @property {number} sheetRow   1-based row in the sheet (header = row 1)
 * @property {number} position   index among the tab's data rows
 * @property {string} tab
 * @property {string} name       Project Name, else sub-category
 * @property {string} subcategory
 * @property {string} category
 * @property {string} client
 * @property {string} year
 * @property {string} text
 * @property {number|null} order
 * @property {boolean} featured  eligible for the Home page later
 * @property {string} cover      thumbnail filename (falls back to the first image)
 * @property {string[]} images   every image filename, cover first, in sheet order
 * @property {string} pdf        PDF filename, or '' when the row has none
 */

/**
 * Turns project rows (from one or several tabs) into the final project list.
 * Pure function — reused by every category page.
 *
 * Rules
 *  - Sorted by `order` ascending; rows without a valid order go last. Ties keep
 *    tab order (as passed in), then sheet row order.
 *  - A project listed twice (same name and cover, e.g. a tab that doesn't exist
 *    makes Google return the first tab again) is kept once.
 *  - Ids are stable, URL-safe slugs of the name, made unique with -2, -3 …
 */

/**
 * Project type comes from the `category` field: "Branding" / "Brand Identity"
 * are branding projects; anything else (e.g. "Logo Design") is a logo project.
 * A category naming both ("Logo & Branding") counts as logo, so existing
 * image-based projects never change behaviour.
 */
const isBrandingCategory = (category) => /brand/i.test(category) && !/logo/i.test(category);

/**
 * @param {import('./normalizeRows.js').ProjectRow[]} rows  in tab order
 * @returns {Project[]}
 */
function buildProjects(rows) {
  const seen = new Set();
  const unique = [];
  rows.forEach((row, rank) => {
    const key = `${row.name.toLowerCase()}|${row.cover}`;
    if (seen.has(key)) {
      console.warn(`[sheet] Skipped duplicate project "${row.name}" (tab "${row.tab}", row ${row.sheetRow}).`);
      return;
    }
    seen.add(key);
    unique.push({ row, rank });
  });

  unique.sort((a, b) => {
    const ao = a.row.order ?? Number.POSITIVE_INFINITY;
    const bo = b.row.order ?? Number.POSITIVE_INFINITY;
    return ao - bo || a.rank - b.rank;
  });

  const used = new Set();
  return unique.map(({ row }) => {
    const base = slugify(row.name);
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);

    return {
      id,
      name: row.name,
      subcategory: row.subcategory,
      category: row.category,
      client: row.client,
      year: row.year,
      description: row.text,
      paragraphs: splitParagraphs(row.text),
      order: row.order,
      featured: row.featured,
      tab: row.tab,
      cover: row.cover,
      images: row.images,
      pdf: row.pdf,
      type: isBrandingCategory(row.category) ? 'branding' : 'logo',
      // Branding projects that have a PDF open it in a modal; everything else
      // (logo projects, or branding without a PDF) keeps the image detail view.
      viewer: isBrandingCategory(row.category) && row.pdf ? 'pdf' : 'images',
    };
  });
}

/**
 * @typedef {object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} subcategory
 * @property {string} category
 * @property {string} client
 * @property {string} year
 * @property {string} description
 * @property {string[]} paragraphs
 * @property {number|null} order
 * @property {boolean} featured
 * @property {string} tab
 * @property {string} cover
 * @property {string[]} images
 * @property {string} pdf
 * @property {'branding'|'logo'} type    from `category`
 * @property {'pdf'|'images'} viewer     how the project opens from the gallery
 */

/**
 * Composes fetch → parse → normalize → build for one or more sheet tabs.
 * Presentation code only ever calls this.
 *
 * Tabs load independently: if one fails (renamed tab, sharing changed) the
 * others are still shown and the failure is reported in `failed`. It only
 * throws when NO tab could be loaded.
 *
 * @param {string[]} tabs  keys from SHEET.tabs, e.g. ['logo', 'branding']
 * @returns {Promise<{ projects: import('./buildProjects.js').Project[],
 *                     invalid: { tab: string, row: number, reason: string }[],
 *                     failed: { tab: string, message: string }[] }>}
 */
async function loadProjects(tabs) {
  const results = await Promise.allSettled(
    tabs.map(async (tab) => {
      const text = await loadTabCSV(tab);
      return { tab, ...normalizeProjectRows(readTable(text), { tab }) };
    }),
  );

  const rows = [];
  const invalid = [];
  const failed = [];

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      failed.push({ tab: tabs[i], message: result.reason?.message ?? String(result.reason) });
      return;
    }
    rows.push(...result.value.rows);
    invalid.push(...result.value.invalid.map((x) => ({ ...x, tab: result.value.tab })));
  });

  if (failed.length === tabs.length) throw new Error(failed.map((f) => f.message).join(' '));
  return { projects: buildProjects(rows), invalid, failed };
}

/**
 * Social Media model. Each `social` row is a campaign; its image1…N become
 * individual gallery items, grouped by FORMAT (taken from the row's `category`,
 * e.g. "Portrait(4:5)"). Pure functions.
 */

const FORMATS = [
  { key: 'portrait', label: 'Portrait', ratio: '4:5', css: '4 / 5', match: /portrait|4\s*:\s*5/i },
  { key: 'square', label: 'Square', ratio: '1:1', css: '1 / 1', match: /square|1\s*:\s*1/i },
  { key: 'story', label: 'Story', ratio: '9:16', css: '9 / 16', match: /stor(y|ies)|9\s*:\s*16/i },
];
const OTHER_FORMAT = { key: 'other', label: 'Other', ratio: '', css: '1 / 1' };

function formatOf(category) {
  return FORMATS.find((f) => f.match.test(String(category ?? ''))) ?? OTHER_FORMAT;
}

/**
 * @param {import('./buildProjects.js').Project[]} projects  campaigns, already sorted by `order`
 * @returns {SocialItem[]}  campaign order, then image order within each campaign
 */
function buildSocialItems(projects) {
  const items = [];
  for (const project of projects) {
    const format = formatOf(project.category);
    if (format === OTHER_FORMAT) {
      console.warn(`[social] "${project.name}": unrecognised format "${project.category}" (expected Portrait, Square or Story).`);
    }
    project.images.forEach((file, i) => {
      items.push({
        id: `${project.id}-${i + 1}`,
        file,
        format,
        client: project.client,
        campaign: project.subcategory || project.name,
        year: project.year,
        paragraphs: project.paragraphs,
        featured: project.featured,
        index: i,
        total: project.images.length,
      });
    });
  }
  return items;
}

/**
 * @typedef {object} SocialItem
 * @property {string} id
 * @property {string} file
 * @property {typeof FORMATS[number] | typeof OTHER_FORMAT} format
 * @property {string} client
 * @property {string} campaign
 * @property {string} year
 * @property {string[]} paragraphs
 * @property {boolean} featured
 * @property {number} index
 * @property {number} total
 */

/* ==========================================================================
   4. SHARED UI
   ========================================================================== */

/**
 * Shared header + primary navigation, rendered from SITE.nav.
 * - `activeKey` gets aria-current="page".
 * - Items without an href render as inert "coming soon" placeholders.
 * - Desktop: centered nav.
 */
function createSiteNav({ activeKey }) {
  const items = SITE.nav.map((item) => {
    const isActive = item.key === activeKey;

    if (!item.href) {
      return h(
        'li',
        {},
        h('a', { class: 'nav__link is-soon', role: 'link', 'aria-disabled': 'true', title: 'Coming soon' }, item.label),
      );
    }
    return h(
      'li',
      {},
      h('a', { class: 'nav__link', href: siteUrl(item.href), 'aria-current': isActive ? 'page' : false }, item.label),
    );
  });

  const nav = h('nav', { class: 'nav', id: 'primary-nav', 'aria-label': 'Primary' }, h('ul', { class: 'nav__list' }, items));

  const toggle = h(
    'button',
    { class: 'nav-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'primary-nav' },
    h('span', { class: 'nav-toggle__label' }, 'Menu'),
    h('span', { class: 'nav-toggle__icon', 'aria-hidden': 'true' }),
  );

  const header = h(
    'header',
    { class: 'site-header' },
    h(
      'div',
      { class: 'container site-header__inner' },
      h('a', { class: 'brand', href: siteUrl('index.html') }, SITE.name),
      toggle,
      nav,
    ),
  );

  // Mobile menu
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.nav-toggle__label').textContent = open ? 'Close' : 'Menu';
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => e.target.closest('a[href]') && setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  // Hairline appears once the page is scrolled.
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return header;
}

function createSiteFooter() {
  return h(
    'footer',
    { class: 'site-footer' },
    h(
      'div',
      { class: 'container' },
      h(
        'div',
        { class: 'site-footer__inner' },
        h('p', {}, `© ${new Date().getFullYear()} ${SITE.name}`),
        h(
          'a',
          {
            class: 'site-footer__top',
            href: '#top',
            onclick: (e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          },
          'Back to top ↑',
        ),
      ),
    ),
  );
}

/**
 * Closing call-to-action band ("Let's create something meaningful together").
 * Configured in SITE.cta. With no `href` it renders as a plain, non-clickable
 * band, so there is never a dead link.
 */
function createSiteCta() {
  const cta = SITE.cta;
  if (!cta) return null;

  const content = [
    cta.image
      ? h('div', { class: 'cta__media' }, h('img', { src: siteUrl(cta.image), alt: '', loading: 'lazy', decoding: 'async' }))
      : h('div', { class: 'cta__media cta__media--plain', 'aria-hidden': 'true' }),
    h(
      'div',
      { class: 'cta__body' },
      h('p', { class: 'eyebrow' }, cta.eyebrow),
      h('p', { class: 'cta__text' }, cta.text),
      cta.href ? h('span', { class: 'cta__arrow', 'aria-hidden': 'true' }, '→') : null,
    ),
  ];

  return cta.href
    ? h('a', { class: 'cta container', href: cta.href }, content)
    : h('div', { class: 'cta container' }, content);
}

/**
 * Mounts the shared chrome (header/nav + footer) into every page.
 * Each page needs <div id="site-header"> and <div id="site-footer"> placeholders;
 * an optional <div id="site-cta"> adds the closing call-to-action band.
 */
function mountShell({ activeKey }) {
  // The skip link moves focus to <main> WITHOUT changing the URL hash: pages route on
  // the hash (e.g. #project/<id>), so a "#main" fragment would break reloads and deep links.
  document.querySelector('.skip-link')?.addEventListener('click', (e) => {
    const main = document.getElementById('main');
    if (!main) return;
    e.preventDefault();
    main.setAttribute('tabindex', '-1');
    main.focus();
    main.scrollIntoView();
  });

  document.getElementById('site-header')?.replaceWith(createSiteNav({ activeKey }));
  document.getElementById('site-footer')?.replaceWith(createSiteFooter());

  const ctaSlot = document.getElementById('site-cta');
  if (ctaSlot) {
    const cta = createSiteCta();
    if (cta) ctaSlot.replaceWith(cta);
    else ctaSlot.remove();
  }
}

/** Loading skeleton: two project-shaped placeholders. */
function renderLoading(container) {
  const skeleton = () =>
    h(
      'div',
      { class: 'project project--skeleton', 'aria-hidden': 'true' },
      h(
        'div',
        { class: 'project__meta' },
        h('span', { class: 'sk sk--title' }),
        h('span', { class: 'sk sk--line' }),
        h('span', { class: 'sk sk--line sk--short' }),
      ),
      h(
        'div',
        { class: 'project__gallery' },
        h('span', { class: 'sk sk--lead' }),
        h('div', { class: 'sk-row' }, h('span', { class: 'sk sk--tile' }), h('span', { class: 'sk sk--tile' })),
      ),
    );

  container.setAttribute('aria-busy', 'true');
  container.replaceChildren(
    h('p', { class: 'visually-hidden', role: 'status' }, 'Loading projects…'),
    skeleton(),
    skeleton(),
  );
}

function renderError(container, { message, onRetry }) {
  container.setAttribute('aria-busy', 'false');
  container.replaceChildren(
    h(
      'div',
      { class: 'state', role: 'alert' },
      h('h2', { class: 'state__title' }, 'The work couldn’t be loaded'),
      h('p', { class: 'state__text' }, message),
      h('button', { class: 'button', type: 'button', onclick: onRetry }, 'Try again'),
    ),
  );
}

function renderEmpty(container, { title, text }) {
  container.setAttribute('aria-busy', 'false');
  container.replaceChildren(
    h('div', { class: 'state' }, h('h2', { class: 'state__title' }, title), h('p', { class: 'state__text' }, text)),
  );
}

/**
 * Subtle fade-up on scroll. Elements only get hidden if IntersectionObserver
 * exists, so nothing can ever be stuck invisible. CSS disables the motion for
 * users who prefer reduced motion.
 */
function observeReveal(elements) {
  const list = [...elements];
  if (!('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.04, rootMargin: '0px 0px -6% 0px' },
  );

  for (const el of list) {
    el.classList.add('reveal');
    io.observe(el);
  }
}

/**
 * Optional hero image: <section id="hero" data-hero-image="filename.webp">.
 * Resolved against the page's category folder; skipped silently if missing.
 */
function mountHeroImage(hero, folderKey) {
  const file = hero?.dataset.heroImage?.trim();
  if (!file) return;

  const img = h('img', { class: 'hero__img', alt: '', decoding: 'async' });
  const figure = h('figure', { class: 'hero__media', 'aria-hidden': 'true' }, img);
  createImageLoader(img, {
    folderKey,
    onFail: () => {
      figure.remove();
      hero.classList.remove('has-media');
      console.warn(`[hero] Hero image "${file}" could not be loaded; skipping it.`);
    },
  }).load(file);

  hero.classList.add('has-media');
  hero.prepend(figure);
}

/**
 * A single gallery image (WebP, named in the sheet). Lazy-loaded, fades in once
 * loaded, and degrades to a quiet "Image unavailable" tile naming the file if
 * no candidate folder serves it (see IMAGE_FOLDERS), so problems are easy to spot.
 *
 * Natural aspect ratio by default (never cropped or stretched). Pass `ratio`
 * (a CSS aspect-ratio such as "4 / 5") for a fixed-shape cell in a symmetric
 * grid; the image then fills the cell.
 *
 * @param {object} o
 * @param {string} o.folderKey    key in IMAGE_FOLDERS
 * @param {string} o.file         WebP filename from the sheet
 * @param {string} o.alt
 * @param {boolean} [o.priority]  load eagerly (above-the-fold image)
 * @param {string} [o.ratio]
 * @param {'button'|'span'} [o.as] 'span' when the tile sits inside a link
 * @param {(el: HTMLElement) => void} [o.onActivate]
 */
function createImageTile({ folderKey, file, alt, priority = false, ratio, as = 'button', onActivate }) {
  const isButton = as === 'button';
  const tile = h(as, {
    class: `tile${ratio ? ' tile--fixed' : ''}${isButton ? '' : ' tile--static'}`,
    type: isButton ? 'button' : false,
    style: ratio ? `--ratio: ${ratio}` : false,
    'aria-label': isButton ? `Open ${alt}` : false,
    dataset: { state: 'loading' },
  });

  const img = h('img', { class: 'tile__img', alt: isButton ? alt : '', decoding: 'async', loading: priority ? 'eager' : 'lazy' });

  const loader = createImageLoader(img, {
    folderKey,
    onLoad: () => {
      tile.dataset.state = 'ready';
    },
    onFallback: (url) => console.info(`[images] "${file}" not found in the first folder; trying ${url}`),
    onFail: (urls) => {
      tile.dataset.state = 'error';
      if (isButton) tile.disabled = true;
      tile.replaceChildren(
        h(
          'span',
          { class: 'tile__fallback' },
          h('span', { class: 'tile__fallback-title' }, 'Image unavailable'),
          h('span', { class: 'tile__fallback-file' }, file),
        ),
      );
      console.warn(
        `[images] Could not load "${file}" (tried ${urls.join(', ') || 'no filename'}). ` +
          'Check the exact filename, including letter case, and that the .webp is in the category folder.',
      );
    },
  });

  tile.append(img);
  loader.load(file);
  if (img.complete && img.naturalWidth > 0) tile.dataset.state = 'ready';

  if (onActivate && isButton) tile.addEventListener('click', () => onActivate(tile));
  return tile;
}

/**
 * Responsive masonry for items of any height.
 *
 * Items are dealt into columns left-to-right (1st → col 1, 2nd → col 2, 3rd →
 * col 1 …), so reading order matches the spreadsheet row order, while each
 * column stacks items at their natural height — no cropping, no distortion.
 * The column count follows the container's width (ResizeObserver), and tiles
 * are moved (not recreated), so images never reload on resize.
 *
 * @param {HTMLElement[]} items
 * @param {{ minColWidth?: number, maxCols?: number }} [options]
 */
function createMasonry(items, { minColWidth = 260, maxCols = 2 } = {}) {
  const el = h('div', { class: 'masonry' });
  let cols = 0;

  const place = (count) => {
    if (count === cols) return;
    cols = count;
    const columns = Array.from({ length: count }, () => h('div', { class: 'masonry__col' }));
    items.forEach((item, i) => columns[i % count].append(item));
    el.replaceChildren(...columns);
    el.dataset.cols = String(count);
  };

  place(1);

  if ('ResizeObserver' in window) {
    new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (!width) return;
      const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 16;
      place(Math.max(1, Math.min(maxCols, Math.floor((width + gap) / (minColWidth + gap)))));
    }).observe(el);
  }

  return el;
}

/**
 * Filter rows ("Format: All · Portrait · Square …"). Each group is a single
 * choice; groups combine with AND. Options cascade: a group only offers values
 * that still exist given the OTHER groups' selections, so a filter can never
 * lead to an empty result by itself. Buttons are shown/hidden in place (not
 * rebuilt), so keyboard focus is preserved.
 *
 * A group with fewer than two possible values is not shown. If no group is
 * shown, the container is hidden.
 *
 * @param {HTMLElement} container
 * @param {object} o
 * @param {{ key: string, label?: string, values?: string[] }[]} o.groups
 *        `values` fixes the order of options; otherwise first appearance in `items`.
 * @param {object[]} o.items
 * @param {(item: object, key: string) => string} o.getValue
 * @param {(visible: object[], selection: Record<string, string|null>) => void} o.onChange
 * @returns {{ reset(): void, selection: Record<string, string|null> }}
 */
function renderFilters(container, { groups, items, getValue, onChange }) {
  const norm = (v) => String(v ?? '').trim().toLowerCase();
  const selection = Object.fromEntries(groups.map((g) => [g.key, null]));

  const matches = (item, ignoreKey) =>
    groups.every((g) => g.key === ignoreKey || selection[g.key] === null || norm(getValue(item, g.key)) === norm(selection[g.key]));

  const universe = groups.map((g) => {
    const seen = [];
    for (const v of [...(g.values ?? []), ...items.map((item) => getValue(item, g.key))]) {
      const value = String(v ?? '').trim();
      if (value && !seen.some((x) => norm(x) === norm(value))) seen.push(value);
    }
    // A fixed `values` list only orders options; values that never occur are dropped.
    return seen.filter((v) => items.some((item) => norm(getValue(item, g.key)) === norm(v)));
  });

  const rows = groups.map((g, gi) => {
    const buttons = [null, ...universe[gi]].map((value) => {
      const button = h('button', { class: 'filters__btn', type: 'button', 'aria-pressed': 'false' }, value ?? 'All');
      button.addEventListener('click', () => {
        selection[g.key] = value;
        update();
      });
      return { value, button };
    });
    const row = h(
      'div',
      { class: 'filters__row', role: 'group', 'aria-label': g.label ? `Filter by ${g.label.toLowerCase()}` : 'Filter projects' },
      g.label ? h('span', { class: 'filters__label' }, g.label) : null,
      h('div', { class: 'filters__list' }, buttons.map((b) => b.button)),
    );
    return { row, buttons };
  });

  function update() {
    // A selected value may have become impossible after another group changed.
    groups.forEach((g, gi) => {
      const available = new Set(items.filter((item) => matches(item, g.key)).map((item) => norm(getValue(item, g.key))));
      if (selection[g.key] !== null && !available.has(norm(selection[g.key]))) selection[g.key] = null;
    });

    let anyShown = false;
    groups.forEach((g, gi) => {
      const available = new Set(items.filter((item) => matches(item, g.key)).map((item) => norm(getValue(item, g.key))));
      for (const { value, button } of rows[gi].buttons) {
        button.hidden = value !== null && !available.has(norm(value));
        button.setAttribute('aria-pressed', String(value === selection[g.key] || (value === null && selection[g.key] === null)));
      }
      const options = universe[gi].filter((v) => available.has(norm(v))).length;
      const show = universe[gi].length > 1 && (options > 1 || selection[g.key] !== null);
      rows[gi].row.hidden = !show;
      anyShown ||= show;
    });
    container.hidden = !anyShown;
    onChange(items.filter((item) => matches(item)), { ...selection });
  }

  container.replaceChildren(...rows.map((r) => r.row));
  update();

  return {
    selection,
    reset() {
      for (const key of Object.keys(selection)) selection[key] = null;
      update();
    },
  };
}

/**
 * Project detail view: a full-screen dialog with the project's images, its
 * description, keyboard (←/→/Esc) and swipe navigation. Built on <dialog>, so
 * focus is trapped and Esc works natively. One instance serves the whole page.
 *
 * Items are `{ folderKey, file, alt }` (a WebP named in the sheet). `project`
 * is `{ name, year?, meta?, paragraphs }`; `meta` (e.g. "THI · 2026") replaces
 * `year` in the subtitle line. With one item the prev/next controls are hidden.
 */
function createLightbox() {
  let dialog = null;
  let els = null;
  let loader = null;
  let state = { items: [], index: 0, project: null, opener: null };

  function build() {
    els = {
      img: h('img', { class: 'lb__img', alt: '' }),
      status: h('p', { class: 'lb__status', role: 'status' }),
      title: h('h2', { class: 'lb__title', id: 'lb-title' }),
      year: h('p', { class: 'lb__year' }),
      text: h('div', { class: 'lb__text' }),
      counter: h('p', { class: 'lb__counter', 'aria-live': 'polite' }),
      prev: h('button', { class: 'lb__btn', type: 'button', 'aria-label': 'Previous image' }, '← Prev'),
      next: h('button', { class: 'lb__btn', type: 'button', 'aria-label': 'Next image' }, 'Next →'),
      close: h('button', { class: 'lb__close', type: 'button', 'aria-label': 'Close project view' }, 'Close ×'),
    };

    const stage = h('div', { class: 'lb__stage' }, els.img, els.status);
    const panel = h(
      'aside',
      { class: 'lb__panel' },
      h('div', { class: 'lb__info' }, els.title, els.year, els.text),
      h('div', { class: 'lb__controls' }, els.prev, els.counter, els.next),
    );

    dialog = h('dialog', { class: 'lb', 'aria-labelledby': 'lb-title' }, els.close, h('div', { class: 'lb__inner' }, stage, panel));
    document.body.append(dialog);

    els.prev.addEventListener('click', () => go(-1));
    els.next.addEventListener('click', () => go(1));
    els.close.addEventListener('click', () => dialog.close());

    loader = createImageLoader(els.img, {
      onLoad: () => {
        els.status.textContent = '';
        els.img.hidden = false;
      },
      onFail: () => {
        els.img.hidden = true;
        els.status.textContent = 'This image couldn’t be loaded.';
      },
    });

    // Click on empty stage area closes (but not on the image itself).
    stage.addEventListener('click', (e) => {
      if (e.target === stage) dialog.close();
    });

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });

    // Swipe
    let startX = null;
    stage.addEventListener('touchstart', (e) => (startX = e.changedTouches[0].clientX), { passive: true });
    stage.addEventListener(
      'touchend',
      (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        startX = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      },
      { passive: true },
    );

    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('is-locked');
      state.opener?.focus?.({ preventScroll: true });
    });
  }

  function render() {
    const { items, index, project } = state;
    const item = items[index];

    els.img.hidden = false;
    els.status.textContent = 'Loading…';
    els.img.alt = item.alt;
    loader.load(item.file, item.folderKey);

    els.title.textContent = project.name;
    const meta = project.meta ?? project.year ?? '';
    els.year.textContent = meta;
    els.year.hidden = !meta;
    els.text.replaceChildren(...project.paragraphs.map((p) => h('p', {}, p)));
    els.text.hidden = project.paragraphs.length === 0;
    els.counter.textContent = `${index + 1} / ${items.length}`;

    const single = items.length < 2;
    els.prev.hidden = els.next.hidden = single;

    // Warm the cache for the NEXT image only.
    const next = items[(index + 1) % items.length];
    if (next && next !== item) {
      const [url] = imageSources(next.folderKey, next.file);
      if (url) new Image().src = url;
    }
  }

  function go(step) {
    const n = state.items.length;
    if (n < 2) return;
    state.index = (state.index + step + n) % n;
    render();
  }

  return {
    open({ items, index = 0, project }, opener) {
      if (!dialog) build();
      state = { items, index, project, opener };
      render();
      document.documentElement.classList.add('is-locked');
      if (!dialog.open) dialog.showModal();
    },
  };
}

/**
 * Large, centered PDF viewer in a <dialog> (focus trap, Esc, backdrop click).
 *
 * - Pages are drawn with PDF.js onto canvases stacked vertically in one scrolling
 *   area, so the whole document scrolls top to bottom. Pages render lazily as they
 *   near the viewport.
 * - Zoom: − / + / Fit (and the + − 0 keys). 100% = page width fits the window.
 * - "Open in new tab" always works, and is the fallback if PDF.js can't be loaded:
 *   the browser's own PDF viewer is then embedded instead (zoom controls hidden).
 * - PDF.js is loaded from PDFJS.lib only the first time a modal opens.
 *
 * One instance serves the whole page: `createPdfModal().open({ title, url, opener })`.
 */

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const MAX_DPR = 2; // cap canvas density so large pages stay light on memory

let pdfjsPromise = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  pdfjsPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS.lib;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (!window.pdfjsLib) return reject(new Error('PDF viewer library did not initialise'));
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS.worker;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Could not load the PDF viewer'));
    document.head.append(script);
  }).catch((error) => {
    pdfjsPromise = null; // allow a retry on the next open
    throw error;
  });
  return pdfjsPromise;
}

function createPdfModal() {
  let dialog = null;
  let els = null;
  let session = 0; // increments per open(); stale async work checks it and stops
  let state = null; // { doc, pages, zoom, url, opener }

  function build() {
    const mkButton = (label, text, onClick) => h('button', { class: 'pdfm__btn', type: 'button', 'aria-label': label, onclick: onClick }, text);

    els = {
      title: h('h2', { class: 'pdfm__title', id: 'pdfm-title' }),
      pageInfo: h('p', { class: 'pdfm__pages', 'aria-live': 'polite' }),
      zoomOut: mkButton('Zoom out', '−', () => stepZoom(-1)),
      zoomIn: mkButton('Zoom in', '+', () => stepZoom(1)),
      zoomFit: mkButton('Fit to width', 'Fit', () => setZoom(1)),
      zoomLabel: h('span', { class: 'pdfm__zoom-label', 'aria-live': 'polite' }, '100%'),
      newTab: h('a', { class: 'pdfm__btn pdfm__btn--link', target: '_blank', rel: 'noopener', href: '#' }, 'Open in new tab ↗'),
      close: h('button', { class: 'pdfm__btn pdfm__close', type: 'button', 'aria-label': 'Close PDF', onclick: () => dialog.close() }, 'Close ×'),
      status: h('p', { class: 'pdfm__status', role: 'status' }),
      pages: h('div', { class: 'pdfm__pagelist' }),
    };
    els.zoomGroup = h('div', { class: 'pdfm__zoom', role: 'group', 'aria-label': 'Zoom' }, els.zoomOut, els.zoomLabel, els.zoomIn, els.zoomFit);
    els.scroll = h('div', { class: 'pdfm__scroll', tabindex: '0', 'aria-label': 'PDF pages' }, els.status, els.pages);

    dialog = h(
      'dialog',
      { class: 'pdfm', 'aria-labelledby': 'pdfm-title' },
      h(
        'header',
        { class: 'pdfm__bar' },
        h('div', { class: 'pdfm__heading' }, els.title, els.pageInfo),
        h('div', { class: 'pdfm__tools' }, els.zoomGroup, els.newTab, els.close),
      ),
      els.scroll,
    );
    document.body.append(dialog);

    // Click on the dimmed area (the <dialog> box itself) closes.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => teardown(true));
    dialog.addEventListener('keydown', (e) => {
      if (!state?.doc || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '+' || e.key === '=') (e.preventDefault(), stepZoom(1));
      else if (e.key === '-' || e.key === '_') (e.preventDefault(), stepZoom(-1));
      else if (e.key === '0') (e.preventDefault(), setZoom(1));
    });

    let frame = 0;
    els.scroll.addEventListener(
      'scroll',
      () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          renderVisible();
          updatePageInfo();
        });
      },
      { passive: true },
    );

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      if (!dialog.open || !state?.doc) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => applyZoom(), 150);
    });
  }

  /* ---------- sizing & rendering ---------- */

  const fitWidth = () => Math.max(200, els.scroll.clientWidth - 2 * parseFloat(getComputedStyle(els.pages).paddingLeft || 0));

  function pageScale(page) {
    return (fitWidth() * state.zoom) / page.base.width; // CSS px per PDF unit
  }

  function applyZoom({ keepPosition = true } = {}) {
    if (!state?.doc) return;
    const ratio = keepPosition && els.scroll.scrollHeight ? els.scroll.scrollTop / els.scroll.scrollHeight : 0;
    for (const page of state.pages) {
      page.task?.cancel();
      page.renderedScale = 0;
      const scale = pageScale(page);
      page.wrap.style.width = `${Math.round(page.base.width * scale)}px`;
      page.wrap.style.height = `${Math.round(page.base.height * scale)}px`;
    }
    els.scroll.scrollTop = ratio * els.scroll.scrollHeight;
    els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    els.zoomOut.disabled = state.zoom <= ZOOM_STEPS[0];
    els.zoomIn.disabled = state.zoom >= ZOOM_STEPS.at(-1);
    renderVisible();
    updatePageInfo();
  }

  function setZoom(value) {
    if (!state?.doc) return;
    state.zoom = value;
    applyZoom();
  }

  function stepZoom(direction) {
    if (!state?.doc) return;
    const i = ZOOM_STEPS.findIndex((z) => z >= state.zoom - 1e-6);
    const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, (i === -1 ? ZOOM_STEPS.length - 1 : i) + direction))];
    setZoom(next);
  }

  // Renders for one canvas run one at a time: PDF.js refuses a new render() on a
  // canvas whose cancelled render hasn't finished yet (rapid zoom clicks).
  function renderPage(page, mySession) {
    const scale = pageScale(page);
    page.renderedScale = scale; // marks "queued at this scale" so renderVisible() skips it
    const previous = page.done;

    page.done = (async () => {
      await previous;
      if (mySession !== session || page.renderedScale !== scale) return; // superseded or closed
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const viewport = page.pdfPage.getViewport({ scale: scale * dpr });
      page.canvas.width = Math.floor(viewport.width);
      page.canvas.height = Math.floor(viewport.height);
      const task = page.pdfPage.render({ canvasContext: page.canvas.getContext('2d'), viewport });
      page.task = task;
      try {
        await task.promise;
        if (mySession === session) page.wrap.dataset.state = 'ready';
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException') console.warn('[pdf] page render failed', error);
        if (page.renderedScale === scale) page.renderedScale = 0;
      } finally {
        if (page.task === task) page.task = null;
      }
    })();
  }

  function renderVisible() {
    if (!state?.doc) return;
    const mySession = session;
    const box = els.scroll.getBoundingClientRect();
    const margin = box.height; // pre-render one screen above/below
    for (const page of state.pages) {
      if (Math.abs(page.renderedScale - pageScale(page)) < 1e-6) continue;
      const r = page.wrap.getBoundingClientRect();
      if (r.bottom >= box.top - margin && r.top <= box.bottom + margin) renderPage(page, mySession);
    }
  }

  function updatePageInfo() {
    if (!state?.doc) return;
    // "Current" = the first page that still reaches below the top quarter of the window;
    // at the very end it is the last page (small pages can leave several in view).
    const box = els.scroll;
    const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
    const threshold = box.getBoundingClientRect().top + box.clientHeight * 0.25;
    let current = state.pages.findIndex((page) => page.wrap.getBoundingClientRect().bottom > threshold) + 1;
    if (atEnd || current === 0) current = state.pages.length;
    els.pageInfo.textContent = `Page ${current} of ${state.pages.length}`;
  }

  /* ---------- open / close ---------- */

  function showFallback(url, title, message) {
    els.zoomGroup.hidden = true;
    els.pageInfo.textContent = '';
    els.status.textContent = '';
    els.pages.replaceChildren(
      message ? h('p', { class: 'pdfm__note' }, message) : null,
      h('iframe', { class: 'pdfm__frame', src: url, title: `${title} (PDF)` }),
    );
    els.scroll.classList.add('is-frame');
  }

  async function open({ title, url, opener = null }) {
    if (!dialog) build();
    const mySession = ++session;
    teardown(false);
    state = { doc: null, pages: [], zoom: 1, url, opener };

    els.title.textContent = title;
    els.newTab.href = url;
    els.zoomGroup.hidden = false;
    els.scroll.classList.remove('is-frame');
    els.pageInfo.textContent = '';
    els.zoomLabel.textContent = '100%';
    els.status.textContent = 'Loading PDF…';
    els.pages.replaceChildren();
    els.scroll.scrollTop = 0;

    document.documentElement.classList.add('is-locked');
    if (!dialog.open) dialog.showModal();
    els.scroll.focus({ preventScroll: true });

    try {
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ url }).promise;
      if (mySession !== session) return doc.destroy();
      state.doc = doc;

      const pages = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const pdfPage = await doc.getPage(n);
        if (mySession !== session) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const canvas = h('canvas', { class: 'pdfm__canvas', role: 'img', 'aria-label': `Page ${n} of ${doc.numPages}` });
        const wrap = h('div', { class: 'pdfm__page', dataset: { state: 'loading' } }, canvas);
        pages.push({ pdfPage, base, canvas, wrap, task: null, done: null, renderedScale: 0 });
      }
      state.pages = pages;
      els.status.textContent = '';
      els.pages.replaceChildren(...pages.map((p) => p.wrap));
      applyZoom({ keepPosition: false });
    } catch (error) {
      if (mySession !== session) return;
      console.warn('[pdf] viewer unavailable, using the browser’s PDF viewer:', error);
      state.doc = null;
      showFallback(url, title, 'Showing your browser’s built-in PDF viewer.');
    }
  }

  function teardown(restoreFocus = true) {
    if (!state) return;
    for (const page of state.pages) page.task?.cancel();
    state.doc?.destroy?.();
    const opener = state.opener;
    state = null;
    session += restoreFocus ? 1 : 0; // closing invalidates any in-flight load
    if (restoreFocus) {
      document.documentElement.classList.remove('is-locked');
      els.pages.replaceChildren();
      els.scroll.classList.remove('is-frame');
      opener?.focus?.({ preventScroll: true });
    }
  }

  return { open };
}

/**
 * Gallery card for a project: its cover (the sheet's `thumbnail`) in a uniform
 * frame (CSS `--card-ratio`, default 4:3, as in the mockup), plus name and
 * "category / year". It is a real link to the
 * project's detail view (#project/<id>), so it works with the back button,
 * middle-click and shared URLs. Only the cover is loaded here — the rest of
 * the project's images load in the detail view.
 *
 * Branding projects with a PDF (`project.viewer === 'pdf'`) link to the PDF itself
 * (so middle-click / "open in new tab" / no-JS just work) and a normal click calls
 * `onOpenPdf` to show it in the modal instead. Everything else opens the detail view.
 *
 * @param {import('../domain/buildProjects.js').Project} project
 * @param {{ folderKey: string, priority?: boolean,
 *           onOpenPdf?: (project: import('../domain/buildProjects.js').Project, opener: HTMLElement) => void }} ctx
 */
function createProjectCard(project, { folderKey, priority = false, onOpenPdf }) {
  const meta = [project.category, project.year].filter(Boolean).join(' / ');
  const count = project.images.length;
  const asPdf = project.viewer === 'pdf' && onOpenPdf;

  const link = asPdf
    ? {
        href: fileUrl(project.tab, project.pdf),
        target: '_blank',
        rel: 'noopener',
        onclick: (e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          onOpenPdf(project, e.currentTarget);
        },
      }
    : { href: `#project/${project.id}` };

  return h(
    'a',
    { class: 'card', ...link, 'aria-label': `${project.name}${meta ? `, ${meta}` : ''} — ${asPdf ? 'view PDF' : 'view project'}` },
    createImageTile({
      folderKey,
      file: project.cover,
      alt: '',
      as: 'span',
      ratio: 'var(--card-ratio, 4 / 3)',
      priority,
    }),
    h(
      'span',
      { class: 'card__caption' },
      h(
        'span',
        { class: 'card__text' },
        h('span', { class: 'card__name' }, project.name),
        meta ? h('span', { class: 'card__meta' }, meta) : null,
      ),
      h('span', { class: 'card__arrow', 'aria-hidden': 'true', title: count > 1 ? `${count} images` : '' }, '→'),
    ),
  );
}

/**
 * A project's dedicated view: sticky meta column (back link, name, category,
 * year, description) beside ALL of the project's images (lead image full width,
 * the rest in a masonry at natural proportions). Clicking an image opens the
 * lightbox at that image, with prev/next across the project.
 *
 * @param {import('../domain/buildProjects.js').Project} project
 * @param {{ folderKey: string, lightbox: ReturnType<typeof import('./lightbox.js').createLightbox>,
 *           backLabel: string, onBack: () => void }} ctx
 */
function createProjectDetail(project, { folderKey, lightbox, backLabel, onBack }) {
  const total = project.images.length;
  const items = project.images.map((file, i) => ({
    folderKey,
    file,
    alt: `${project.name}${project.year ? `, ${project.year}` : ''} — image ${i + 1} of ${total}`,
  }));
  const detail = { name: project.name, year: project.year, paragraphs: project.paragraphs };

  const tiles = items.map((item, i) =>
    createImageTile({ ...item, priority: i === 0, onActivate: (el) => lightbox.open({ items, index: i, project: detail }, el) }),
  );
  const [lead, ...rest] = tiles;
  const meta = [project.category, project.year].filter(Boolean).join(' / ');

  return h(
    'article',
    { class: 'project', 'aria-labelledby': 'detail-title' },
    h(
      'header',
      { class: 'project__meta' },
      h(
        'a',
        {
          class: 'detail__back',
          href: '#',
          onclick: (e) => {
            e.preventDefault();
            onBack();
          },
        },
        `← ${backLabel}`,
      ),
      h('h1', { class: 'project__title', id: 'detail-title' }, project.name),
      meta ? h('p', { class: 'project__year' }, meta) : null,
      project.paragraphs.length ? h('div', { class: 'project__text' }, project.paragraphs.map((p) => h('p', {}, p))) : null,
      total > 1 ? h('p', { class: 'project__count' }, `${total} images`) : null,
    ),
    h('div', { class: 'project__gallery' }, h('div', { class: 'project__lead' }, lead), rest.length ? createMasonry(rest, { maxCols: 2 }) : null),
  );
}

/* ==========================================================================
   5a. PAGE: HOME (placeholder)
   ========================================================================== */

// Placeholder: the Home page is not built yet. It only mounts the shared chrome.
function mountHomePage() {
  mountShell({ activeKey: 'home' });
}

/* ==========================================================================
   5b. PAGE: BRANDING (tabs: logo + branding)
   ========================================================================== */

/**
 * Branding page: a gallery of project covers (one card per sheet row, from the
 * `logo` and `branding` tabs) and a dedicated detail view per project, routed
 * with the URL hash (#project/<id>) so it works on static GitHub Pages, with
 * the browser back button and with shareable links.
 */

const PROJECT_HASH = '#project/';

function mountBrandingPage({ activeKey = 'branding', tabs = ['logo', 'branding'], backLabel = 'All branding' } = {}) {
  mountShell({ activeKey });

  const listView = document.getElementById('list-view');
  const hero = document.getElementById('hero');
  const filtersEl = document.getElementById('filters');
  const listEl = document.getElementById('projects');
  const detailEl = document.getElementById('project-detail');
  const lightbox = createLightbox();
  const pdfModal = createPdfModal();
  const pageTitle = document.title;

  mountHeroImage(hero, 'logo');

  let projects = [];
  const cards = new Map();
  let listScroll = 0;

  const showList = () => {
    detailEl.hidden = true;
    detailEl.replaceChildren();
    listView.hidden = false;
    document.title = pageTitle;
    window.scrollTo({ top: listScroll, behavior: 'instant' });
  };

  const goBack = () => {
    history.pushState(null, '', location.pathname + location.search);
    route();
  };

  // Branding projects with a PDF open it in the modal (cards call this directly).
  const openPdf = (project, opener = null) =>
    pdfModal.open({ title: project.name, url: fileUrl(project.tab, project.pdf), opener });

  const showDetail = (id) => {
    const project = projects.find((p) => p.id === id);
    if (project?.viewer === 'pdf') {
      // #project/<id> for a PDF project (e.g. a pasted link): show the gallery with the PDF open.
      showList();
      openPdf(project);
      return;
    }
    if (!listView.hidden) listScroll = window.scrollY;
    listView.hidden = true;
    detailEl.hidden = false;

    if (!project) {
      renderEmpty(detailEl, { title: 'Project not found', text: 'This project doesn’t exist (any more).' });
      detailEl.append(h('a', { class: 'button', href: '#', onclick: (e) => (e.preventDefault(), goBack()) }, `← ${backLabel}`));
      document.title = `Not found — ${pageTitle}`;
    } else {
      detailEl.replaceChildren(createProjectDetail(project, { folderKey: project.tab, lightbox, backLabel, onBack: goBack }));
      document.title = `${project.name} — ${pageTitle}`;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Only project hashes switch views. Other hashes (the skip link's #main, for
  // example) leave the current view alone.
  function route() {
    if (!projects.length && !cards.size) return; // not loaded yet; load() calls route() when ready
    const { hash } = location;
    if (hash.startsWith(PROJECT_HASH)) showDetail(decodeURIComponent(hash.slice(PROJECT_HASH.length)));
    else if (hash === '' || hash === '#') showList();
  }
  window.addEventListener('hashchange', route);

  async function load() {
    filtersEl.hidden = true;
    renderLoading(listEl);

    try {
      const result = await loadProjects(tabs);
      projects = result.projects;

      for (const { tab, row, reason } of result.invalid) console.warn(`[${tab}] Skipped sheet row ${row}: ${reason}.`);
      for (const { tab, message } of result.failed) console.warn(`[${tab}] Tab not loaded, showing the others: ${message}`);

      if (!projects.length) {
        renderEmpty(listEl, { title: 'Nothing here yet', text: 'New work will be added soon.' });
        return;
      }

      projects.forEach((project, i) => cards.set(project.id, createProjectCard(project, { folderKey: project.tab, priority: i < 3, onOpenPdf: openPdf })));

      const show = (visible) => {
        listEl.replaceChildren(h('div', { class: 'cards' }, visible.map((p) => cards.get(p.id))));
      };
      // Category tabs appear automatically once the sheet has two or more categories.
      renderFilters(filtersEl, {
        groups: [{ key: 'category' }],
        items: projects,
        getValue: (project) => project.category,
        onChange: show,
      });
      listEl.setAttribute('aria-busy', 'false');
      observeReveal(cards.values());
      route();
    } catch (error) {
      console.error(error);
      renderError(listEl, { message: `${error.message} Please check your connection and try again.`, onRetry: load });
    }
  }

  load();
}

/* ==========================================================================
   5c. PAGE: SOCIAL MEDIA (tab: social)
   ========================================================================== */

/**
 * Social Media page: every image of every campaign (one `social` row each) as
 * its own cell in a symmetric three-column grid, in labelled sections by format
 * (Portrait 4:5 · Square 1:1 · Story 9:16), with format / client / campaign
 * filters. Clicking an image opens just that image in the lightbox.
 */

const FOLDER = 'social';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function mountSocialPage({ tabs = ['social'] } = {}) {
  mountShell({ activeKey: 'social' });

  const hero = document.getElementById('hero');
  const filtersEl = document.getElementById('filters');
  const listEl = document.getElementById('projects');
  const lightbox = createLightbox();

  mountHeroImage(hero, FOLDER);

  function createSection(format, items, tiles) {
    const titleId = `format-${format.key}`;
    const count = h('p', { class: 'format__count' });
    const section = h(
      'section',
      { class: 'format', 'aria-labelledby': titleId },
      h(
        'header',
        { class: 'format__head' },
        h('h2', { class: 'format__title', id: titleId }, format.label, format.ratio ? h('span', { class: 'format__ratio' }, format.ratio) : null),
        count,
      ),
      h('div', { class: 'grid3', style: `--ratio: ${format.css}` }, items.map((item) => tiles.get(item.id))),
    );
    return { section, count, items };
  }

  async function load() {
    filtersEl.hidden = true;
    renderLoading(listEl);

    try {
      const result = await loadProjects(tabs);
      for (const { tab, row, reason } of result.invalid) console.warn(`[${tab}] Skipped sheet row ${row}: ${reason}.`);
      for (const { tab, message } of result.failed) console.warn(`[${tab}] Tab not loaded: ${message}`);

      const items = buildSocialItems(result.projects);
      if (!items.length) {
        renderEmpty(listEl, { title: 'Nothing here yet', text: 'New work will be added soon.' });
        return;
      }

      // One tile per image, created once; filtering only hides/shows them, so nothing is re-downloaded.
      const tiles = new Map(
        items.map((item) => [
          item.id,
          createImageTile({
            folderKey: FOLDER,
            file: item.file,
            ratio: item.format.css,
            alt: `${item.campaign}${item.client ? `, ${item.client}` : ''} — ${item.format.label} ${item.index + 1} of ${item.total}`,
            onActivate: (el) =>
              lightbox.open(
                {
                  items: [{ folderKey: FOLDER, file: item.file, alt: `${item.campaign}${item.client ? `, ${item.client}` : ''} — ${item.format.label}` }],
                  index: 0,
                  project: { name: item.campaign, meta: [item.client, item.year].filter(Boolean).join(' · '), paragraphs: item.paragraphs },
                },
                el,
              ),
          }),
        ]),
      );

      const sections = [...FORMATS, OTHER_FORMAT]
        .map((format) => ({ format, items: items.filter((item) => item.format === format) }))
        .filter((s) => s.items.length)
        .map((s) => ({ ...s, ...createSection(s.format, s.items, tiles) }));

      const empty = h('div', { class: 'state', hidden: true }, h('h2', { class: 'state__title' }, 'No images match'), h('p', { class: 'state__text' }, 'Try a different combination of filters.'));
      let filters;
      empty.append(h('button', { class: 'button', type: 'button', onclick: () => filters.reset() }, 'Clear filters'));

      listEl.replaceChildren(...sections.map((s) => s.section), empty);
      listEl.setAttribute('aria-busy', 'false');

      filters = renderFilters(filtersEl, {
        groups: [
          { key: 'format', label: 'Format', values: [...FORMATS.map((f) => f.label), OTHER_FORMAT.label] },
          { key: 'client', label: 'Client' },
          { key: 'campaign', label: 'Campaign' },
        ],
        items,
        getValue: (item, key) => (key === 'format' ? item.format.label : item[key]),
        onChange: (visible) => {
          const shown = new Set(visible.map((item) => item.id));
          for (const item of items) tiles.get(item.id).hidden = !shown.has(item.id);
          for (const s of sections) {
            const n = s.items.filter((item) => shown.has(item.id)).length;
            s.section.hidden = n === 0;
            s.count.textContent = plural(n, 'image');
          }
          empty.hidden = visible.length > 0;
        },
      });
    } catch (error) {
      console.error(error);
      renderError(listEl, { message: `${error.message} Please check your connection and try again.`, onRetry: load });
    }
  }

  load();
}

/* ========================================================================== 
   6. BOOT
   ========================================================================== */

const PAGES = { home: mountHomePage, branding: mountBrandingPage, social: mountSocialPage };
PAGES[document.body.dataset.page]?.();

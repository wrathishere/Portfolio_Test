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
export class SheetSchemaError extends Error {
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
export function normalizeProjectRows(table, { tab = '' } = {}) {
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

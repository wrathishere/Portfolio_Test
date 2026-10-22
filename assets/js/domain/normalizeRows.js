/**
 * Turns raw table records (see utils/csv.js) into clean, typed rows and reports
 * the ones that can't be used. Pure functions — no DOM, no network.
 *
 * Schema: image | category | sub-category | year | text | order | Featured
 */
export class SheetSchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SheetSchemaError';
  }
}

const REQUIRED_COLUMNS = ['image', 'subcategory'];
const TRUTHY = /^(true|yes|y|1|✓|✔|x)$/i;

const clean = (v) => String(v ?? '').trim();

function parseOrder(value) {
  const n = Number.parseFloat(clean(value));
  return Number.isFinite(n) ? n : null;
}

function parseYear(value) {
  // "2025", "2025.0" (number-formatted cell) → "2025"
  return clean(value).replace(/\.0+$/, '');
}

/**
 * @param {{ headers: string[], records: object[] }} table
 * @returns {{ rows: NormalizedRow[], invalid: { row: number, reason: string }[] }}
 */
export function normalizeRows(table) {
  const missing = REQUIRED_COLUMNS.filter((col) => !table.headers.includes(col));
  if (missing.length) {
    // gviz silently returns the FIRST tab when a tab name doesn't exist, which
    // shows up here as unexpected columns — so this also catches a wrong tab name.
    throw new SheetSchemaError(
      `The sheet is missing expected column(s): ${missing.join(', ')}. ` +
        `Check the tab name and the header row (image | category | sub-category | year | text | order | Featured).`,
    );
  }

  const rows = [];
  const invalid = [];

  for (const rec of table.records) {
    const image = clean(rec.image);
    if (!image) {
      invalid.push({ row: rec.__row, reason: 'missing image filename' });
      continue;
    }
    rows.push({
      sheetRow: rec.__row,
      image,
      category: clean(rec.category),
      subcategory: clean(rec.subcategory),
      year: parseYear(rec.year),
      text: clean(rec.text),
      order: parseOrder(rec.order),
      featured: TRUTHY.test(clean(rec.featured)),
    });
  }
  return { rows, invalid };
}

/**
 * @typedef {object} NormalizedRow
 * @property {number} sheetRow
 * @property {string} image
 * @property {string} category
 * @property {string} subcategory
 * @property {string} year
 * @property {string} text
 * @property {number|null} order
 * @property {boolean} featured
 */

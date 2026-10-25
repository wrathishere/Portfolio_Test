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
import { slugify, splitParagraphs } from '../utils/text.js';

/**
 * @param {import('./normalizeRows.js').ProjectRow[]} rows  in tab order
 * @returns {Project[]}
 */
export function buildProjects(rows) {
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
 */

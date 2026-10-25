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
 * Project type comes from the `category` field: "Branding" / "Brand Identity"
 * are branding projects; anything else (e.g. "Logo Design") is a logo project.
 * A category naming both ("Logo & Branding") counts as logo, so existing
 * image-based projects never change behaviour.
 */
export const isBrandingCategory = (category) => /brand/i.test(category) && !/logo/i.test(category);

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

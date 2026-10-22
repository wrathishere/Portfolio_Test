/**
 * Groups normalized rows into projects. Pure function — reusable for every tab
 * (logo, social, misc, motion, packaging).
 *
 * Rules
 *  - A project = all rows sharing the same `sub-category` (case/space-insensitive).
 *  - Projects are sorted by `order` (lowest value found in the group, ascending);
 *    projects without a valid order go last, ties keep their first appearance in the sheet.
 *  - Images keep the exact row order from the sheet.
 *  - Year / description come from the first row in the group that has one,
 *    so only the first row needs filling in.
 *  - `featured` is true if ANY row in the project is featured (used by Home later);
 *    each image also keeps its own flag.
 */
import { slugify, splitParagraphs } from '../utils/text.js';

const UNTITLED = 'Untitled project';

/**
 * @param {import('./normalizeRows.js').NormalizedRow[]} rows
 * @returns {Project[]}
 */
export function groupProjects(rows) {
  const groups = new Map();

  rows.forEach((row, position) => {
    const name = row.subcategory || UNTITLED;
    const key = name.toLowerCase().replace(/\s+/g, ' ');

    let project = groups.get(key);
    if (!project) {
      project = {
        id: '',
        name,
        category: row.category,
        year: '',
        description: '',
        paragraphs: [],
        order: null,
        featured: false,
        firstPosition: position,
        images: [],
      };
      groups.set(key, project);
    }

    project.images.push({ file: row.image, featured: row.featured, sheetRow: row.sheetRow });

    if (!project.year && row.year) project.year = row.year;
    if (!project.description && row.text) {
      project.description = row.text;
      project.paragraphs = splitParagraphs(row.text);
    }
    if (!project.category && row.category) project.category = row.category;
    if (row.order !== null && (project.order === null || row.order < project.order)) {
      project.order = row.order;
    }
    if (row.featured) project.featured = true;
  });

  const projects = [...groups.values()].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.firstPosition - b.firstPosition;
  });

  // Stable, unique, URL-safe ids for anchors / deep links.
  const used = new Set();
  for (const project of projects) {
    const base = slugify(project.name);
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    project.id = id;
  }
  return projects;
}

/**
 * @typedef {object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} year
 * @property {string} description
 * @property {string[]} paragraphs
 * @property {number|null} order
 * @property {boolean} featured
 * @property {{ file: string, featured: boolean, sheetRow: number }[]} images
 */

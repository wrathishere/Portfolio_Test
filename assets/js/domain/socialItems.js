/**
 * Social Media model. Each `social` row is a campaign; its image1…N become
 * individual gallery items, grouped by FORMAT (taken from the row's `category`,
 * e.g. "Portrait(4:5)"). Pure functions.
 */

export const FORMATS = [
  { key: 'portrait', label: 'Portrait', ratio: '4:5', css: '4 / 5', match: /portrait|4\s*:\s*5/i },
  { key: 'square', label: 'Square', ratio: '1:1', css: '1 / 1', match: /square|1\s*:\s*1/i },
  { key: 'story', label: 'Story', ratio: '9:16', css: '9 / 16', match: /stor(y|ies)|9\s*:\s*16/i },
];
export const OTHER_FORMAT = { key: 'other', label: 'Other', ratio: '', css: '1 / 1' };

export function formatOf(category) {
  return FORMATS.find((f) => f.match.test(String(category ?? ''))) ?? OTHER_FORMAT;
}

/**
 * @param {import('./buildProjects.js').Project[]} projects  campaigns, already sorted by `order`
 * @returns {SocialItem[]}  campaign order, then image order within each campaign
 */
export function buildSocialItems(projects) {
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

import { loadTabCSV } from '../data/sheetsClient.js';
import { readTable } from '../utils/csv.js';
import { normalizeRows } from './normalizeRows.js';
import { groupProjects } from './groupProjects.js';

/**
 * Composes fetch → parse → normalize → group for any sheet tab.
 * Presentation code only ever calls this.
 *
 * @param {string} tab  key from SHEET.tabs, e.g. "logo"
 * @returns {Promise<{ projects: import('./groupProjects.js').Project[],
 *                     invalid: { row: number, reason: string }[],
 *                     source: 'live' | 'snapshot' }>}
 */
export async function loadProjects(tab) {
  const { text, source } = await loadTabCSV(tab);
  const { rows, invalid } = normalizeRows(readTable(text));
  return { projects: groupProjects(rows), invalid, source };
}

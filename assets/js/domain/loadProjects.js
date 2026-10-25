import { loadTabCSV } from '../data/sheetsClient.js';
import { readTable } from '../utils/csv.js';
import { normalizeProjectRows } from './normalizeRows.js';
import { buildProjects } from './buildProjects.js';

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
 *                     failed: { tab: string, message: string }[],
 *                     sources: Record<string, 'live' | 'snapshot'> }>}
 */
export async function loadProjects(tabs) {
  const results = await Promise.allSettled(
    tabs.map(async (tab) => {
      const { text, source } = await loadTabCSV(tab);
      return { tab, source, ...normalizeProjectRows(readTable(text), { tab }) };
    }),
  );

  const rows = [];
  const invalid = [];
  const failed = [];
  const sources = {};

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      failed.push({ tab: tabs[i], message: result.reason?.message ?? String(result.reason) });
      return;
    }
    sources[result.value.tab] = result.value.source;
    rows.push(...result.value.rows);
    invalid.push(...result.value.invalid.map((x) => ({ ...x, tab: result.value.tab })));
  });

  if (failed.length === tabs.length) throw new Error(failed.map((f) => f.message).join(' '));
  return { projects: buildProjects(rows), invalid, failed, sources };
}

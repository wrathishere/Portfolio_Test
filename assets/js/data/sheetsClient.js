/**
 * Data fetching only. Knows how to get CSV text for a sheet tab; knows nothing
 * about projects or the DOM.
 *
 * Read-only, credential-free: uses Google's public CSV export of a sheet that
 * is shared as "Anyone with the link → Viewer" (or published to the web).
 *
 * Resilience: if the live request fails (offline, quota, sharing changed), it
 * falls back to a committed snapshot at data/<tab>.snapshot.csv, if present.
 */
import { SHEET, ROOT } from '../config.js';

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

/** @returns {Promise<{ text: string, source: 'live' | 'snapshot' }>} */
export async function loadTabCSV(tab) {
  let liveError;
  try {
    return { text: await fetchText(liveCsvUrl(tab), SHEET.timeoutMs), source: 'live' };
  } catch (err) {
    liveError = err;
    console.warn(`[sheet] Live fetch for "${tab}" failed (${err.message}). Trying snapshot…`);
  }

  try {
    const snapshotUrl = new URL(`data/${tab}.snapshot.csv`, ROOT).href;
    return { text: await fetchText(snapshotUrl, 8000), source: 'snapshot' };
  } catch {
    throw new Error(`Could not load the "${tab}" sheet: ${liveError.message}.`);
  }
}

import { buildSheets, demoPages } from './portfolioData';
import type { MediaKind, PageType, PortfolioDataResult, PortfolioPage } from './types';

const requiredColumnGroups = [
  ['page_order', 'page no.', 'page no', 'page', 'order'],
  ['image_url', 'source', 'image', 'image url'],
];
const optionalColumns = {
  id: ['id'],
  enabled: ['enabled', 'published', 'active'],
  pageType: ['page_type', 'type'],
  project: ['project', 'category'],
  title: ['title', 'category'],
  year: ['year'],
};
const validPageTypes = new Set<PageType>(['cover', 'page', 'back_cover']);
const videoExtensions = new Set(['mp4', 'webm', 'mov', 'm4v']);

function googleCsvUrl(sheetId: string, tab: string) {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function columnIndex(header: string[], aliases: string[]) {
  return aliases.map((alias) => header.indexOf(alias)).find((index) => index >= 0) ?? -1;
}

function valueAt(row: string[], index: number) {
  return index >= 0 ? row[index]?.trim() ?? '' : '';
}

function mediaKindFor(source: string): MediaKind {
  const extension = source.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return videoExtensions.has(extension) ? 'video' : 'image';
}

function makeVideoPoster(source: string, title: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600">
      <rect width="1200" height="1600" fill="#181614"/>
      <rect x="88" y="88" width="1024" height="1424" rx="22" fill="none" stroke="#efe6d8" stroke-width="4"/>
      <polygon points="500,650 500,950 760,800" fill="#efe6d8"/>
      <text x="120" y="1220" fill="#efe6d8" font-family="Inter,Arial" font-size="58" font-weight="700">${title || 'Motion Design'}</text>
      <text x="120" y="1295" fill="#cbbda9" font-family="Inter,Arial" font-size="30">Video source: ${source}</text>
    </svg>`)} `;
}

function resolveSource(source: string, title: string) {
  const mediaKind = mediaKindFor(source);
  if (mediaKind === 'video') return { mediaKind, imageUrl: makeVideoPoster(source, title) };
  if (/^(https?:|data:|blob:|\/)/i.test(source)) return { mediaKind, imageUrl: source };

  const baseUrl = import.meta.env.VITE_PORTFOLIO_IMAGE_BASE_URL || '/portfolio/';
  return { mediaKind, imageUrl: `${baseUrl.replace(/\/$/, '')}/${source.replace(/^\//, '')}` };
}

function inferPageType(order: number, source: string, explicitType: string): PageType {
  const normalizedType = explicitType.trim().toLowerCase().replace(/\s+/g, '_') as PageType;
  if (validPageTypes.has(normalizedType)) return normalizedType;
  if (order === 1 || /cover/i.test(source)) return 'cover';
  return 'page';
}

function normalizeRows(rows: string[][]): { pages: PortfolioPage[]; warnings: string[] } {
  const warnings: string[] = [];
  const header = (rows.shift() ?? []).map((heading) => heading.trim().toLowerCase());
  const requiredIndexes = requiredColumnGroups.map((aliases) => columnIndex(header, aliases));

  requiredColumnGroups.forEach((aliases, groupIndex) => {
    if (requiredIndexes[groupIndex] < 0) {
      throw new Error(`Google Sheet is missing a required column. Expected one of: ${aliases.join(', ')}`);
    }
  });

  const idIndex = columnIndex(header, optionalColumns.id);
  const enabledIndex = columnIndex(header, optionalColumns.enabled);
  const typeIndex = columnIndex(header, optionalColumns.pageType);
  const projectIndex = columnIndex(header, optionalColumns.project);
  const titleIndex = columnIndex(header, optionalColumns.title);
  const yearIndex = columnIndex(header, optionalColumns.year);
  const pages: PortfolioPage[] = [];

  rows.forEach((row, rowIndex) => {
    const enabled = valueAt(row, enabledIndex).toLowerCase();
    if (['false', '0', 'no', 'n', 'disabled'].includes(enabled)) return;

    const order = Number(valueAt(row, requiredIndexes[0]));
    const source = valueAt(row, requiredIndexes[1]);
    const title = valueAt(row, titleIndex) || valueAt(row, projectIndex) || `Page ${order}`;

    if (!Number.isFinite(order) || !source) {
      warnings.push(`Ignored row ${rowIndex + 2}: page number/order or source is missing.`);
      return;
    }

    const { mediaKind, imageUrl } = resolveSource(source, title);
    const type = inferPageType(order, source, valueAt(row, typeIndex));

    pages.push({
      id: valueAt(row, idIndex) || `page-${order}`,
      order,
      source,
      imageUrl,
      type,
      mediaKind,
      project: valueAt(row, projectIndex) || undefined,
      title,
      year: valueAt(row, yearIndex) || undefined,
    });
  });

  pages.sort((left, right) => left.order - right.order);

  if (!pages.length) throw new Error('Google Sheet did not contain any enabled rows with a page number and source.');
  if (!pages.some((page) => page.type === 'cover')) warnings.push('No explicit cover was found; the first row or cover-like filename is used as the cover.');

  return { pages, warnings };
}

export async function fetchPortfolioPages(): Promise<PortfolioDataResult> {
  const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
  const tab = import.meta.env.VITE_GOOGLE_SHEET_TAB || 'Portfolio Main';
  const useDemoData = import.meta.env.VITE_USE_DEMO_DATA === 'true';

  if (!sheetId) {
    if (useDemoData) {
      return {
        pages: demoPages,
        sheets: buildSheets(demoPages),
        warnings: ['Using explicit demo data because VITE_GOOGLE_SHEET_ID is empty.'],
        source: 'demo',
      };
    }
    throw new Error('Set VITE_GOOGLE_SHEET_ID or enable VITE_USE_DEMO_DATA=true for local demo content.');
  }

  const response = await fetch(googleCsvUrl(sheetId, tab));
  if (!response.ok) {
    throw new Error(`Google Sheets request failed (${response.status}). Confirm the sheet is shared publicly and the tab name is correct.`);
  }

  const { pages, warnings } = normalizeRows(parseCsv(await response.text()));
  return { pages, sheets: buildSheets(pages), warnings, source: 'google-sheets' };
}

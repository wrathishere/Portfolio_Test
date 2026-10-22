/**
 * Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, embedded
 * newlines, CRLF, BOM). Descriptions in the sheet contain line breaks, so a
 * naive split(',') / split('\n') would corrupt them.
 */
export function parseCSV(input) {
  let text = String(input ?? '');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "Sub-Category", "sub_category", "subcategory " → "subcategory" */
export function normalizeHeader(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[\s_\-]+/g, '')
    .trim();
}

/**
 * Parses CSV text into `{ headers, records }`. Each record is keyed by the
 * normalized header and carries `__row`, its 1-based row number in the sheet
 * (header = row 1), which is handy for diagnostics. Fully blank rows are dropped.
 */
export function readTable(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { headers: [], records: [] };

  const headers = rows[0].map(normalizeHeader);
  const records = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.every((cell) => String(cell).trim() === '')) continue;
    const rec = { __row: r + 1 };
    headers.forEach((key, i) => {
      if (key) rec[key] = cells[i] ?? '';
    });
    records.push(rec);
  }
  return { headers, records };
}

import { ROOT, IMAGE_FOLDERS } from '../config.js';

/** Absolute URL for a path relative to the site root (subpath-safe). */
export function siteUrl(path) {
  return new URL(path, ROOT).href;
}

/**
 * Percent-encodes each path segment of a sheet filename. Leading slashes and
 * "." / ".." segments are dropped so a sheet cell can never point outside the
 * intended folder. Case is preserved (GitHub Pages is case-sensitive).
 */
function encodeFilename(filename) {
  return String(filename ?? '')
    .trim()
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .map(encodeURIComponent)
    .join('/');
}

function folderBases(folderKey) {
  const folders = IMAGE_FOLDERS[folderKey];
  if (!folders) throw new Error(`Unknown image folder key: "${folderKey}"`);
  return [].concat(folders).map((path) => new URL(path, ROOT)); // spaces in folder names are encoded
}

// folderKey -> index of the folder that last served an image successfully.
const preferred = new Map();

/**
 * Candidate URLs for a WebP file named in the sheet, best guess first (the
 * folder that already worked for this category, then the others in config order).
 * Returns [] for a blank filename.
 */
export function imageSources(folderKey, filename) {
  const name = encodeFilename(filename);
  if (!name) return [];
  const bases = folderBases(folderKey);
  const first = preferred.get(folderKey) ?? 0;
  const order = bases.map((_, i) => i).sort((a, b) => (a === first ? -1 : b === first ? 1 : a - b));
  return order.map((i) => new URL(name, bases[i]).href);
}

/**
 * URL of a non-image file such as a PDF. PDFs live in the category folder itself
 * (the last entry of IMAGE_FOLDERS, e.g. "Images/Logo Designs/Aaksha.pdf"),
 * not in its Thumbnail/ subfolder. Returns '' for a blank filename.
 */
export function fileUrl(folderKey, filename) {
  const name = encodeFilename(filename);
  if (!name) return '';
  const bases = folderBases(folderKey);
  return new URL(name, bases[bases.length - 1]).href;
}

/** Remember which folder served `url`, so later images try it first. */
export function rememberFolder(folderKey, url) {
  const bases = folderBases(folderKey);
  let best = -1;
  bases.forEach((base, i) => {
    if (url.startsWith(base.href) && (best === -1 || base.href.length > bases[best].href.length)) best = i;
  });
  if (best !== -1) preferred.set(folderKey, best);
}

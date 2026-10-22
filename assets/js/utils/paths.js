import { ROOT, IMAGE_FOLDERS, THUMBNAIL_FOLDER } from '../config.js';

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
  return String(filename)
    .trim()
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .map(encodeURIComponent)
    .join('/');
}

function folderUrl(folderKey) {
  const folder = IMAGE_FOLDERS[folderKey];
  if (!folder) throw new Error(`Unknown image folder key: "${folderKey}"`);
  return new URL(folder, ROOT); // spaces in folder names are encoded automatically
}

/**
 * URL of the ORIGINAL image, from the exact filename in the `image` column.
 * Works under /repo-name/ and encodes names like "kynn_logo (1).jpg".
 */
export function imageUrl(folderKey, filename) {
  return new URL(encodeFilename(filename), folderUrl(folderKey)).href;
}

/**
 * URL of the optimized preview, from the `thumbnail` column. It lives in the
 * `Thumbnail/` subfolder of the category folder. A sheet value that already
 * starts with "Thumbnail/" is accepted too.
 *
 * Returns '' when the sheet gives no thumbnail, so callers use the original.
 */
export function thumbnailUrl(folderKey, filename) {
  if (!filename || !String(filename).trim()) return '';
  const name = encodeFilename(String(filename).trim().replace(new RegExp(`^${THUMBNAIL_FOLDER}/`, 'i'), ''));
  if (!name) return '';
  return new URL(name, new URL(`${THUMBNAIL_FOLDER}/`, folderUrl(folderKey))).href;
}

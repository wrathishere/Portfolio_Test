import { ROOT, IMAGE_FOLDERS } from '../config.js';

/** Absolute URL for a path relative to the site root (subpath-safe). */
export function siteUrl(path) {
  return new URL(path, ROOT).href;
}

/**
 * Builds the URL of an image from the exact filename in the spreadsheet.
 *
 * - Resolved against the site root, so it works under /repo-name/.
 * - Each path segment is percent-encoded, so names like "kynn_logo (1).jpg" work.
 * - Case is preserved: GitHub Pages is case-sensitive ("Logo.JPG" ≠ "logo.jpg").
 * - Leading slashes and "." / ".." segments are dropped so a sheet cell can
 *   never point outside the image folder.
 */
export function imageUrl(folderKey, filename) {
  const folder = IMAGE_FOLDERS[folderKey];
  if (!folder) throw new Error(`Unknown image folder key: "${folderKey}"`);

  const base = new URL(folder, ROOT);
  const encoded = String(filename)
    .trim()
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .map(encodeURIComponent)
    .join('/');

  return new URL(encoded, base).href;
}

import { h } from '../utils/dom.js';
import { createImageLoader } from '../utils/imageFallback.js';

/**
 * A single gallery image (WebP, named in the sheet). Lazy-loaded, fades in once
 * loaded, and degrades to a quiet "Image unavailable" tile naming the file if
 * no candidate folder serves it (see IMAGE_FOLDERS), so problems are easy to spot.
 *
 * Natural aspect ratio by default (never cropped or stretched). Pass `ratio`
 * (a CSS aspect-ratio such as "4 / 5") for a fixed-shape cell in a symmetric
 * grid; the image then fills the cell.
 *
 * @param {object} o
 * @param {string} o.folderKey    key in IMAGE_FOLDERS
 * @param {string} o.file         WebP filename from the sheet
 * @param {string} o.alt
 * @param {boolean} [o.priority]  load eagerly (above-the-fold image)
 * @param {string} [o.ratio]
 * @param {'button'|'span'} [o.as] 'span' when the tile sits inside a link
 * @param {(el: HTMLElement) => void} [o.onActivate]
 */
export function createImageTile({ folderKey, file, alt, priority = false, ratio, as = 'button', onActivate }) {
  const isButton = as === 'button';
  const tile = h(as, {
    class: `tile${ratio ? ' tile--fixed' : ''}${isButton ? '' : ' tile--static'}`,
    type: isButton ? 'button' : false,
    style: ratio ? `--ratio: ${ratio}` : false,
    'aria-label': isButton ? `Open ${alt}` : false,
    dataset: { state: 'loading' },
  });

  const img = h('img', { class: 'tile__img', alt: isButton ? alt : '', decoding: 'async', loading: priority ? 'eager' : 'lazy' });

  const loader = createImageLoader(img, {
    folderKey,
    onLoad: () => {
      tile.dataset.state = 'ready';
    },
    onFallback: (url) => console.info(`[images] "${file}" not found in the first folder; trying ${url}`),
    onFail: (urls) => {
      tile.dataset.state = 'error';
      if (isButton) tile.disabled = true;
      tile.replaceChildren(
        h(
          'span',
          { class: 'tile__fallback' },
          h('span', { class: 'tile__fallback-title' }, 'Image unavailable'),
          h('span', { class: 'tile__fallback-file' }, file),
        ),
      );
      console.warn(
        `[images] Could not load "${file}" (tried ${urls.join(', ') || 'no filename'}). ` +
          'Check the exact filename, including letter case, and that the .webp is in the category folder.',
      );
    },
  });

  tile.append(img);
  loader.load(file);
  if (img.complete && img.naturalWidth > 0) tile.dataset.state = 'ready';

  if (onActivate && isButton) tile.addEventListener('click', () => onActivate(tile));
  return tile;
}

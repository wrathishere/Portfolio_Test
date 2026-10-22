import { h } from '../utils/dom.js';
import { loadWithFallback } from '../utils/imageFallback.js';

/**
 * A single gallery image. Shows the optimized thumbnail (`src`) at its natural
 * aspect ratio — never cropped or stretched — and fades it in once loaded.
 *
 * Fallbacks, in order:
 *   1. thumbnail (`src`)  →  2. original (`fallbackSrc`)  →  3. quiet
 *      "Image unavailable" tile naming the file, so the problem is easy to spot.
 *
 * @param {object} o
 * @param {string} o.src          thumbnail URL (or the original if there is no thumbnail)
 * @param {string} [o.fallbackSrc] original URL, used if `src` fails
 * @param {string} o.alt
 * @param {string} o.file         original filename from the sheet (for diagnostics)
 * @param {boolean} [o.priority]  load eagerly (above-the-fold image)
 * @param {(button: HTMLButtonElement) => void} [o.onActivate]
 */
export function createImageTile({ src, fallbackSrc, alt, file, priority = false, onActivate }) {
  const button = h('button', {
    class: 'tile',
    type: 'button',
    dataset: { state: 'loading' },
    'aria-label': `Open ${alt}`,
  });

  const img = h('img', { class: 'tile__img', alt, decoding: 'async', loading: priority ? 'eager' : 'lazy' });

  img.addEventListener('load', () => {
    button.dataset.state = 'ready';
  });

  loadWithFallback(img, {
    primary: src,
    fallback: fallbackSrc,
    onFallback: () => {
      button.dataset.thumb = 'fallback';
      console.warn(`[images] Thumbnail failed for "${file}" (${src}); using the original instead.`);
    },
    onFail: () => {
      button.dataset.state = 'error';
      button.disabled = true;
      button.replaceChildren(
        h(
          'span',
          { class: 'tile__fallback' },
          h('span', { class: 'tile__fallback-title' }, 'Image unavailable'),
          h('span', { class: 'tile__fallback-file' }, file),
        ),
      );
      console.warn(
        `[images] Could not load "${file}" (${fallbackSrc || src}). Check the exact filename, including letter case, and that it is in the image folder.`,
      );
    },
  });

  if (img.complete && img.naturalWidth > 0) button.dataset.state = 'ready';

  button.append(img);
  if (onActivate) button.addEventListener('click', () => onActivate(button));
  return button;
}

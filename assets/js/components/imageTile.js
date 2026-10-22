import { h } from '../utils/dom.js';

/**
 * A single gallery image. The image is shown at its natural aspect ratio —
 * never cropped or stretched — and fades in once loaded. If the file can't be
 * loaded (typo, wrong case, not uploaded yet) the tile degrades to a quiet
 * placeholder that names the file, so the problem is easy to spot.
 *
 * @param {object} o
 * @param {string} o.src
 * @param {string} o.alt
 * @param {string} o.file         filename from the sheet (for diagnostics)
 * @param {boolean} [o.priority]  load eagerly (above-the-fold image)
 * @param {(button: HTMLButtonElement) => void} [o.onActivate]
 */
export function createImageTile({ src, alt, file, priority = false, onActivate }) {
  const button = h('button', {
    class: 'tile',
    type: 'button',
    dataset: { state: 'loading' },
  });

  const img = h('img', { class: 'tile__img', alt, decoding: 'async', loading: priority ? 'eager' : 'lazy' });

  const markReady = () => {
    button.dataset.state = 'ready';
  };

  img.addEventListener('load', markReady);
  img.addEventListener('error', () => {
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
      `[images] Could not load "${file}" (${src}). Check the exact filename, including letter case, and that it is in the image folder.`,
    );
  });

  img.src = src;
  if (img.complete && img.naturalWidth > 0) markReady();

  button.append(img);
  if (onActivate) button.addEventListener('click', () => onActivate(button));
  return button;
}

import { h } from '../utils/dom.js';

/**
 * Responsive masonry for items of any height.
 *
 * Items are dealt into columns left-to-right (1st → col 1, 2nd → col 2, 3rd →
 * col 1 …), so reading order matches the spreadsheet row order, while each
 * column stacks items at their natural height — no cropping, no distortion.
 * The column count follows the container's width (ResizeObserver), and tiles
 * are moved (not recreated), so images never reload on resize.
 *
 * @param {HTMLElement[]} items
 * @param {{ minColWidth?: number, maxCols?: number }} [options]
 */
export function createMasonry(items, { minColWidth = 260, maxCols = 2 } = {}) {
  const el = h('div', { class: 'masonry' });
  let cols = 0;

  const place = (count) => {
    if (count === cols) return;
    cols = count;
    const columns = Array.from({ length: count }, () => h('div', { class: 'masonry__col' }));
    items.forEach((item, i) => columns[i % count].append(item));
    el.replaceChildren(...columns);
    el.dataset.cols = String(count);
  };

  place(1);

  if ('ResizeObserver' in window) {
    new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (!width) return;
      const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 16;
      place(Math.max(1, Math.min(maxCols, Math.floor((width + gap) / (minColWidth + gap)))));
    }).observe(el);
  }

  return el;
}

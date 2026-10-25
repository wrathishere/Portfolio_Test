import { h } from '../utils/dom.js';
import { createImageLoader } from '../utils/imageFallback.js';

/**
 * Optional hero image: <section id="hero" data-hero-image="filename.webp">.
 * Resolved against the page's category folder; skipped silently if missing.
 */
export function mountHeroImage(hero, folderKey) {
  const file = hero?.dataset.heroImage?.trim();
  if (!file) return;

  const img = h('img', { class: 'hero__img', alt: '', decoding: 'async' });
  const figure = h('figure', { class: 'hero__media', 'aria-hidden': 'true' }, img);
  createImageLoader(img, {
    folderKey,
    onFail: () => {
      figure.remove();
      hero.classList.remove('has-media');
      console.warn(`[hero] Hero image "${file}" could not be loaded; skipping it.`);
    },
  }).load(file);

  hero.classList.add('has-media');
  hero.prepend(figure);
}

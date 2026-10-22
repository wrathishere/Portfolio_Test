import { SITE } from '../config.js';
import { siteUrl } from '../utils/paths.js';
import { h } from '../utils/dom.js';

/**
 * Closing call-to-action band ("Let's create something meaningful together").
 * Configured in SITE.cta. With no `href` it renders as a plain, non-clickable
 * band, so there is never a dead link.
 */
export function createSiteCta() {
  const cta = SITE.cta;
  if (!cta) return null;

  const content = [
    cta.image
      ? h('div', { class: 'cta__media' }, h('img', { src: siteUrl(cta.image), alt: '', loading: 'lazy', decoding: 'async' }))
      : h('div', { class: 'cta__media cta__media--plain', 'aria-hidden': 'true' }),
    h(
      'div',
      { class: 'cta__body' },
      h('p', { class: 'eyebrow' }, cta.eyebrow),
      h('p', { class: 'cta__text' }, cta.text),
      cta.href ? h('span', { class: 'cta__arrow', 'aria-hidden': 'true' }, '→') : null,
    ),
  ];

  return cta.href
    ? h('a', { class: 'cta container', href: cta.href }, content)
    : h('div', { class: 'cta container' }, content);
}

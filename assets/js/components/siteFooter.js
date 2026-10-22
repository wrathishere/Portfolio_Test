import { SITE } from '../config.js';
import { h } from '../utils/dom.js';

export function createSiteFooter() {
  return h(
    'footer',
    { class: 'site-footer' },
    h(
      'div',
      { class: 'container site-footer__inner' },
      h('p', {}, `© ${new Date().getFullYear()} ${SITE.name}`),
      h('a', { class: 'site-footer__top', href: '#top' }, 'Back to top ↑'),
    ),
  );
}

import { SITE } from '../config.js';
import { h } from '../utils/dom.js';

export function createSiteFooter() {
  const [left, right] = SITE.tagline ?? [];

  return h(
    'footer',
    { class: 'site-footer' },
    h(
      'div',
      { class: 'container' },
      left || right
        ? h(
            'div',
            { class: 'tagline' },
            h('p', { class: 'tagline__text' }, left),
            h('span', { class: 'tagline__line', 'aria-hidden': 'true' }),
            h('p', { class: 'tagline__text' }, right),
          )
        : null,
      h(
        'div',
        { class: 'site-footer__inner' },
        h('p', {}, `© ${new Date().getFullYear()} ${SITE.name}`),
        h('a', { class: 'site-footer__top', href: '#top' }, 'Back to top ↑'),
      ),
    ),
  );
}

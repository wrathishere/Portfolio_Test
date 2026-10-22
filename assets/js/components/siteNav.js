import { SITE } from '../config.js';
import { siteUrl } from '../utils/paths.js';
import { h } from '../utils/dom.js';

/**
 * Shared header + primary navigation, rendered from SITE.nav.
 * - `activeKey` gets aria-current="page".
 * - Items without an href render as inert "coming soon" placeholders.
 */
export function createSiteNav({ activeKey }) {
  const items = SITE.nav.map((item) => {
    const isActive = item.key === activeKey;

    if (!item.href) {
      return h(
        'li',
        {},
        h('a', { class: 'nav__link is-soon', role: 'link', 'aria-disabled': 'true', title: 'Coming soon' }, item.label),
      );
    }
    return h(
      'li',
      {},
      h('a', { class: 'nav__link', href: siteUrl(item.href), 'aria-current': isActive ? 'page' : false }, item.label),
    );
  });

  const nav = h('nav', { class: 'nav', id: 'primary-nav', 'aria-label': 'Primary' }, h('ul', { class: 'nav__list' }, items));

  const toggle = h(
    'button',
    { class: 'nav-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'primary-nav' },
    h('span', { class: 'nav-toggle__label' }, 'Menu'),
    h('span', { class: 'nav-toggle__icon', 'aria-hidden': 'true' }),
  );

  const header = h(
    'header',
    { class: 'site-header' },
    h(
      'div',
      { class: 'container site-header__inner' },
      h('a', { class: 'brand', href: siteUrl('index.html') }, SITE.name),
      toggle,
      nav,
    ),
  );

  // Mobile menu
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.nav-toggle__label').textContent = open ? 'Close' : 'Menu';
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => e.target.closest('a[href]') && setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  // Hairline appears once the page is scrolled.
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return header;
}

import { createSiteNav } from './components/siteNav.js';
import { createSiteFooter } from './components/siteFooter.js';
import { createSiteCta } from './components/siteCta.js';

/**
 * Mounts the shared chrome (header/nav + footer) into every page.
 * Each page needs <div id="site-header"> and <div id="site-footer"> placeholders;
 * an optional <div id="site-cta"> adds the closing call-to-action band.
 */
export function mountShell({ activeKey }) {
  // The skip link moves focus to <main> WITHOUT changing the URL hash: pages route on
  // the hash (e.g. #project/<id>), so a "#main" fragment would break reloads and deep links.
  document.querySelector('.skip-link')?.addEventListener('click', (e) => {
    const main = document.getElementById('main');
    if (!main) return;
    e.preventDefault();
    main.setAttribute('tabindex', '-1');
    main.focus();
    main.scrollIntoView();
  });

  document.getElementById('site-header')?.replaceWith(createSiteNav({ activeKey }));
  document.getElementById('site-footer')?.replaceWith(createSiteFooter());

  const ctaSlot = document.getElementById('site-cta');
  if (ctaSlot) {
    const cta = createSiteCta();
    if (cta) ctaSlot.replaceWith(cta);
    else ctaSlot.remove();
  }
}

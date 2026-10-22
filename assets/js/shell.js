import { createSiteNav } from './components/siteNav.js';
import { createSiteFooter } from './components/siteFooter.js';

/**
 * Mounts the shared chrome (header/nav + footer) into every page.
 * Each page needs <div id="site-header"> and <div id="site-footer"> placeholders.
 */
export function mountShell({ activeKey }) {
  document.getElementById('site-header')?.replaceWith(createSiteNav({ activeKey }));
  document.getElementById('site-footer')?.replaceWith(createSiteFooter());
}

/**
 * Branding page: a gallery of project covers (one card per sheet row, from the
 * `logo` and `branding` tabs) and a dedicated detail view per project, routed
 * with the URL hash (#project/<id>) so it works on static GitHub Pages, with
 * the browser back button and with shareable links.
 */
import { mountShell } from '../shell.js';
import { loadProjects } from '../domain/loadProjects.js';
import { createProjectCard } from '../components/projectCard.js';
import { createProjectDetail } from '../components/projectDetail.js';
import { createLightbox } from '../components/lightbox.js';
import { createPdfModal } from '../components/pdfModal.js';
import { renderFilters } from '../components/multiFilter.js';
import { renderLoading, renderError, renderEmpty } from '../components/states.js';
import { observeReveal } from '../components/reveal.js';
import { mountHeroImage } from '../components/heroImage.js';
import { fileUrl } from '../utils/paths.js';
import { h } from '../utils/dom.js';

const PROJECT_HASH = '#project/';

export function mountBrandingPage({ activeKey = 'branding', tabs = ['logo', 'branding'], backLabel = 'All branding' } = {}) {
  mountShell({ activeKey });

  const listView = document.getElementById('list-view');
  const hero = document.getElementById('hero');
  const filtersEl = document.getElementById('filters');
  const listEl = document.getElementById('projects');
  const detailEl = document.getElementById('project-detail');
  const lightbox = createLightbox();
  const pdfModal = createPdfModal();
  const pageTitle = document.title;

  mountHeroImage(hero, 'logo');

  let projects = [];
  const cards = new Map();
  let listScroll = 0;

  const showList = () => {
    detailEl.hidden = true;
    detailEl.replaceChildren();
    listView.hidden = false;
    document.title = pageTitle;
    window.scrollTo({ top: listScroll, behavior: 'instant' });
  };

  const goBack = () => {
    history.pushState(null, '', location.pathname + location.search);
    route();
  };

  // Branding projects with a PDF open it in the modal (cards call this directly).
  const openPdf = (project, opener = null) =>
    pdfModal.open({ title: project.name, url: fileUrl(project.tab, project.pdf), opener });

  const showDetail = (id) => {
    const project = projects.find((p) => p.id === id);
    if (project?.viewer === 'pdf') {
      // #project/<id> for a PDF project (e.g. a pasted link): show the gallery with the PDF open.
      showList();
      openPdf(project);
      return;
    }
    if (!listView.hidden) listScroll = window.scrollY;
    listView.hidden = true;
    detailEl.hidden = false;

    if (!project) {
      renderEmpty(detailEl, { title: 'Project not found', text: 'This project doesn’t exist (any more).' });
      detailEl.append(h('a', { class: 'button', href: '#', onclick: (e) => (e.preventDefault(), goBack()) }, `← ${backLabel}`));
      document.title = `Not found — ${pageTitle}`;
    } else {
      detailEl.replaceChildren(createProjectDetail(project, { folderKey: project.tab, lightbox, backLabel, onBack: goBack }));
      document.title = `${project.name} — ${pageTitle}`;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Only project hashes switch views. Other hashes (the skip link's #main, for
  // example) leave the current view alone.
  function route() {
    if (!projects.length && !cards.size) return; // not loaded yet; load() calls route() when ready
    const { hash } = location;
    if (hash.startsWith(PROJECT_HASH)) showDetail(decodeURIComponent(hash.slice(PROJECT_HASH.length)));
    else if (hash === '' || hash === '#') showList();
  }
  window.addEventListener('hashchange', route);

  async function load() {
    filtersEl.hidden = true;
    renderLoading(listEl);

    try {
      const result = await loadProjects(tabs);
      projects = result.projects;

      for (const { tab, row, reason } of result.invalid) console.warn(`[${tab}] Skipped sheet row ${row}: ${reason}.`);
      for (const { tab, message } of result.failed) console.warn(`[${tab}] Tab not loaded, showing the others: ${message}`);
      document.documentElement.dataset.contentSource = [...new Set(Object.values(result.sources))].join('+');

      if (!projects.length) {
        renderEmpty(listEl, { title: 'Nothing here yet', text: 'New work will be added soon.' });
        return;
      }

      projects.forEach((project, i) => cards.set(project.id, createProjectCard(project, { folderKey: project.tab, priority: i < 3, onOpenPdf: openPdf })));

      const show = (visible) => {
        listEl.replaceChildren(h('div', { class: 'cards' }, visible.map((p) => cards.get(p.id))));
      };
      // Category tabs appear automatically once the sheet has two or more categories.
      renderFilters(filtersEl, {
        groups: [{ key: 'category' }],
        items: projects,
        getValue: (project) => project.category,
        onChange: show,
      });
      listEl.setAttribute('aria-busy', 'false');
      observeReveal(cards.values());
      route();
    } catch (error) {
      console.error(error);
      renderError(listEl, { message: `${error.message} Please check your connection and try again.`, onRetry: load });
    }
  }

  load();
}

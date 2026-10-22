/**
 * Generic "gallery page" controller. The Logo Designs page is just a thin
 * configuration of this; Social Media Work, Packaging & Misc, etc. can reuse it
 * by passing a different sheet tab and image-folder key.
 *
 *   mountCategoryPage({ activeKey: 'logo', tab: 'logo', folderKey: 'logo' })
 */
import { mountShell } from '../shell.js';
import { loadProjects } from '../domain/loadProjects.js';
import { createProjectSection } from '../components/projectSection.js';
import { renderProjectIndex } from '../components/projectIndex.js';
import { createLightbox } from '../components/lightbox.js';
import { renderLoading, renderError, renderEmpty } from '../components/states.js';
import { observeReveal } from '../components/reveal.js';
import { imageUrl } from '../utils/paths.js';
import { h } from '../utils/dom.js';

/** Optional hero image: <section id="hero" data-hero-image="filename.jpg"> */
function mountHeroImage(hero, folderKey) {
  const file = hero?.dataset.heroImage?.trim();
  if (!file) return;

  const img = h('img', { class: 'hero__img', src: imageUrl(folderKey, file), alt: '', decoding: 'async' });
  const figure = h('figure', { class: 'hero__media' }, img);
  img.addEventListener('error', () => {
    figure.remove();
    console.warn(`[hero] Hero image "${file}" could not be loaded; skipping it.`);
  });
  hero.after(figure);
}

export function mountCategoryPage({ activeKey, tab, folderKey, masonry }) {
  mountShell({ activeKey });

  const hero = document.getElementById('hero');
  const indexEl = document.getElementById('project-index');
  const listEl = document.getElementById('projects');
  const lightbox = createLightbox();

  mountHeroImage(hero, folderKey);

  async function load() {
    indexEl.hidden = true;
    renderLoading(listEl);

    try {
      const { projects, invalid, source } = await loadProjects(tab);

      for (const { row, reason } of invalid) {
        console.warn(`[${tab}] Skipped sheet row ${row}: ${reason}.`);
      }
      document.documentElement.dataset.contentSource = source;

      if (!projects.length) {
        renderEmpty(listEl, { title: 'Nothing here yet', text: 'New work will be added soon.' });
        return;
      }

      const sections = projects.map((project, i) =>
        createProjectSection(project, { index: i, folderKey, lightbox, masonry }),
      );
      listEl.replaceChildren(...sections);
      listEl.setAttribute('aria-busy', 'false');

      renderProjectIndex(indexEl, projects);
      observeReveal(sections);

      // Honour deep links such as logo-designs.html#orizza-project
      if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
    } catch (error) {
      console.error(error);
      renderError(listEl, {
        message: `${error.message} Please check your connection and try again.`,
        onRetry: load,
      });
    }
  }

  load();
}

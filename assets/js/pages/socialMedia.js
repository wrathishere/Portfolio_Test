/**
 * Social Media page: every image of every campaign (one `social` row each) as
 * its own cell in a symmetric three-column grid, in labelled sections by format
 * (Portrait 4:5 · Square 1:1 · Story 9:16), with format / client / campaign
 * filters. Clicking an image opens just that image in the lightbox.
 */
import { mountShell } from '../shell.js';
import { loadProjects } from '../domain/loadProjects.js';
import { FORMATS, OTHER_FORMAT, buildSocialItems } from '../domain/socialItems.js';
import { createImageTile } from '../components/imageTile.js';
import { createLightbox } from '../components/lightbox.js';
import { renderFilters } from '../components/multiFilter.js';
import { renderLoading, renderError, renderEmpty } from '../components/states.js';
import { mountHeroImage } from '../components/heroImage.js';
import { h } from '../utils/dom.js';

const FOLDER = 'social';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function mountSocialPage({ tabs = ['social'] } = {}) {
  mountShell({ activeKey: 'social' });

  const hero = document.getElementById('hero');
  const filtersEl = document.getElementById('filters');
  const listEl = document.getElementById('projects');
  const lightbox = createLightbox();

  mountHeroImage(hero, FOLDER);

  function createSection(format, items, tiles) {
    const titleId = `format-${format.key}`;
    const count = h('p', { class: 'format__count' });
    const section = h(
      'section',
      { class: 'format', 'aria-labelledby': titleId },
      h(
        'header',
        { class: 'format__head' },
        h('h2', { class: 'format__title', id: titleId }, format.label, format.ratio ? h('span', { class: 'format__ratio' }, format.ratio) : null),
        count,
      ),
      h('div', { class: 'grid3', style: `--ratio: ${format.css}` }, items.map((item) => tiles.get(item.id))),
    );
    return { section, count, items };
  }

  async function load() {
    filtersEl.hidden = true;
    renderLoading(listEl);

    try {
      const result = await loadProjects(tabs);
      for (const { tab, row, reason } of result.invalid) console.warn(`[${tab}] Skipped sheet row ${row}: ${reason}.`);
      for (const { tab, message } of result.failed) console.warn(`[${tab}] Tab not loaded: ${message}`);
      document.documentElement.dataset.contentSource = [...new Set(Object.values(result.sources))].join('+');

      const items = buildSocialItems(result.projects);
      if (!items.length) {
        renderEmpty(listEl, { title: 'Nothing here yet', text: 'New work will be added soon.' });
        return;
      }

      // One tile per image, created once; filtering only hides/shows them, so nothing is re-downloaded.
      const tiles = new Map(
        items.map((item) => [
          item.id,
          createImageTile({
            folderKey: FOLDER,
            file: item.file,
            ratio: item.format.css,
            alt: `${item.campaign}${item.client ? `, ${item.client}` : ''} — ${item.format.label} ${item.index + 1} of ${item.total}`,
            onActivate: (el) =>
              lightbox.open(
                {
                  items: [{ folderKey: FOLDER, file: item.file, alt: `${item.campaign}${item.client ? `, ${item.client}` : ''} — ${item.format.label}` }],
                  index: 0,
                  project: { name: item.campaign, meta: [item.client, item.year].filter(Boolean).join(' · '), paragraphs: item.paragraphs },
                },
                el,
              ),
          }),
        ]),
      );

      const sections = [...FORMATS, OTHER_FORMAT]
        .map((format) => ({ format, items: items.filter((item) => item.format === format) }))
        .filter((s) => s.items.length)
        .map((s) => ({ ...s, ...createSection(s.format, s.items, tiles) }));

      const empty = h('div', { class: 'state', hidden: true }, h('h2', { class: 'state__title' }, 'No images match'), h('p', { class: 'state__text' }, 'Try a different combination of filters.'));
      let filters;
      empty.append(h('button', { class: 'button', type: 'button', onclick: () => filters.reset() }, 'Clear filters'));

      listEl.replaceChildren(...sections.map((s) => s.section), empty);
      listEl.setAttribute('aria-busy', 'false');

      filters = renderFilters(filtersEl, {
        groups: [
          { key: 'format', label: 'Format', values: [...FORMATS.map((f) => f.label), OTHER_FORMAT.label] },
          { key: 'client', label: 'Client' },
          { key: 'campaign', label: 'Campaign' },
        ],
        items,
        getValue: (item, key) => (key === 'format' ? item.format.label : item[key]),
        onChange: (visible) => {
          const shown = new Set(visible.map((item) => item.id));
          for (const item of items) tiles.get(item.id).hidden = !shown.has(item.id);
          for (const s of sections) {
            const n = s.items.filter((item) => shown.has(item.id)).length;
            s.section.hidden = n === 0;
            s.count.textContent = plural(n, 'image');
          }
          empty.hidden = visible.length > 0;
        },
      });
    } catch (error) {
      console.error(error);
      renderError(listEl, { message: `${error.message} Please check your connection and try again.`, onRetry: load });
    }
  }

  load();
}

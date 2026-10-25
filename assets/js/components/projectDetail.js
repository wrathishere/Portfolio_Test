import { h } from '../utils/dom.js';
import { createImageTile } from './imageTile.js';
import { createMasonry } from './masonry.js';

/**
 * A project's dedicated view: sticky meta column (back link, name, category,
 * year, description) beside ALL of the project's images (lead image full width,
 * the rest in a masonry at natural proportions). Clicking an image opens the
 * lightbox at that image, with prev/next across the project.
 *
 * @param {import('../domain/buildProjects.js').Project} project
 * @param {{ folderKey: string, lightbox: ReturnType<typeof import('./lightbox.js').createLightbox>,
 *           backLabel: string, onBack: () => void }} ctx
 */
export function createProjectDetail(project, { folderKey, lightbox, backLabel, onBack }) {
  const total = project.images.length;
  const items = project.images.map((file, i) => ({
    folderKey,
    file,
    alt: `${project.name}${project.year ? `, ${project.year}` : ''} — image ${i + 1} of ${total}`,
  }));
  const detail = { name: project.name, year: project.year, paragraphs: project.paragraphs };

  const tiles = items.map((item, i) =>
    createImageTile({ ...item, priority: i === 0, onActivate: (el) => lightbox.open({ items, index: i, project: detail }, el) }),
  );
  const [lead, ...rest] = tiles;
  const meta = [project.category, project.year].filter(Boolean).join(' / ');

  return h(
    'article',
    { class: 'project', 'aria-labelledby': 'detail-title' },
    h(
      'header',
      { class: 'project__meta' },
      h(
        'a',
        {
          class: 'detail__back',
          href: '#',
          onclick: (e) => {
            e.preventDefault();
            onBack();
          },
        },
        `← ${backLabel}`,
      ),
      h('h1', { class: 'project__title', id: 'detail-title' }, project.name),
      meta ? h('p', { class: 'project__year' }, meta) : null,
      project.paragraphs.length ? h('div', { class: 'project__text' }, project.paragraphs.map((p) => h('p', {}, p))) : null,
      total > 1 ? h('p', { class: 'project__count' }, `${total} images`) : null,
    ),
    h('div', { class: 'project__gallery' }, h('div', { class: 'project__lead' }, lead), rest.length ? createMasonry(rest, { maxCols: 2 }) : null),
  );
}

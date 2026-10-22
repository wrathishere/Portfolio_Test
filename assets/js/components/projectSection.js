import { h } from '../utils/dom.js';
import { pad2 } from '../utils/text.js';
import { imageUrl } from '../utils/paths.js';
import { createImageTile } from './imageTile.js';
import { createMasonry } from './masonry.js';

/**
 * One project: sticky meta column (name, year, description) beside a gallery.
 * The first image leads at full width; the rest flow into the masonry.
 * Reusable for any category — it only needs a Project and an image-folder key.
 *
 * @param {import('../domain/groupProjects.js').Project} project
 * @param {{ index: number, folderKey: string, lightbox: ReturnType<typeof import('./lightbox.js').createLightbox>,
 *           masonry?: { minColWidth?: number, maxCols?: number } }} ctx
 */
export function createProjectSection(project, { index, folderKey, lightbox, masonry }) {
  const total = project.images.length;

  const items = project.images.map((image, i) => ({
    file: image.file,
    src: imageUrl(folderKey, image.file),
    alt: `${project.name}${project.year ? `, ${project.year}` : ''} — image ${i + 1} of ${total}`,
  }));

  const detail = { name: project.name, year: project.year, paragraphs: project.paragraphs };
  const open = (i, opener) => lightbox.open({ items, index: i, project: detail }, opener);

  const tiles = items.map((item, i) =>
    createImageTile({
      ...item,
      priority: index === 0 && i === 0,
      onActivate: (button) => open(i, button),
    }),
  );
  const [lead, ...rest] = tiles;

  const titleId = `${project.id}-title`;

  const meta = h(
    'header',
    { class: 'project__meta' },
    h('p', { class: 'project__index', 'aria-hidden': 'true' }, pad2(index + 1)),
    h('h2', { class: 'project__title', id: titleId }, project.name),
    project.year ? h('p', { class: 'project__year' }, project.year) : null,
    project.paragraphs.length
      ? h('div', { class: 'project__text' }, project.paragraphs.map((p) => h('p', {}, p)))
      : null,
    h(
      'button',
      {
        class: 'link-button',
        type: 'button',
        onclick: (e) => open(0, e.currentTarget),
        'aria-label': `View ${project.name} project, ${total} ${total === 1 ? 'image' : 'images'}`,
      },
      total > 1 ? `View project · ${total} images` : 'View image',
    ),
  );

  const gallery = h(
    'div',
    { class: 'project__gallery' },
    h('div', { class: 'project__lead' }, lead),
    rest.length ? createMasonry(rest, masonry) : null,
  );

  return h('article', { class: 'project', id: project.id, 'aria-labelledby': titleId }, meta, gallery);
}

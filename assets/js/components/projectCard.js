import { h } from '../utils/dom.js';
import { createImageTile } from './imageTile.js';

/**
 * Gallery card for a project: its cover (the sheet's `thumbnail`) in a uniform
 * frame (CSS `--card-ratio`, default 4:3, as in the mockup), plus name and
 * "category / year". It is a real link to the
 * project's detail view (#project/<id>), so it works with the back button,
 * middle-click and shared URLs. Only the cover is loaded here — the rest of
 * the project's images load in the detail view.
 *
 * @param {import('../domain/buildProjects.js').Project} project
 * @param {{ folderKey: string, priority?: boolean }} ctx
 */
export function createProjectCard(project, { folderKey, priority = false }) {
  const meta = [project.category, project.year].filter(Boolean).join(' / ');
  const count = project.images.length;

  return h(
    'a',
    { class: 'card', href: `#project/${project.id}`, 'aria-label': `${project.name}${meta ? `, ${meta}` : ''} — view project` },
    createImageTile({
      folderKey,
      file: project.cover,
      alt: '',
      as: 'span',
      ratio: 'var(--card-ratio, 4 / 3)',
      priority,
    }),
    h(
      'span',
      { class: 'card__caption' },
      h(
        'span',
        { class: 'card__text' },
        h('span', { class: 'card__name' }, project.name),
        meta ? h('span', { class: 'card__meta' }, meta) : null,
      ),
      h('span', { class: 'card__arrow', 'aria-hidden': 'true', title: count > 1 ? `${count} images` : '' }, '→'),
    ),
  );
}

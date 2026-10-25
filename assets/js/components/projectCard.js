import { h } from '../utils/dom.js';
import { fileUrl } from '../utils/paths.js';
import { createImageTile } from './imageTile.js';

/**
 * Gallery card for a project: its cover (the sheet's `thumbnail`) in a uniform
 * frame (CSS `--card-ratio`, default 4:3, as in the mockup), plus name and
 * "category / year". It is a real link to the
 * project's detail view (#project/<id>), so it works with the back button,
 * middle-click and shared URLs. Only the cover is loaded here — the rest of
 * the project's images load in the detail view.
 *
 * Branding projects with a PDF (`project.viewer === 'pdf'`) link to the PDF itself
 * (so middle-click / "open in new tab" / no-JS just work) and a normal click calls
 * `onOpenPdf` to show it in the modal instead. Everything else opens the detail view.
 *
 * @param {import('../domain/buildProjects.js').Project} project
 * @param {{ folderKey: string, priority?: boolean,
 *           onOpenPdf?: (project: import('../domain/buildProjects.js').Project, opener: HTMLElement) => void }} ctx
 */
export function createProjectCard(project, { folderKey, priority = false, onOpenPdf }) {
  const meta = [project.category, project.year].filter(Boolean).join(' / ');
  const count = project.images.length;
  const asPdf = project.viewer === 'pdf' && onOpenPdf;

  const link = asPdf
    ? {
        href: fileUrl(project.tab, project.pdf),
        target: '_blank',
        rel: 'noopener',
        onclick: (e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          onOpenPdf(project, e.currentTarget);
        },
      }
    : { href: `#project/${project.id}` };

  return h(
    'a',
    { class: 'card', ...link, 'aria-label': `${project.name}${meta ? `, ${meta}` : ''} — ${asPdf ? 'view PDF' : 'view project'}` },
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

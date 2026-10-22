import { h } from '../utils/dom.js';
import { pad2 } from '../utils/text.js';

/** Quiet jump-list of projects shown under the intro. */
export function renderProjectIndex(container, projects) {
  if (projects.length < 2) {
    container.hidden = true;
    return;
  }
  container.replaceChildren(
    h(
      'ol',
      { class: 'project-index__list' },
      projects.map((project, i) =>
        h(
          'li',
          {},
          h(
            'a',
            { class: 'project-index__link', href: `#${project.id}` },
            h('span', { class: 'project-index__num' }, pad2(i + 1)),
            h('span', { class: 'project-index__name' }, project.name),
            project.year ? h('span', { class: 'project-index__year' }, project.year) : null,
          ),
        ),
      ),
    ),
  );
  container.hidden = false;
}

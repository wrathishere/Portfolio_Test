import { h } from '../utils/dom.js';

/** Loading skeleton: two project-shaped placeholders. */
export function renderLoading(container) {
  const skeleton = () =>
    h(
      'div',
      { class: 'project project--skeleton', 'aria-hidden': 'true' },
      h(
        'div',
        { class: 'project__meta' },
        h('span', { class: 'sk sk--title' }),
        h('span', { class: 'sk sk--line' }),
        h('span', { class: 'sk sk--line sk--short' }),
      ),
      h(
        'div',
        { class: 'project__gallery' },
        h('span', { class: 'sk sk--lead' }),
        h('div', { class: 'sk-row' }, h('span', { class: 'sk sk--tile' }), h('span', { class: 'sk sk--tile' })),
      ),
    );

  container.setAttribute('aria-busy', 'true');
  container.replaceChildren(
    h('p', { class: 'visually-hidden', role: 'status' }, 'Loading projects…'),
    skeleton(),
    skeleton(),
  );
}

export function renderError(container, { message, onRetry }) {
  container.setAttribute('aria-busy', 'false');
  container.replaceChildren(
    h(
      'div',
      { class: 'state', role: 'alert' },
      h('h2', { class: 'state__title' }, 'The work couldn’t be loaded'),
      h('p', { class: 'state__text' }, message),
      h('button', { class: 'button', type: 'button', onclick: onRetry }, 'Try again'),
    ),
  );
}

export function renderEmpty(container, { title, text }) {
  container.setAttribute('aria-busy', 'false');
  container.replaceChildren(
    h('div', { class: 'state' }, h('h2', { class: 'state__title' }, title), h('p', { class: 'state__text' }, text)),
  );
}

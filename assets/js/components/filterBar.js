import { h } from '../utils/dom.js';

/**
 * Filter tabs ("All · Brand Identity · …"). Generic: it filters by whatever
 * string `getValue(project)` returns, so other pages can filter by a different
 * field. Renders nothing when there are fewer than two distinct values (a
 * filter with a single choice is just noise).
 *
 * @param {HTMLElement} container
 * @param {object[]} projects
 * @param {{ getValue?: (p: object) => string, onChange: (value: string|null) => void }} opts
 * @returns {boolean} whether the bar is shown
 */
export function renderFilterBar(container, projects, { getValue = (p) => p.category, onChange }) {
  const values = [];
  for (const project of projects) {
    const v = (getValue(project) || '').trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) values.push(v);
  }

  if (values.length < 2) {
    container.hidden = true;
    container.replaceChildren();
    return false;
  }

  const buttons = [{ label: 'All', value: null }, ...values.map((v) => ({ label: v, value: v }))].map((item) =>
    h('button', { class: 'filters__btn', type: 'button', 'aria-pressed': 'false' }, item.label),
  );
  const entries = buttons.map((button, i) => ({ button, value: i === 0 ? null : values[i - 1] }));

  const select = (value) => {
    for (const entry of entries) entry.button.setAttribute('aria-pressed', String(entry.value === value));
    onChange(value);
  };
  for (const entry of entries) entry.button.addEventListener('click', () => select(entry.value));

  container.replaceChildren(h('div', { class: 'filters__list', role: 'group', 'aria-label': 'Filter projects' }, buttons));
  container.hidden = false;
  select(null);
  return true;
}

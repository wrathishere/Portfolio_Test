import { h } from '../utils/dom.js';

/**
 * Filter rows ("Format: All · Portrait · Square …"). Each group is a single
 * choice; groups combine with AND. Options cascade: a group only offers values
 * that still exist given the OTHER groups' selections, so a filter can never
 * lead to an empty result by itself. Buttons are shown/hidden in place (not
 * rebuilt), so keyboard focus is preserved.
 *
 * A group with fewer than two possible values is not shown. If no group is
 * shown, the container is hidden.
 *
 * @param {HTMLElement} container
 * @param {object} o
 * @param {{ key: string, label?: string, values?: string[] }[]} o.groups
 *        `values` fixes the order of options; otherwise first appearance in `items`.
 * @param {object[]} o.items
 * @param {(item: object, key: string) => string} o.getValue
 * @param {(visible: object[], selection: Record<string, string|null>) => void} o.onChange
 * @returns {{ reset(): void, selection: Record<string, string|null> }}
 */
export function renderFilters(container, { groups, items, getValue, onChange }) {
  const norm = (v) => String(v ?? '').trim().toLowerCase();
  const selection = Object.fromEntries(groups.map((g) => [g.key, null]));

  const matches = (item, ignoreKey) =>
    groups.every((g) => g.key === ignoreKey || selection[g.key] === null || norm(getValue(item, g.key)) === norm(selection[g.key]));

  const universe = groups.map((g) => {
    const seen = [];
    for (const v of [...(g.values ?? []), ...items.map((item) => getValue(item, g.key))]) {
      const value = String(v ?? '').trim();
      if (value && !seen.some((x) => norm(x) === norm(value))) seen.push(value);
    }
    // A fixed `values` list only orders options; values that never occur are dropped.
    return seen.filter((v) => items.some((item) => norm(getValue(item, g.key)) === norm(v)));
  });

  const rows = groups.map((g, gi) => {
    const buttons = [null, ...universe[gi]].map((value) => {
      const button = h('button', { class: 'filters__btn', type: 'button', 'aria-pressed': 'false' }, value ?? 'All');
      button.addEventListener('click', () => {
        selection[g.key] = value;
        update();
      });
      return { value, button };
    });
    const row = h(
      'div',
      { class: 'filters__row', role: 'group', 'aria-label': g.label ? `Filter by ${g.label.toLowerCase()}` : 'Filter projects' },
      g.label ? h('span', { class: 'filters__label' }, g.label) : null,
      h('div', { class: 'filters__list' }, buttons.map((b) => b.button)),
    );
    return { row, buttons };
  });

  function update() {
    // A selected value may have become impossible after another group changed.
    groups.forEach((g, gi) => {
      const available = new Set(items.filter((item) => matches(item, g.key)).map((item) => norm(getValue(item, g.key))));
      if (selection[g.key] !== null && !available.has(norm(selection[g.key]))) selection[g.key] = null;
    });

    let anyShown = false;
    groups.forEach((g, gi) => {
      const available = new Set(items.filter((item) => matches(item, g.key)).map((item) => norm(getValue(item, g.key))));
      for (const { value, button } of rows[gi].buttons) {
        button.hidden = value !== null && !available.has(norm(value));
        button.setAttribute('aria-pressed', String(value === selection[g.key] || (value === null && selection[g.key] === null)));
      }
      const options = universe[gi].filter((v) => available.has(norm(v))).length;
      const show = universe[gi].length > 1 && (options > 1 || selection[g.key] !== null);
      rows[gi].row.hidden = !show;
      anyShown ||= show;
    });
    container.hidden = !anyShown;
    onChange(items.filter((item) => matches(item)), { ...selection });
  }

  container.replaceChildren(...rows.map((r) => r.row));
  update();

  return {
    selection,
    reset() {
      for (const key of Object.keys(selection)) selection[key] = null;
      update();
    },
  };
}

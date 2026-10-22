import { h } from '../utils/dom.js';

/**
 * Project detail view: a full-screen dialog with the project's images, its
 * description, keyboard (←/→/Esc) and swipe navigation. Built on <dialog>, so
 * focus is trapped and Esc works natively. One instance serves the whole page.
 */
export function createLightbox() {
  let dialog = null;
  let els = null;
  let state = { items: [], index: 0, project: null, opener: null };

  function build() {
    els = {
      img: h('img', { class: 'lb__img', alt: '' }),
      status: h('p', { class: 'lb__status', role: 'status' }),
      title: h('h2', { class: 'lb__title', id: 'lb-title' }),
      year: h('p', { class: 'lb__year' }),
      text: h('div', { class: 'lb__text' }),
      counter: h('p', { class: 'lb__counter', 'aria-live': 'polite' }),
      prev: h('button', { class: 'lb__btn', type: 'button', 'aria-label': 'Previous image' }, '← Prev'),
      next: h('button', { class: 'lb__btn', type: 'button', 'aria-label': 'Next image' }, 'Next →'),
      close: h('button', { class: 'lb__close', type: 'button', 'aria-label': 'Close project view' }, 'Close ×'),
    };

    const stage = h('div', { class: 'lb__stage' }, els.img, els.status);
    const panel = h(
      'aside',
      { class: 'lb__panel' },
      h('div', { class: 'lb__info' }, els.title, els.year, els.text),
      h('div', { class: 'lb__controls' }, els.prev, els.counter, els.next),
    );

    dialog = h('dialog', { class: 'lb', 'aria-labelledby': 'lb-title' }, els.close, h('div', { class: 'lb__inner' }, stage, panel));
    document.body.append(dialog);

    els.prev.addEventListener('click', () => go(-1));
    els.next.addEventListener('click', () => go(1));
    els.close.addEventListener('click', () => dialog.close());

    els.img.addEventListener('load', () => {
      els.status.textContent = '';
      els.img.hidden = false;
    });
    els.img.addEventListener('error', () => {
      els.img.hidden = true;
      els.status.textContent = 'This image couldn’t be loaded.';
    });

    // Click on empty stage area closes (but not on the image itself).
    stage.addEventListener('click', (e) => {
      if (e.target === stage) dialog.close();
    });

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });

    // Swipe
    let startX = null;
    stage.addEventListener('touchstart', (e) => (startX = e.changedTouches[0].clientX), { passive: true });
    stage.addEventListener(
      'touchend',
      (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        startX = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      },
      { passive: true },
    );

    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('is-locked');
      state.opener?.focus?.({ preventScroll: true });
    });
  }

  function render() {
    const { items, index, project } = state;
    const item = items[index];

    els.img.hidden = false;
    els.status.textContent = '';
    els.img.alt = item.alt;
    els.img.src = item.src;

    els.title.textContent = project.name;
    els.year.textContent = project.year || '';
    els.year.hidden = !project.year;
    els.text.replaceChildren(...project.paragraphs.map((p) => h('p', {}, p)));
    els.text.hidden = project.paragraphs.length === 0;
    els.counter.textContent = `${index + 1} / ${items.length}`;

    const single = items.length < 2;
    els.prev.hidden = els.next.hidden = single;

    // Warm the cache for neighbours.
    for (const offset of [1, -1]) {
      const neighbour = items[(index + offset + items.length) % items.length];
      if (neighbour && neighbour !== item) new Image().src = neighbour.src;
    }
  }

  function go(step) {
    const n = state.items.length;
    if (n < 2) return;
    state.index = (state.index + step + n) % n;
    render();
  }

  return {
    open({ items, index = 0, project }, opener) {
      if (!dialog) build();
      state = { items, index, project, opener };
      render();
      document.documentElement.classList.add('is-locked');
      if (!dialog.open) dialog.showModal();
    },
  };
}

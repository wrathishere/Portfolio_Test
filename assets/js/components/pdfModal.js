import { h } from '../utils/dom.js';
import { PDFJS } from '../config.js';

/**
 * Large, centered PDF viewer in a <dialog> (focus trap, Esc, backdrop click).
 *
 * - Pages are drawn with PDF.js onto canvases stacked vertically in one scrolling
 *   area, so the whole document scrolls top to bottom. Pages render lazily as they
 *   near the viewport.
 * - Zoom: − / + / Fit (and the + − 0 keys). 100% = page width fits the window.
 * - "Open in new tab" always works, and is the fallback if PDF.js can't be loaded:
 *   the browser's own PDF viewer is then embedded instead (zoom controls hidden).
 * - PDF.js is loaded from PDFJS.lib only the first time a modal opens.
 *
 * One instance serves the whole page: `createPdfModal().open({ title, url, opener })`.
 */

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const MAX_DPR = 2; // cap canvas density so large pages stay light on memory

let pdfjsPromise = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  pdfjsPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS.lib;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (!window.pdfjsLib) return reject(new Error('PDF viewer library did not initialise'));
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS.worker;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Could not load the PDF viewer'));
    document.head.append(script);
  }).catch((error) => {
    pdfjsPromise = null; // allow a retry on the next open
    throw error;
  });
  return pdfjsPromise;
}

export function createPdfModal() {
  let dialog = null;
  let els = null;
  let session = 0; // increments per open(); stale async work checks it and stops
  let state = null; // { doc, pages, zoom, url, opener }

  function build() {
    const mkButton = (label, text, onClick) => h('button', { class: 'pdfm__btn', type: 'button', 'aria-label': label, onclick: onClick }, text);

    els = {
      title: h('h2', { class: 'pdfm__title', id: 'pdfm-title' }),
      pageInfo: h('p', { class: 'pdfm__pages', 'aria-live': 'polite' }),
      zoomOut: mkButton('Zoom out', '−', () => stepZoom(-1)),
      zoomIn: mkButton('Zoom in', '+', () => stepZoom(1)),
      zoomFit: mkButton('Fit to width', 'Fit', () => setZoom(1)),
      zoomLabel: h('span', { class: 'pdfm__zoom-label', 'aria-live': 'polite' }, '100%'),
      newTab: h('a', { class: 'pdfm__btn pdfm__btn--link', target: '_blank', rel: 'noopener', href: '#' }, 'Open in new tab ↗'),
      close: h('button', { class: 'pdfm__btn pdfm__close', type: 'button', 'aria-label': 'Close PDF', onclick: () => dialog.close() }, 'Close ×'),
      status: h('p', { class: 'pdfm__status', role: 'status' }),
      pages: h('div', { class: 'pdfm__pagelist' }),
    };
    els.zoomGroup = h('div', { class: 'pdfm__zoom', role: 'group', 'aria-label': 'Zoom' }, els.zoomOut, els.zoomLabel, els.zoomIn, els.zoomFit);
    els.scroll = h('div', { class: 'pdfm__scroll', tabindex: '0', 'aria-label': 'PDF pages' }, els.status, els.pages);

    dialog = h(
      'dialog',
      { class: 'pdfm', 'aria-labelledby': 'pdfm-title' },
      h(
        'header',
        { class: 'pdfm__bar' },
        h('div', { class: 'pdfm__heading' }, els.title, els.pageInfo),
        h('div', { class: 'pdfm__tools' }, els.zoomGroup, els.newTab, els.close),
      ),
      els.scroll,
    );
    document.body.append(dialog);

    // Click on the dimmed area (the <dialog> box itself) closes.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => teardown(true));
    dialog.addEventListener('keydown', (e) => {
      if (!state?.doc || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '+' || e.key === '=') (e.preventDefault(), stepZoom(1));
      else if (e.key === '-' || e.key === '_') (e.preventDefault(), stepZoom(-1));
      else if (e.key === '0') (e.preventDefault(), setZoom(1));
    });

    let frame = 0;
    els.scroll.addEventListener(
      'scroll',
      () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          renderVisible();
          updatePageInfo();
        });
      },
      { passive: true },
    );

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      if (!dialog.open || !state?.doc) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => applyZoom(), 150);
    });
  }

  /* ---------- sizing & rendering ---------- */

  const fitWidth = () => Math.max(200, els.scroll.clientWidth - 2 * parseFloat(getComputedStyle(els.pages).paddingLeft || 0));

  function pageScale(page) {
    return (fitWidth() * state.zoom) / page.base.width; // CSS px per PDF unit
  }

  function applyZoom({ keepPosition = true } = {}) {
    if (!state?.doc) return;
    const ratio = keepPosition && els.scroll.scrollHeight ? els.scroll.scrollTop / els.scroll.scrollHeight : 0;
    for (const page of state.pages) {
      page.task?.cancel();
      page.renderedScale = 0;
      const scale = pageScale(page);
      page.wrap.style.width = `${Math.round(page.base.width * scale)}px`;
      page.wrap.style.height = `${Math.round(page.base.height * scale)}px`;
    }
    els.scroll.scrollTop = ratio * els.scroll.scrollHeight;
    els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    els.zoomOut.disabled = state.zoom <= ZOOM_STEPS[0];
    els.zoomIn.disabled = state.zoom >= ZOOM_STEPS.at(-1);
    renderVisible();
    updatePageInfo();
  }

  function setZoom(value) {
    if (!state?.doc) return;
    state.zoom = value;
    applyZoom();
  }

  function stepZoom(direction) {
    if (!state?.doc) return;
    const i = ZOOM_STEPS.findIndex((z) => z >= state.zoom - 1e-6);
    const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, (i === -1 ? ZOOM_STEPS.length - 1 : i) + direction))];
    setZoom(next);
  }

  // Renders for one canvas run one at a time: PDF.js refuses a new render() on a
  // canvas whose cancelled render hasn't finished yet (rapid zoom clicks).
  function renderPage(page, mySession) {
    const scale = pageScale(page);
    page.renderedScale = scale; // marks "queued at this scale" so renderVisible() skips it
    const previous = page.done;

    page.done = (async () => {
      await previous;
      if (mySession !== session || page.renderedScale !== scale) return; // superseded or closed
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const viewport = page.pdfPage.getViewport({ scale: scale * dpr });
      page.canvas.width = Math.floor(viewport.width);
      page.canvas.height = Math.floor(viewport.height);
      const task = page.pdfPage.render({ canvasContext: page.canvas.getContext('2d'), viewport });
      page.task = task;
      try {
        await task.promise;
        if (mySession === session) page.wrap.dataset.state = 'ready';
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException') console.warn('[pdf] page render failed', error);
        if (page.renderedScale === scale) page.renderedScale = 0;
      } finally {
        if (page.task === task) page.task = null;
      }
    })();
  }

  function renderVisible() {
    if (!state?.doc) return;
    const mySession = session;
    const box = els.scroll.getBoundingClientRect();
    const margin = box.height; // pre-render one screen above/below
    for (const page of state.pages) {
      if (Math.abs(page.renderedScale - pageScale(page)) < 1e-6) continue;
      const r = page.wrap.getBoundingClientRect();
      if (r.bottom >= box.top - margin && r.top <= box.bottom + margin) renderPage(page, mySession);
    }
  }

  function updatePageInfo() {
    if (!state?.doc) return;
    // "Current" = the first page that still reaches below the top quarter of the window;
    // at the very end it is the last page (small pages can leave several in view).
    const box = els.scroll;
    const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
    const threshold = box.getBoundingClientRect().top + box.clientHeight * 0.25;
    let current = state.pages.findIndex((page) => page.wrap.getBoundingClientRect().bottom > threshold) + 1;
    if (atEnd || current === 0) current = state.pages.length;
    els.pageInfo.textContent = `Page ${current} of ${state.pages.length}`;
  }

  /* ---------- open / close ---------- */

  function showFallback(url, title, message) {
    els.zoomGroup.hidden = true;
    els.pageInfo.textContent = '';
    els.status.textContent = '';
    els.pages.replaceChildren(
      message ? h('p', { class: 'pdfm__note' }, message) : null,
      h('iframe', { class: 'pdfm__frame', src: url, title: `${title} (PDF)` }),
    );
    els.scroll.classList.add('is-frame');
  }

  async function open({ title, url, opener = null }) {
    if (!dialog) build();
    const mySession = ++session;
    teardown(false);
    state = { doc: null, pages: [], zoom: 1, url, opener };

    els.title.textContent = title;
    els.newTab.href = url;
    els.zoomGroup.hidden = false;
    els.scroll.classList.remove('is-frame');
    els.pageInfo.textContent = '';
    els.zoomLabel.textContent = '100%';
    els.status.textContent = 'Loading PDF…';
    els.pages.replaceChildren();
    els.scroll.scrollTop = 0;

    document.documentElement.classList.add('is-locked');
    if (!dialog.open) dialog.showModal();
    els.scroll.focus({ preventScroll: true });

    try {
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ url }).promise;
      if (mySession !== session) return doc.destroy();
      state.doc = doc;

      const pages = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const pdfPage = await doc.getPage(n);
        if (mySession !== session) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const canvas = h('canvas', { class: 'pdfm__canvas', role: 'img', 'aria-label': `Page ${n} of ${doc.numPages}` });
        const wrap = h('div', { class: 'pdfm__page', dataset: { state: 'loading' } }, canvas);
        pages.push({ pdfPage, base, canvas, wrap, task: null, done: null, renderedScale: 0 });
      }
      state.pages = pages;
      els.status.textContent = '';
      els.pages.replaceChildren(...pages.map((p) => p.wrap));
      applyZoom({ keepPosition: false });
    } catch (error) {
      if (mySession !== session) return;
      console.warn('[pdf] viewer unavailable, using the browser’s PDF viewer:', error);
      state.doc = null;
      showFallback(url, title, 'Showing your browser’s built-in PDF viewer.');
    }
  }

  function teardown(restoreFocus = true) {
    if (!state) return;
    for (const page of state.pages) page.task?.cancel();
    state.doc?.destroy?.();
    const opener = state.opener;
    state = null;
    session += restoreFocus ? 1 : 0; // closing invalidates any in-flight load
    if (restoreFocus) {
      document.documentElement.classList.remove('is-locked');
      els.pages.replaceChildren();
      els.scroll.classList.remove('is-frame');
      opener?.focus?.({ preventScroll: true });
    }
  }

  return { open };
}
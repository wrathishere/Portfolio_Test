import { imageSources, rememberFolder } from './paths.js';

/**
 * Loads a sheet-named WebP into an <img>, trying each candidate folder in turn
 * (see IMAGE_FOLDERS) until one works. Listeners are attached once, so the same
 * <img> can be reused for many files (the lightbox does this).
 *
 * @param {HTMLImageElement} img
 * @param {object} [o]
 * @param {string} [o.folderKey]  default folder key (can be overridden per load)
 * @param {(url: string) => void} [o.onLoad]
 * @param {(url: string) => void} [o.onFallback]  a candidate failed; trying the next
 * @param {(urls: string[]) => void} [o.onFail]   every candidate failed (or no filename)
 */
export function createImageLoader(img, { folderKey: defaultKey, onLoad, onFallback, onFail } = {}) {
  let key = defaultKey;
  let sources = [];
  let i = 0;

  img.addEventListener('load', () => {
    rememberFolder(key, sources[i]);
    onLoad?.(sources[i]);
  });
  img.addEventListener('error', () => {
    if (i + 1 < sources.length) {
      i += 1;
      onFallback?.(sources[i]);
      img.src = sources[i];
    } else {
      onFail?.(sources);
    }
  });

  return {
    load(file, folderKey = defaultKey) {
      key = folderKey;
      sources = imageSources(key, file);
      i = 0;
      if (!sources.length) {
        onFail?.(sources);
        return;
      }
      img.src = sources[0];
    },
  };
}

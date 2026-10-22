/**
 * Loads `primary` into an <img>; if it fails and a different `fallback` is
 * given, loads that instead. Used for "thumbnail first, original if the
 * thumbnail is missing or broken".
 *
 * @param {HTMLImageElement} img
 * @param {object} o
 * @param {string} o.primary
 * @param {string} [o.fallback]
 * @param {() => void} [o.onFallback]  called when switching to the fallback
 * @param {() => void} [o.onFail]      called when nothing could be loaded
 */
export function loadWithFallback(img, { primary, fallback, onFallback, onFail }) {
  let usedFallback = false;

  const onError = () => {
    if (!usedFallback && fallback && fallback !== primary) {
      usedFallback = true;
      onFallback?.();
      img.src = fallback;
      return;
    }
    img.removeEventListener('error', onError);
    onFail?.();
  };

  img.addEventListener('error', onError);
  img.src = primary;
}

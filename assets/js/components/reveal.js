/**
 * Subtle fade-up on scroll. Elements only get hidden if IntersectionObserver
 * exists, so nothing can ever be stuck invisible. CSS disables the motion for
 * users who prefer reduced motion.
 */
export function observeReveal(elements) {
  const list = [...elements];
  if (!('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.04, rootMargin: '0px 0px -6% 0px' },
  );

  for (const el of list) {
    el.classList.add('reveal');
    io.observe(el);
  }
}

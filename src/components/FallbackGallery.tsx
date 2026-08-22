import type { PortfolioPage } from '../data/types';

export function FallbackGallery({ pages, reason }: { pages: PortfolioPage[]; reason?: string }) {
  return (
    <main className="fallback">
      <h1>Portfolio Book</h1>
      {reason && <p className="fallback-reason">{reason}</p>}
      {pages.map((page) => (
        <figure key={page.id}>
          <img src={page.imageUrl} alt={page.title || page.id} />
          <figcaption>{page.title || page.id}</figcaption>
        </figure>
      ))}
    </main>
  );
}

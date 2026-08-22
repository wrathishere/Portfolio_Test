import type { PortfolioPage } from '../data/types';
export function FallbackGallery({pages}:{pages:PortfolioPage[]}){ return <main className="fallback"><h1>Portfolio Book</h1>{pages.map(p=><figure key={p.id}><img src={p.imageUrl} alt={p.title||p.id}/><figcaption>{p.title||p.id}</figcaption></figure>)}</main>; }

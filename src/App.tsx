import { useEffect, useMemo, useState } from 'react';
import { BookCanvas } from './book/Book';
import { BookController } from './book/BookController';
import { FallbackGallery } from './components/FallbackGallery';
import { Navigation } from './components/Navigation';
import { RuntimeErrorBoundary } from './components/RuntimeErrorBoundary';
import { fetchPortfolioPages } from './data/googleSheets';
import type { PortfolioDataResult } from './data/types';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { canUseWebGL } from './utils/webgl';
import './styles/global.css';

export default function App() {
  const [data, setData] = useState<PortfolioDataResult>();
  const [error, setError] = useState<string>();
  const [, forceRender] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    fetchPortfolioPages()
      .then((result) => {
        result.warnings.forEach((warning) => console.warn(warning));
        setData(result);
      })
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : String(caughtError)));
  }, []);

  const controller = useMemo(() => {
    if (!data) return undefined;
    const pageCount = data.pages.filter((page) => page.type === 'page').length;
    return new BookController(Math.max(1, Math.ceil(pageCount / 2)), () => forceRender((value) => value + 1), reducedMotion);
  }, [data, reducedMotion]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!controller) return;
      if (event.key === 'ArrowRight') controller.turn('forward');
      if (event.key === 'ArrowLeft') controller.turn('backward');
    };

    addEventListener('keydown', handleKeyDown);
    return () => removeEventListener('keydown', handleKeyDown);
  }, [controller]);

  if (error) {
    return (
      <main className="status" role="alert">
        <h1>Portfolio data unavailable</h1>
        <p>{error}</p>
        <p>Make the Google Sheet public, check the tab name, or enable explicit demo data while developing.</p>
      </main>
    );
  }

  if (!data || !controller) {
    return (
      <main className="status" aria-busy="true">
        <p>Loading portfolio book…</p>
      </main>
    );
  }

  if (!canUseWebGL()) return <FallbackGallery pages={data.pages} reason="WebGL is unavailable in this browser." />;

  const innerPageCount = data.pages.filter((page) => page.type === 'page').length;

  return (
    <RuntimeErrorBoundary fallback={<FallbackGallery pages={data.pages} reason="The 3D renderer could not start, so the accessible portfolio gallery is shown instead." />}>
      <main className="app">
        <section className="stage" aria-label="Interactive 3D portfolio book">
          <BookCanvas pages={data.pages} controller={controller} />
        </section>
        <Navigation controller={controller} current={controller.spread * 2 + 1} total={innerPageCount} onTick={() => forceRender((value) => value + 1)} />
        <p className="hint">Click the closed book to open. Drag page corners, swipe, or use arrow keys to browse.</p>
      </main>
    </RuntimeErrorBoundary>
  );
}

import type { PhysicalSheet, PortfolioPage } from './types';

const makeDemoArtwork = (background: string, foreground: string, title: string, subtitle = '') =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600">
      <rect width="1200" height="1600" fill="${background}"/>
      <rect x="86" y="86" width="1028" height="1428" rx="18" fill="none" stroke="${foreground}" stroke-width="5"/>
      <text x="120" y="250" fill="${foreground}" font-family="Inter,Arial" font-size="82" font-weight="700">${title}</text>
      <text x="120" y="350" fill="${foreground}" font-family="Inter,Arial" font-size="34">${subtitle}</text>
      <circle cx="900" cy="1120" r="170" fill="${foreground}" opacity=".14"/>
      <path d="M170 1240h650" stroke="${foreground}" stroke-width="22" stroke-linecap="round" opacity=".28"/>
    </svg>`)} `;

export const demoPages: PortfolioPage[] = [
  { id: 'cover', order: 1, type: 'cover', mediaKind: 'image', source: 'demo-cover', title: 'Portfolio Cover', imageUrl: makeDemoArtwork('#241d18', '#f2e9dc', 'DESIGN', 'Portfolio Book') },
  { id: 'intro', order: 2, type: 'page', mediaKind: 'image', source: 'demo-intro', title: 'Introduction', imageUrl: makeDemoArtwork('#f6f0e8', '#221b16', 'HELLO', 'Selected graphic design work') },
  { id: 'brand-a', order: 3, type: 'page', mediaKind: 'image', source: 'demo-brand', project: 'Branding', title: 'Project One', imageUrl: makeDemoArtwork('#e8ded2', '#7b3f2f', 'BRAND', 'Identity system') },
  { id: 'editorial', order: 4, type: 'page', mediaKind: 'image', source: 'demo-editorial', project: 'Editorial', title: 'Magazine', imageUrl: makeDemoArtwork('#efe7d8', '#1f3c46', 'PRINT', 'Editorial layouts') },
  { id: 'poster', order: 5, type: 'page', mediaKind: 'image', source: 'demo-poster', project: 'Poster', title: 'Campaign', imageUrl: makeDemoArtwork('#e7e2ef', '#33264f', 'POSTER', 'Campaign visuals') },
  { id: 'back', order: 6, type: 'back_cover', mediaKind: 'image', source: 'demo-back', title: 'Contact', imageUrl: makeDemoArtwork('#241d18', '#f2e9dc', 'THANK YOU', 'contact@example.com') },
];

export function buildSheets(pages: PortfolioPage[]): PhysicalSheet[] {
  const innerPages = pages.filter((page) => page.type === 'page');
  const sheets: PhysicalSheet[] = [];

  for (let pageIndex = 0; pageIndex < innerPages.length; pageIndex += 2) {
    sheets.push({
      sheetIndex: sheets.length,
      front: innerPages[pageIndex],
      back: innerPages[pageIndex + 1],
    });
  }

  return sheets;
}

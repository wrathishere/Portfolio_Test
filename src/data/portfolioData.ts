import type { PhysicalSheet, PortfolioPage } from './types';
const svg = (bg:string, fg:string, title:string, sub='') => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="${bg}"/><rect x="86" y="86" width="1028" height="1428" rx="18" fill="none" stroke="${fg}" stroke-width="5"/><text x="120" y="250" fill="${fg}" font-family="Inter,Arial" font-size="82" font-weight="700">${title}</text><text x="120" y="350" fill="${fg}" font-family="Inter,Arial" font-size="34">${sub}</text><circle cx="900" cy="1120" r="170" fill="${fg}" opacity=".14"/><path d="M170 1240h650" stroke="${fg}" stroke-width="22" stroke-linecap="round" opacity=".28"/></svg>`)}`;
export const demoPages: PortfolioPage[] = [
 {id:'cover',order:1,type:'cover',title:'Portfolio Cover',imageUrl:svg('#241d18','#f2e9dc','DESIGN','Portfolio Book')},
 {id:'intro',order:2,type:'page',title:'Introduction',imageUrl:svg('#f6f0e8','#221b16','HELLO','Selected graphic design work')},
 {id:'brand-a',order:3,type:'page',project:'Branding',title:'Project One',imageUrl:svg('#e8ded2','#7b3f2f','BRAND','Identity system')},
 {id:'editorial',order:4,type:'page',project:'Editorial',title:'Magazine',imageUrl:svg('#efe7d8','#1f3c46','PRINT','Editorial layouts')},
 {id:'poster',order:5,type:'page',project:'Poster',title:'Campaign',imageUrl:svg('#e7e2ef','#33264f','POSTER','Campaign visuals')},
 {id:'back',order:6,type:'back_cover',title:'Contact',imageUrl:svg('#241d18','#f2e9dc','THANK YOU','contact@example.com')},
];
export function buildSheets(pages: PortfolioPage[]): PhysicalSheet[] { const inner = pages.filter(p=>p.type==='page'); const sheets: PhysicalSheet[]=[]; for(let i=0;i<inner.length;i+=2) sheets.push({sheetIndex:sheets.length,front:inner[i],back:inner[i+1]}); return sheets; }

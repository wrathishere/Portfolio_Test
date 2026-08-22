export type PageType = 'cover' | 'page' | 'back_cover';
export interface PortfolioPage { id: string; order: number; imageUrl: string; type: PageType; project?: string; title?: string; }
export interface PhysicalSheet { sheetIndex: number; front: PortfolioPage; back?: PortfolioPage; }
export interface PortfolioDataResult { pages: PortfolioPage[]; sheets: PhysicalSheet[]; warnings: string[]; source: 'google-sheets' | 'demo'; }

export type PageType = 'cover' | 'page' | 'back_cover';
export type MediaKind = 'image' | 'video';

export interface PortfolioPage {
  id: string;
  order: number;
  imageUrl: string;
  source: string;
  type: PageType;
  mediaKind: MediaKind;
  project?: string;
  title?: string;
  year?: string;
}

export interface PhysicalSheet {
  sheetIndex: number;
  front: PortfolioPage;
  back?: PortfolioPage;
}

export interface PortfolioDataResult {
  pages: PortfolioPage[];
  sheets: PhysicalSheet[];
  warnings: string[];
  source: 'google-sheets' | 'demo';
}

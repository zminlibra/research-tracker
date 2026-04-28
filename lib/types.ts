export interface Article {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceType: 'news' | 'paper';
  url: string;
  imageUrl: string | null;
  publishedDate: string;
  authors: string[];
  tags: string[];
  clickCount: number;
}

export interface SearchResult {
  articles: Article[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AIInsight {
  summary: string;
  analysis: string;
  keyPoints: string[];
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
}

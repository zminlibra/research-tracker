/**
 * Crossref 数据源 Fetcher 封装。
 */

import type { Article } from '../types';
import type { Fetcher, SearchOptions } from './base-fetcher';
import { getCached, setCached, makeCacheKey } from '../cache';
import { searchCrossRef as apiSearch, getCrossRefByDoi as apiGetById } from '../crossref';

export class CrossrefFetcher implements Fetcher {
  name = 'Crossref';
  sourceType = 'paper' as const;

  async search(options: SearchOptions): Promise<Article[]> {
    const { query, limit = 20, offset = 0 } = options;
    const cacheKey = makeCacheKey('crossref', { q: query, l: limit, o: offset });
    const cached = getCached<Article[]>(cacheKey);
    if (cached) return cached;

    const articles = await apiSearch(query, limit, offset);
    setCached(cacheKey, articles, 30 * 60 * 1000);
    return articles;
  }

  async fetchById(id: string): Promise<Article | null> {
    // id 格式：crossref-DOI
    const doi = id.replace('crossref-', '');
    const cacheKey = `crossref-byid-${doi}`;
    const cached = getCached<Article>(cacheKey);
    if (cached) return cached;

    const article = await apiGetById(doi);
    if (article) setCached(cacheKey, article, 60 * 60 * 1000);
    return article;
  }
}

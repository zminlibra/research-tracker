/**
 * arXiv 数据源 Fetcher 封装。
 */

import type { Article, SearchResult } from '../types';
import type { Fetcher, SearchOptions } from './base-fetcher';
import { getCached, setCached, makeCacheKey } from '../cache';
import { searchArxiv as apiSearch, getArxivById as apiGetById } from '../arxiv';

export class ArxivFetcher implements Fetcher {
  name = 'arXiv';
  sourceType = 'paper' as const;

  async search(options: SearchOptions): Promise<Article[]> {
    const { query, limit = 20, offset = 0 } = options;
    const cacheKey = makeCacheKey('arxiv', { q: query, l: limit, o: offset });
    const cached = getCached<Article[]>(cacheKey);
    if (cached) return cached;

    const articles = await apiSearch(query, limit, offset);
    setCached(cacheKey, articles, 30 * 60 * 1000);
    return articles;
  }

  async fetchById(id: string): Promise<Article | null> {
    const cacheKey = `arxiv-byid-${id}`;
    const cached = getCached<Article>(cacheKey);
    if (cached) return cached;

    const article = await apiGetById(id.replace('arxiv-', ''));
    if (article) setCached(cacheKey, article, 60 * 60 * 1000);
    return article;
  }
}

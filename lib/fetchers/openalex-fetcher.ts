/**
 * OpenAlex 数据源 Fetcher 封装。
 */

import type { Article } from '../types';
import type { Fetcher, SearchOptions } from './base-fetcher';
import { getCached, setCached, makeCacheKey } from '../cache';
import { searchOpenAlex as apiSearch, getOpenAlexById as apiGetById } from '../openalex';

export class OpenAlexFetcher implements Fetcher {
  name = 'OpenAlex';
  sourceType = 'paper' as const;

  async search(options: SearchOptions): Promise<Article[]> {
    const { query, limit = 20, offset = 0 } = options;
    const cacheKey = makeCacheKey('openalex', { q: query, l: limit, o: offset });
    const cached = getCached<Article[]>(cacheKey);
    if (cached) return cached;

    const page = Math.floor(offset / limit) + 1;
    const articles = await apiSearch(query, limit, page);
    setCached(cacheKey, articles, 30 * 60 * 1000);
    return articles;
  }

  async fetchById(id: string): Promise<Article | null> {
    const cacheKey = `openalex-byid-${id}`;
    const cached = getCached<Article>(cacheKey);
    if (cached) return cached;

    const article = await apiGetById(id);
    if (article) setCached(cacheKey, article, 60 * 60 * 1000);
    return article;
  }
}

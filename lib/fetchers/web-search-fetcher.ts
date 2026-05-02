/**
 * SearXNG 网页搜索数据源 Fetcher 封装。
 */

import type { Article } from '../types';
import type { Fetcher, SearchOptions } from './base-fetcher';
import { getCached, setCached, makeCacheKey } from '../cache';
import { searchWeb as apiSearch } from '../web-search';

export class WebSearchFetcher implements Fetcher {
  name = 'Web Search';
  sourceType = 'news' as const;

  async search(options: SearchOptions): Promise<Article[]> {
    const { query, limit = 15 } = options;
    const cacheKey = makeCacheKey('web', { q: query, l: limit });
    const cached = getCached<Article[]>(cacheKey);
    if (cached) return cached;

    const articles = await apiSearch(query, limit);
    setCached(cacheKey, articles, 15 * 60 * 1000);
    return articles;
  }

  async fetchById(): Promise<Article | null> {
    // 网页搜索结果不支持按 ID 获取
    return null;
  }
}

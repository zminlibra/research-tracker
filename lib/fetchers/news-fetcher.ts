/**
 * 新闻/RSS 数据源 Fetcher 封装。
 */

import type { Article } from '../types';
import type { Fetcher, SearchOptions } from './base-fetcher';
import { getCached, setCached, makeCacheKey } from '../cache';
import { searchNews as apiSearch, getNewsFromFeeds as apiGetFeeds } from '../news';

export class NewsFetcher implements Fetcher {
  name = 'News & RSS';
  sourceType = 'news' as const;

  async search(options: SearchOptions): Promise<Article[]> {
    const { query, limit = 15 } = options;
    const cacheKey = makeCacheKey('news', { q: query, l: limit });
    const cached = getCached<Article[]>(cacheKey);
    if (cached) return cached;

    const articles = await apiSearch(query, limit);
    setCached(cacheKey, articles, 10 * 60 * 1000); // 新闻缓存 10 分钟
    return articles;
  }

  async fetchById(): Promise<Article | null> {
    // 新闻不支持按 ID 获取
    return null;
  }
}

/**
 * 获取热门新闻供稿（不按关键词过滤，用于首页填充）。
 */
export async function fetchTrendingNews(limit = 20): Promise<Article[]> {
  const cacheKey = 'trending-news';
  const cached = getCached<Article[]>(cacheKey);
  if (cached) return cached;

  const articles = await apiGetFeeds(limit);
  setCached(cacheKey, articles, 30 * 60 * 1000);
  return articles;
}

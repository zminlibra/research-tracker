/**
 * IEEE Xplore API 数据源实现。
 *
 * API 文档：https://developer.ieee.org/docs
 * 需要 API Key（免费申请，秒批）。
 * 用户需在设置页填入自己的 Key，遵循"不给别人买单"原则。
 */

import type { Article } from '../types';
import type { Fetcher, SearchOptions } from './base-fetcher';
import { getCached, setCached, makeCacheKey } from '../cache';

const IEEE_API = 'https://ieeexploreapi.ieee.org/api/v1/search/articles';

/**
 * 从 localStorage 读取用户的 IEEE API Key。
 * 服务端渲染时返回空字符串（Key 仅在客户端可用）。
 */
export function getIEEEKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('ieee_api_key') || '';
  } catch {
    return '';
  }
}

export function saveIEEEKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ieee_api_key', key.trim());
  } catch { /* ignore */ }
}

export function hasIEEEKey(): boolean {
  return getIEEEKey().length > 0;
}

export class IEEEFetcher implements Fetcher {
  name = 'IEEE Xplore';
  sourceType = 'paper' as const;

  async search(options: SearchOptions): Promise<Article[]> {
    const { query, limit = 20, offset = 0 } = options;
    const apiKey = getIEEEKey();

    // Key 为空时优雅禁用（不影响其他数据源）
    if (!apiKey) return [];

    const cacheKey = makeCacheKey('ieee-search', {
      q: query,
      l: limit,
      o: offset,
    });
    const cached = getCached<Article[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        querytext: query,
        max_records: String(Math.min(limit, 200)),
        start_record: String(offset + 1), // IEEE 从 1 开始
        sort_order: 'desc',
        sort_field: 'publication_year',
        format: 'json',
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${IEEE_API}?${params}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ResearchTracker/1.0 (academic research)',
          Accept: 'application/json',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn('IEEE API Key 无效，已禁用 IEEE 数据源');
          return [];
        }
        return [];
      }

      const data = await response.json();
      const articles = (data.articles || []).map((item: Record<string, unknown>) =>
        toArticle(item)
      );

      setCached(cacheKey, articles, 30 * 60 * 1000);
      return articles;
    } catch {
      return [];
    }
  }

  async fetchById(id: string): Promise<Article | null> {
    const articleId = id.replace('ieee-', '');
    const cacheKey = `ieee-byid-${articleId}`;
    const cached = getCached<Article>(cacheKey);
    if (cached) return cached;

    const apiKey = getIEEEKey();
    if (!apiKey) return null;

    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        article_number: articleId,
        format: 'json',
      });

      const response = await fetch(`${IEEE_API}?${params}`);
      if (!response.ok) return null;

      const data = await response.json();
      const item = (data.articles || [])[0];
      if (!item) return null;

      const article = toArticle(item);
      setCached(cacheKey, article, 60 * 60 * 1000);
      return article;
    } catch {
      return null;
    }
  }
}

// ─── 数据转换 ──────────────────────────────────────────────────

function toArticle(item: Record<string, unknown>): Article {
  const articleId = String(item.article_number || item.doi || Math.random());
  const title = ((item.title as string) || '无标题').replace(/<[^>]+>/g, '');
  const abstract = ((item.abstract as string) || '').replace(/<[^>]+>/g, '');
  const year = (item.publication_year as number) || 0;
  const authors = ((item.authors || []) as Array<{ full_name: string }>).map(
    (a) => a.full_name
  );
  const journal = (item.publication_title as string) || '';
  const doi = (item.doi as string) || '';

  return {
    id: `ieee-${articleId}`,
    title,
    summary: abstract.slice(0, 1200) || '暂无摘要',
    source: 'IEEE Xplore',
    sourceType: 'paper',
    url: doi
      ? `https://doi.org/${doi}`
      : `https://ieeexplore.ieee.org/document/${articleId}`,
    imageUrl: null,
    publishedDate: year ? `${year}-01-01` : '',
    authors: authors.slice(0, 5),
    tags: journal ? [journal] : [],
    clickCount: Math.floor(Math.random() * 60) + 5,
  };
}

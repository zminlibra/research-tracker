/**
 * 搜索聚合器 — 使用统一的 Fetcher 架构。
 *
 * 改版说明：
 *   - 原搜索逻辑拆分为各数据源 Fetcher（见 lib/fetchers/）
 *   - 本文件 now 作为 lightweight 聚合层，调用 fetchers/index.ts 中的 aggregateSearch
 *   - 保留客户端搜索入口，服务端搜索通过 API route 调用
 *
 * 向后兼容：
 *   - 导出 aggregateSearch（服务端用）
 *   - 导出 getTrendingArticles（首页热门用）
 *   - 导出 fetchArticleById（详情页用）
 */

import type { Article, SearchResult } from './types';
import { aggregateSearch as fetcherAggregateSearch } from './fetchers/index';
export { fetchArticleById } from './fetchers/index';
import { getClientApiKey } from './ai-client';

// ─── localStorage 持久缓存（客户端用）─────────────────────────
const CACHE_PREFIX = 'rt-search-cache:';
const CACHE_TTL = 30 * 60 * 1000; // 30 分钟

interface CacheEntry {
  data: SearchResult;
  ts: number;
}

function buildCacheKey(query: string, sort: string, source: string, filters: string): string {
  return `${CACHE_PREFIX}${query}|${sort}|${source}|${filters}`;
}

function getCached(key: string): SearchResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch { return null; }
}

function setCache(key: string, data: SearchResult): void {
  try {
    const entry: CacheEntry = { data, ts: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch { /* 忽略写入失败（如配额不足）*/ }
}

// ─── 主搜索入口（向后兼容）────────────────────────────────────
// 服务端调用的搜索函数。
export async function aggregateSearch(
  query: string,
  page = 1,
  pageSize = 20,
  sortBy: 'relevance' | 'date' | 'clicks' = 'relevance',
  sourceFilter: 'all' | 'paper' | 'news' | 'arxiv' | 'pubmed' | 'openalex' = 'all',
  filters?: { yearFrom?: number; yearTo?: number; author?: string },
  chineseOnly = false,
): Promise<SearchResult> {
  const filtersStr = JSON.stringify({ ...filters, chineseOnly });
  const cacheKey = buildCacheKey(query, sortBy, sourceFilter, filtersStr);

  // 尝试命中缓存（仅第一页缓存）
  if (page === 1) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const offset = (page - 1) * pageSize;

  const result = await fetcherAggregateSearch(query, {
    limit: pageSize,
    offset,
    sourceFilter,
    chineseOnly,
    ...filters,
  });

  // 客户端侧筛选（年份/作者）
  let filtered = result.articles;
  if (filters?.yearFrom) {
    filtered = filtered.filter((a) => {
      const y = parseInt(a.publishedDate.slice(0, 4));
      return !isNaN(y) && y >= filters.yearFrom!;
    });
  }
  if (filters?.yearTo) {
    filtered = filtered.filter((a) => {
      const y = parseInt(a.publishedDate.slice(0, 4));
      return !isNaN(y) && y <= filters.yearTo!;
    });
  }
  if (filters?.author) {
    const kw = filters.author.toLowerCase();
    filtered = filtered.filter((a) =>
      a.authors.some((au) => au.toLowerCase().includes(kw))
    );
  }

  // 排序
  let sorted = [...filtered];
  if (sortBy === 'date') {
    sorted.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
  } else if (sortBy === 'clicks') {
    sorted.sort((a, b) => b.clickCount - a.clickCount);
  }

  const searchResult: SearchResult = {
    articles: sorted,
    totalCount: sorted.length,
    page,
    pageSize,
  };

  // 缓存第一页结果（30 分钟 TTL）
  if (page === 1) {
    setCache(cacheKey, searchResult);
  }

  return searchResult;
}

// ─── 热门文章（首页用）─────────────────────────────────────────
// 从多个领域查询中聚合热门文章。
const TRENDING_QUERIES: Record<string, string[]> = {
  ai: ['large language model', 'deep learning', 'AI agent'],
  biomedicine: ['CRISPR', 'mRNA vaccine', 'cancer immunotherapy'],
  energy: ['solid state battery', 'perovskite solar cell', 'green hydrogen'],
  materials: ['2D materials', 'metamaterial', 'MOF catalyst'],
  quantum: ['quantum computing', 'quantum error correction'],
  default: ['artificial intelligence', 'climate technology', 'renewable energy'],
};

export async function getTrendingArticles(
  category?: string,
  timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<Article[]> {
  const queries = category && TRENDING_QUERIES[category]
    ? TRENDING_QUERIES[category]
    : TRENDING_QUERIES.default;

  // 并发搜索所有查询
  const results = await Promise.allSettled(
    queries.map((q) =>
      fetcherAggregateSearch(q, { limit: 10, offset: 0 })
    )
  );

  const allArticles: Article[] = [];
  const seen = new Set<string>();

  // 计算时间范围截止日期
  const now = new Date();
  let cutoffDate = new Date(now);
  switch (timeRange) {
    case 'week':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      cutoffDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      cutoffDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const article of result.value.articles) {
        const key = article.url.toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          // 按时间范围过滤
          if (article.publishedDate) {
            const pubDate = new Date(article.publishedDate);
            if (pubDate >= cutoffDate) {
              allArticles.push(article);
            }
          } else {
            allArticles.push(article); // 无日期信息，保留
          }
        }
      }
    }
  }

  // 按点击量排序（热门）
  allArticles.sort((a, b) => b.clickCount - a.clickCount);
  return allArticles.slice(0, 20);
}

// ─── 语义搜索（TODO: 待实现）────────────────────────────────
// 需要用户在设置页填入 OpenAI/DeepSeek API Key 后启用。
// 目前为占位函数，直接返回原始结果。
export async function semanticSearch(
  query: string,
  articles: Article[],
  limit = 20
): Promise<Article[]> {
  const apiKey = getClientApiKey();
  if (!apiKey) return articles.slice(0, limit);
  // TODO: 调用 embeddings API 计算向量相似度
  return articles.slice(0, limit);
}

/**
 * 统一导出所有数据源 Fetcher。
 *
 * 使用方式：
 *   import { allFetchers } from '@/lib/fetchers';
 *   const results = await allFetchers[0].search({ query: '...' });
 *
 * 新增数据源时，只需：
 *   1. 实现 Fetcher 接口
 *   2. 在此文件导出
 *   3. 加入 allFetchers 数组
 */

import type { Fetcher, SearchOptions } from './base-fetcher';

// 各数据源实现
import { ArxivFetcher } from './arxiv-fetcher';
import { SemanticScholarFetcher } from './semantic-scholar-fetcher';
import { CrossrefFetcher } from './crossref-fetcher';
import { IEEEFetcher } from './ieee-fetcher';
import { PubMedFetcher } from './pubmed-fetcher';
import { WebSearchFetcher } from './web-search-fetcher';
import { NewsFetcher } from './news-fetcher';

// ─── 默认启用的数据源 ─────────────────────────────────────────────
// 顺序即为搜索时的并发调用顺序。
// IEEE / PubMed 需要 API Key，Fetcher 内部会在 Key 为空时静默跳过。
export const defaultFetchers: Fetcher[] = [
  new ArxivFetcher(),
  new SemanticScholarFetcher(),
  new CrossrefFetcher(),
  new IEEEFetcher(),
  new PubMedFetcher(),
  new WebSearchFetcher(),
  new NewsFetcher(),
];

// ─── 按名称获取 Fetcher ────────────────────────────────────────────
export function getFetcherByName(name: string): Fetcher | undefined {
  return defaultFetchers.find((f) => f.name === name);
}

// ─── 服务端搜索聚合器 ─────────────────────────────────────────────
// 供 app/api/search/route.ts 调用。
// 客户端搜索见 lib/search-client.ts（直接在浏览器中调用各数据源）。
export async function aggregateSearch(
  query: string,
  options: { limit?: number; offset?: number; sourceFilter?: string } = {},
): Promise<{ articles: import('../types').Article[]; totalCount: number }> {
  const { sourceFilter, ...searchOptions } = options;
  const limit = searchOptions.limit ?? 20;

  // 根据 sourceFilter 过滤数据源
  const activeFetchers = sourceFilter && sourceFilter !== 'all'
    ? defaultFetchers.filter((f) => {
        if (sourceFilter === 'paper') return f.sourceType === 'paper';
        if (sourceFilter === 'news') return f.sourceType === 'news';
        return f.name.toLowerCase().includes(sourceFilter.toLowerCase());
      })
    : defaultFetchers;

  // 并发调用所有启用的数据源
  const results = await Promise.allSettled(
    activeFetchers.map((fetcher) =>
      fetcher.search({ ...searchOptions, query }).then((articles) => ({
        name: fetcher.name,
        articles,
      }))
    )
  );

  // 收集结果并去重
  const allArticles: import('../types').Article[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const article of result.value.articles) {
        // URL 去重
        const urlKey = article.url.toLowerCase().trim();
        if (urlKey && urlKey !== '#' && seenUrls.has(urlKey)) continue;
        seenUrls.add(urlKey);

        // 标题去重（前 60 字符相似度）
        const titleKey = article.title.toLowerCase().slice(0, 60).replace(/[^a-z0-9]/g, '');
        if (titleKey.length > 10 && seenTitles.has(titleKey)) continue;
        if (titleKey.length > 10) seenTitles.add(titleKey);

        allArticles.push(article);
      }
    }
  }

  // 重排序（综合评分）
  const scored = allArticles.map((article) => ({
    article,
    score: rerankScore(article, query),
  }));
  scored.sort((a, b) => b.score - a.score);

  const paginated = scored.slice(0, limit).map((s) => s.article);

  return {
    articles: paginated,
    totalCount: allArticles.length,
  };
}

// ─── 重排序评分函数 ─────────────────────────────────────────────
// 综合：语义相关度（如有）+ 时间衰减 + 引用量（如有）
function rerankScore(article: import('../types').Article, query: string): number {
  let score = 0;

  // 1. 关键词相关度（基础分）
  const q = query.toLowerCase();
  const haystack = `${article.title} ${article.summary}`.toLowerCase();
  const queryTerms = q.split(/\s+/).filter((t: string) => t.length > 1);
  for (const term of queryTerms) {
    const count = (haystack.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    const inTitle = article.title.toLowerCase().includes(term);
    score += count + (inTitle ? 5 : 0);
  }

  // 2. 来源权威性加分
  const authoritySources = ['Nature', 'Science', 'Cell', 'IEEE', 'ACM', 'arXiv', 'CrossRef', 'PubMed', 'Semantic Scholar'];
  if (authoritySources.some((s) => article.source.includes(s))) {
    score += 3;
  }

  // 3. 时间衰减（越新越好，以 2020 年为基准）
  if (article.publishedDate) {
    const year = parseInt(article.publishedDate.slice(0, 4));
    if (!isNaN(year)) {
      const age = Math.max(0, 2026 - year);
      score += Math.max(0, 10 - age); // 近 10 年内的文章加分
    }
  }

  // 4. 点击量（热度）加分
  score += Math.log1p(article.clickCount || 0) * 2;

  return score;
}

// ─── 按 ID 获取文章（自动路由到对应 Fetcher）────────────────────
export async function fetchArticleById(id: string): Promise<import('../types').Article | null> {
  // id 格式：sourceId-actualId（如 arxiv-2401.12345）
  const parts = id.split('-');
  if (parts.length < 2) return null;

  const sourceName = parts[0].toLowerCase();

  // 找到对应的 Fetcher
  const fetcher = defaultFetchers.find(
    (f) => f.name.toLowerCase().includes(sourceName) ||
      (sourceName === 'arxiv' && f.name === 'ArXiv') ||
      (sourceName === 'ss' && f.name === 'Semantic Scholar') ||
      (sourceName === 'crossref' && f.name === 'CrossRef') ||
      (sourceName === 'ieee' && f.name === 'IEEE Xplore') ||
      (sourceName === 'pubmed' && f.name === 'PubMed') ||
      (sourceName === 'web' && f.name === 'Web Search') ||
      (sourceName === 'news' && f.name === 'News & RSS')
  );

  if (fetcher && fetcher.fetchById) {
    return await fetcher.fetchById(id);
  }

  return null;
}

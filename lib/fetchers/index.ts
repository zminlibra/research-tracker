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

// 各数据源实现（search 用 singleton 实例）
import { ArxivFetcher } from './arxiv-fetcher';
import { IEEEFetcher } from './ieee-fetcher';
import { OpenAlexFetcher } from './openalex-fetcher';
import { PubMedFetcher } from './pubmed-fetcher';
import { WebSearchFetcher } from './web-search-fetcher';
import { NewsFetcher } from './news-fetcher';

// ─── 默认启用的数据源 ─────────────────────────────────────────────
// 顺序即为搜索时的并发调用顺序。
// IEEE / PubMed 需要 API Key，Fetcher 内部会在 Key 为空时静默跳过。
export const defaultFetchers: Fetcher[] = [
  new ArxivFetcher(),
  new IEEEFetcher(),
  new OpenAlexFetcher(),
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
  options: { limit?: number; offset?: number; sourceFilter?: string; chineseOnly?: boolean } = {},
): Promise<{ articles: import('../types').Article[]; totalCount: number }> {
  const { sourceFilter, chineseOnly, ...searchOptions } = options;
  const limit = searchOptions.limit ?? 20;

  // 根据 sourceFilter 过滤数据源
  const activeFetchers = sourceFilter && sourceFilter !== 'all'
    ? defaultFetchers.filter((f) => {
        // 精确匹配三大学术来源
        if (sourceFilter === 'arxiv')   return f.name === 'arXiv';
        if (sourceFilter === 'pubmed')  return f.name === 'PubMed';
        if (sourceFilter === 'openalex') return f.name === 'OpenAlex';
        // 兼容旧的逻辑分组
        if (sourceFilter === 'paper') return f.sourceType === 'paper';
        if (sourceFilter === 'news')  return f.sourceType === 'news';
        // 模糊兜底
        return f.name.toLowerCase().includes(sourceFilter.toLowerCase());
      })
    : defaultFetchers;

  // 扩大 limit 以确保小众来源有机会进入排序候选
  const expandedLimit = limit * 3;

  // 并发调用所有启用的数据源
  const results = await Promise.allSettled(
    activeFetchers.map((fetcher) =>
      fetcher.search({ ...searchOptions, query, limit: expandedLimit, chineseOnly }).then((articles) => ({
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
// 核心策略：各来源加权固定，关键词匹配锦上添花，避免摘要长度造成的不公平
function rerankScore(article: import('../types').Article, query: string): number {
  let score = 0;

  // ── 1. 来源权威性（核心加权，固定值）────────────────────────
  // 正式期刊 > 预印本，确保各来源论文都有展示机会
  const idLower = article.id.toLowerCase();
  const srcLower = article.source.toLowerCase();

  if (idLower.startsWith('pubmed-') || srcLower.includes('pubmed')) {
    // PubMed：同行评审生物医学文献，对合成生物学用户高度相关
    score += 50;
  } else if (idLower.startsWith('openalex-')) {
    // OpenAlex：含期刊名 → 正式期刊论文；无期刊名 → 可能是会议/预印本
    const baseScore = article.source && article.source !== 'OpenAlex' ? 40 : 25;
    // ── 中文期刊/机构额外加权 ──────────────────────────────────
    // 期刊名含中文 → 中文期刊论文
    const hasChineseJournal = /[\u4e00-\u9fff]/.test(article.source);
    // 作者团队含中国机构（CN）
    const hasChineseInstitution = (article.institutionsCountry || []).includes('CN');
    const chineseBonus = hasChineseJournal ? 15 : hasChineseInstitution ? 8 : 0;
    score += baseScore + chineseBonus;
  } else if (idLower.startsWith('arxiv-') || srcLower.includes('arxiv')) {
    // arXiv：预印本，质量参差，降低权重
    const hasChineseInstitution = (article.institutionsCountry || []).includes('CN');
    score += hasChineseInstitution ? 8 : 5;
  } else if (srcLower.includes('ieee') || srcLower.includes('acm')) {
    // IEEE/ACM：工程技术权威来源
    score += 35;
  } else {
    // Web / News 等其他来源
    score += 0;
  }

  // ── 2. 关键词相关度（标题匹配加权，摘要仅作补充）────────────
  const q = query.toLowerCase();
  const queryTerms = q.split(/\s+/).filter((t: string) => t.length > 1);

  // 标题中命中关键词（最重要，权重高）
  for (const term of queryTerms) {
    if (article.title.toLowerCase().includes(term)) {
      score += 3; // 每命中一个关键词 +3
    }
  }

  // 摘要中命中关键词（仅统计有实质内容的摘要，防止 placeholder 占优）
  const summaryLen = (article.summary || '').length;
  if (summaryLen > 50) {
    const summary = article.summary.toLowerCase();
    for (const term of queryTerms) {
      const count = (summary.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
      score += count * 0.5; // 摘要中每命中一次 +0.5（权重很低，避免长摘要碾压）
    }
  }

  // ── 3. 时间新鲜度（近 3 年 +5，越老衰减越多）──────────────
  if (article.publishedDate) {
    const year = parseInt(article.publishedDate.slice(0, 4));
    if (!isNaN(year) && year >= 2020) {
      const age = 2026 - year;
      score += Math.max(0, 5 - age); // 2024-2026 → +5~+2，2020 → +1
    }
  }

  // ── 4. 引用量（高质量论文加分）────────────────────────────
  score += Math.log1p(article.clickCount || 0) * 0.3;

  return score;
}

// ─── 按 ID 获取文章（自动路由到对应 Fetcher）────────────────────
export async function fetchArticleById(id: string): Promise<import('../types').Article | null> {
  // 先判断来源前缀（优先匹配前缀，兜底用名称匹配）
  const fetcherMap: Array<{ prefixes: string[]; fetcher: Fetcher }> = [
    { prefixes: ['arxiv'], fetcher: new ArxivFetcher() },
    { prefixes: ['openalex'], fetcher: new OpenAlexFetcher() },
    { prefixes: ['pubmed'], fetcher: new PubMedFetcher() },
    { prefixes: ['ieee'], fetcher: new IEEEFetcher() },
    { prefixes: ['hn', 'news', 'rss', 'web'], fetcher: new NewsFetcher() },
  ];

  // 精确前缀匹配
  const lower = id.toLowerCase();
  for (const { prefixes, fetcher } of fetcherMap) {
    if (prefixes.some((p) => lower.startsWith(`${p}-`))) {
      if (fetcher.fetchById) {
        return await fetcher.fetchById(id);
      }
    }
  }

  // 名称模糊匹配（兜底：某些 ID 可能没有前缀）
  const sourceName = id.split('-')[0].toLowerCase();
  const fetcher = defaultFetchers.find(
    (f) => f.name.toLowerCase().includes(sourceName) ||
      (sourceName === 'arxiv' && f.name === 'ArXiv') ||
      (sourceName === 'ieee' && f.name === 'IEEE Xplore') ||
      (sourceName === 'openalex' && f.name === 'OpenAlex') ||
      (sourceName === 'pubmed' && f.name === 'PubMed') ||
      (sourceName === 'web' && f.name === 'Web Search') ||
      (sourceName === 'news' && f.name === 'News & RSS')
  );

  if (fetcher && fetcher.fetchById) {
    return await fetcher.fetchById(id);
  }

  return null;
}

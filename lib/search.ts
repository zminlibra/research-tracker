import type { Article, SearchResult } from './types';
import { searchArxiv } from './arxiv';
import { searchSemanticScholar } from './semantic-scholar';
import { searchCrossRef } from './crossref';
import { searchNews, getNewsFromFeeds } from './news';
import { searchWeb } from './web-search';
import { translateChineseQuery } from './ai';

// ─── 工具函数 ──────────────────────────────────────────────────

function isChineseQuery(q: string): boolean {
  return /[\u4e00-\u9fff]/.test(q);
}

/** 基于标题相似度去重 */
function deduplicate(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const result: Article[] = [];

  for (const article of articles) {
    // 优先用 URL 去重
    if (article.url && article.url !== '#') {
      const urlKey = article.url.toLowerCase().trim();
      if (seen.has(urlKey)) continue;
      seen.add(urlKey);
    }

    // 标题相似度去重（前 60 个字符）
    const titleKey = article.title.toLowerCase().slice(0, 60).replace(/[^a-z0-9]/g, '');
    if (titleKey.length > 10 && seen.has(titleKey)) continue;
    if (titleKey.length > 10) seen.add(titleKey);

    result.push(article);
  }

  return result;
}

/** 简单的关键词相关性评分（AI 不可用时的后备方案） */
function keywordRelevanceScore(article: Article, query: string): number {
  if (!query) return 0;
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const haystack = `${article.title} ${article.summary}`.toLowerCase();

  let score = 0;
  for (const term of terms) {
    const count = (haystack.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    // 标题匹配权重更高
    const inTitle = article.title.toLowerCase().includes(term);
    score += count + (inTitle ? 5 : 0);
  }

  // 来源权威性加分
  const highAuthoritySources = ['Nature', 'Science', 'Cell', 'IEEE', 'ACM', 'arXiv', 'CrossRef'];
  if (highAuthoritySources.some(s => article.source.includes(s))) {
    score += 3;
  }

  return score;
}

// ─── 核心搜索 ──────────────────────────────────────────────────

export async function aggregateSearch(
  query: string,
  page = 1,
  pageSize = 20,
  sortBy: 'relevance' | 'date' | 'clicks' = 'relevance',
  sourceFilter: 'all' | 'paper' | 'news' = 'all'
): Promise<SearchResult> {
  const start = (page - 1) * pageSize;
  const apiMax = Math.min(pageSize * 3, 30);
  const isChinese = isChineseQuery(query);

  // 中文查询 → 翻译成英文关键词用于学术搜索
  let academicQuery = query;
  if (isChinese) {
    const translated = await translateChineseQuery(query);
    if (translated) {
      academicQuery = translated;
    }
  }

  const articlesMap = new Map<string, Article[]>();

  // ─── 并行搜索所有数据源 ──────────────────────────────────
  const searchPromises: Promise<{ source: string; articles: Article[] }>[] = [];

  // 学术源（按来源过滤时跳过）
  if (sourceFilter === 'all' || sourceFilter === 'paper') {
    searchPromises.push(
      searchArxiv(academicQuery, apiMax, start).then(a => ({ source: 'arxiv', articles: a })),
      searchSemanticScholar(academicQuery, apiMax, start).then(a => ({ source: 'semantic-scholar', articles: a })),
      searchCrossRef(academicQuery, apiMax, start).then(a => ({ source: 'crossref', articles: a })),
    );
  }

  // 新闻/网页源
  if (sourceFilter === 'all' || sourceFilter === 'news') {
    searchPromises.push(
      // 真正的网页搜索（SearXNG，聚合 Google/Bing 结果）
      searchWeb(query, apiMax).then(a => ({ source: 'web', articles: a })),
      // 原有的 RSS+HN 搜索作为补充
      searchNews(query, Math.ceil(apiMax / 2)).then(a => ({ source: 'rss', articles: a })),
    );
  }

  const allResults = await Promise.allSettled(searchPromises);

  // 收集结果
  for (const result of allResults) {
    if (result.status === 'fulfilled') {
      articlesMap.set(result.value.source, result.value.articles);
    }
  }

  // ─── 合并 & 去重 ─────────────────────────────────────────
  let allArticles: Article[] = [];
  for (const articles of articlesMap.values()) {
    allArticles.push(...articles);
  }

  // 去重
  allArticles = deduplicate(allArticles);

  // ─── 相关性排序 ──────────────────────────────────────────
  if (sortBy === 'relevance') {
    // 计算相关性分数并排序
    allArticles = allArticles
      .map(a => {
        const keywordScore = keywordRelevanceScore(a, query);
        // 学术源有更高的基础权重
        const sourceBonus = a.sourceType === 'paper' ? 2 : 0;
        return { article: a, score: keywordScore + sourceBonus };
      })
      .sort((a, b) => b.score - a.score)
      .map(x => x.article);
  } else if (sortBy === 'date') {
    allArticles.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
  } else if (sortBy === 'clicks') {
    allArticles.sort((a, b) => b.clickCount - a.clickCount);
  }

  // ─── 分页 ────────────────────────────────────────────────
  const totalCount = allArticles.length;
  const paged = allArticles.slice(start, start + pageSize);

  return {
    articles: paged,
    totalCount,
    page,
    pageSize,
  };
}

// ─── 热门文章 ──────────────────────────────────────────────────

export async function getTrendingArticles(
  category?: string,
  timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<Article[]> {
  const trendingQueries: Record<string, string[]> = {
    ai: ['large language model 2026', 'deep learning breakthrough', 'AI agent'],
    biomedicine: ['CRISPR therapy 2026', 'cancer immunotherapy trial', 'mRNA vaccine development'],
    energy: ['solid state battery 2026', 'perovskite solar cell efficiency', 'green hydrogen production'],
    materials: ['2D materials research', 'metamaterial application', 'MOF catalyst'],
    quantum: ['quantum computing milestone 2026', 'quantum error correction', 'quantum network'],
    default: ['artificial intelligence breakthrough', 'climate technology innovation', 'renewable energy research'],
  };

  const queries = category && trendingQueries[category]
    ? trendingQueries[category]
    : trendingQueries.default;

  // 并行搜索：学术 + 网页
  const [paperResults, webResults] = await Promise.all([
    // 学术源
    Promise.all(queries.map(q => Promise.allSettled([
      searchArxiv(q, 4),
      searchSemanticScholar(q, 4),
      searchCrossRef(q, 4),
    ]))),
    // 网页搜索
    Promise.all(queries.map(q => searchWeb(q, 5))),
  ]);

  const allArticles: Article[] = [];

  // 收集学术结果
  for (const settled of paperResults) {
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    }
  }

  // 收集网页结果
  for (const articles of webResults) {
    allArticles.push(...articles);
  }

  // 去重并排序
  const unique = deduplicate(allArticles);
  unique.sort((a, b) => b.clickCount - a.clickCount);
  return unique.slice(0, 20);
}

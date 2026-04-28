import type { Article, SearchResult } from './types';
import { searchArxiv } from './arxiv';
import { searchSemanticScholar } from './semantic-scholar';
import { searchNews, getNewsFromFeeds } from './news';
import { translateChineseQuery } from './ai';

function isChineseQuery(q: string): boolean {
  return /[\u4e00-\u9fff]/.test(q);
}

export async function aggregateSearch(
  query: string,
  page = 1,
  pageSize = 20,
  sortBy: 'relevance' | 'date' | 'clicks' = 'relevance',
  sourceFilter: 'all' | 'paper' | 'news' = 'all'
): Promise<SearchResult> {
  const start = (page - 1) * pageSize;
  const apiMax = Math.min(pageSize * 2, 30);

  // 中文查询 → 尝试翻译成英文关键词用于学术搜索
  let academicQuery = query;
  if (isChineseQuery(query)) {
    const translated = await translateChineseQuery(query);
    if (translated) {
      academicQuery = translated;
    }
  }

  // 并行搜索多个数据源：论文 + 新闻
  // 学术源用英文查询（可能是翻译后的），新闻源用原始查询
  const [arxivResults, ssResults, newsResults] = await Promise.all([
    searchArxiv(academicQuery, apiMax, start),
    searchSemanticScholar(academicQuery, apiMax, start),
    searchNews(query, apiMax),
  ]);

  // 合并
  let allArticles = [...arxivResults, ...ssResults, ...newsResults];

  // 按来源过滤
  if (sourceFilter !== 'all') {
    allArticles = allArticles.filter((a) => a.sourceType === sourceFilter);
  }

  // 排序
  switch (sortBy) {
    case 'date':
      allArticles.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
      break;
    case 'clicks':
      allArticles.sort((a, b) => b.clickCount - a.clickCount);
      break;
    case 'relevance':
    default:
      break;
  }

  // 分页
  const totalCount = allArticles.length;
  const paged = allArticles.slice(0, pageSize);

  return {
    articles: paged,
    totalCount,
    page,
    pageSize,
  };
}

export async function getTrendingArticles(
  category?: string,
  timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<Article[]> {
  const trendingQueries: Record<string, string[]> = {
    ai: ['large language model', 'deep learning', 'neural network'],
    biomedicine: ['CRISPR', 'cancer immunotherapy', 'mRNA vaccine'],
    energy: ['solid state battery', 'perovskite solar cell', 'hydrogen fuel'],
    materials: ['2D materials', 'metamaterial', 'metal organic framework'],
    quantum: ['quantum computing', 'quantum error correction', 'quantum supremacy'],
    default: ['artificial intelligence', 'climate change', 'renewable energy'],
  };

  const queries = category && trendingQueries[category]
    ? trendingQueries[category]
    : trendingQueries.default;

  // 同时获取论文和新闻
  const [paperResults, newsResults] = await Promise.all([
    Promise.all(queries.map((q) => searchArxiv(q, 5))),
    Promise.all(queries.map((q) => searchNews(q, 6))),
  ]);

  const allArticles = [...paperResults.flat(), ...newsResults.flat()];

  // 去重并排序
  const seen = new Set<string>();
  const unique = allArticles.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  unique.sort((a, b) => b.clickCount - a.clickCount);
  return unique.slice(0, 20);
}

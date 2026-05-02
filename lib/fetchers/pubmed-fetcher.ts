/**
 * PubMed (NCBI E-utilities) 数据源实现。
 *
 * API 文档：https://www.ncbi.nlm.nih.gov/books/NBK25500/
 * 无需 API Key（有 Key 可提高限额：10 req/s vs 3 req/s）。
 * 免费、稳定、覆盖全球生物医学文献，与合成生物学高度相关。
 */

import type { Article } from '../types';
import type { Fetcher, SearchOptions } from './base-fetcher';
import { getCached, setCached, makeCacheKey } from '../cache';

const PUBMED_SEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_FETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const PUBMED_SUMMARY = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

/**
 * 从 localStorage 读取用户可选的 PubMed API Key（可选，非必须）。
 */
function getPubMedKey(): string {
  if (typeof window === 'undefined') {
    // 服务端：尝试读环境变量（部署者可选择性配置，非必须）
    return process.env.PUBMED_API_KEY || '';
  }
  try {
    return localStorage.getItem('pubmed_api_key') || '';
  } catch {
    return '';
  }
}

export class PubMedFetcher implements Fetcher {
  name = 'PubMed';
  sourceType = 'paper' as const;

  async search(options: SearchOptions): Promise<Article[]> {
    const { query, limit = 20, offset = 0 } = options;
    const cacheKey = makeCacheKey('pubmed-search', {
      q: query, l: limit, o: offset,
    });
    const cached = getCached<Article[]>(cacheKey);
    if (cached) return cached;

    try {
      const apiKey = getPubMedKey();
      const searchParams = new URLSearchParams({
        db: 'pubmed',
        term: query,
        retstart: String(offset),
        retmax: String(limit),
        retmode: 'json',
        sort: 'date',
        ...(apiKey ? { api_key: apiKey } : {}),
      });

      // 1. ESearch：获取 PMID 列表
      const searchRes = await fetchWithRateLimit(
        `${PUBMED_SEARCH}?${searchParams}`
      );
      if (!searchRes.ok) return [];
      const searchData = await searchRes.json();
      const pmids: string[] = searchData.esearchresult?.idlist || [];
      if (pmids.length === 0) return [];

      // 2. ESummary：获取每篇文章的摘要元数据
      const summary = await fetchSummaries(pmids, apiKey);
      const articles = pmids
        .map((pmid) => summary[pmid])
        .filter(Boolean)
        .map((item: Record<string, unknown>) => toArticle(item));

      setCached(cacheKey, articles, 30 * 60 * 1000); // 缓存 30 分钟
      return articles;
    } catch {
      return [];
    }
  }

  async fetchById(id: string): Promise<Article | null> {
    // id 格式：pubmed-PMID
    const pmid = id.replace('pubmed-', '');
    const cacheKey = `pubmed-byid-${pmid}`;
    const cached = getCached<Article>(cacheKey);
    if (cached) return cached;

    try {
      const apiKey = getPubMedKey();
      const summary = await fetchSummaries([pmid], apiKey);
      const item = summary[pmid];
      if (!item) return null;
      const article = toArticle(item);
      setCached(cacheKey, article, 60 * 60 * 1000);
      return article;
    } catch {
      return null;
    }
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────

/** 批量获取 ESummary 数据 */
async function fetchSummaries(
  pmids: string[],
  apiKey = ''
): Promise<Record<string, Record<string, unknown>>> {
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
    ...(apiKey ? { api_key: apiKey } : {}),
  });

  const res = await fetchWithRateLimit(`${PUBMED_SUMMARY}?${params}`);
  if (!res.ok) return {};
  const data = await res.json();
  return data.result || {};
}

/** 将 PubMed API 返回的数据转为统一的 Article 格式 */
function toArticle(item: Record<string, unknown>): Article {
  const pmid = String(item.uid || '');
  const title = ((item.title as string) || '无标题').replace(/\s+/g, ' ');
  const authors = ((item.authors as Array<{ name: string }>) || []).map(
    (a) => a.name
  );
  const pubDate = (item.pubdate as string) || '';
  const journal = (item.fulljournalname as string) || '';
  const tags = journal ? [journal] : [];

  // PubMed 没有直接摘要（ESummary 不含 abstract），需单独调用 EFetch
  // 这里先留空，详情页再按需获取
  return {
    id: `pubmed-${pmid}`,
    title,
    summary: '暂无摘要（点击查看详情）',
    source: 'PubMed',
    sourceType: 'paper',
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    imageUrl: null,
    publishedDate: parsePubMedDate(pubDate),
    authors: authors.slice(0, 5),
    tags,
    clickCount: Math.floor(Math.random() * 80) + 10,
  };
}

/**
 * 解析 PubMed 日期字符串（格式多样，如 "2024 May 12" / "2024" / "2024/05/12"）。
 */
function parsePubMedDate(raw: string): string {
  if (!raw) return '';
  // 尝试直接解析
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  // 只取年份
  const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? `${yearMatch[1]}-01-01` : '';
}

/**
 * 带限流等待的 fetch（PubMed 免费版限流：3 req/s；有 Key：10 req/s）。
 */
async function fetchWithRateLimit(url: string): Promise<Response> {
  const apiKey = getPubMedKey();
  const minInterval = apiKey ? 100 : 340; // ms between requests
  await rateLimitWait('pubmed', minInterval);
  return fetch(url, {
    headers: {
      'User-Agent': 'ResearchTracker/1.0 (mailto:research-tracker@example.com)',
    },
  });
}

// ─── 简单限流：保证两次请求间隔不小于 minInterval ─────────────
const lastCall: Record<string, number> = {};
async function rateLimitWait(key: string, minIntervalMs: number): Promise<void> {
  const now = Date.now();
  const last = lastCall[key] || 0;
  const wait = minIntervalMs - (now - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall[key] = Date.now();
}

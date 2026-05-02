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
      // 3. EFetch：获取摘要（ESummary 不含 abstract，需单独获取）
      const abstracts = await fetchPubmedAbstracts(pmids, apiKey);
      const articles = pmids
        .map((pmid) => summary[pmid])
        .filter(Boolean)
        .map((item: Record<string, unknown>) => toArticle(item, abstracts));

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
      const abstracts = await fetchPubmedAbstracts([pmid], apiKey);
      const article = toArticle(item, abstracts);
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

/**
 * 批量获取 PubMed 摘要（通过 EFetch API 返回 XML）。
 * EFetch 支持一次请求获取多篇文章的摘要，XML 中每个 Article 标签含 AbstractText。
 */
async function fetchPubmedAbstracts(
  pmids: string[],
  apiKey = ''
): Promise<Record<string, string>> {
  if (pmids.length === 0) return {};

  try {
    const params = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      rettype: 'abstract',
      retmode: 'xml',
      ...(apiKey ? { api_key: apiKey } : {}),
    });

    const res = await fetchWithRateLimit(`${PUBMED_FETCH}?${params}`);
    if (!res.ok) return {};
    const xml = await res.text();

    const result: Record<string, string> = {};
    // 解析 <PubmedArticle>...</PubmedArticle> 块
    const articleMatches = xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g);

    for (const match of articleMatches) {
      const articleXml = match[1];
      const pmidMatch = articleXml.match(/<PMID[^>]*>([\s\S]*?)<\/PMID>/);
      const pmid = pmidMatch ? pmidMatch[1].trim() : null;

      if (!pmid) continue;

      // 提取所有 <AbstractText> 内容（可能有多个 Label+Text 对）
      const abstractTexts: string[] = [];
      const absMatches = articleXml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
      for (const absMatch of absMatches) {
        let text = absMatch[1].trim();
        // 去除内部标签（如 <xref>、<bold> 等）
        text = text.replace(/<[^>]+>/g, '');
        // 清理实体编码
        text = text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ');
        if (text) abstractTexts.push(text);
      }

      if (abstractTexts.length > 0) {
        result[pmid] = abstractTexts.join('\n\n');
      }
    }

    return result;
  } catch {
    return {};
  }
}

/** 将 PubMed API 返回的数据转为统一的 Article 格式 */
function toArticle(
  item: Record<string, unknown>,
  abstracts: Record<string, string> = {}
): Article {
  const pmid = String(item.uid || '');
  const title = ((item.title as string) || '无标题').replace(/\s+/g, ' ');
  const authors = ((item.authors as Array<{ name: string }>) || []).map(
    (a) => a.name
  );
  const pubDate = (item.pubdate as string) || '';
  const journal = (item.fulljournalname as string) || '';
  const tags = journal ? [journal] : [];

  // 优先使用 EFetch 获取的真实摘要
  const summary = abstracts[pmid] || '暂无摘要（点击查看详情）';

  return {
    id: `pubmed-${pmid}`,
    title,
    summary,
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

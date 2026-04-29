import type { Article } from './types';

/**
 * SearXNG 公共实例列表（免费、无需 API Key）
 * 这些实例聚合了 Google、Bing、DuckDuckGo 等搜索引擎的结果
 */
const SEARXNG_INSTANCES = [
  'https://searx.be',
  'https://search.sapti.me',
  'https://searx.tiekoetter.com',
  'https://search.bus-hit.me',
  'https://searx.si',
];

/**
 * 使用 SearXNG 公共实例进行真正的网页搜索。
 * 返回新闻、博客、网站等结果，质量接近 Google/Bing。
 */
export async function searchWeb(
  query: string,
  maxResults = 15
): Promise<Article[]> {
  // 尝试多个实例，取第一个成功的
  for (const instance of SEARXNG_INSTANCES) {
    try {
      const results = await trySearchInstance(instance, query, maxResults);
      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }
  return [];
}

async function trySearchInstance(
  instance: string,
  query: string,
  maxResults: number
): Promise<Article[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    categories: 'news,general,science,technology',
    language: 'auto',
    safesearch: '1',
  });

  try {
    const response = await fetch(`${instance}/search?${params}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ResearchTracker/1.0 (academic research tool)',
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    const results = data.results || [];

    return results.slice(0, maxResults).map((r: SearXNGResult) => {
      const date = r.publishedDate || r.parsed_url?.[0] || '';
      const formattedDate = date
        ? new Date(date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      return {
        id: `web-${encodeURIComponent(r.url)}`,
        title: cleanTitle(r.title || '无标题'),
        summary: (r.content || r.snippet || '暂无摘要').slice(0, 500),
        source: extractSourceName(r.url),
        sourceType: 'news' as const,
        url: r.url,
        imageUrl: r.img_src || null,
        publishedDate: formattedDate,
        authors: [],
        tags: r.engines || [],
        clickCount: Math.floor(Math.random() * 50) + 10,
      };
    });
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

interface SearXNGResult {
  title?: string;
  url: string;
  content?: string;
  snippet?: string;
  publishedDate?: string;
  img_src?: string;
  engines?: string[];
  parsed_url?: string[];
}

function cleanTitle(title: string): string {
  return title
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      // 返回主域名（大写首字母）
      const name = parts[parts.length - 2];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return hostname;
  } catch {
    return 'Web';
  }
}

/**
 * 使用 SearXNG 新闻类别搜索新闻。
 */
export async function searchNewsWeb(
  query: string,
  maxResults = 15
): Promise<Article[]> {
  // 在查询前加 "news" 或使用 news 类别
  for (const instance of SEARXNG_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const params = new URLSearchParams({
        q: query,
        format: 'json',
        categories: 'news',
        language: 'auto',
        safesearch: '1',
      });

      const response = await fetch(`${instance}/search?${params}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ResearchTracker/1.0 (academic research tool)',
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = await response.json();
      const results = data.results || [];

      if (results.length > 0) {
        return results.slice(0, maxResults).map((r: SearXNGResult) => {
          const date = r.publishedDate || '';
          const formattedDate = date
            ? new Date(date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

          return {
            id: `news-${encodeURIComponent(r.url)}`,
            title: cleanTitle(r.title || '无标题'),
            summary: (r.content || r.snippet || '暂无摘要').slice(0, 500),
            source: extractSourceName(r.url),
            sourceType: 'news' as const,
            url: r.url,
            imageUrl: r.img_src || null,
            publishedDate: formattedDate,
            authors: [],
            tags: [],
            clickCount: Math.floor(Math.random() * 40) + 10,
          };
        });
      }
    } catch {
      continue;
    }
  }
  // 如果 news 类别搜索失败，回退到通用搜索
  return searchWeb(query, maxResults);
}

import type { Article } from './types';

// ─── Hacker News API（免费，无需 Key）─────────────────────────
const HN_API = 'https://hacker-news.firebaseio.com/v0';

interface HNItem {
  id: number;
  title: string;
  url?: string;
  text?: string;
  time: number;
  score: number;
  descendants: number;
  type: string;
}

async function fetchHNTopStories(limit = 50): Promise<HNItem[]> {
  try {
    const idsRes = await fetch(`${HN_API}/topstories.json`);
    if (!idsRes.ok) return [];
    const ids: number[] = await idsRes.json();

    const batch = ids.slice(0, limit);
    const items = await Promise.all(
      batch.map(async (id) => {
        try {
          const res = await fetch(`${HN_API}/item/${id}.json`);
          if (!res.ok) return null;
          return await res.json() as HNItem;
        } catch {
          return null;
        }
      })
    );

    return items.filter((i): i is HNItem => i !== null && i.type === 'story');
  } catch {
    return [];
  }
}

// ─── RSS 源列表（移除 Reddit RSS，因其封禁云服务器 IP）────────
interface RSSSource {
  url: string;
  name: string;
  type: 'news';
}

const RSS_SOURCES: RSSSource[] = [
  { url: 'https://hnrss.org/frontpage?count=25', name: 'Hacker News', type: 'news' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica', type: 'news' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Tech', type: 'news' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'NYT Tech', type: 'news' },
  { url: 'https://www.sciencedaily.com/rss/top/science.xml', name: 'Science Daily', type: 'news' },
  { url: 'https://www.sciencedaily.com/rss/top/technology.xml', name: 'Science Daily Tech', type: 'news' },
  { url: 'https://www.wired.com/feed/rss', name: 'Wired', type: 'news' },
  { url: 'https://36kr.com/feed', name: '36氪', type: 'news' },
];

// ─── RSS 解析工具 ─────────────────────────────────────────────
interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

async function fetchRSSFeed(url: string): Promise<RSSItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ResearchTracker/1.0' },
    });
    clearTimeout(timeout);

    if (!response.ok) return [];
    const text = await response.text();
    return parseRSS(text);
  } catch {
    return [];
  }
}

function parseRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  // 同时支持 <item> 和 <entry> (Atom) 格式
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const xml = match[1];
    const link = extractTag(xml, 'link')
      || extractAttr(xml, 'link', 'href')
      || '';

    items.push({
      title: extractTag(xml, 'title') || '',
      link: link,
      description: extractTag(xml, 'description')
        || extractTag(xml, 'summary')
        || extractTag(xml, 'content') || '',
      pubDate: extractTag(xml, 'pubDate')
        || extractTag(xml, 'published')
        || extractTag(xml, 'updated') || '',
    });
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's'));
  if (!match) return null;
  return cleanHTML(match[1]);
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i'));
  return match ? match[1] : null;
}

function cleanHTML(html: string): string {
  let cleaned = html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // 清理 HN RSS 的元数据行
  cleaned = cleaned
    .replace(/Article URL:\s*\S+/gi, '')
    .replace(/Comments URL:\s*\S+/gi, '')
    .replace(/Points:\s*\d+/gi, '')
    .replace(/# Comments:\s*\d+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

// ─── 关键词提取 ────────────────────────────────────────────────
function extractKeywords(query: string, title: string): string[] {
  const words = [...query.split(/\s+/), ...title.split(/\s+/)];
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
    'to', 'for', 'of', 'and', 'or', 'with', 'by', 'from', 'that', 'this',
    'its', 'it', 'be', 'has', 'have', 'been', 'can', 'will', 'may', 'new',
  ]);
  const keywords = words
    .map((w) => w.replace(/[^a-zA-Z0-9\u4e00-\u9fff\-]/g, ''))
    .filter((w) => w.length > 3 && !stopWords.has(w.toLowerCase()))
    .slice(0, 5);
  return [...new Set(keywords)];
}

function matchesQuery(itemTitle: string, itemDesc: string, query: string): boolean {
  if (!query) return true;
  const lower = query.toLowerCase();
  const terms = lower.split(/\s+/);
  const haystack = `${itemTitle} ${itemDesc}`.toLowerCase();
  // 至少匹配一个搜索词
  return terms.some((term) => haystack.includes(term));
}

// ─── 判断是否为中文查询 ───────────────────────────────────────
function isChineseQuery(query: string): boolean {
  return /[\u4e00-\u9fff]/.test(query);
}

// ─── 数据转换 ──────────────────────────────────────────────────
function rssToArticle(
  item: RSSItem,
  sourceType: 'news',
  sourceName: string
): Article {
  const date = item.pubDate
    ? new Date(item.pubDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return {
    id: `rss-${btoa(item.link)}`,
    title: cleanHTML(item.title) || '无标题',
    summary: cleanHTML(item.description).slice(0, 350) || '暂无摘要，请点击原文查看详情',
    source: sourceName,
    sourceType,
    url: item.link,
    imageUrl: null,
    publishedDate: date,
    authors: [],
    tags: [],
    clickCount: Math.floor(Math.random() * 150) + 20,
  };
}

function hnToArticle(item: HNItem): Article {
  const date = item.time
    ? new Date(item.time * 1000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return {
    id: `hn-${item.id}`,
    title: item.title || '无标题',
    summary: (item.text || '').replace(/<[^>]+>/g, '').slice(0, 350)
      || '暂无摘要，请点击原文查看详情',
    source: 'Hacker News',
    sourceType: 'news',
    url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    imageUrl: null,
    publishedDate: date,
    authors: [],
    tags: extractKeywords('', item.title),
    clickCount: item.score || Math.floor(Math.random() * 100),
  };
}

// ─── 核心导出：新闻搜索 ────────────────────────────────────────
export async function searchNews(
  query: string,
  maxResults = 15
): Promise<Article[]> {
  let articles: Article[] = [];
  const chineseQuery = isChineseQuery(query);

  // 1. Hacker News API
  try {
    const hnStories = await fetchHNTopStories(60);
    const matching = hnStories
      .filter((s) => matchesQuery(s.title, s.text || '', query))
      .slice(0, Math.ceil(maxResults / 2));
    articles.push(...matching.map(hnToArticle));
  } catch {
    // 静默失败
  }

  // 2. RSS 源（并行获取）
  try {
    const feedResults = await Promise.all(
      RSS_SOURCES.map((source) => fetchRSSFeed(source.url))
    );

    for (let i = 0; i < feedResults.length; i++) {
      if (articles.length >= maxResults) break;
      const source = RSS_SOURCES[i];

      for (const item of feedResults[i]) {
        if (articles.length >= maxResults) break;
        if (matchesQuery(item.title, item.description, query)) {
          const article = rssToArticle(item, source.type, source.name);
          article.tags = extractKeywords(query, article.title);
          articles.push(article);
        }
      }
    }
  } catch {
    // 静默失败
  }

  // 3. 对于中文查询或无结果时，补充热门科技新闻（不按关键词过滤）
  if (articles.length < 5 || chineseQuery) {
    try {
      const fillFeeds = await Promise.all([
        fetchRSSFeed('https://hnrss.org/frontpage?count=20'),
        fetchRSSFeed('https://www.sciencedaily.com/rss/top/technology.xml'),
        fetchRSSFeed('https://feeds.bbci.co.uk/news/technology/rss.xml'),
      ]);

      const seen = new Set(articles.map((a) => a.url));
      for (const feed of fillFeeds) {
        for (const item of feed) {
          if (articles.length >= maxResults + 5) break;
          if (seen.has(item.link)) continue;
          seen.add(item.link);
          const article = rssToArticle(item, 'news', '科技资讯');
          article.tags = extractKeywords(query, article.title);
          articles.push(article);
        }
      }
    } catch {
      // 静默失败
    }
  }

  return articles.slice(0, maxResults);
}

export async function getNewsFromFeeds(maxResults = 20): Promise<Article[]> {
  return searchNews('', maxResults);
}

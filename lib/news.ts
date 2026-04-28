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

// ─── RSS 源列表 ─────────────────────────────────────────────
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
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const innerXml = match[1];
    const link = extractTag(innerXml, 'link')
      || extractAttr(innerXml, 'link', 'href')
      || '';

    items.push({
      title: extractTag(innerXml, 'title') || '',
      link: link,
      description: extractTag(innerXml, 'description')
        || extractTag(innerXml, 'summary')
        || extractTag(innerXml, 'content') || '',
      pubDate: extractTag(innerXml, 'pubDate')
        || extractTag(innerXml, 'published')
        || extractTag(innerXml, 'updated') || '',
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
    // 先移除 CDATA 包裹
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    // 移除 <img> 标签及其后的图注文字（"图源：...", "图片来源：..."）
    .replace(/<img[^>]*>/gi, '')
    .replace(/图源[：:][^\n<。]*[。\n]?/g, '')
    .replace(/图片来源[：:][^\n<。]*[。\n]?/g, '')
    .replace(/图片[：:][^\n<。]*[。\n]?/g, '')
    // 移除所有 HTML 标签
    .replace(/<[^>]+>/g, '')
    // 解码 HTML 实体
    .replace(/&amp;|&#38;/gi, '&')
    .replace(/&lt;|&#60;/gi, '<')
    .replace(/&gt;|&#62;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n) => String.fromCharCode(parseInt(n, 16)))
    // 移除 CSS 残留 和 data 属性残留
    .replace(/[a-z]+-[a-z]+(?:-[a-z]+)*\s*[:=]\s*[^;]+[;]?/gi, '')
    .replace(/image-wrapper|img-desc|image-caption/gi, '')
    // 合并空白
    .replace(/\s+/g, ' ')
    .trim();

  // 清理 HN RSS 元数据
  cleaned = cleaned
    .replace(/Article URL:\s*\S+/gi, '')
    .replace(/Comments URL:\s*\S+/gi, '')
    .replace(/Points:\s*\d+/gi, '')
    .replace(/# Comments:\s*\d+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

// ─── 智能摘要提取 ────────────────────────────────────────────
function extractSummary(description: string, title: string, sourceName: string): string {
  const cleaned = cleanHTML(description);

  // 对 36kr 摘要格式做特殊处理：摘要包含多个新闻条目
  if (sourceName === '36氪') {
    // 36kr 的描述通常是多个新闻的合集，尝试提取与标题相关的部分
    const titleKeywords = title.replace(/[，。、；：！？\s]/g, ' ').split(' ').filter(w => w.length >= 2);
    const paragraphs = cleaned.split(/[。！？\n]/).filter(s => s.trim().length > 5);

    // 找到包含标题关键词最多的段落
    let bestPara = '';
    let bestScore = 0;
    for (const para of paragraphs.slice(0, 10)) {
      const score = titleKeywords.filter(kw => para.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestPara = para;
      }
    }

    if (bestPara && bestPara.trim().length > 15) {
      return bestPara.trim().slice(0, 350);
    }
    // 找不到匹配段落，使用前几个有意义的句子
    const meaningful = paragraphs.filter(p => p.trim().length > 15);
    return meaningful.slice(0, 3).join('。').slice(0, 350) || '暂无摘要，请点击原文查看详情';
  }

  // 通用处理：取前几个有意义的句子
  const sentences = cleaned.split(/[。！？.!?]/).filter(s => s.trim().length > 5);
  const meaningful = sentences.filter(s => {
    const t = s.trim();
    // 过滤掉纯标签/导航文本
    if (/^(大公司|新产品|投融资|其他|相关|推荐|阅读|查看|点击|扫码|关注|来源|作者|编辑)[：:：]/.test(t)) return false;
    if (t.length < 10) return false;
    return true;
  });

  const result = meaningful.slice(0, 3).join('。');
  if (result.trim().length > 15) return result.slice(0, 350);
  return cleaned.slice(0, 350) || '暂无摘要，请点击原文查看详情';
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

  // 中文查询：检查标题或描述是否包含任意一个查询字词
  if (/[\u4e00-\u9fff]/.test(query)) {
    const haystack = `${itemTitle} ${itemDesc}`;
    // 将查询拆分为单个汉字和词组
    const chars = query.replace(/\s+/g, '').split('');
    // 至少匹配 2 个汉字或查询中的连续片段
    let matchCount = 0;
    for (const char of chars) {
      if (haystack.includes(char)) matchCount++;
    }
    // 中文查询：至少匹配 30% 的字符
    return matchCount >= Math.max(2, chars.length * 0.3);
  }

  // 英文查询：不区分大小写，任一搜索词匹配即可
  const lower = query.toLowerCase();
  const terms = lower.split(/\s+/).filter(t => t.length > 0);
  const haystack = `${itemTitle} ${itemDesc}`.toLowerCase();

  // 短词（<=2 字符）要求精确单词匹配
  // 长词用子串匹配
  return terms.some((term) => {
    if (term.length <= 2) {
      const wordRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return wordRegex.test(haystack);
    }
    return haystack.includes(term);
  });
}

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
    summary: extractSummary(item.description, cleanHTML(item.title), sourceName),
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
        // 中文查询或短查询时放宽匹配条件
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

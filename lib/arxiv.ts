import type { Article } from './types';

const ARXIV_API = 'https://export.arxiv.org/api/query';

export async function searchArxiv(
  query: string,
  maxResults = 20,
  start = 0
): Promise<Article[]> {
  const params = new URLSearchParams({
    search_query: `all:${query}`,
    start: String(start),
    max_results: String(maxResults),
    sortBy: 'relevance',
    sortOrder: 'descending',
  });

  try {
    const response = await fetch(`${ARXIV_API}?${params}`);

    if (!response.ok) {
      console.error('arXiv API error:', response.status, response.statusText);
      return [];
    }

    const text = await response.text();
    return parseArxivXml(text);
  } catch (error) {
    console.error('arXiv fetch error:', error);
    return [];
  }
}

function parseArxivXml(xml: string): Article[] {
  const entries = xml.split('<entry>').slice(1);
  const articles: Article[] = [];

  for (const entry of entries) {
    try {
      const id = extractTag(entry, 'id')?.replace('http://arxiv.org/abs/', '') || '';
      const title = cleanText(extractTag(entry, 'title') || '');
      const summary = cleanText(extractTag(entry, 'summary') || '').slice(0, 300);
      const published = extractTag(entry, 'published')?.split('T')[0] || '';
      const authors = extractAllTags(entry, 'name');

      // 提取分类标签
      const categories = extractAllTags(entry, 'category')
        .map((c) => c.split(' ')[0])
        .slice(0, 3);

      articles.push({
        id: `arxiv-${id}`,
        title: title || '无标题',
        summary: summary || '暂无摘要',
        source: 'arXiv',
        sourceType: 'paper',
        url: `https://arxiv.org/abs/${id}`,
        imageUrl: null,
        publishedDate: published,
        authors: authors.slice(0, 5),
        tags: categories,
        clickCount: Math.floor(Math.random() * 100),
      });
    } catch {
      // Skip malformed entries
    }
  }

  return articles;
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's'));
  return match ? match[1].trim() : null;
}

function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'gs');
  const matches = xml.matchAll(regex);
  return Array.from(matches, (m) => m[1].trim());
}

export async function getArxivById(id: string): Promise<Article | null> {
  const params = new URLSearchParams({
    id_list: id,
    max_results: '1',
  });

  try {
    const response = await fetch(`${ARXIV_API}?${params}`);
    if (!response.ok) return null;

    const text = await response.text();
    const articles = parseArxivXml(text);
    return articles[0] || null;
  } catch {
    return null;
  }
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\\n/g, ' ')
    .trim();
}

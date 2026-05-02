/**
 * OpenAlex 学术元数据 API 封装。
 *
 * API 文档：https://api.openalex.org
 * 完全免费，无需 API Key，覆盖全球 2 亿+ 学术论文、会议论文、书籍等。
 * 数据质量高，元数据丰富（DOI、作者、机构、期刊、引用量等）。
 */

import type { Article } from './types';

const OPENALEX_API = 'https://api.openalex.org';

export async function searchOpenAlex(
  query: string,
  perPage = 20,
  page = 1
): Promise<Article[]> {
  const offset = (page - 1) * perPage;

  try {
    const url = `${OPENALEX_API}/works?search=${encodeURIComponent(query)}&per-page=${perPage}&page=${page}&mailto=research-tracker@example.com`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ResearchTracker/1.0 (https://researchtracker.win; mailto:research-tracker@example.com)' },
      next: { revalidate: 30 * 60 }, // 缓存 30 分钟
    });

    if (!res.ok) {
      console.error('OpenAlex API error:', res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    return (data.results || []).map(toArticle);
  } catch (error) {
    console.error('OpenAlex fetch error:', error);
    return [];
  }
}

export async function getOpenAlexById(id: string): Promise<Article | null> {
  try {
    const workId = id.replace('openalex-', '');
    const url = `${OPENALEX_API}/works/${workId}?mailto=research-tracker@example.com`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ResearchTracker/1.0 (https://researchtracker.win; mailto:research-tracker@example.com)' },
      next: { revalidate: 60 * 60 }, // 缓存 1 小时
    });

    if (!res.ok) return null;
    const data = await res.json();
    return toArticle(data);
  } catch {
    return null;
  }
}

/** 将 OpenAlex work 对象映射为统一 Article 格式 */
function toArticle(work: Record<string, unknown>): Article {
  // OpenAlex ID 示例：https://openalex.org/W2893546873
  const openalexId: string = (work.id as string) || '';
  const workId = openalexId.replace('https://openalex.org/', '');

  // DOI 链接
  const doi: string = (work.doi as string) || '';
  const url = doi || openalexId || '#';

  // 标题
  const title: string = ((work.title as string) || '无标题').replace(/\s+/g, ' ');

  // 摘要（OpenAlex 的 abstract_inverted_index 需要反转还原）
  const invertedIndex = work.abstract_inverted_index as Record<string, Array<[number, number]>> | null;
  const summary = reconstructAbstract(invertedIndex);

  // 作者
  const authorships = (work.authorships as Array<{ author: { display_name: string }; author_position: string }>) || [];
  const authors = authorships.map((a) => a.author?.display_name || '').filter(Boolean);

  // 出版日期
  const publicationDate = parseOpenAlexDate(work);

  // 期刊/来源
  const primaryLocation = work.primary_location as Record<string, unknown> | null;
  const source = (primaryLocation?.source as Record<string, unknown>)?.display_name as string || '';
  const journal = (work.host_venue as Record<string, unknown>)?.display_name as string || source;

  // 标签/主题
  const topics = (work.topics as Array<{ display_name: string; subfield: { display_name: string }; field: { display_name: string } }>) || [];
  const tags = topics
    .slice(0, 5)
    .map((t) => t.subfield?.display_name || t.field?.display_name || t.display_name);

  // DOI 基础点击量（引用量作代理）
  const citedByCount: number = (work.cited_by_count as number) || 0;

  return {
    id: `openalex-${workId}`,
    title,
    summary: summary || '暂无摘要（点击查看原文获取完整内容）',
    source: journal || source || 'OpenAlex',
    sourceType: 'paper',
    url,
    imageUrl: null,
    publishedDate: publicationDate,
    authors: authors.slice(0, 5),
    tags,
    clickCount: citedByCount,
  };
}

/** 从 OpenAlex work 对象解析出版日期 */
function parseOpenAlexDate(work: Record<string, unknown>): string {
  // 优先使用 publication_date（格式：YYYY-MM-DD）
  const pubDate: string = (work.publication_date as string) || '';
  if (pubDate && /^\d{4}-\d{2}-\d{2}$/.test(pubDate)) {
    return pubDate;
  }
  // 其次使用 created_date（格式：YYYY-MM-DDTHH:MM:SS）
  const createdDate: string = (work.created_date as string) || '';
  if (createdDate) {
    return createdDate.split('T')[0];
  }
  // fallback 到 pubYear
  const year: number = (work.publication_year as number) || 0;
  if (year > 1900) return `${year}-01-01`;
  return '';
}

/** 还原 OpenAlex inverted_index 格式的摘要文本 */
function reconstructAbstract(invertedIndex: Record<string, Array<[number, number]>> | null): string {
  if (!invertedIndex) return '';
  try {
    const words: Array<[number, string]> = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const [pos] of positions) {
        words.push([pos, word]);
      }
    }
    words.sort((a, b) => a[0] - b[0]);
    return words.map(([, word]) => word).join(' ');
  } catch {
    return '';
  }
}

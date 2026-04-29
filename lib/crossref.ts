import type { Article } from './types';

/**
 * CrossRef API — 覆盖 150M+ 学术论文，免费无需 API Key。
 * 比 arXiv 覆盖范围广得多（包含所有主要出版社的论文）。
 */
const CROSSREF_API = 'https://api.crossref.org/works';

export async function searchCrossRef(
  query: string,
  maxResults = 20,
  offset = 0
): Promise<Article[]> {
  const params = new URLSearchParams({
    query,
    rows: String(Math.min(maxResults, 20)),
    offset: String(offset),
    filter: 'type:journal-article',
    select: 'DOI,title,abstract,URL,created,author,subject,container-title,published-print,published-online',
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${CROSSREF_API}?${params}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ResearchTracker/1.0 (mailto:research-tracker@example.com)',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('CrossRef API error:', response.status);
      return [];
    }

    const data = await response.json();
    const items = data.message?.items || [];

    return items.map((item: Record<string, unknown>) => {
      const titleArray = item.title as string[] | undefined;
      const title = titleArray?.[0] || '无标题';
      const abstract = (item.abstract as string) || '';
      const doi = item.DOI as string || '';
      const url = `https://doi.org/${doi}`;

      // 提取发表日期
      const createdDate = (item.created as { 'date-parts': number[][] })['date-parts']?.[0];
      const publishedPrint = (item['published-print'] as { 'date-parts': number[][] })['date-parts']?.[0];
      const publishedOnline = (item['published-online'] as { 'date-parts': number[][] })['date-parts']?.[0];
      const dateParts = publishedPrint || publishedOnline || createdDate;
      const dateStr = dateParts
        ? `${dateParts[0]}-${String(dateParts[1] || 1).padStart(2, '0')}-${String(dateParts[2] || 1).padStart(2, '0')}`
        : '';

      // 提取作者
      const authors = ((item.author as Array<{ given?: string; family?: string }>) || [])
        .map((a) => `${a.given || ''} ${a.family || ''}`.trim())
        .filter(Boolean);

      // 提取主题标签
      const subjects = (item.subject as string[]) || [];
      const containerTitle = (item['container-title'] as string[])?.[0];
      const tags = [...subjects.slice(0, 3)];
      if (containerTitle) tags.unshift(containerTitle);

      return {
        id: `crossref-${doi || String(Math.random())}`,
        title,
        summary: abstract.slice(0, 1200) || '暂无摘要',
        source: 'CrossRef',
        sourceType: 'paper' as const,
        url,
        imageUrl: null,
        publishedDate: dateStr,
        authors: authors.slice(0, 5),
        tags: tags.slice(0, 4),
        clickCount: Math.floor(Math.random() * 60) + 5,
      };
    });
  } catch (error) {
    console.error('CrossRef fetch error:', error);
    return [];
  }
}

/**
 * 通过 DOI 获取单篇论文详情。
 */
export async function getCrossRefByDoi(doi: string): Promise<Article | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${CROSSREF_API}/${encodeURIComponent(doi)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ResearchTracker/1.0 (mailto:research-tracker@example.com)',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const item = data.message;
    if (!item) return null;

    const title = (item.title as string[])?.[0] || '无标题';
    const abstract = (item.abstract as string) || '';
    const url = `https://doi.org/${item.DOI}`;

    const publishedPrint = (item['published-print'] as { 'date-parts': number[][] })['date-parts']?.[0];
    const dateParts = publishedPrint || (item.created as { 'date-parts': number[][] })['date-parts']?.[0];
    const dateStr = dateParts
      ? `${dateParts[0]}-${String(dateParts[1] || 1).padStart(2, '0')}-${String(dateParts[2] || 1).padStart(2, '0')}`
      : '';

    const authors = ((item.author as Array<{ given?: string; family?: string }>) || [])
      .map((a) => `${a.given || ''} ${a.family || ''}`.trim())
      .filter(Boolean);

    return {
      id: `crossref-${item.DOI as string}`,
      title,
      summary: abstract.slice(0, 2000) || '暂无摘要',
      source: 'CrossRef',
      sourceType: 'paper',
      url,
      imageUrl: null,
      publishedDate: dateStr,
      authors: authors.slice(0, 5),
      tags: (item.subject as string[])?.slice(0, 4) || [],
      clickCount: Math.floor(Math.random() * 40) + 5,
    };
  } catch {
    return null;
  }
}

import type { Article } from './types';

const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1';

export async function searchSemanticScholar(
  query: string,
  limit = 20,
  offset = 0
): Promise<Article[]> {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
    offset: String(offset),
    fields: 'title,abstract,url,publicationDate,authors,externalIds,fieldsOfStudy,openAccessPdf',
  });

  try {
    const response = await fetch(`${SEMANTIC_SCHOLAR_API}/paper/search?${params}`);

    if (!response.ok) {
      console.error('Semantic Scholar API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return (data.data || []).map((paper: Record<string, unknown>) => {
      const fields = (paper.fieldsOfStudy as string[]) || [];
      const authors = ((paper.authors as Array<{ name: string }>) || []).map((a) => a.name);
      const extIds = (paper.externalIds as Record<string, string>) || {};

      return {
        id: `ss-${paper.paperId}`,
        title: (paper.title as string) || '无标题',
        summary: ((paper.abstract as string) || '暂无摘要').slice(0, 300),
        source: 'Semantic Scholar',
        sourceType: 'paper' as const,
        url: (paper.url as string) || `https://www.semanticscholar.org/paper/${paper.paperId}`,
        imageUrl: null,
        publishedDate: (paper.publicationDate as string) || '',
        authors: authors.slice(0, 5),
        tags: fields.slice(0, 4),
        clickCount: Math.floor(Math.random() * 80),
      };
    });
  } catch (error) {
    console.error('Semantic Scholar fetch error:', error);
    return [];
  }
}

export async function getPaperById(id: string): Promise<Article | null> {
  const paperId = id.replace('ss-', '');

  try {
    const response = await fetch(
      `${SEMANTIC_SCHOLAR_API}/paper/${paperId}?fields=title,abstract,url,publicationDate,authors,externalIds,fieldsOfStudy,openAccessPdf,tldr`
    );

    if (!response.ok) return null;

    const paper = await response.json();
    const fields = (paper.fieldsOfStudy as string[]) || [];
    const authors = ((paper.authors as Array<{ name: string }>) || []).map((a) => a.name);

    return {
      id: `ss-${paper.paperId}`,
      title: (paper.title as string) || '无标题',
      summary: ((paper.abstract as string) || (paper.tldr as { text: string })?.text || '暂无摘要').slice(0, 500),
      source: 'Semantic Scholar',
      sourceType: 'paper',
      url: (paper.url as string) || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      imageUrl: null,
      publishedDate: (paper.publicationDate as string) || '',
      authors: authors.slice(0, 5),
      tags: fields.slice(0, 4),
      clickCount: Math.floor(Math.random() * 50),
    };
  } catch {
    return null;
  }
}

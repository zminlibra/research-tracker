import type { Article } from './types';

const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1';

/**
 * 带指数退避重试的 fetch 封装，处理 429 限流。
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // 限流：等待后重试
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.warn(`Semantic Scholar 429 限流，第 ${attempt + 1} 次重试，${waitMs}ms 后重试...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  throw lastError || new Error('请求失败（超过最大重试次数）');
}

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
    const response = await fetchWithRetry(`${SEMANTIC_SCHOLAR_API}/paper/search?${params}`);

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
        summary: ((paper.abstract as string) || '暂无摘要').slice(0, 1200),
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
    const response = await fetchWithRetry(
      `${SEMANTIC_SCHOLAR_API}/paper/${paperId}?fields=title,abstract,url,publicationDate,authors,externalIds,fieldsOfStudy,openAccessPdf,tldr`
    );

    if (!response.ok) return null;

    const paper = await response.json();
    const fields = (paper.fieldsOfStudy as string[]) || [];
    const authors = ((paper.authors as Array<{ name: string }>) || []).map((a) => a.name);

    return {
      id: `ss-${paper.paperId}`,
      title: (paper.title as string) || '无标题',
      summary: ((paper.abstract as string) || (paper.tldr as { text: string })?.text || '暂无摘要').slice(0, 2000),
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

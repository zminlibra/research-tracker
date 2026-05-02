/**
 * 全文抓取工具
 * 尝试从各大学术平台抓取论文全文（HTML 格式）
 * 优先级：arXiv HTML > PMC 免费全文 > 摘要兜底
 */

const FULL_TEXT_CACHE = new Map<string, string>();

/**
 * 根据文章 ID 和 URL 尝试抓取全文
 * 返回全文文本，如果无法获取则返回 null
 */
export async function fetchFullText(
  articleId: string,
  articleUrl: string,
  summary: string
): Promise<string | null> {
  const cacheKey = `fulltext:${articleId}`;
  if (FULL_TEXT_CACHE.has(cacheKey)) {
    return FULL_TEXT_CACHE.get(cacheKey)!;
  }

  try {
    // 1. arXiv HTML 版本
    if (articleId.startsWith('arxiv-') || articleUrl.includes('arxiv.org')) {
      const fullText = await fetchArxivFullText(articleId, articleUrl);
      if (fullText && fullText.length > 500) {
        FULL_TEXT_CACHE.set(cacheKey, fullText);
        return fullText;
      }
    }

    // 2. PubMed Central (PMC) 免费全文
    if (articleId.startsWith('pmc-') || articleUrl.includes('ncbi.nlm.nih.gov')) {
      const fullText = await fetchPmcFullText(articleId, articleUrl);
      if (fullText && fullText.length > 500) {
        FULL_TEXT_CACHE.set(cacheKey, fullText);
        return fullText;
      }
    }

    // 3. Semantic Scholar 如果有 OA 链接
    if (articleId.startsWith('ss-')) {
      const fullText = await fetchSemanticScholarFullText(articleId);
      if (fullText && fullText.length > 500) {
        FULL_TEXT_CACHE.set(cacheKey, fullText);
        return fullText;
      }
    }
  } catch {
    // 所有抓取尝试失败，返回 null
  }

  // 全文抓取失败，返回 null，调用方会使用摘要
  return null;
}

/**
 * 抓取 arXiv 论文全文（HTML 格式）
 * arXiv 提供 HTML 版本：https://ar5iv.labs.arxiv.org/html/<id>
 */
async function fetchArxivFullText(
  articleId: string,
  articleUrl: string
): Promise<string | null> {
  try {
    // 从 articleId 或 URL 中提取 arXiv ID
    let arxivId = articleId.replace('arxiv-', '');
    if (articleUrl) {
      const match = articleUrl.match(/arxiv\.org\/abs\/(\S+)/);
      if (match) arxivId = match[1];
    }

    // 使用 ar5iv 的 HTML 版本（arXiv 的 HTML 渲染服务）
    const htmlUrl = `https://ar5iv.labs.arxiv.org/html/${arxivId}`;
    const response = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'ResearchTracker/1.0 (academic research tool)',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    // 简单去除 HTML 标签，保留文本内容
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, 30000); // 限制长度，避免超过 token 限制
  } catch {
    return null;
  }
}

/**
 * 抓取 PubMed Central (PMC) 免费全文
 */
async function fetchPmcFullText(
  articleId: string,
  articleUrl: string
): Promise<string | null> {
  try {
    // 提取 PMC ID
    let pmcId = '';
    if (articleId.startsWith('pmc-')) {
      pmcId = articleId.replace('pmc-', '');
    } else if (articleUrl) {
      const match = articleUrl.match(/PMC(\d+)/i);
      if (match) pmcId = match[1];
    }

    if (!pmcId) return null;

    // 使用 NCBI 的 efetch API 获取全文
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmcId}&rettype=text`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ResearchTracker/1.0 (academic research tool)',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const text = await response.text();
    if (text.length > 500) {
      return text.slice(0, 30000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 尝试从 Semantic Scholar 获取 OA（开放获取）全文
 */
async function fetchSemanticScholarFullText(
  articleId: string
): Promise<string | null> {
  try {
    const ssId = articleId.replace('ss-', '');
    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/${ssId}?fields=title,abstract,openAccessPdf`,
      {
        headers: {
          'User-Agent': 'ResearchTracker/1.0 (academic research tool)',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    
    // 如果有 OA PDF 链接，尝试抓取
    if (data.openAccessPdf?.url) {
      const pdfResponse = await fetch(data.openAccessPdf.url, {
        signal: AbortSignal.timeout(10000),
      });
      if (pdfResponse.ok) {
        // 注意：PDF 需要解析，这里只返回摘要作为兜底
        // 实际生产环境需要使用 PDF 解析库（如 pdf-parse）
        return data.abstract || null;
      }
    }

    return data.abstract || null;
  } catch {
    return null;
  }
}

/**
 * 为 ChatWithPaper 准备上下文
 * 优先返回全文，如果没有则返回摘要
 */
export async function getPaperContext(
  articleId: string,
  articleUrl: string,
  summary: string
): Promise<{ context: string; isFullText: boolean }> {
  const fullText = await fetchFullText(articleId, articleUrl, summary);
  
  if (fullText && fullText.length > summary.length * 2) {
    return {
      context: fullText,
      isFullText: true,
    };
  }

  return {
    context: summary,
    isFullText: false,
  };
}

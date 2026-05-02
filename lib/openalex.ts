/**
 * OpenAlex 学术元数据 API 封装。
 *
 * API 文档：https://developers.openalex.org/
 * Freemium 模式：需 API Key，每日 $1 免费额度（约 1000 次搜索）。
 * 数据覆盖全球 2 亿+ 学术论文、会议论文、书籍等。
 */

import type { Article } from './types';

const OPENALEX_API = 'https://api.openalex.org';
const MAILTO = 'zminlibra@gmail.com';

/**
 * 从环境变量读取 OpenAlex API Key。
 * 兼容多种运行时环境：Node.js、Cloudflare Workers、Next.js Edge
 */
function getApiKey(): string | undefined {
  // 兼容多种运行时：Node.js / Next.js / Cloudflare Workers
  const nodeKey = typeof process !== 'undefined' ? (process.env?.OPENALEX_API_KEY as string | undefined) : undefined;
  const globalKey = typeof globalThis !== 'undefined' ? ((globalThis as Record<string, unknown>).OPENALEX_API_KEY as string | undefined) : undefined;
  const key = nodeKey || globalKey;

  // 仅在开发环境输出日志
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    if (key) {
      console.log('[OpenAlex] API Key loaded');
    } else {
      console.warn('[OpenAlex] API Key not found in environment variables');
    }
  }
  return key;
}

/**
 * 构建带认证和字段筛选的 URL。
 * - api_key：认证（来自环境变量）
 * - mailto：礼貌性标识（帮助 OpenAlex 联系开发者）
 * - select：只拉取 toArticle() 实际使用的字段，减小响应体积
 */
function buildUrl(path: string, params: URLSearchParams): string {
  const apiKey = getApiKey();
  if (apiKey) {
    params.set('api_key', apiKey);
  }
  params.set('mailto', MAILTO);
  return `${OPENALEX_API}${path}?${params.toString()}`;
}

/**
 * toArticle() 实际使用的字段清单，通过 select 参数只拉这些字段。
 * 完整字段列表：https://developers.openalex.org/docs/fields
 */
const SELECT_FIELDS = [
  'id',
  'doi',
  'title',
  'abstract_inverted_index',
  'authorships',
  'publication_date',
  'publication_year',
  'locations',
  'topics',
  'cited_by_count',
  'type',
  'language',
].join(',');

/**
 * 搜索 OpenAlex 论文。
 * 支持分页，返回 Article[] 数组。
 * @param query 搜索关键词
 * @param perPage 每页数量（默认20，最大100）
 * @param page 页码
 * @param chineseOnly 是否仅返回中国机构作者的论文（注入 institutions.country_code:CN 过滤）
 */
export async function searchOpenAlex(
  query: string,
  perPage = 20,
  page = 1,
  chineseOnly = false,
): Promise<Article[]> {
  try {
    const params = new URLSearchParams({
      search: query,
      'per-page': String(Math.min(perPage, 100)),
      page: String(page),
      select: SELECT_FIELDS,
    });

    // 注入中文机构过滤（作者团队中至少一人来自中国高校/研究所）
    if (chineseOnly) {
      params.set('filter', 'authorships.institutions.country_code:CN');
    }

    const url = buildUrl('/works', params);

    console.log('[OpenAlex] Request URL:', url.replace(/api_key=[^&]+/, 'api_key=***'));

    const res = await fetch(url, {
      headers: {
        'User-Agent': `ResearchTracker/1.0 (mailto:${MAILTO})`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[OpenAlex] HTTP ${res.status}: ${res.statusText}`, body.slice(0, 200));
      return [];
    }

    const data = await res.json();
    const results: Record<string, unknown>[] = data.results || [];

    if (results.length === 0) {
      return [];
    }

    return results.map(toArticle);
  } catch (error) {
    console.error('[OpenAlex] search error:', error);
    return [];
  }
}

/**
 * 根据 OpenAlex work ID 获取单篇文章详情。
 */
export async function getOpenAlexById(id: string): Promise<Article | null> {
  try {
    // id 格式：openalex-W2021099440 或 W2021099440 或 https://openalex.org/W2021099440
    const workId = id
      .replace('openalex-', '')
      .replace('https://openalex.org/', '')
      .replace(/^W/, 'W');

    const params = new URLSearchParams({ select: SELECT_FIELDS });
    const url = buildUrl(`/works/${workId}`, params);

    const res = await fetch(url, {
      headers: {
        'User-Agent': `ResearchTracker/1.0 (mailto:${MAILTO})`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[OpenAlex] fetchById HTTP', res.status, body.slice(0, 200));
      return null;
    }

    const data = await res.json();
    return toArticle(data);
  } catch (error) {
    console.error('[OpenAlex] fetchById error:', error);
    return null;
  }
}

/** 将 OpenAlex work 对象映射为统一 Article 格式 */
function toArticle(work: Record<string, unknown>): Article {
  // OpenAlex ID 示例：https://openalex.org/W2893546873
  const openalexId: string = (work.id as string) || '';
  const workId = openalexId.replace('https://openalex.org/', '');

  // DOI 链接（优先使用 DOI 作为跳转 URL）
  const doi: string = (work.doi as string) || '';
  const url = doi || openalexId || '#';

  // 标题（确保不为空）
  const titleRaw = (work.title as string) || '';
  const title: string = titleRaw.replace(/\s+/g, ' ').trim() || '无标题';

  // 摘要（OpenAlex 的 abstract_inverted_index 需要反转还原）
  // 格式：{ "word": [{ "start": 0, "end": 5, ... }, ...], ... }
  const invertedIndex = work.abstract_inverted_index as Record<string, OpenAlexPosition[]> | null;
  const summary = reconstructAbstract(invertedIndex);

  // 作者列表
  const authorships = (work.authorships as AuthorshipEntry[]) || [];
  const authors = authorships
    .map((a) => a.author?.display_name?.trim())
    .filter((name): name is string => Boolean(name));

  // 提取作者机构所属国家代码（用于中文论文检测）
  const countrySet = new Set<string>();
  for (const a of authorships) {
    if (a.institutions) {
      for (const inst of a.institutions) {
        if (inst.country_code) {
          countrySet.add(inst.country_code.toUpperCase());
        }
      }
    }
  }
  const institutionsCountry = countrySet.size > 0 ? Array.from(countrySet) : undefined;

  // 出版日期
  const publicationDate = parseOpenAlexDate(work);

  // 期刊/来源名称（从 locations 取第一个来源的 display_name）
  const locations = (work.locations as Location[]) || [];
  const sourceDisplayName: string = locations[0]?.source?.display_name || '';
  const journal = sourceDisplayName;

  // 标签/主题（前 5 个，取 subfield 或 field 或 topic 名称）
  const topics = (work.topics as Topic[]) || [];
  const tags = topics.slice(0, 5).map((t) =>
    t.subfield?.display_name || t.field?.display_name || t.display_name || ''
  ).filter(Boolean);

  // 引用量（作为热度代理）
  const citedByCount: number = (work.cited_by_count as number) || 0;

  // 生成稳定 ID：优先用 DOI，其次用 OpenAlex ID
  const stableId = doi
    ? `openalex-${encodeURIComponent(doi.replace('https://doi.org/', ''))}`
    : `openalex-${workId}`;

  return {
    id: stableId,
    title,
    summary: summary || '暂无摘要（点击查看原文获取完整内容）',
    source: journal || 'OpenAlex',
    sourceType: 'paper',
    url,
    imageUrl: null,
    publishedDate: publicationDate,
    authors: authors.slice(0, 5),
    tags,
    clickCount: citedByCount,
    institutionsCountry,
  };
}

/** OpenAlex abstract_inverted_index 中每个词条的位置信息 */
interface OpenAlexPosition {
  start: number;
  end: number;
  sentences_before?: number;
  sentences_in_sentence?: number;
  sentences_after?: number;
}

/** OpenAlex authorships 中的作者条目 */
interface AuthorshipEntry {
  author?: { display_name?: string };
  author_position?: string;
  institutions?: Array<{ display_name?: string; country_code?: string; type?: string }>;
}

/** OpenAlex locations 中的来源条目 */
interface Location {
  source?: { display_name?: string };
}

/** OpenAlex topics 中的主题条目 */
interface Topic {
  display_name?: string;
  subfield?: { display_name?: string };
  field?: { display_name?: string };
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

/**
 * 还原 OpenAlex inverted_index 格式的摘要文本。
 *
 * OpenAlex abstract_inverted_index 格式示例：
 * {
 *   "Background:": [144],
 *   "and":         [156],
 *   ...
 * }
 *
 * 注意：position 值可能是数字（直接表示位置），也可能是 { start, end } 对象。
 * 每个词对应一个或多个位置，需提取所有位置并按 position 值排序。
 */
function reconstructAbstract(invertedIndex: Record<string, number[] | OpenAlexPosition[]> | null): string {
  if (!invertedIndex) return '';

  try {
    const words: Array<{ pos: number; word: string }> = [];

    for (const [word, positions] of Object.entries(invertedIndex)) {
      if (!positions || positions.length === 0) continue;
      for (const posEntry of positions) {
        // 兼容两种格式：直接数字 或 { start: number } 对象
        if (typeof posEntry === 'number') {
          words.push({ pos: posEntry, word });
        } else if (typeof posEntry === 'object' && posEntry !== null && typeof posEntry.start === 'number') {
          words.push({ pos: posEntry.start, word });
        }
      }
    }

    if (words.length === 0) return '';

    // 按位置排序，还原原始顺序
    words.sort((a, b) => a.pos - b.pos);
    return words.map((w) => w.word).join(' ');
  } catch {
    return '';
  }
}

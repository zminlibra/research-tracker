'use client';

import type { AIInsight } from './types';

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const STORAGE_KEY = 'deepseek_api_key';

export function getClientApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveClientApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch { /* ignore */ }
}

export function clearClientApiKey(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export function hasClientApiKey(): boolean {
  return getClientApiKey().length > 0;
}

// ─── 通用 DeepSeek 调用（OpenAI 兼容格式）───────────────────────
async function callDeepSeek(prompt: string, temperature = 0.5, maxTokens = 1024): Promise<string> {
  const apiKey = getClientApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 402) throw new Error('DEEPSEEK_QUOTA_EXHAUSTED');
    throw new Error(`DeepSeek API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── AI 分析 ───────────────────────────────────────────────────
export async function generateClientInsight(
  title: string,
  abstract: string,
  sourceType: string
): Promise<AIInsight> {
  const typeLabel = sourceType === 'paper' ? '一篇学术论文' : '一篇科技新闻报道';

  const prompt = `你是一个顶尖的科研分析助手。请认真阅读以下${typeLabel}，用中文撰写一份高质量的分析报告。

标题：${title}
正文/摘要：${abstract}

请严格按照以下JSON格式回复（不要输出任何其他内容）：
{
  "summary": "用200-300字的中文，以通俗易懂的语言归纳这篇文章的核心发现和主要贡献。不要直接复制粘贴原文句子，要用你自己的话重新组织。如果原文是英文，请翻译成中文。",
  "keyPoints": [
    "具体的关键发现1（要包含实质信息，不要泛泛而谈）",
    "具体的关键发现2",
    "具体的关键发现3",
    "具体的关键发现4"
  ],
  "analysis": "用200-300字的中文，深入分析：(1)这项研究/报道的意义和潜在影响；(2)与该领域其他工作的关联或对比；(3)可能的应用场景或局限性。要具体，不要套话。"
}`;

  const text = await callDeepSeek(prompt, 0.5, 1024);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || [],
        analysis: parsed.analysis || '',
      };
    } catch { /* fall through */ }
  }

  return {
    summary: text.slice(0, 500),
    analysis: '',
    keyPoints: [],
  };
}

// ─── 中英翻译 ───────────────────────────────────────────────────
export async function translateToChineseClient(text: string): Promise<string> {
  const prompt = `请将以下英文科技内容翻译成流畅的中文。保留专业术语，使译文通俗易懂。只输出翻译结果，不要任何解释。\n\n${text.slice(0, 2000)}`;

  return callDeepSeek(prompt, 0.3, 1024);
}

// ─── 中文查询翻译为英文关键词 ──────────────────────────────────
export async function translateChineseQueryClient(chineseQuery: string): Promise<string> {
  const prompt = `将以下中文科研搜索词翻译成英文关键词（用空格分隔，只输出关键词，不要其他内容）：\n\n${chineseQuery}`;

  return callDeepSeek(prompt, 0.2, 100);
}

// ─── 动态热门搜索标签 ──────────────────────────────────────────
export interface TrendingTag {
  label: string;
  query: string;
}

const TRENDING_TAGS_CACHE_KEY = 'trending_tags_cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 小时

/**
 * 获取当前科技领域热门搜索标签。
 * 优先使用 localStorage 缓存（6 小时有效），缓存过期后调用 DeepSeek 生成新标签。
 */
export async function getTrendingTags(): Promise<TrendingTag[]> {
  // 尝试从缓存读取
  try {
    const cached = localStorage.getItem(TRENDING_TAGS_CACHE_KEY);
    if (cached) {
      const { tags, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(tags) && tags.length > 0) {
        return tags;
      }
    }
  } catch { /* ignore */ }

  // 缓存过期或不存在，调用 AI 生成
  try {
    const apiKey = getClientApiKey();
    if (!apiKey) {
      return getDefaultTrendingTags();
    }

    const prompt = `列出当前（2026年4月）全球科技领域最受关注的8个热门话题/技术方向。

要求：
1. 每个话题用中文标签（5-8个字）
2. 同时提供对应的英文搜索关键词（用于在学术数据库/新闻源中搜索）
3. 话题应该覆盖不同领域（AI、生物医药、能源、材料、量子、机器人等）
4. 必须是当下真正热门的方向，不是泛泛而谈的经典话题

请严格按以下JSON格式回复（不要输出任何其他内容）：
[
  {"label": "中文标签1", "query": "english search keywords 1"},
  {"label": "中文标签2", "query": "english search keywords 2"},
  {"label": "中文标签3", "query": "english search keywords 3"},
  {"label": "中文标签4", "query": "english search keywords 4"},
  {"label": "中文标签5", "query": "english search keywords 5"},
  {"label": "中文标签6", "query": "english search keywords 6"},
  {"label": "中文标签7", "query": "english search keywords 7"},
  {"label": "中文标签8", "query": "english search keywords 8"}
]`;

    const text = await callDeepSeek(prompt, 0.7, 400);

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 写入缓存
        try {
          localStorage.setItem(TRENDING_TAGS_CACHE_KEY, JSON.stringify({
            tags: parsed,
            timestamp: Date.now(),
          }));
        } catch { /* ignore */ }
        return parsed;
      }
    }
  } catch { /* ignore */ }

  return getDefaultTrendingTags();
}

/**
 * 默认热门标签（AI 不可用时的后备方案，定期手动更新）。
 */
function getDefaultTrendingTags(): TrendingTag[] {
  return [
    { label: '大型语言模型', query: 'large language model' },
    { label: '固态电池', query: 'solid state battery' },
    { label: '基因编辑', query: 'CRISPR gene editing' },
    { label: '量子计算', query: 'quantum computing' },
    { label: '自动驾驶', query: 'autonomous driving' },
    { label: 'mRNA疫苗', query: 'mRNA vaccine' },
    { label: '核聚变', query: 'nuclear fusion' },
    { label: '脑机接口', query: 'brain computer interface' },
  ];
}

// ─── AI 查询扩展 ──────────────────────────────────────────────

interface ExpandedQueries {
  /** 优化后的主搜索查询 */
  primary: string;
  /** 替换关键词（同义词、相关术语） */
  alternatives: string[];
  /** 用于学术搜索的英文关键词 */
  academic: string;
  /** 用于新闻搜索的关键词 */
  news: string;
}

const EXPANDED_QUERY_CACHE = new Map<string, ExpandedQueries>();

/**
 * 使用 AI 扩展用户的搜索查询。
 * 生成优化的搜索词以覆盖更多相关结果。
 * 自带内存缓存（会话级别），避免重复调用。
 */
export async function expandSearchQuery(rawQuery: string): Promise<ExpandedQueries> {
  const cacheKey = rawQuery.toLowerCase().trim();
  if (EXPANDED_QUERY_CACHE.has(cacheKey)) {
    return EXPANDED_QUERY_CACHE.get(cacheKey)!;
  }

  try {
    const apiKey = getClientApiKey();
    if (!apiKey) {
      return simpleExpand(rawQuery);
    }

    const prompt = `你是一个搜索查询优化专家。请分析以下用户输入的搜索词，生成优化的搜索查询。

用户搜索词：${rawQuery}

请严格按以下JSON格式回复（不要输出任何其他内容）：
{
  "primary": "优化后的主搜索查询（修正拼写、添加关键修饰词，英文）",
  "alternatives": ["替换搜索词1", "替换搜索词2", "替换搜索词3"],
  "academic": "用于学术论文数据库搜索的英文关键词（正式术语，用空格分隔）",
  "news": "用于新闻/网页搜索的英文关键词（侧重应用和行业，用空格分隔）"
}

规则：
- 如果用户输入是中文，primary/academic/news 必须翻译为英文
- primary 应该是 3-8 个词的精炼搜索短语
- alternatives 是 2-3 个不同角度的搜索词
- academic 使用正式学术术语
- news 使用更通俗的行业术语`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      return simpleExpand(rawQuery);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const result: ExpandedQueries = {
        primary: parsed.primary || rawQuery,
        alternatives: parsed.alternatives || [],
        academic: parsed.academic || rawQuery,
        news: parsed.news || rawQuery,
      };
      EXPANDED_QUERY_CACHE.set(cacheKey, result);
      return result;
    }
  } catch { /* ignore */ }

  return simpleExpand(rawQuery);
}

function simpleExpand(query: string): ExpandedQueries {
  return {
    primary: query,
    alternatives: [],
    academic: query,
    news: query,
  };
}

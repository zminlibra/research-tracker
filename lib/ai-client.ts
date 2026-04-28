'use client';

import type { AIInsight } from './types';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const STORAGE_KEY = 'gemini_api_key';

/**
 * 从 localStorage 读取用户设置的 API Key。
 * 如果没有设置过，返回空字符串（调用方应提示用户输入）。
 */
export function getClientApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * 保存 API Key 到 localStorage。
 */
export function saveClientApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch { /* ignore */ }
}

/**
 * 清除已保存的 API Key。
 */
export function clearClientApiKey(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/**
 * 检查是否已配置 API Key。
 */
export function hasClientApiKey(): boolean {
  return getClientApiKey().length > 0;
}

// ─── 通用 Gemini 调用 ──────────────────────────────────────────
async function callGemini(prompt: string, temperature = 0.5, maxTokens = 1024): Promise<string> {
  const apiKey = getClientApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

  const text = await callGemini(prompt, 0.5, 1024);

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

  return callGemini(prompt, 0.3, 1024);
}

// ─── 中文查询翻译为英文关键词 ──────────────────────────────────
export async function translateChineseQueryClient(chineseQuery: string): Promise<string> {
  const prompt = `将以下中文科研搜索词翻译成英文关键词（用空格分隔，只输出关键词，不要其他内容）：\n\n${chineseQuery}`;

  return callGemini(prompt, 0.2, 100);
}

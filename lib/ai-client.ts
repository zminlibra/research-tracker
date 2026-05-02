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

// ─── 通用 DeepSeek 调用（非流式）───────────────────────
async function callDeepSeek(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  temperature = 0.5,
  maxTokens = 1024
): Promise<string> {
  const apiKey = getClientApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
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

// ─── 通用 DeepSeek 调用（流式）───────────────────────
export async function callDeepSeekStream(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  onChunk: (text: string) => void
): Promise<void> {
  const apiKey = getClientApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.3,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 402) throw new Error('DEEPSEEK_QUOTA_EXHAUSTED');
    throw new Error(`DeepSeek API ${response.status}: ${errText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;

      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      } catch { /* ignore malformed chunks */ }
    }
  }
}

// ─── 生成长文本分段摘要（Map-Reduce）───────────────────────
export async function summarizeLongText(text: string): Promise<string> {
  if (text.length <= 2000) {
    return callDeepSeek([
      { role: 'system', content: '请用 150 字以内总结以下文本的核心内容，直接输出摘要，不要任何铺垫或套话。' },
      { role: 'user', content: text.slice(0, 4000) },
    ], 0.3, 300);
  }

  // 分段（按句子切分，每段 ~1500 字符）
  const chunks: string[] = [];
  let current = '';
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  for (const sent of sentences) {
    if ((current + sent).length > 1500) {
      if (current) chunks.push(current);
      current = sent;
    } else {
      current += sent;
    }
  }
  if (current) chunks.push(current);

  // Map：每段生成摘要
  const chunkSummaries = await Promise.all(
    chunks.map((chunk) =>
      callDeepSeek([
        { role: 'system', content: '用 80 字以内总结这段内容，直接输出，不要套话。' },
        { role: 'user', content: chunk },
      ], 0.3, 120)
    )
  );

  // Reduce：聚合所有摘要
  const finalSummary = await callDeepSeek([
    { role: 'system', content: '将以下多段摘要合并为一段 200 字以内的连贯总结，直接输出，不要套话。' },
    { role: 'user', content: chunkSummaries.join('\n\n') },
  ], 0.3, 350);

  return finalSummary;
}

// ─── 生成结构化洞察（7 维度增强版）──────────────────────
export async function generateInsight(
  title: string,
  abstract: string
): Promise<AIInsight> {
  const hasContent = abstract && abstract.length > 20;
  const prompt = `你是一位资深合成生物学研究员。请对以下论文进行深度分析，严格按如下七个部分输出，每部分不超过指定字数：

### 一句话摘要
（用 1 句话概括整篇论文的核心发现或结论，不超过 40 字）

### 核心贡献
（该研究解决了什么问题、提出了什么新方法/新发现？用 1-3 句话，禁止出现"本文提出了"等套话，不超过 120 字）

### 技术路径
（使用了哪些关键实验方法、基因工程手段、底盘细胞、仪器设备或计算工具？不超过 150 字）

### 实验结果
（核心数据、性能指标、产量/效率提升幅度、与现有方法的对比等，不超过 150 字）

### 核心要点
（列出该研究最重要的 3-5 个发现或结论，每点用一句话，用编号 1. 2. 3. 格式，不超过 200 字）

### 局限性
（该研究的不足之处：方法局限、规模限制、未解决问题、应用场景约束等，不超过 120 字）

### 深度见解
（该研究对合成生物学领域的影响、潜在应用方向、未来研究建议或展望，不超过 150 字）

论文标题：${title}
${hasContent ? `论文摘要：\n${abstract}` : '（无摘要，仅基于标题分析）'}

严格按以上七部分格式输出，每部分前加"### "标记，不要任何前言、结语或其他内容。`;

  const text = await callDeepSeek(
    [
      {
        role: 'system',
        content:
          '你是合成生物学领域的资深研究员，擅长深度学术分析。输出直接、精准、专业，禁止套话和废话，七个部分缺一不可。',
      },
      { role: 'user', content: prompt },
    ],
    0.3,
    1200
  );

  // 解析七段结构
  const sections: AIInsight = {
    summary: '',
    coreContribution: '',
    methodology: '',
    keyResults: '',
    keyTakeaways: '',
    limitations: '',
    deepInsights: '',
  };

  const patterns: [keyof AIInsight, string][] = [
    ['summary', '一句话摘要'],
    ['coreContribution', '核心贡献'],
    ['methodology', '技术路径'],
    ['keyResults', '实验结果'],
    ['keyTakeaways', '核心要点'],
    ['limitations', '局限性'],
    ['deepInsights', '深度见解'],
  ];

  for (const [key, label] of patterns) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escaped}[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n###|\\n*$)`);
    const match = text.match(regex);
    if (match) sections[key] = match[1].trim();
  }

  // 兜底：如果解析全部失败，把原文本放进 summary
  if (!sections.summary && !sections.coreContribution) {
    sections.summary = text.trim().slice(0, 200);
  }

  return sections;
}

// ─── 中译英翻译 ────────────────────────────────────────────────
export async function translateToChineseClient(text: string): Promise<string> {
  if (typeof window === 'undefined') return '';

  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const prompt = `请将以下英文内容翻译为中文，保持学术风格，准确翻译专业术语：\n\n${text}`;

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });

  if (response.status === 402 || response.status === 429) {
    throw new Error('DEEPSEEK_QUOTA_EXHAUSTED');
  }
  if (!response.ok) {
    throw new Error(`API_ERROR:${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

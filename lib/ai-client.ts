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

// ─── 生成结构化洞察 ───────────────────────
export async function generateInsight(
  title: string,
  summary: string
): Promise<AIInsight> {
  const prompt = `你是一位资深合成生物学研究员。请对以下论文进行分析，输出严格按如下四段格式（每段不超过 150 字）：

### 核心贡献
（用 1-2 句话说明该研究解决了什么问题、提出了什么新方法/新发现，禁止出现"本文提出了"等套话）

### 技术路径
（说明使用的关键实验方法、基因工程手段、底盘细胞或仪器设备）

### 实验结果
（核心数据、性能指标、与现有方法的对比）

### 局限性
（该研究的不足、未解决的问题、或实际应用中的限制）

论文标题：${title}
摘要：${summary || '（无摘要）'}

只输出四段内容，不要任何前言或结尾。`;

  const text = await callDeepSeek(
    [
      { role: 'system', content: '你是合成生物学领域的资深研究员，擅长快速抓住论文核心贡献和技术路径。输出直接、简洁，禁止套话。' },
      { role: 'user', content: prompt },
    ],
    0.3,
    800
  );

  // 解析四段结构
  const sections = {
    coreContribution: '',
    methodology: '',
    keyResults: '',
    limitations: '',
  };

  const coreMatch = text.match(/核心贡献[\s\S]*?\n([\s\S]*?)(?=\n###|\n*$)/);
  const methodMatch = text.match(/技术路径[\s\S]*?\n([\s\S]*?)(?=\n###|\n*$)/);
  const resultMatch = text.match(/实验结果[\s\S]*?\n([\s\S]*?)(?=\n###|\n*$)/);
  const limitMatch = text.match(/局限性[\s\S]*?\n([\s\S]*?)(?=\n###|\n*$)/);

  if (coreMatch) sections.coreContribution = coreMatch[1].trim();
  if (methodMatch) sections.methodology = methodMatch[1].trim();
  if (resultMatch) sections.keyResults = resultMatch[1].trim();
  if (limitMatch) sections.limitations = limitMatch[1].trim();

  // 兜底：如果解析失败，把整个文本放进 coreContribution
  if (!sections.coreContribution && !sections.methodology) {
    sections.coreContribution = text.trim();
  }

  return sections;
}

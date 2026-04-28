import type { AIInsight } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function generateInsight(
  title: string,
  abstract: string,
  sourceType: string
): Promise<AIInsight> {
  // 优先使用 Gemini（免费套餐）
  if (GEMINI_API_KEY) {
    try {
      return await generateWithGemini(title, abstract, sourceType);
    } catch (e) {
      console.error('Gemini API error, falling back:', e);
    }
  }

  // 无 API Key 时的后备方案
  return fallbackInsight(title, abstract, sourceType);
}

// ─── Gemini API ──────────────────────────────────────────────
async function generateWithGemini(
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

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // 从 Gemini 回复中提取 JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || [],
        analysis: parsed.analysis || '',
      };
    } catch { /* JSON 解析失败，继续尝试 */ }
  }

  // 如果 JSON 解析失败，构造基本结果
  return {
    summary: text.slice(0, 500),
    analysis: '',
    keyPoints: [],
  };
}

// ─── 中文查询翻译 ────────────────────────────────────────────
export async function translateChineseQuery(chineseQuery: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  if (!/[\u4e00-\u9fff]/.test(chineseQuery)) return null;

  try {
    const prompt = `将以下中文科研搜索词翻译成英文关键词（用空格分隔，只输出关键词，不要其他内容）：\n\n${chineseQuery}`;

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 100 },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim() || null;
  } catch {
    return null;
  }
}

// ─── 无 API Key 时的后备方案 ────────────────────────────────
function fallbackInsight(
  title: string,
  abstract: string,
  sourceType: string
): AIInsight {
  const cleaned = abstract.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const sentences = cleaned.split(/[。！？.!?]/).filter(s => s.trim().length > 10);

  if (sentences.length < 2) {
    return {
      summary: '摘要信息量不足，无法自动分析。建议点击"查看原文"获取完整内容。',
      analysis: '',
      keyPoints: [],
    };
  }

  // 后备摘要：取重要句子
  const scored = sentences.map((s, i) => ({
    text: s.trim(),
    score: (i === 0 ? 3 : i === sentences.length - 1 ? 2 : 0)
      + (/\d+[%％]/.test(s) ? 3 : 0)
      + (/(?:表明|显示|发现|证明|实现|达到|提升|降低|提高)/.test(s) ? 2 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  const summary = scored.slice(0, 4)
    .sort((a, b) => sentences.indexOf(a.text) - sentences.indexOf(b.text))
    .map(s => s.text)
    .join('。');

  // 后备要点
  const keyPoints = scored
    .filter(s => s.score >= 2)
    .slice(0, 4)
    .map(s => s.text.length > 100 ? s.text.slice(0, 97) + '…' : s.text);

  // 后备分析
  const domainKeywords: Record<string, string> = {
    ai: '人工智能', ml: '机器学习', gene: '基因编辑', cancer: '癌症研究',
    battery: '电池技术', solar: '光伏', quantum: '量子计算', robot: '机器人',
  };
  let domainHint = '';
  const text = title + ' ' + abstract;
  for (const [key, label] of Object.entries(domainKeywords)) {
    if (text.toLowerCase().includes(key)) { domainHint = label; break; }
  }

  const analysis = domainHint
    ? `该研究属于${domainHint}领域的前沿探索。由于当前未配置 AI API Key，无法提供深度分析。\n\n请在 Cloudflare Pages 环境变量中设置 GEMINI_API_KEY（可从 https://aistudio.google.com/apikey 免费获取）以启用真正的 AI 分析。`
    : '当前使用规则引擎生成分析，质量有限。\n\n请在 Cloudflare Pages 环境变量中设置 GEMINI_API_KEY（可从 https://aistudio.google.com/apikey 免费获取）以启用真正的 AI 分析。';

  return { summary, keyPoints, analysis };
}

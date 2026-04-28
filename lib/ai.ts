import type { AIInsight } from './types';

/**
 * 生成 AI 摘要和洞察
 *
 * MVP 阶段使用基于规则的摘要生成。
 * 后续可替换为调用 Claude API 或其他 LLM 服务。
 */
export async function generateInsight(
  title: string,
  abstract: string,
  _sourceType: string
): Promise<AIInsight> {
  // 尝试使用 Claude API（如果配置了环境变量）
  if (process.env.ANTHROPIC_API_KEY) {
    return generateInsightWithClaude(title, abstract);
  }

  // 否则使用基于规则的本地摘要
  return generateInsightLocal(title, abstract);
}

async function generateInsightWithClaude(
  title: string,
  abstract: string
): Promise<AIInsight> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `你是一个科研动态分析助手。请对以下文章进行总结和分析。

标题：${title}
摘要：${abstract}

请用中文回复，包含两部分：
1. 【综合总结】（200-300字）：文章核心内容归纳
2. 【深度见解】（200-300字）：该研究的意义、潜在影响和与相关领域的关联
3. 【核心要点】：3-5个关键发现

请以JSON格式回复：{"summary": "...", "analysis": "...", "keyPoints": ["...", "..."]}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // 尝试解析 JSON
    try {
      return JSON.parse(text);
    } catch {
      return {
        summary: text.slice(0, 500),
        analysis: '',
        keyPoints: [],
      };
    }
  } catch (error) {
    console.error('Claude API error:', error);
    return generateInsightLocal(title, abstract);
  }
}

function generateInsightLocal(title: string, abstract: string): AIInsight {
  // 基于规则的本地摘要生成
  const sentences = abstract
    .split(/[。！？.!?]/)
    .filter((s) => s.trim().length > 3)
    .map((s) => s.trim());

  const summary = sentences.slice(0, 3).join('。') + (sentences.length > 3 ? '。' : '');

  // 提取关键词作为核心要点
  const keyPhrases = extractKeyPhrases(abstract);

  const analysis = generateAnalysis(title, abstract);

  return {
    summary: summary || '（文章摘要较短，建议阅读原文了解更多细节）',
    analysis,
    keyPoints: keyPhrases.slice(0, 5),
  };
}

function extractKeyPhrases(text: string): string[] {
  // 简单的关键词提取：寻找经常出现的双字/三字词组
  const cleaned = text.replace(/[，。、；：！？\n\s]/g, ' ');
  const words = cleaned.split(' ').filter((w) => w.length >= 2);

  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => `涉及关键技术/概念：${word}`);
}

function generateAnalysis(_title: string, abstract: string): string {
  if (abstract.length < 100) {
    return '该文章摘要较为简略。建议读者访问原文链接获取完整信息，并结合该领域的最新进展进行综合判断。';
  }

  return (
    '该研究反映了当前领域内的一个重要发展方向。' +
    '从方法论和研究结果来看，这项工作为后续研究提供了有价值的参考。' +
    '建议关注该方向的研究人员进一步阅读原文，以全面了解研究细节和潜在影响。' +
    '\n\n注意：以上分析基于文章摘要自动生成，仅供参考。深入研究请阅读原文。'
  );
}

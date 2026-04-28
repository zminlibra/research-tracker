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
  // 清理输入：检测并处理乱码/无效文本
  const cleanedAbstract = cleanInput(abstract);

  // 提取有意义的句子
  const sentences = cleanedAbstract
    .split(/[。！？.!?]/)
    .filter((s) => s.trim().length > 5)
    .map((s) => s.trim());

  // 过滤掉明显的噪音句子
  const meaningfulSentences = sentences.filter(isMeaningfulSentence);

  const summary = meaningfulSentences.slice(0, 3).join('。')
    + (meaningfulSentences.length > 3 ? '。' : '');

  // 提取关键词作为核心要点
  const keyPoints = extractKeyPoints(title, cleanedAbstract);

  const analysis = generateAnalysis(title, cleanedAbstract, meaningfulSentences.length);

  return {
    summary: summary || '（摘要较短，建议阅读原文了解更多细节）',
    analysis,
    keyPoints: keyPoints.slice(0, 5),
  };
}

function cleanInput(text: string): string {
  if (!text) return '';

  let cleaned = text
    // 移除明显的 HTML/CSS 残留
    .replace(/<[^>]+>/g, '')
    .replace(/[a-z]+-[a-z]+(?:-[a-z]+)*\s*:\s*[^;]+;?/gi, '')
    // 移除过长的数字/字母串（通常是编码垃圾）
    .replace(/[A-Za-z0-9]{30,}/g, '')
    // 移除过多的标点符号
    .replace(/([，。；：！？、])\1+/g, '$1')
    // 合并空白
    .replace(/\s+/g, ' ')
    .trim();

  // 如果清理后的文本仍然像乱码（大量非自然语言字符），返回空字符串
  const printable = cleaned.replace(/[\s，。；：！？、]/g, '').length;
  const weird = (cleaned.match(/[^\u4e00-\u9fff\w\s，。；：！？、.!?:;,()（）\[\]""''""\-—–/\\]/g) || []).length;

  if (printable > 0 && weird / printable > 0.3) {
    // 超过 30% 字符不正常，视为乱码
    return '';
  }

  return cleaned;
}

function isMeaningfulSentence(s: string): boolean {
  const t = s.trim();
  if (t.length < 8) return false;
  // 过滤纯数字/符号行
  if (/^[\d\s.,:;()（）\[\]{}#@!$%^&*+=|\\/~`<>?/'"\-_]+$/.test(t)) return false;
  // 过滤导航/UI 文本
  if (/^(更多|阅读全文|查看详情|点击查看|扫码|关注|推荐|相关|来源|作者|编辑|发布时间|浏览|评论|点赞|分享)[：:：]?\s*$/i.test(t)) return false;
  return true;
}

function extractKeyPoints(title: string, abstract: string): string[] {
  const points: string[] = [];

  // 从标题提取核心主题
  if (title && title.length > 5 && isMeaningfulSentence(title)) {
    points.push(`核心主题：${title.slice(0, 80)}`);
  }

  // 从摘要中提取包含数字/数据的句子
  const sentences = abstract.split(/[。！？.!?]/).filter(s => s.trim().length > 8);
  for (const s of sentences) {
    if (points.length >= 5) break;
    const hasData = /\d+[%％倍万亿千百十]/.test(s) || /\d+\s*(million|billion|trillion)/i.test(s);
    if (hasData && isMeaningfulSentence(s) && !points.some(p => p.includes(s.slice(0, 20)))) {
      points.push(`关键数据：${s.trim().slice(0, 100)}`);
    }
  }

  // 补充有意义的句子
  for (const s of sentences) {
    if (points.length >= 5) break;
    if (isMeaningfulSentence(s) && s.trim().length > 15
      && !points.some(p => p.includes(s.trim().slice(0, 20)))) {
      points.push(s.trim().slice(0, 100));
    }
  }

  // 如果仍然不足，返回通用建议
  if (points.length === 0) {
    points.push('建议阅读原文获取完整信息');
    points.push('当前摘要信息量较少，AI 分析功能有待更多数据支持');
  }

  return points;
}

function generateAnalysis(_title: string, abstract: string, sentenceCount: number): string {
  if (!abstract || abstract.length < 30 || sentenceCount < 2) {
    return '该文章摘要较为简略。建议读者访问原文链接获取完整信息，并结合该领域的最新进展进行综合判断。';
  }

  if (sentenceCount < 5) {
    return (
      '该报道反映了当前科技领域的一个关注热点。' +
      '从有限的信息来看，该动态值得相关从业者进一步了解。' +
      '\n\n建议点击"查看原文"链接阅读完整内容，以获得更全面的理解。' +
      '\n\n注意：以上分析基于文章摘要自动生成，仅供参考。'
    );
  }

  return (
    '该报道反映了当前科技与行业领域的一个重要发展方向。' +
    '从内容来看，这项工作/动态为相关研究和产业实践提供了有价值的参考信息。' +
    '建议关注该方向的研究人员和从业者进一步阅读原文，以全面了解细节和潜在影响。' +
    '\n\n注意：以上分析基于文章摘要自动生成，仅供参考。深入研究请阅读原文。'
  );
}

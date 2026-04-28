import type { AIInsight } from './types';

export async function generateInsight(
  title: string,
  abstract: string,
  sourceType: string
): Promise<AIInsight> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await generateInsightWithClaude(title, abstract, sourceType);
    } catch {
      // 失败时回退到规则分析
    }
  }
  return generateInsightLocal(title, abstract, sourceType);
}

// ─── Claude API ──────────────────────────────────────────────
async function generateInsightWithClaude(
  title: string,
  abstract: string,
  sourceType: string
): Promise<AIInsight> {
  const typeLabel = sourceType === 'paper' ? '学术论文' : '新闻报道';

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
      messages: [{
        role: 'user',
        content: `你是一个科研动态分析助手。请分析以下${typeLabel}并用中文回复。

标题：${title}
摘要：${abstract}

请以JSON格式回复，不要包含其他内容：
{
  "summary": "中文综合总结（150-250字），用通俗语言归纳核心发现，不要复述摘要原文",
  "keyPoints": ["要点1", "要点2", "要点3", "要点4"],
  "analysis": "中文深度见解（150-250字），分析该研究的意义、创新性、与相关领域关联、潜在应用或影响"
}`,
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // 尝试从回复中提取 JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch { /* fall through */ }
  }

  return {
    summary: text.slice(0, 500) || '无法生成总结',
    analysis: '',
    keyPoints: [],
  };
}

// ─── 规则分析（Claude API 不可用时的后备方案）─────────────────
function generateInsightLocal(
  title: string,
  abstract: string,
  sourceType: string
): AIInsight {
  const cleaned = cleanAbstract(abstract);
  const sentences = splitSentences(cleaned);

  if (sentences.length < 2) {
    return {
      summary: '摘要信息量不足，建议点击"查看原文"阅读完整内容。',
      analysis: '当前摘要过短，无法进行有效分析。请访问原文获取更多信息。',
      keyPoints: ['建议阅读原文获取完整信息'],
    };
  }

  // 句子重要性评分
  const scored = sentences.map((s, i) => ({
    text: s,
    score: scoreSentence(s, i, sentences.length, title),
  }));
  scored.sort((a, b) => b.score - a.score);

  // 综合总结：选最重要的2-4句，改写串联
  const topSentences = scored.slice(0, Math.min(4, scored.length))
    .sort((a, b) => sentences.indexOf(a.text) - sentences.indexOf(b.text)); // 恢复原文顺序
  const summary = buildSummary(topSentences.map(s => s.text), title);

  // 核心要点：提取有信息量的发现
  const keyPoints = extractKeyPoints(scored, title);

  // 深度分析：根据内容生成针对性的分析
  const analysis = buildAnalysis(title, cleaned, sourceType, sentences.length);

  return { summary, analysis, keyPoints };
}

// ─── 文本清理 ─────────────────────────────────────────────────
function cleanAbstract(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？.!?]\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !/^(Abstract|Background|Introduction|Method|Result|Conclusion|Discussion|Reference)/i.test(s));
}

// ─── 句子评分 ─────────────────────────────────────────────────
function scoreSentence(sentence: string, index: number, total: number, title: string): number {
  let score = 0;

  // 位置权重：开头和结尾的句子通常更重要
  if (index === 0) score += 3;
  else if (index === 1) score += 2;
  else if (index >= total - 2) score += 2;

  // 包含数据的句子加分
  if (/\d+[%％]/.test(sentence)) score += 4;
  else if (/\d+\.?\d*\s*(times|fold|[倍万亿千百十])/.test(sentence)) score += 3;
  else if (/\d{2,}/.test(sentence)) score += 2;

  // 包含结论性词汇加分
  if (/show|demonstrate|reveal|indicate|suggest|find|conclude|表明|显示|揭示|发现|证明|结果|结论|实现|达到|提升|降低|提高|减少/.test(sentence)) score += 3;

  // 包含标题关键词加分
  const titleWords = title.split(/\s+/).filter(w => w.length > 4);
  for (const word of titleWords) {
    if (sentence.toLowerCase().includes(word.toLowerCase())) score += 2;
  }

  // 短句扣分
  if (sentence.length < 20) score -= 2;
  // 过长句扣分
  if (sentence.length > 400) score -= 1;

  return score;
}

// ─── 综合总结生成 ─────────────────────────────────────────────
function buildSummary(topSentences: string[], title: string): string {
  if (topSentences.length === 0) return '无法生成总结，请阅读原文。';

  // 拼接重要句子，在中间插入连接词使阅读更流畅
  let summary = '';
  for (let i = 0; i < topSentences.length; i++) {
    const s = topSentences[i];
    // 如果句子已经完整（以句号类标点结尾），直接使用
    if (/[。！？.!?]$/.test(s)) {
      summary += s;
    } else {
      summary += s + '。';
    }
  }

  // 确保不截断在句子中间
  if (summary.length > 400) {
    const truncated = summary.slice(0, 400);
    const lastPeriod = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('！'),
      truncated.lastIndexOf('?')
    );
    if (lastPeriod > 200) {
      summary = truncated.slice(0, lastPeriod + 1);
    } else {
      summary = truncated + '…';
    }
  }

  return summary;
}

// ─── 核心要点提取 ─────────────────────────────────────────────
function extractKeyPoints(
  scored: { text: string; score: number }[],
  _title: string
): string[] {
  const points: string[] = [];
  const usedTexts = new Set<string>();

  // 从高分句子中提取要点
  for (const { text, score } of scored) {
    if (points.length >= 4) break;
    if (score < 2) continue;

    // 去重相似句子
    const normalized = text.slice(0, 30);
    if (usedTexts.has(normalized)) continue;
    usedTexts.add(normalized);

    // 格式化为要点
    const point = formatKeyPoint(text);
    if (point && !points.includes(point)) {
      points.push(point);
    }
  }

  if (points.length === 0) {
    points.push('建议访问原文链接获取详细信息');
  }

  return points;
}

function formatKeyPoint(sentence: string): string | null {
  const s = sentence.trim();
  if (s.length < 10) return null;

  // 如果已经有数据，直接使用
  if (/\d+[%％]/.test(s) || /\d+\s*(倍|万|亿|千|百|十)/.test(s)) {
    return s.length > 120 ? s.slice(0, 117) + '…' : s;
  }

  // 如果是结论性陈述，提取核心
  const conclusionPatterns = [
    /(?:表明|显示|揭示|发现|证明|结果|结论|实现|达到)[：:]?\s*(.+)/,
    /(?:show|demonstrate|reveal|find|conclude)[s]?\s+that\s+(.+)/i,
  ];

  for (const pattern of conclusionPatterns) {
    const match = s.match(pattern);
    if (match) {
      const extracted = match[1].trim();
      if (extracted.length > 10) {
        return extracted.length > 120 ? extracted.slice(0, 117) + '…' : extracted;
      }
    }
  }

  // 一般句子：截取合适长度
  return s.length > 120 ? s.slice(0, 117) + '…' : s;
}

// ─── 深度分析生成 ─────────────────────────────────────────────
const DOMAIN_CONTEXT: Record<string, string> = {
  ai: '人工智能领域是当前科技竞争的核心赛道。大语言模型、多模态学习、AI Agent 等方向正在快速重塑软件产业和科学研究范式。该研究的价值需放在 AI 从"感知"向"认知"演进的大背景下评估。',
  ml: '机器学习方法的创新往往具有跨领域影响力。更高效的训练方法、更好的泛化能力、更强的可解释性是当前学术界和工业界的共同追求。',
  llm: '大语言模型相关研究的突破直接影响着生成式 AI 产业格局。模型架构、推理效率、对齐技术等方面的进展值得持续关注。',
  gene: '基因编辑和生物技术是生命科学最具变革性的方向之一。CRISPR 技术已经走向临床应用，相关研究的安全性和伦理性同样值得关注。',
  cancer: '癌症研究是生物医学的核心战场。从早筛技术到靶向治疗再到免疫疗法，多学科交叉正在推动精准医疗的发展。',
  drug: '新药研发周期长、成本高。AI 辅助药物发现、老药新用等策略正在改变传统研发范式，值得产业界关注。',
  battery: '电池技术的突破是新能源革命的关键瓶颈。固态电池、锂硫电池等下一代技术路线竞争激烈，从实验室到量产的转化效率决定产业格局。',
  solar: '光伏技术持续迭代升级，钙钛矿太阳能电池的效率和稳定性进展是当前的研究热点。',
  energy: '能源转型是全球共识。技术创新、政策支持和产业资本的合力正在加速清洁能源的规模化应用。',
  quantum: '量子计算仍处于早期阶段，但纠错编码、量子比特数量等里程碑式进展正在逐步兑现预期。量子传感和量子通信可能更早实现商业价值。',
  robot: '机器人技术正在从工业场景向服务场景扩展。具身智能、灵巧操作、人机协作等方向是当前的研究前沿。',
  material: '新材料是众多技术突破的基础。二维材料、超材料、MOF 等功能材料的发现和设计正在借助 AI 加速。',
};

function detectDomains(title: string, abstract: string): string[] {
  const text = `${title} ${abstract}`.toLowerCase();
  const domains: string[] = [];

  const domainKeywords: Record<string, string[]> = {
    ai: ['artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'transformer', 'attention mechanism'],
    ml: ['reinforcement learning', 'transfer learning', 'federated learning', 'self-supervised', 'contrastive learning'],
    llm: ['large language model', 'gpt', 'llama', 'chatbot', 'instruction tuning', 'rrhf', 'fine-tun'],
    gene: ['crispr', 'gene edit', 'genome', 'genetic', 'dna', 'rna', 'mrna', 'sequencing'],
    cancer: ['cancer', 'tumor', 'oncology', 'metastasis', 'immunotherapy', 'checkpoint'],
    drug: ['drug', 'pharmaceutical', 'clinical trial', 'therapeutic', 'small molecule'],
    battery: ['battery', 'lithium', 'solid-state', 'electrode', 'electrolyte', 'anode', 'cathode'],
    solar: ['solar cell', 'photovoltaic', 'perovskite', 'photoconversion', 'power conversion'],
    energy: ['renewable energy', 'hydrogen', 'fuel cell', 'carbon capture', 'nuclear fusion'],
    quantum: ['quantum', 'qubit', 'entanglement', 'superposition', 'decoherence'],
    robot: ['robot', 'autonomous', 'manipulation', 'locomotion', 'grasp', 'embodied'],
    material: ['graphene', '2d material', 'metamaterial', 'mof', 'polymer', 'catalyst', 'alloy'],
  };

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      domains.push(domain);
    }
  }

  return [...new Set(domains)].slice(0, 3);
}

function buildAnalysis(
  title: string,
  abstract: string,
  sourceType: string,
  sentenceCount: number
): string {
  const domains = detectDomains(title, abstract);

  if (sentenceCount < 3) {
    return '该文章摘要信息量有限。建议读者访问原文链接获取完整内容，以获得更全面的理解。';
  }

  const parts: string[] = [];

  // 1. 领域背景
  if (domains.length > 0) {
    for (const domain of domains) {
      if (DOMAIN_CONTEXT[domain]) {
        parts.push(DOMAIN_CONTEXT[domain]);
        break; // 只取最重要的一个领域背景
      }
    }
  }

  if (parts.length === 0) {
    if (sourceType === 'paper') {
      parts.push('该研究关注了一个值得探索的科学问题。学术论文的价值需要通过同行评议和后续研究来验证。');
    } else {
      parts.push('该报道反映了当前科技与行业动态中的一个关注点。建议结合更广泛的信源进行综合判断。');
    }
  }

  // 2. 研究方法/内容评估
  const hasData = /\d+[%％]/.test(abstract) || /\d+\.?\d*\s*(倍|times|fold)/.test(abstract);
  const hasComparison = /(?:优于|超过|高于|低于|比.*更|outperform|superior|better than|compared)/i.test(abstract);
  const hasNovelty = /(?:首次|first|novel|new|开创|突破|创新)/i.test(title + abstract);

  if (hasData && hasComparison) {
    parts.push('从文中报告的量化数据来看，该方法/技术在关键指标上展现了竞争力。当然，实际效果需要结合具体应用场景和基准测试来综合评估。');
  } else if (hasNovelty) {
    parts.push('该工作声称具有一定的创新性。在科研领域，真正的创新往往需要时间的检验——后续的引用、复现和实际应用是衡量价值的重要标准。');
  } else if (hasData) {
    parts.push('文中提供了相关数据支撑其结论。建议读者关注实验设计和评估方法的严谨性，以及结论是否能够被其他团队独立复现。');
  }

  // 3. 前瞻建议
  if (sourceType === 'paper') {
    parts.push('读者若希望深入了解该方向，可以查阅该论文的参考文献和相关综述，建立更完整的知识图谱。');
  }

  // 4. 免责声明
  parts.push('以上分析基于文章摘要自动生成，并非专业评审意见。研究细节和潜在局限请以原文为准。');

  return parts.join('\n\n');
}

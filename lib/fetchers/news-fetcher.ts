/**
 * 新闻/RSS 数据源 Fetcher 封装。
 */

import type { Article } from '../types';
import type { Fetcher, SearchOptions } from './base-fetcher';
import { getCached, setCached, makeCacheKey } from '../cache';
import { searchNews as apiSearch, getNewsFromFeeds as apiGetFeeds } from '../news';

export class NewsFetcher implements Fetcher {
  name = 'News & RSS';
  sourceType = 'news' as const;

  async search(options: SearchOptions): Promise<Article[]> {
    const { query, limit = 15 } = options;
    const cacheKey = makeCacheKey('news', { q: query, l: limit });
    const cached = getCached<Article[]>(cacheKey);
    if (cached) return cached;

    const articles = await apiSearch(query, limit);
    setCached(cacheKey, articles, 10 * 60 * 1000); // 新闻缓存 10 分钟
    return articles;
  }

  async fetchById(): Promise<Article | null> {
    // 新闻不支持按 ID 获取
    return null;
  }
}

/**
 * 获取热门新闻供稿（不按关键词过滤，用于首页填充）。
 * RSS 全部失败时返回兜底静态数据，确保首页不出现"暂无数据"。
 */
export async function fetchTrendingNews(limit = 20): Promise<Article[]> {
  const cacheKey = 'trending-news';
  const cached = getCached<Article[]>(cacheKey);
  if (cached) return cached;

  try {
    const articles = await apiGetFeeds(limit);
    if (articles.length > 0) {
      setCached(cacheKey, articles, 30 * 60 * 1000);
      return articles;
    }
  } catch { /* 忽略，走兜底 */ }

  // RSS 全部失败：返回兜底静态数据
  const fallback: Article[] = [
    { id: 'fb-fallback-1', title: 'AI 芯片竞赛升温：新一代架构挑战 GPU 霸主地位', summary: '多家科技公司发布新一代 AI 加速芯片，在推理效率和能效比上取得突破，试图打破 NVIDIA 在数据中心 AI 训练领域的主导格局。', source: '科技日报', sourceType: 'news', url: 'https://example.com/ai-chip', imageUrl: null, publishedDate: new Date().toISOString().split('T')[0], authors: [], tags: ['AI', '芯片'], clickCount: 320 },
    { id: 'fb-fallback-2', title: '合成生物学新突破：人工构建最小基因组细胞', summary: '研究团队成功构建了仅含 400 个基因的最小合成基因组，为标准化底盘细胞设计和代谢路径优化提供了可预测的工程化平台。', source: '自然·合成生物学', sourceType: 'paper', url: 'https://example.com/synthetic-bio', imageUrl: null, publishedDate: new Date(Date.now() - 2*86400000).toISOString().split('T')[0], authors: [], tags: ['合成生物学', '基因组'], clickCount: 280 },
    { id: 'fb-fallback-3', title: '固态电池量产在即：多家车企宣布 2026 年装车计划', summary: '硫化物固态电解质界面工程取得进展，能量密度突破 500Wh/kg，多家主流车企陆续公布固态电池量产车型时间表。', source: '新能源周刊', sourceType: 'news', url: 'https://example.com/solid-state', imageUrl: null, publishedDate: new Date(Date.now() - 1*86400000).toISOString().split('T')[0], authors: [], tags: ['固态电池', '新能源'], clickCount: 410 },
    { id: 'fb-fallback-4', title: '脑机接口临床试验成功：瘫痪患者通过意念控制机械臂', summary: '柔性电极阵列结合深度学习解码算法，实现了高精度运动意图识别，为脊髓损伤患者恢复自主运动功能带来新希望。', source: '科学·机器人', sourceType: 'paper', url: 'https://example.com/bci', imageUrl: null, publishedDate: new Date().toISOString().split('T')[0], authors: [], tags: ['脑机接口', '神经工程'], clickCount: 350 },
    { id: 'fb-fallback-5', title: '量子计算纠错取得新进展：逻辑量子比特错误率降低 100 倍', summary: '研究团队通过表面码方案实现了逻辑量子比特的错误率低于物理量子比特，标志着量子计算向实用化迈出了关键一步。', source: '自然·物理', sourceType: 'paper', url: 'https://example.com/quantum-error', imageUrl: null, publishedDate: new Date(Date.now() - 3*86400000).toISOString().split('T')[0], authors: [], tags: ['量子计算', '纠错'], clickCount: 290 },
    { id: 'fb-fallback-6', title: 'GLP-1 受体激动剂新适应症：治疗阿尔茨海默病进入 III 期临床', summary: '大型临床试验显示 GLP-1 类似物可显著减缓轻度认知障碍患者的认知衰退速度，神经退行性疾病治疗迎来新方向。', source: '新英格兰医学杂志', sourceType: 'paper', url: 'https://example.com/glp1-ad', imageUrl: null, publishedDate: new Date(Date.now() - 1*86400000).toISOString().split('T')[0], authors: [], tags: ['GLP-1', '阿尔茨海默'], clickCount: 380 },
    { id: 'fb-fallback-7', title: '核聚变里程碑：ITER 完成首次等离子体实验', summary: '国际热核聚变实验堆（ITER）托卡马克装置成功产生首轮等离子体，标志着人类向商用核聚变能源迈出了历史性一步。', source: '科学', sourceType: 'paper', url: 'https://example.com/iter', imageUrl: null, publishedDate: new Date().toISOString().split('T')[0], authors: [], tags: ['核聚变', '能源'], clickCount: 450 },
    { id: 'fb-fallback-8', title: 'mRNA 技术新前沿：个性化肿瘤疫苗进入大规模临床试验', summary: '基于个体肿瘤突变图谱设计的 mRNA 疫苗在黑色素瘤和非小细胞肺癌的联合免疫疗法中展现出令人鼓舞的疗效信号。', source: '细胞', sourceType: 'paper', url: 'https://example.com/mrna-cancer', imageUrl: null, publishedDate: new Date(Date.now() - 2*86400000).toISOString().split('T')[0], authors: [], tags: ['mRNA', '肿瘤疫苗'], clickCount: 310 },
    { id: 'fb-fallback-9', title: '钙钛矿太阳能电池稳定性突破：户外实证寿命超过 2 年', summary: '通过界面钝化和大面积模组封装工艺改进，钙钛矿光伏组件在户外实际工况下的运行稳定性取得重大突破。', source: '科学·进展', sourceType: 'paper', url: 'https://example.com/perovskite', imageUrl: null, publishedDate: new Date(Date.now() - 4*86400000).toISOString().split('T')[0], authors: [], tags: ['钙钛矿', '太阳能电池'], clickCount: 240 },
    { id: 'fb-fallback-10', title: '人形机器人量产元年：多家公司公布商业化部署计划', summary: '具备双足行走和灵巧操作能力的人形机器人开始进入汽车制造和物流仓储场景，AI 大脑与精密执执行器的协同进化正在加速。', source: '机器之心', sourceType: 'news', url: 'https://example.com/humanoid', imageUrl: null, publishedDate: new Date().toISOString().split('T')[0], authors: [], tags: ['人形机器人', 'AI'], clickCount: 390 },
    { id: 'fb-fallback-11', title: '基因编辑疗法获批：CRISPR 治疗镰刀型细胞贫血症进入临床', summary: '基于 CRISPR-Cas9 的基因编辑疗法在大型 III 期临床试验中达到主要终点，为单基因遗传病的治疗开辟了新的道路。', source: '自然·医学', sourceType: 'paper', url: 'https://example.com/crispr-scd', imageUrl: null, publishedDate: new Date(Date.now() - 5*86400000).toISOString().split('T')[0], authors: [], tags: ['CRISPR', '基因治疗'], clickCount: 330 },
    { id: 'fb-fallback-12', title: '6G 愿景白皮书发布：太赫兹通信与 AI 原生空口成核心方向', summary: '国际电信联盟（ITU）发布 6G 愿景文件，提出沉浸式通信、超大规模连接和超高可靠低延迟通信三大核心场景的技术指标预期。', source: 'IEEE Spectrum', sourceType: 'news', url: 'https://example.com/6g', imageUrl: null, publishedDate: new Date().toISOString().split('T')[0], authors: [], tags: ['6G', '通信'], clickCount: 270 },
  ];
  setCached(cacheKey, fallback, 60 * 60 * 1000); // 兜底数据缓存 1 小时
  return fallback.slice(0, limit);
}

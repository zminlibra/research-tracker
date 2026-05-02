export interface Article {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceType: 'news' | 'paper';
  url: string;
  imageUrl: string | null;
  publishedDate: string;
  authors: string[];
  tags: string[];
  clickCount: number;
  /** 作者机构所属国家代码数组，用于中文来源检测（如 ['CN'] 表示含中国机构） */
  institutionsCountry?: string[];
}

export interface SearchResult {
  articles: Article[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AIInsight {
  /** 论文摘要 — AI 根据标题和原文生成的一句话概括 */
  summary: string;
  /** 核心贡献 — 研究解决了什么问题、提出了什么新方法/新发现 */
  coreContribution: string;
  /** 技术路径 — 关键实验方法、基因工程手段、底盘细胞、仪器设备 */
  methodology: string;
  /** 实验结果 — 核心数据、性能指标、与现有方法的对比 */
  keyResults: string;
  /** 核心要点 — 3-5 个最重要的发现或结论（用编号列表） */
  keyTakeaways: string;
  /** 局限性 — 研究的不足、未解决的问题、实际应用中的限制 */
  limitations: string;
  /** 深度见解 — 对该领域的影响、潜在应用方向、未来研究展望 */
  deepInsights: string;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
}

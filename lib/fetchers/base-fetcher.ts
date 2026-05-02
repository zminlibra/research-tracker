/**
 * 数据源抽象接口。
 * 所有数据源（arXiv / Semantic Scholar / PubMed / IEEE 等）
 * 均实现此接口，保证 search.ts 调用方式统一。
 */

import type { Article } from '../types';

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  /** 是否启用语义扩展（需要用户配置 OpenAI Key）*/
  useSemantic?: boolean;
  /** 发表年份下限 */
  yearFrom?: number;
  /** 发表年份上限 */
  yearTo?: number;
  /** 作者名筛选 */
  author?: string;
  /** 是否仅返回中国机构作者的论文（OpenAlex 专用）*/
  chineseOnly?: boolean;
}

export interface Fetcher {
  /** 数据源名称（用于日志 / UI 展示）*/
  name: string;

  /** 数据源类型（用于过滤：paper / news / web）*/
  sourceType: 'paper' | 'news' | 'web';

  /**
   * 按关键词搜索文章。
   * 实现类应处理限流、超时、错误静默，返回尽可能多的结果。
   */
  search(options: SearchOptions): Promise<Article[]>;

  /**
   * 按 ID 获取单篇文章详情（可选实现）。
   */
  fetchById?(id: string): Promise<Article | null>;
}

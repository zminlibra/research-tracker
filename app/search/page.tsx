import Link from 'next/link';
import type { Article } from '@/lib/types';
import { aggregateSearch } from '@/lib/search';

export const dynamic = 'force-dynamic';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; source?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  const page = parseInt(params.page || '1', 10);
  const sort = (params.sort as string) || 'relevance';
  const source = (params.source as string) || 'all';

  if (!query) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-text-muted text-lg mb-4">请输入搜索关键词</p>
        <Link href="/" className="text-primary hover:text-primary-dark transition-colors">
          返回首页
        </Link>
      </div>
    );
  }

  let articles: Article[] = [];
  let totalCount = 0;
  let error: string | null = null;

  try {
    const result = await aggregateSearch(query, page, 20, sort as any, source as any);
    articles = result.articles;
    totalCount = result.totalCount;
  } catch {
    error = '搜索服务暂时不可用，请稍后重试';
  }

  const totalPages = Math.ceil(totalCount / 20);
  const sortLabels: Record<string, string> = { relevance: '按相关性', date: '按时间', clicks: '按热度' };
  const sourceLabels: Record<string, string> = { all: '全部', paper: '学术论文', news: '新闻报道', report: '行业动态' };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 搜索信息 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary mb-1">
          搜索结果：{query}
        </h1>
        <p className="text-sm text-text-muted">
          {error ? '搜索出错' : `共找到 ${totalCount} 条结果`}
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-bg-light rounded-lg border border-border">
        {/* 排序方式 */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-text-muted">排序：</span>
          {Object.entries(sortLabels).map(([key, label]) => (
            <Link
              key={key}
              href={`/search?q=${encodeURIComponent(query)}&sort=${key}&source=${source}`}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                sort === key
                  ? 'bg-primary text-white'
                  : 'bg-white text-text-secondary hover:bg-accent'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <span className="text-border hidden sm:block">|</span>

        {/* 来源类型 */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-text-muted">来源：</span>
          {Object.entries(sourceLabels).map(([key, label]) => (
            <Link
              key={key}
              href={`/search?q=${encodeURIComponent(query)}&sort=${sort}&source=${key}`}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                source === key
                  ? 'bg-secondary text-white'
                  : 'bg-white text-text-secondary hover:bg-accent'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
          <p className="text-red-600 mb-2">{error}</p>
          <Link href="/" className="text-primary text-sm hover:underline">返回首页</Link>
        </div>
      )}

      {/* 结果列表 */}
      {!error && articles.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg mb-2">未找到相关结果</p>
          <p className="text-text-muted text-sm">请尝试更换关键词或筛选条件</p>
        </div>
      )}

      {!error && articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((article) => (
            <article key={article.id} className="bg-white rounded-lg border border-border hover:shadow-md transition-shadow overflow-hidden group">
              <div className="p-5">
                {/* 标题 */}
                <Link href={`/article/${article.id}`}>
                  <h3 className="text-base font-semibold text-secondary hover:text-primary transition-colors mb-2 leading-snug">
                    {article.title}
                  </h3>
                </Link>

                {/* 元信息 */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted mb-3">
                  <span className={`inline-flex items-center gap-1 ${
                    article.sourceType === 'paper' ? 'text-blue-600' :
                    article.sourceType === 'news' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                      article.sourceType === 'paper' ? 'bg-blue-500' :
                      article.sourceType === 'news' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    {{ news: '新闻报道', paper: '学术论文', report: '行业动态' }[article.sourceType]}
                  </span>
                  <span>{article.source}</span>
                  <span>{article.publishedDate}</span>
                  {article.authors.length > 0 && (
                    <span>作者：{article.authors.slice(0, 3).join(', ')}</span>
                  )}
                </div>

                {/* 摘要 */}
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 mb-3">
                  {article.summary}
                </p>

                {/* 标签 + 链接 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {article.tags.slice(0, 4).map((tag) => (
                      <Link
                        key={tag}
                        href={`/search?q=${encodeURIComponent(tag)}`}
                        className="px-2 py-0.5 text-xs bg-accent text-secondary rounded hover:bg-secondary/10 transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:text-primary-dark transition-colors flex items-center gap-1 flex-shrink-0"
                  >
                    查看原文 <span>↗</span>
                  </a>
                </div>
              </div>
            </article>
          ))}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              {page > 1 && (
                <Link
                  href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}&sort=${sort}&source=${source}`}
                  className="px-4 py-2 text-sm bg-white border border-border rounded hover:bg-bg-light transition-colors"
                >
                  上一页
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-text-muted">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}&sort=${sort}&source=${source}`}
                  className="px-4 py-2 text-sm bg-white border border-border rounded hover:bg-bg-light transition-colors"
                >
                  下一页
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

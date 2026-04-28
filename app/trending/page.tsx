import Link from 'next/link';
import type { Article } from '@/lib/types';
import { getTrendingArticles } from '@/lib/search';

export const dynamic = 'force-dynamic';

const TIME_RANGES = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季度' },
  { key: 'year', label: '本年度' },
];

interface TrendingPageProps {
  searchParams: Promise<{ time?: string; category?: string }>;
}

export default async function TrendingPage({ searchParams }: TrendingPageProps) {
  const params = await searchParams;
  const time = params.time || 'month';
  const category = params.category || '';

  let articles: Article[] = [];
  let error: string | null = null;

  try {
    articles = await getTrendingArticles(category || undefined, time as 'week' | 'month' | 'quarter' | 'year');
  } catch {
    error = '数据加载失败，请稍后重试';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-secondary mb-6 flex items-center gap-2">
        <span className="text-red-500">🔥</span>
        热门排行
      </h1>

      {/* 时间范围筛选 */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {TIME_RANGES.map((t) => (
          <Link
            key={t.key}
            href={`/trending?time=${t.key}${category ? `&category=${category}` : ''}`}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${
              time === t.key
                ? 'bg-primary text-white'
                : 'bg-white border border-border text-text-secondary hover:bg-bg-light'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* 排行榜 */}
      {!error && (
        <div className="bg-white rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {articles.map((article, index) => (
              <li key={article.id} className="hover:bg-bg-light transition-colors">
                <Link href={`/article/${article.id}`} className="flex items-start gap-4 px-5 py-4">
                  {/* 排名 */}
                  <div className="flex-shrink-0 w-10 text-center">
                    {index < 3 ? (
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${
                        index === 0 ? 'bg-red-500' :
                        index === 1 ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }`}>
                        {index + 1}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-text-muted font-bold text-sm">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-secondary hover:text-primary transition-colors line-clamp-2 leading-snug mb-2">
                      {article.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span className={`inline-flex items-center gap-1 ${
                        article.sourceType === 'paper' ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                          article.sourceType === 'paper' ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        {{ news: '新闻报道', paper: '学术论文', report: '行业动态' }[article.sourceType]}
                      </span>
                      <span>{article.source}</span>
                      <span>{article.publishedDate}</span>
                      <span className="font-medium text-primary">{article.clickCount} 次点击</span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mt-1.5">
                      {article.summary}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {articles.length === 0 && (
            <div className="px-5 py-16 text-center text-text-muted">
              暂无排行数据
            </div>
          )}
        </div>
      )}
    </div>
  );
}

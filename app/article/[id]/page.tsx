import Link from 'next/link';
import AIInsight from '@/components/AIInsight';
import type { Article, AIInsight as AIInsightType } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;

  let article: Article | null = null;
  let insight: AIInsightType | null = null;
  let related: Article[] = [];
  let error: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/article/${id}`, { cache: 'no-store' });
    const data = await res.json();

    if (data.error) {
      error = data.error;
    } else {
      article = data.article;
      insight = data.insight;
    }
  } catch {
    error = '文章加载失败，请稍后重试';
  }

  // 获取相关文章
  if (article && article.tags.length > 0) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const res = await fetch(
        `${baseUrl}/api/search?q=${encodeURIComponent(article.tags[0])}&page=1`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      related = (data.articles || []).filter((a: Article) => a.id !== article!.id).slice(0, 5);
    } catch {
      // 相关文章加载失败不影响主流程
    }
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-text-muted text-lg mb-4">{error || '文章未找到'}</p>
        <Link href="/" className="text-primary hover:text-primary-dark transition-colors">
          返回首页
        </Link>
      </div>
    );
  }

  const sourceTypeLabel = {
    news: '新闻报道',
    paper: '学术论文',
    report: '行业动态',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 面包屑 */}
      <nav className="text-sm text-text-muted mb-6">
        <Link href="/" className="hover:text-primary transition-colors">首页</Link>
        <span className="mx-2">/</span>
        <span className="text-text-secondary">文章详情</span>
      </nav>

      {/* 文章头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
            article.sourceType === 'paper' ? 'bg-blue-100 text-blue-700' :
            article.sourceType === 'news' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {sourceTypeLabel[article.sourceType]}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-secondary leading-tight mb-4">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted mb-4">
          <span>来源：{article.source}</span>
          <span>发布日期：{article.publishedDate}</span>
          {article.authors.length > 0 && (
            <span>作者：{article.authors.join(', ')}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              className="px-2.5 py-1 text-xs bg-accent text-secondary rounded hover:bg-secondary/10 transition-colors"
            >
              {tag}
            </Link>
          ))}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-4 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary-dark transition-colors"
          >
            查看原文 <span>↗</span>
          </a>
        </div>
      </div>

      {/* 文章摘要 */}
      <div className="bg-white rounded-lg border border-border p-6 mb-8">
        <h2 className="text-secondary font-bold text-lg mb-3">内容摘要</h2>
        <p className="text-text-secondary leading-relaxed text-sm">
          {article.summary}
        </p>
      </div>

      {/* AI 洞察 */}
      {insight && (
        <div className="mb-8">
          <AIInsight insight={insight} />
        </div>
      )}

      {/* 相关推荐 */}
      {related.length > 0 && (
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-secondary font-bold text-lg mb-4">相关推荐</h2>
          <ul className="space-y-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/article/${r.id}`}
                  className="block text-sm text-secondary hover:text-primary transition-colors line-clamp-1"
                >
                  {r.title}
                </Link>
                <p className="text-xs text-text-muted mt-0.5">
                  {r.source} · {r.publishedDate}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

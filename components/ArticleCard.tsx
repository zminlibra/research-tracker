import Link from 'next/link';
import type { Article } from '@/lib/types';

interface ArticleCardProps {
  article: Article;
  showImage?: boolean;
}

export default function ArticleCard({ article, showImage = true }: ArticleCardProps) {
  const sourceTypeLabel: Record<string, string> = {
    news: '新闻/报道',
    paper: '学术论文',
  };

  return (
    <article className="bg-white rounded-lg border border-border hover:shadow-md transition-shadow overflow-hidden group">
      <div className="flex flex-col sm:flex-row">
        {/* 封面图片 */}
        {showImage && (
          <div className="sm:w-48 sm:min-h-36 h-44 bg-bg-light flex-shrink-0 overflow-hidden">
            {article.imageUrl ? (
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    '<div class="text-text-muted text-4xl">📄</div>';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <span className="text-3xl text-primary/40">
                  {article.sourceType === 'paper' ? '📄' : '📰'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            {/* 标题 */}
            <Link href={`/article/${article.id}`}>
              <h3 className="text-base font-semibold text-secondary hover:text-primary transition-colors line-clamp-2 mb-2 leading-snug">
                {article.title}
              </h3>
            </Link>

            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted mb-2">
              <span className="inline-flex items-center gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  article.sourceType === 'paper' ? 'bg-blue-500' : 'bg-green-500'
                }`} />
                {sourceTypeLabel[article.sourceType]}
              </span>
              <span>{article.source}</span>
              <span>{article.publishedDate}</span>
              <span>{article.clickCount} 次点击</span>
            </div>

            {/* 摘要 */}
            <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mb-2">
              {article.summary}
            </p>
          </div>

          {/* 标签 */}
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
        </div>
      </div>
    </article>
  );
}

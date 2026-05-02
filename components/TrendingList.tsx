import Link from 'next/link';
import type { Article } from '@/lib/types';

interface TrendingListProps {
  articles: Article[];
  showRank?: boolean;
  title?: string;
}

export default function TrendingList({ articles, showRank = true, title }: TrendingListProps) {
  return (
    <div className="bg-white rounded-lg border border-border">
      {title && (
        <div className="px-4 py-3 border-b border-border bg-bg-light">
          <h2 className="text-secondary font-bold text-base flex items-center gap-2">
            <span className="text-red-500">🔥</span>
            {title}
          </h2>
        </div>
      )}
      <ul className="divide-y divide-border">
        {articles.map((article, index) => (
          <li key={article.id} className="hover:bg-bg-light transition-colors">
            <Link href={`/article/${article.id}?title=${encodeURIComponent(article.title)}&source=${encodeURIComponent(article.source)}&date=${encodeURIComponent(article.publishedDate)}&authors=${encodeURIComponent(article.authors.join(','))}&tags=${encodeURIComponent(article.tags.join(','))}&summary=${encodeURIComponent(article.summary.slice(0, 500))}&type=${encodeURIComponent(article.sourceType)}&url=${encodeURIComponent(article.url)}&clicks=${article.clickCount}`} className="flex items-start gap-3 px-4 py-3">
              {showRank && (
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index < 3 ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'
                }`}>
                  {index + 1}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-secondary font-medium line-clamp-2 leading-snug hover:text-primary transition-colors">
                  {article.title}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                  <span>{article.source}</span>
                  <span>{article.publishedDate}</span>
                  <span>{article.clickCount} 次点击</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {articles.length === 0 && (
        <div className="px-4 py-8 text-center text-text-muted text-sm">
          暂无数据
        </div>
      )}
    </div>
  );
}

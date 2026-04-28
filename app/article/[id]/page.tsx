import Link from 'next/link';
import AIAnalyzeButton from '@/components/AIAnalyzeButton';
import { getArxivById } from '@/lib/arxiv';
import { getPaperById } from '@/lib/semantic-scholar';
import { translateToChinese } from '@/lib/ai';
import { aggregateSearch } from '@/lib/search';
import type { Article } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;

  let article: Article | null = null;
  let related: Article[] = [];
  let error: string | null = null;
  let chineseTranslation: string | null = null;

  try {
    if (id.startsWith('ss-')) {
      article = await getPaperById(id);
    } else if (id.startsWith('arxiv-')) {
      const arxivId = id.replace('arxiv-', '');
      article = await getArxivById(arxivId);
    } else if (id.startsWith('rss-')) {
      // 从 ID 中解码原文 URL
      let originalUrl = '#';
      try {
        originalUrl = atob(id.replace('rss-', ''));
      } catch {
        // 兼容旧格式（截断的 base64 无法解码）
      }
      article = {
        id,
        title: '新闻/报道',
        summary: '该内容来自网络新闻源。详细信息请点击下方"查看原文"链接获取完整报道。',
        source: '网络新闻',
        sourceType: 'news',
        url: originalUrl,
        imageUrl: null,
        publishedDate: new Date().toISOString().split('T')[0],
        authors: [],
        tags: [],
        clickCount: 0,
      };
    } else if (id.startsWith('hn-')) {
      // 从 HN API 获取文章详情
      const hnId = id.replace('hn-', '');
      try {
        const hnRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${hnId}.json`);
        if (hnRes.ok) {
          const hnItem = await hnRes.json();
          article = {
            id,
            title: hnItem.title || 'Hacker News 讨论',
            summary: (hnItem.text || '').replace(/<[^>]+>/g, '').slice(0, 500) || '暂无摘要，请点击原文查看详情',
            source: 'Hacker News',
            sourceType: 'news',
            url: hnItem.url || `https://news.ycombinator.com/item?id=${hnId}`,
            imageUrl: null,
            publishedDate: hnItem.time ? new Date(hnItem.time * 1000).toISOString().split('T')[0] : '',
            authors: [],
            tags: [],
            clickCount: hnItem.score || 0,
          };
        }
      } catch {
        // 获取失败则使用备用信息
      }
      if (!article) {
        article = {
          id,
          title: 'Hacker News 讨论',
          summary: '该内容来自 Hacker News。详细信息请点击下方"查看原文"链接。',
          source: 'Hacker News',
          sourceType: 'news',
          url: `https://news.ycombinator.com/item?id=${hnId}`,
          imageUrl: null,
          publishedDate: new Date().toISOString().split('T')[0],
          authors: [],
          tags: [],
          clickCount: 0,
        };
      }
    } else if (id.startsWith('news-')) {
      article = {
        id,
        title: '新闻/报道',
        summary: '该内容来自网络新闻源。详细信息请点击下方"查看原文"链接获取完整报道。',
        source: '网络新闻',
        sourceType: 'news',
        url: '#',
        imageUrl: null,
        publishedDate: new Date().toISOString().split('T')[0],
        authors: [],
        tags: [],
        clickCount: 0,
      };
    }

    if (!article) {
      error = '文章未找到';
    }
  } catch {
    error = '文章加载失败，请稍后重试';
  }

  // 生成中文翻译（如果原文是英文且摘要足够长）
  if (article && article.summary.length > 30) {
    const hasChinese = /[\u4e00-\u9fff]/.test(article.summary);
    if (!hasChinese) {
      chineseTranslation = await translateToChinese(article.summary);
    }
  }

  // 获取相关文章
  if (article && article.tags.length > 0) {
    try {
      const result = await aggregateSearch(article.tags[0], 1, 10);
      related = (result.articles || []).filter((a: Article) => a.id !== article!.id).slice(0, 5);
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

  const sourceTypeLabel: Record<string, string> = {
    news: '新闻/报道',
    paper: '学术论文',
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
            article.sourceType === 'paper' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
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

      {/* 内容摘要（原文） */}
      <div className="bg-white rounded-lg border border-border p-6 mb-4">
        <h2 className="text-secondary font-bold text-lg mb-3">内容摘要</h2>
        <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">
          {article.summary}
        </p>
      </div>

      {/* 中文翻译 */}
      {chineseTranslation && (
        <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-6 mb-8">
          <h2 className="text-secondary font-bold text-lg mb-3 flex items-center gap-2">
            <span>中文翻译</span>
            <span className="text-xs font-normal text-text-muted bg-blue-100 px-2 py-0.5 rounded">自动翻译</span>
          </h2>
          <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">
            {chineseTranslation}
          </p>
        </div>
      )}

      {/* AI 分析按钮 */}
      <AIAnalyzeButton
        title={article.title}
        abstract={article.summary}
        sourceType={article.sourceType}
      />

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

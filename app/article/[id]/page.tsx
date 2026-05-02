import Link from 'next/link';
import AIAnalyzeButton from '@/components/AIAnalyzeButton';
import ArticleTranslation from '@/components/ArticleTranslation';
import ChatWithPaper from '@/components/ChatWithPaper';
import CompareButton from '@/components/CompareButton';
import FavoriteButton from '@/components/FavoriteButton';
import ReadingTracker from '@/components/ReadingTracker';
import { getArxivById } from '@/lib/arxiv';
import { getPaperById } from '@/lib/semantic-scholar';
import { getCrossRefByDoi } from '@/lib/crossref';
import { aggregateSearch } from '@/lib/search';
import type { Article } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const dynamic = 'force-dynamic';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;

  let article: Article | null = null;
  let related: Article[] = [];
  let error: string | null = null;

  try {
    if (id.startsWith('ss-')) {
      article = await getPaperById(id);
    } else if (id.startsWith('arxiv-')) {
      const arxivId = id.replace('arxiv-', '');
      article = await getArxivById(arxivId);
    } else if (id.startsWith('rss-')) {
      let originalUrl = '#';
      try {
        originalUrl = atob(id.replace('rss-', ''));
      } catch { /* ignore */ }
      article = {
        id, title: '新闻/报道', summary: '该内容来自网络新闻源。详细信息请点击下方"查看原文"链接获取完整报道。',
        source: '网络新闻', sourceType: 'news', url: originalUrl, imageUrl: null,
        publishedDate: new Date().toISOString().split('T')[0], authors: [], tags: [], clickCount: 0,
      };
    } else if (id.startsWith('hn-')) {
      const hnId = id.replace('hn-', '');
      try {
        const hnRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${hnId}.json`);
        if (hnRes.ok) {
          const hnItem = await hnRes.json();
          article = {
            id, title: hnItem.title || 'Hacker News 讨论',
            summary: (hnItem.text || '').replace(/<[^>]+>/g, '').slice(0, 500) || '暂无摘要，请点击原文查看详情',
            source: 'Hacker News', sourceType: 'news',
            url: hnItem.url || `https://news.ycombinator.com/item?id=${hnId}`,
            imageUrl: null, publishedDate: hnItem.time ? new Date(hnItem.time * 1000).toISOString().split('T')[0] : '',
            authors: [], tags: [], clickCount: hnItem.score || 0,
          };
        }
      } catch { /* ignore */ }
      if (!article) {
        article = {
          id, title: 'Hacker News 讨论', summary: '该内容来自 Hacker News。详细信息请点击下方"查看原文"链接。',
          source: 'Hacker News', sourceType: 'news',
          url: `https://news.ycombinator.com/item?id=${hnId}`,
          imageUrl: null, publishedDate: new Date().toISOString().split('T')[0],
          authors: [], tags: [], clickCount: 0,
        };
      }
    } else if (id.startsWith('crossref-')) {
      const doi = id.replace('crossref-', '');
      article = await getCrossRefByDoi(doi);
      if (!article) {
        article = {
          id, title: '学术论文', summary: '无法获取该论文详情，请点击下方链接访问原文。',
          source: 'CrossRef', sourceType: 'paper',
          url: `https://doi.org/${doi}`, imageUrl: null, publishedDate: '',
          authors: [], tags: [], clickCount: 0,
        };
      }
    } else if (id.startsWith('web-') || id.startsWith('news-')) {
      let originalUrl = '#';
      try {
        const encoded = id.replace(/^(web|news)-/, '');
        originalUrl = decodeURIComponent(encoded);
      } catch { /* ignore */ }
      article = {
        id, title: '新闻/报道', summary: '该内容来自网络新闻源。详细信息请点击下方"查看原文"链接获取完整报道。',
        source: '网络新闻', sourceType: 'news', url: originalUrl, imageUrl: null,
        publishedDate: new Date().toISOString().split('T')[0], authors: [], tags: [], clickCount: 0,
      };
    }

    if (!article) error = '文章未找到';
  } catch {
    error = '文章加载失败，请稍后重试';
  }

  if (article && article.tags.length > 0) {
    try {
      const result = await aggregateSearch(article.tags[0], 1, 10);
      related = (result.articles || []).filter((a: Article) => a.id !== article!.id).slice(0, 5);
    } catch { /* ignore */ }
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground text-lg mb-4">{error || '文章未找到'}</p>
        <Link href="/"><Button variant="outline">返回首页</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ReadingTracker article={article} />
      {/* 面包屑 */}
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary transition-colors">首页</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground/70">文章详情</span>
      </nav>

      {/* 文章头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={article.sourceType === 'paper' ? 'default' : 'secondary'}>
            {article.sourceType === 'paper' ? '学术论文' : '新闻/报道'}
          </Badge>
        </div>

        <h1 className="text-2xl font-bold leading-tight mb-4">{article.title}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
          <span>来源：{article.source}</span>
          <span>发布日期：{article.publishedDate}</span>
          {article.authors.length > 0 && <span>作者：{article.authors.join(', ')}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {article.tags.map((tag) => (
            <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`}>
              <Badge variant="secondary" className="cursor-pointer hover:bg-accent">
                {tag}
              </Badge>
            </Link>
          ))}
          <CompareButton article={article} />
          <FavoriteButton
            articleId={article.id}
            title={article.title}
            source={article.source}
            sourceType={article.sourceType}
            publishedDate={article.publishedDate}
            url={article.url}
          />
          <Button asChild size="sm" className="ml-auto">
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              查看原文 ↗
            </a>
          </Button>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* 内容摘要 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="font-bold text-lg mb-3">内容摘要</h2>
          <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-line">
            {article.summary}
          </p>
        </CardContent>
      </Card>

      {/* 中文翻译 */}
      {/[\u4e00-\u9fff]/.test(article.summary) === false && article.summary.length > 30 && (
        <div className="mb-6"><ArticleTranslation text={article.summary} /></div>
      )}

      {/* AI 分析按钮 */}
      <div className="mb-6">
        <AIAnalyzeButton title={article.title} abstract={article.summary} sourceType={article.sourceType} />
      </div>

      {/* 与论文对话 */}
      <div className="mb-6">
        <ChatWithPaper articleId={article.id} articleUrl={article.url} summary={article.summary} title={article.title} />
      </div>

      {/* 相关推荐 */}
      {related.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-bold text-lg mb-4">相关推荐</h2>
            <ul className="space-y-3">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/article/${r.id}`} className="block text-sm hover:text-primary transition-colors line-clamp-1">
                    {r.title}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.source} · {r.publishedDate}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

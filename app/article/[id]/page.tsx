import Link from 'next/link';
import AIAnalyzeButton from '@/components/AIAnalyzeButton';
import ArticleTranslation from '@/components/ArticleTranslation';
import ChatWithPaper from '@/components/ChatWithPaper';
import CompareButton from '@/components/CompareButton';
import FavoriteButton from '@/components/FavoriteButton';
import ReadingTracker from '@/components/ReadingTracker';
import { aggregateSearch, fetchArticleById } from '@/lib/search';
import type { Article } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const dynamic = 'force-dynamic';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    title?: string;
    source?: string;
    date?: string;
    authors?: string;
    tags?: string;
    summary?: string;
    type?: string;
    url?: string;
    clicks?: string;
  }>;
}

export default async function ArticlePage({ params, searchParams }: ArticlePageProps) {
  const { id } = await params;
  const sp = await searchParams;

  let article: Article | null = null;
  let related: Article[] = [];
  let error: string | null = null;

  // ─── 策略一：优先使用 URL 参数（从搜索结果页传递过来）─────────
  if (sp.title) {
    article = {
      id,
      title: sp.title,
      summary: sp.summary || '',
      source: sp.source || '',
      sourceType: (sp.type as 'paper' | 'news') || 'paper',
      url: sp.url || '#',
      imageUrl: null,
      publishedDate: sp.date || '',
      authors: sp.authors ? sp.authors.split(',').filter(Boolean) : [],
      tags: sp.tags ? sp.tags.split(',').filter(Boolean) : [],
      clickCount: sp.clicks ? parseInt(sp.clicks) : 0,
    };

    // 对学术论文来源，尝试从 API 补充完整摘要（URL 传参可能被截断或为空）
    if ((id.startsWith('openalex-') || id.startsWith('pubmed-') || id.startsWith('arxiv-'))
        && article.summary.length < 80) {
      try {
        const fetched = await fetchArticleById(id);
        if (fetched && fetched.summary && fetched.summary.length > article.summary.length) {
          article = { ...article, ...fetched, id };
        }
      } catch { /* 保持 URL 参数版本 */ }
    }
  }

  // ─── 策略二：URL 参数没有，尝试从 API 获取 ──────────────────
  if (!article) {
    try {
      if (id.startsWith('ss-') || id.startsWith('crossref-')) {
        // 这两个数据源已被移除（限流严重 / 404 问题）
        error = '该文章来源（Semantic Scholar / Crossref）已被移除，请从搜索页重新查找该文章。';
      } else if (id.startsWith('arxiv-')) {
        const arxivId = id.replace('arxiv-', '');
        try { article = await fetchArticleById(id); } catch {}
        if (!article) {
          article = {
            id, title: 'arXiv 学术论文', summary: '该内容来自 arXiv。详细信息请点击下方"查看原文"链接获取完整论文。',
            source: 'arXiv', sourceType: 'paper',
            url: `https://arxiv.org/abs/${arxivId}`,
            imageUrl: null, publishedDate: '', authors: [], tags: [], clickCount: 0,
          };
        }
      } else if (id.startsWith('rss-')) {
        let originalUrl = '#';
        try { originalUrl = atob(id.replace('rss-', '')); } catch { /* ignore */ }
        article = {
          id, title: '新闻/报道', summary: '该内容来自网络新闻源。详细信息请点击下方"查看原文"链接获取完整报道。',
          source: '网络新闻', sourceType: 'news', url: originalUrl, imageUrl: null,
          publishedDate: new Date().toISOString().split('T')[0], authors: [], tags: [], clickCount: 0,
        };
      } else if (id.startsWith('hn-')) {
        const hnId = id.replace('hn-', '');
        try {
          const hnRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${hnId}.json`, { signal: AbortSignal.timeout(5000) });
          if (hnRes.ok) {
            const hnItem = await hnRes.json();
            if (hnItem && hnItem.title) {
              article = {
                id, title: hnItem.title,
                summary: (hnItem.text || '').replace(/<[^>]+>/g, '').slice(0, 500) || '暂无摘要，请点击原文查看详情',
                source: 'Hacker News', sourceType: 'news',
                url: hnItem.url || `https://news.ycombinator.com/item?id=${hnId}`,
                imageUrl: null, publishedDate: hnItem.time ? new Date(hnItem.time * 1000).toISOString().split('T')[0] : '',
                authors: [], tags: [], clickCount: hnItem.score || 0,
              };
            }
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
      } else if (id.startsWith('pubmed-')) {
        const pmid = id.replace('pubmed-', '');
        try { article = await fetchArticleById(id); } catch {}
        if (!article) {
          article = {
            id, title: 'PubMed 学术论文', summary: '该内容来自 PubMed。详细信息请点击下方"查看原文"链接获取完整论文。',
            source: 'PubMed', sourceType: 'paper',
            url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
            imageUrl: null, publishedDate: '', authors: [], tags: [], clickCount: 0,
          };
        }
      } else if (id.startsWith('openalex-')) {
        const workId = id.replace('openalex-', '');
        try { article = await fetchArticleById(id); } catch {}
        if (!article) {
          article = {
            id, title: 'OpenAlex 学术论文', summary: '该内容来自 OpenAlex。详细信息请点击下方"查看原文"链接获取完整论文。',
            source: 'OpenAlex', sourceType: 'paper',
            url: `https://openalex.org/works/${workId}`,
            imageUrl: null, publishedDate: '', authors: [], tags: [], clickCount: 0,
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
      } else {
        // 未知格式：尝试用 fetchArticleById
        try { article = await fetchArticleById(id); } catch {}
        if (!article) {
          error = '文章未找到';
        }
      }
    } catch {
      error = '文章加载失败，请稍后重试';
    }
  }

  // ─── 相关推荐 ────────────────────────────────────────────────
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
          {article.publishedDate && <span>发布日期：{article.publishedDate}</span>}
          {article.authors.length > 0 && <span>作者：{article.authors.join(', ')}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {article.tags.map((tag) => (
            <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`}>
              <Badge variant="secondary" className="cursor-pointer hover:bg-accent text-white bg-secondary/70 border border-secondary/30 hover:bg-secondary/90">
                {tag}
              </Badge>
            </Link>
          ))}
          <CompareButton article={article} />
          <FavoriteButton articleId={article.id} />
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
          >
            查看原文 ↗
          </a>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* 内容摘要 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="font-bold text-lg mb-3">内容摘要</h2>
          <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-line">
            {article.summary || '暂无摘要'}
          </p>
        </CardContent>
      </Card>

      {/* 中文翻译 */}
      {article.summary && !/[\u4e00-\u9fff]/.test(article.summary) && article.summary.length > 30 && (
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
                  <Link href={`/article/${r.id}?title=${encodeURIComponent(r.title)}&source=${encodeURIComponent(r.source)}&date=${encodeURIComponent(r.publishedDate)}&authors=${encodeURIComponent(r.authors.join(','))}&tags=${encodeURIComponent(r.tags.join(','))}&summary=${encodeURIComponent(r.summary.slice(0, 2000))}&type=${encodeURIComponent(r.sourceType)}&url=${encodeURIComponent(r.url)}&clicks=${r.clickCount}`} className="block text-sm hover:text-primary transition-colors line-clamp-1">
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

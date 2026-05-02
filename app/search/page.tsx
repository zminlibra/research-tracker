import type { Metadata } from 'next';
import Link from 'next/link';
import type { Article } from '@/lib/types';
import { aggregateSearch } from '@/lib/search';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import SearchFilters from '@/components/SearchFilters';
import FavoriteButton from '@/components/FavoriteButton';
import CompareButton from '@/components/CompareButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '搜索 — ResearchTracker',
  description: '搜索全球科研论文和行业新闻动态，涵盖 arXiv、PubMed、OpenAlex、Hacker News 等多个来源。',
};

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    source?: string;
    yearFrom?: string;
    yearTo?: string;
    author?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  const page = parseInt(params.page || '1', 10);
  const sort = (params.sort as string) || 'relevance';
  const source = (params.source as string) || 'all';
  const yearFrom = params.yearFrom ? parseInt(params.yearFrom) : undefined;
  const yearTo = params.yearTo ? parseInt(params.yearTo) : undefined;
  const author = params.author || '';

  if (!query) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground text-lg mb-4">请输入搜索关键词</p>
        <Link href="/"><Button variant="outline">返回首页</Button></Link>
      </div>
    );
  }

  let articles: Article[] = [];
  let totalCount = 0;
  let error: string | null = null;

  try {
    const result = await aggregateSearch(
      query, page, 20, sort as any, source as any,
      { yearFrom, yearTo, author: author || undefined }
    );
    articles = result.articles;
    totalCount = result.totalCount;
  } catch {
    error = '搜索服务暂时不可用，请稍后重试';
  }

  const totalPages = Math.ceil(totalCount / 20);
  const sortLabels: Record<string, string> = { relevance: '按相关性', date: '按时间', clicks: '按热度' };
  const sourceLabels: Record<string, string> = {
    all: '全部',
    arxiv: 'arXiv',
    pubmed: 'PubMed',
    openalex: 'OpenAlex',
    news: '新闻/报道',
  };
  const sourceKeys = Object.keys(sourceLabels);

  // 来源徽章颜色映射
  function getSourceBadgeClass(source: string): string {
    const s = source.toLowerCase();
    if (s.includes('arxiv'))      return 'bg-green-700 text-white border-green-700';
    if (s.includes('pubmed'))     return 'bg-blue-700 text-white border-blue-700';
    if (s.includes('openalex'))   return 'bg-purple-700 text-white border-purple-700';
    if (s.includes('news') || s.includes('hacker') || s.includes('rss'))
                                    return 'bg-gray-500 text-white border-gray-500';
    return 'bg-secondary text-secondary-foreground border-transparent';
  }

  // 标题匹配等级：'exact' > 'partial' > 'none'
  function getTitleMatchLevel(title: string, q: string): 'exact' | 'partial' | 'none' {
    const t = title.toLowerCase().replace(/\s+/g, ' ').trim();
    const qn = q.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!qn) return 'none';
    // 完全相同
    if (t === qn) return 'exact';
    // 查询词完整包含在标题中（子串匹配）
    if (t.includes(qn)) return 'partial';
    // 分词：查询词的所有 token 都在标题中出现
    const qTokens = qn.split(/\s+/).filter(w => w.length > 1);
    if (qTokens.length >= 3 && qTokens.every(w => t.includes(w))) return 'partial';
    return 'none';
  }

  // 重新排列：完全匹配置顶
  let sortedArticles = articles;
  if (sort === 'relevance') {
    const exactMatches = articles.filter(a => getTitleMatchLevel(a.title, query) === 'exact');
    const partialMatches = articles.filter(a => getTitleMatchLevel(a.title, query) === 'partial');
    const rest = articles.filter(a => getTitleMatchLevel(a.title, query) === 'none');
    sortedArticles = [...exactMatches, ...partialMatches, ...rest];
  }

  // 构建带筛选参数的 URL
  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    p.set('q', query);
    if (overrides.sort !== undefined) p.set('sort', overrides.sort);
    else if (sort) p.set('sort', sort);
    if (overrides.source !== undefined) p.set('source', overrides.source);
    else if (source && source !== 'all') p.set('source', source);
    if (overrides.yearFrom !== undefined) p.set('yearFrom', overrides.yearFrom);
    else if (params.yearFrom) p.set('yearFrom', params.yearFrom);
    if (overrides.yearTo !== undefined) p.set('yearTo', overrides.yearTo);
    else if (params.yearTo) p.set('yearTo', params.yearTo);
    if (overrides.author !== undefined) p.set('author', overrides.author);
    else if (author) p.set('author', author);
    if (overrides.page !== undefined) p.set('page', overrides.page);
    else p.set('page', '1'); // 筛选变更时回到第 1 页
    return `/search?${p.toString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 搜索信息 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1">
          搜索结果：<span className="text-primary">{query}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {error ? '搜索出错' : `共找到 ${totalCount} 条结果`}
        </p>
      </div>

      {/* 筛选面板 */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg border space-y-3">
        {/* 排序 + 来源 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">排序：</span>
            {Object.entries(sortLabels).map(([key, label]) => (
              <Link key={key} href={buildUrl({ sort: key })}>
                <Badge variant={sort === key ? 'default' : 'secondary'}
                  className={sort !== key ? 'cursor-pointer hover:bg-accent' : 'cursor-default'}>
                  {label}
                </Badge>
              </Link>
            ))}
          </div>
          <span className="text-border hidden sm:block">|</span>
          <div className="flex items-center gap-1.5 text-sm flex-wrap">
            <span className="text-muted-foreground">来源：</span>
            {sourceKeys.map((key) => (
              <Link key={key} href={buildUrl({ source: key })}>
                <Badge variant={source === key ? 'default' : 'secondary'}
                  className={source !== key ? 'cursor-pointer hover:bg-accent' : 'cursor-default'}>
                  {sourceLabels[key]}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* 高级筛选：年份范围 + 作者 */}
        <details className="group">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
            高级筛选 ▾
          </summary>
          <div className="mt-3">
            <SearchFilters
              defaultYearFrom={params.yearFrom || ""}
              defaultYearTo={params.yearTo || ""}
              defaultAuthor={author}
            />
          </div>
        </details>
      </div>

      {/* 错误提示 */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-2">{error}</p>
            <Link href="/"><Button variant="outline" size="sm">返回首页</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* 结果列表 */}
      {!error && articles.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg mb-2">未找到相关结果</p>
          <p className="text-muted-foreground text-sm">请尝试更换关键词或筛选条件</p>
        </div>
      )}

      {!error && articles.length > 0 && (
        <div className="space-y-4">
          {sortedArticles.map((article) => {
            const level = getTitleMatchLevel(article.title, query);
            const cardClass = level === 'exact'
              ? 'ring-2 ring-primary bg-primary/[0.06] shadow-md'
              : level === 'partial'
              ? 'ring-1 ring-primary/30 bg-primary/[0.02]'
              : '';
            const titleClass = level === 'exact'
              ? 'text-primary font-bold'
              : level === 'partial'
              ? 'text-primary/80'
              : '';
            return (
            <Card key={article.id} className={`hover:shadow-md transition-shadow group ${cardClass}`}>
              <CardContent className="p-5">
                <Link
                  href={`/article/${article.id}?title=${encodeURIComponent(article.title)}&source=${encodeURIComponent(article.source)}&date=${encodeURIComponent(article.publishedDate)}&authors=${encodeURIComponent(article.authors.join(','))}&tags=${encodeURIComponent(article.tags.join(','))}&summary=${encodeURIComponent((article.summary || '').slice(0, 2000))}&type=${encodeURIComponent(article.sourceType)}&url=${encodeURIComponent(article.url)}&clicks=${article.clickCount}`}
                >
                  <h3 className={`text-base font-semibold group-hover:text-primary transition-colors mb-2 leading-snug ${titleClass}`}>
                    {level === 'exact' && <span className="mr-1.5 text-xs align-middle">★</span>}
                    {article.title}
                  </h3>
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                  <Badge className={`text-[10px] px-1.5 py-0 border ${getSourceBadgeClass(article.source)}`}>
                    {article.source}
                  </Badge>
                  <span>{article.publishedDate}</span>
                  {article.authors.length > 0 && (
                    <span>作者：{article.authors.slice(0, 3).join(', ')}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">
                  {article.summary}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {article.tags.slice(0, 4).map((tag) => (
                      <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`}>
                        <Badge variant="secondary" className="cursor-pointer hover:bg-accent text-xs">
                          {tag}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <CompareButton article={article} />
                    <FavoriteButton articleId={article.id} />
                    <a href={article.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0">
                      查看原文 ↗
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}


          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })}>
                  <Button variant="outline" size="sm">上一页</Button>
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })}>
                  <Button variant="outline" size="sm">下一页</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

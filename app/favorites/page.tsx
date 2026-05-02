'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser, removeFavorite } from '@/lib/auth-store';
import type { Article } from '@/lib/types';

export default function FavoritesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    const favIds = user?.favorites || [];
    if (favIds.length === 0) { setLoading(false); return; }

    // 并发获取每篇收藏文章详情
    Promise.all(
      favIds.map(async (id) => {
        try {
          const res = await fetch(`/api/article/${encodeURIComponent(id)}`);
          if (res.ok) return (await res.json()) as Article;
          return null;
        } catch { return null; }
      })
    ).then((results) => {
      setArticles(results.filter(Boolean) as Article[]);
    }).finally(() => setLoading(false));
  }, []);

  const handleRemove = (id: string) => {
    removeFavorite(id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的收藏</h1>
        {articles.length > 0 && (
          <span className="text-sm text-muted-foreground">{articles.length} 篇</span>
        )}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-16">加载中...</div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">暂无收藏</p>
            <Link href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
              去搜索论文 →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id} className="group">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/article/${article.id}?title=${encodeURIComponent(article.title)}&source=${encodeURIComponent(article.source)}&date=${encodeURIComponent(article.publishedDate)}&authors=${encodeURIComponent(article.authors.join(','))}&tags=${encodeURIComponent(article.tags.join(','))}&summary=${encodeURIComponent(article.summary.slice(0, 500))}&type=${encodeURIComponent(article.sourceType)}&url=${encodeURIComponent(article.url)}&clicks=${article.clickCount}`}
                    className="font-medium text-sm hover:text-primary transition-colors line-clamp-1"
                  >
                    {article.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant={article.sourceType === 'paper' ? 'default' : 'secondary'} className="text-[10px]">
                      {article.sourceType === 'paper' ? '学术论文' : '新闻'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{article.source}</span>
                    <span className="text-xs text-muted-foreground">{article.publishedDate}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => handleRemove(article.id)}
                >
                  ✕
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

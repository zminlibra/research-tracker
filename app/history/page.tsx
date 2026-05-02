'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getHistory, clearHistory, type ReadHistoryEntry } from '@/lib/auth-store';
import { getCurrentUser } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HistoryPage() {
  const [entries, setEntries] = useState<ReadHistoryEntry[]>([]);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());
    setEntries(getHistory());
  }, []);

  if (!mounted) return null;

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">请先登录查看阅读历史</p>
        <Button asChild><Link href="/login">登录</Link></Button>
      </div>
    );
  }

  const handleClear = () => {
    clearHistory();
    setEntries([]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">阅读历史</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {entries.length} 篇 · {user.name}
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            清空历史
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            暂无阅读历史，去
            <Link href="/" className="text-primary hover:underline mx-1">首页</Link>
            探索一下吧
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map(({ article, viewedAt }) => (
            <Card key={`${article.id}-${viewedAt}`} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={article.sourceType === 'paper' ? 'default' : 'secondary'} className="text-xs">
                        {article.sourceType === 'paper' ? '学术论文' : '新闻/报道'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{article.source}</span>
                    </div>
                    <Link href={`/article/${article.id}`} className="text-sm font-medium hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      阅读于 {new Date(viewedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/article/${article.id}`}>查看</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

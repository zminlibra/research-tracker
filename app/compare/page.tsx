'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Article } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const STORAGE_KEY = 'research-tracker-compare';

function getCompareList(): Article[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export default function ComparePage() {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => { setArticles(getCompareList()); }, []);

  const remove = (id: string) => {
    const updated = articles.filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setArticles(updated);
  };

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setArticles([]);
  };

  if (articles.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">暂无待对比的论文</p>
        <p className="text-sm text-muted-foreground mb-6">
          在搜索结果中点击「对比」按钮添加论文（最多 4 篇）
        </p>
        <Link href="/">
          <Button variant="outline">去搜索</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">论文对比</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setArticles(getCompareList())}>
            刷新
          </Button>
          <Button variant="destructive" size="sm" onClick={clearAll}>
            清空全部
          </Button>
        </div>
      </div>

      {/* 对比表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 border-b bg-muted/50 font-medium text-muted-foreground w-32 sticky left-0 bg-muted">
                项目
              </th>
              {articles.map((a) => (
                <th key={a.id} className="p-3 border-b text-left align-top min-w-0" style={{ maxWidth: '280px' }}>
                  <div className="line-clamp-2 font-semibold leading-snug mb-2">{a.title}</div>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant={a.sourceType === 'paper' ? 'default' : 'secondary'} className="text-[10px]">
                      {a.sourceType === 'paper' ? '论文' : '新闻'}
                    </Badge>
                    <button onClick={() => remove(a.id)} className="text-xs text-destructive hover:underline">
                      移除
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border-b font-medium text-muted-foreground sticky left-0 bg-background">来源</td>
              {articles.map((a) => (
                <td key={a.id} className="p-3 border-b text-muted-foreground">{a.source}</td>
              ))}
            </tr>
            <tr>
              <td className="p-3 border-b font-medium text-muted-foreground sticky left-0 bg-background">发布日期</td>
              {articles.map((a) => (
                <td key={a.id} className="p-3 border-b text-muted-foreground">{a.publishedDate}</td>
              ))}
            </tr>
            <tr>
              <td className="p-3 border-b font-medium text-muted-foreground sticky left-0 bg-background">作者</td>
              {articles.map((a) => (
                <td key={a.id} className="p-3 border-b text-muted-foreground">
                  {a.authors.length > 0 ? a.authors.slice(0, 5).join(', ') : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-3 border-b font-medium text-muted-foreground sticky left-0 bg-background">标签</td>
              {articles.map((a) => (
                <td key={a.id} className="p-3 border-b">
                  <div className="flex flex-wrap gap-1">
                    {a.tags.slice(0, 5).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-3 border-b font-medium text-muted-foreground sticky left-0 bg-background align-top">摘要</td>
              {articles.map((a) => (
                <td key={a.id} className="p-3 border-b text-muted-foreground text-xs leading-relaxed max-w-xs">
                  <div className="line-clamp-6">{a.summary}</div>
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-3 font-medium text-muted-foreground sticky left-0 bg-background">操作</td>
              {articles.map((a) => (
                <td key={a.id} className="p-3">
                  <div className="flex flex-col gap-1">
                    <Link href={`/article/${a.id}`}>
                      <Button variant="outline" size="sm" className="w-full">查看详情</Button>
                    </Link>
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="w-full text-xs">原文链接 ↗</Button>
                    </a>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

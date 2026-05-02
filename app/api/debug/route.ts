import { NextResponse } from 'next/server';
import { searchNews } from '@/lib/news';

export const dynamic = 'force-dynamic';

export async function GET() {
  const info: Record<string, unknown> = {};

  // 测试 searchNews — 模拟新闻源测试
  try {
    const q = 'test';
    const results = await searchNews(q, 15);
    const bySource: Record<string, number> = {};
    results.forEach((a) => {
      bySource[a.source] = (bySource[a.source] || 0) + 1;
    });
    info['searchNews'] = {
      query: q,
      total: results.length,
      bySource,
      items: results.map((a) => ({
        source: a.source,
        title: a.title.slice(0, 80),
        url: a.url.slice(0, 60),
      })),
    };
  } catch (e) {
    info['searchNews_error'] = String(e);
  }

  // 直接测试 RSS 源
  info['rss_tests'] = {};
  const sources = [
    { url: 'https://hnrss.org/frontpage?count=3', name: 'hnrss.org' },
    { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica' },
    { url: 'https://www.sciencedaily.com/rss/top/technology.xml', name: 'Science Daily Tech' },
    { url: 'https://www.wired.com/feed/rss', name: 'Wired' },
    { url: 'https://36kr.com/feed', name: '36kr' },
  ];
  for (const src of sources) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(src.url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'ResearchTracker/1.0' },
      });
      const text = await res.text().catch(() => '');
      const itemCount = (text.match(/<(?:item|entry)>/gi) || []).length;
      (info['rss_tests'] as Record<string, unknown>)[src.name] = {
        ok: res.ok,
        status: res.status,
        items: itemCount,
      };
    } catch (e: any) {
      (info['rss_tests'] as Record<string, unknown>)[src.name] = {
        error: e.message || String(e),
      };
    }
  }

  return NextResponse.json(info);
}

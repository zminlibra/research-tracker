import { NextRequest, NextResponse } from 'next/server';
import { searchNews } from '@/lib/news';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 简单密钥保护，防止公开访问。设置 DEBUG_API_KEY 环境变量即可启用。
  const debugKey = process.env.DEBUG_API_KEY;
  if (debugKey) {
    const key = request.nextUrl.searchParams.get('key');
    if (key !== debugKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const info: Record<string, unknown> = {};

  // 测试 searchNews
  try {
    const q = request.nextUrl.searchParams.get('q') || 'test';
    const results = await searchNews(q, 8);
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
      })),
    };
  } catch (e) {
    info['searchNews_error'] = String(e);
  }

  return NextResponse.json(info);
}

import { NextResponse } from 'next/server';
import { aggregateSearch } from '@/lib/search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const months = parseInt(searchParams.get('months') || '6');

  if (!keyword) return NextResponse.json({ error: '缺少 keyword' }, { status: 400 });

  try {
    // 获取近 N 个月的日期范围
    const now = new Date();
    const counts: { month: string; count: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const monthStr = `${y}-${m}`;
      counts.push({ month: monthStr, count: 0 });
    }

    // 搜索该关键词，按日期筛选（客户端侧）
    const result = await aggregateSearch(keyword, 1, 100, 'date');

    // 统计每个月的论文数量
    result.articles.forEach((article) => {
      const monthPrefix = article.publishedDate.slice(0, 7); // "2026-03"
      const idx = counts.findIndex((c) => c.month === monthPrefix);
      if (idx >= 0) counts[idx].count++;
    });

    return NextResponse.json({ keyword, counts });
  } catch {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}

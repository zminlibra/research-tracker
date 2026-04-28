import { NextRequest, NextResponse } from 'next/server';
import { getTrendingArticles } from '@/lib/search';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') || undefined;
  const timeRange = (searchParams.get('time') as 'week' | 'month' | 'quarter' | 'year') || 'month';

  try {
    const articles = await getTrendingArticles(category, timeRange);
    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Trending error:', error);
    return NextResponse.json(
      { error: '获取热门文章失败' },
      { status: 500 }
    );
  }
}

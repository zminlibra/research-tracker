import { NextRequest, NextResponse } from 'next/server';
import { aggregateSearch } from '@/lib/search';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = (searchParams.get('sort') as 'relevance' | 'date' | 'clicks') || 'relevance';
  const source =
    (searchParams.get('source') as
      | 'all'
      | 'paper'
      | 'news'
      | 'arxiv'
      | 'pubmed'
      | 'openalex'
      | 'ieee') || 'all';
  const chinese = searchParams.get('chinese') === '1';

  if (!query.trim()) {
    return NextResponse.json(
      { error: '请输入搜索关键词' },
      { status: 400 }
    );
  }

  try {
    const results = await aggregateSearch(query.trim(), page, 20, sortBy, source, undefined, chinese);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: '搜索失败，请稍后重试' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { fetchArticleById } from '@/lib/fetchers';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    if (id.startsWith('ss-') || id.startsWith('crossref-')) {
      return NextResponse.json({ error: '此文章来源（Semantic Scholar / Crossref）已被移除，请从搜索页重新查找。' }, { status: 410 });
    }
    // 使用统一的 fetcher 路由（支持所有来源：arxiv、openalex、pubmed、ieee、news 等）
    const article = await fetchArticleById(id);
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(article);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

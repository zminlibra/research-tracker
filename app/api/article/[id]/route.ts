import { NextResponse } from 'next/server';
import { getArxivById } from '@/lib/arxiv';
import { getOpenAlexById } from '@/lib/openalex';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    if (id.startsWith('ss-') || id.startsWith('crossref-')) {
      return NextResponse.json({ error: '此文章来源（Semantic Scholar / Crossref）已被移除，请从搜索页重新查找。' }, { status: 410 });
    }
    if (id.startsWith('arxiv-')) {
      const article = await getArxivById(id.replace('arxiv-', ''));
      if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(article);
    }
    if (id.startsWith('openalex-')) {
      const article = await getOpenAlexById(id);
      if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(article);
    }
    return NextResponse.json({ error: 'Unsupported ID format' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

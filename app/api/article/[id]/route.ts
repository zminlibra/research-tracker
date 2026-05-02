import { NextResponse } from 'next/server';
import { getArxivById } from '@/lib/arxiv';
import { getPaperById } from '@/lib/semantic-scholar';
import { getCrossRefByDoi } from '@/lib/crossref';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    if (id.startsWith('ss-')) {
      const article = await getPaperById(id);
      if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(article);
    } else if (id.startsWith('arxiv-')) {
      const article = await getArxivById(id.replace('arxiv-', ''));
      if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(article);
    } else if (id.startsWith('crossref-')) {
      const article = await getCrossRefByDoi(id.replace('crossref-', ''));
      if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(article);
    }
    return NextResponse.json({ error: 'Unsupported ID format' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

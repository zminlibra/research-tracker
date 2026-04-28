import { NextRequest, NextResponse } from 'next/server';
import { getPaperById } from '@/lib/semantic-scholar';
import { getArxivById } from '@/lib/arxiv';
import { generateInsight } from '@/lib/ai';
import type { Article } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    let article: Article | null = null;

    if (id.startsWith('ss-')) {
      article = await getPaperById(id);
    } else if (id.startsWith('arxiv-')) {
      const arxivId = id.replace('arxiv-', '');
      article = await getArxivById(arxivId);
    } else if (id.startsWith('rss-') || id.startsWith('news-')) {
      // RSS/新闻文章：返回从 URL 解码的基本信息
      // 完整信息已在搜索结果中提供，此处仅提供基本可用数据
      article = {
        id,
        title: '新闻/行业动态',
        summary: '该内容来自网络新闻源。详细信息请点击下方"查看原文"链接获取完整报道。',
        source: '网络新闻',
        sourceType: id.startsWith('news-') ? 'news' : 'report',
        url: '#',
        imageUrl: null,
        publishedDate: new Date().toISOString().split('T')[0],
        authors: [],
        tags: [],
        clickCount: 0,
      };
    }

    if (!article) {
      return NextResponse.json(
        { error: '文章未找到' },
        { status: 404 }
      );
    }

    // 生成 AI 洞察
    const insight = await generateInsight(article.title, article.summary, article.sourceType);

    return NextResponse.json({ article, insight });
  } catch (error) {
    console.error('Article detail error:', error);
    return NextResponse.json(
      { error: '获取文章详情失败' },
      { status: 500 }
    );
  }
}

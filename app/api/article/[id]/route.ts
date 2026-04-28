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
    } else if (id.startsWith('rss-')) {
      let originalUrl = '#';
      try {
        originalUrl = atob(id.replace('rss-', ''));
      } catch { /* 兼容旧格式 */ }
      article = {
        id,
        title: '新闻/报道',
        summary: '该内容来自网络新闻源。详细信息请点击下方"查看原文"链接获取完整报道。',
        source: '网络新闻',
        sourceType: 'news',
        url: originalUrl,
        imageUrl: null,
        publishedDate: new Date().toISOString().split('T')[0],
        authors: [],
        tags: [],
        clickCount: 0,
      };
    } else if (id.startsWith('hn-')) {
      const hnId = id.replace('hn-', '');
      try {
        const hnRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${hnId}.json`);
        if (hnRes.ok) {
          const hnItem = await hnRes.json();
          article = {
            id,
            title: hnItem.title || 'Hacker News 讨论',
            summary: (hnItem.text || '').replace(/<[^>]+>/g, '').slice(0, 500) || '暂无摘要',
            source: 'Hacker News',
            sourceType: 'news',
            url: hnItem.url || `https://news.ycombinator.com/item?id=${hnId}`,
            imageUrl: null,
            publishedDate: hnItem.time ? new Date(hnItem.time * 1000).toISOString().split('T')[0] : '',
            authors: [],
            tags: [],
            clickCount: hnItem.score || 0,
          };
        }
      } catch { /* fallback */ }
      if (!article) {
        article = {
          id,
          title: 'Hacker News 讨论',
          summary: '该内容来自 Hacker News。',
          source: 'Hacker News',
          sourceType: 'news',
          url: `https://news.ycombinator.com/item?id=${hnId}`,
          imageUrl: null,
          publishedDate: new Date().toISOString().split('T')[0],
          authors: [],
          tags: [],
          clickCount: 0,
        };
      }
    } else if (id.startsWith('news-')) {
      article = {
        id,
        title: '新闻/报道',
        summary: '该内容来自网络新闻源。详细信息请点击下方"查看原文"链接获取完整报道。',
        source: '网络新闻',
        sourceType: 'news',
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

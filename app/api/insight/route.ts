import { NextRequest, NextResponse } from 'next/server';
import { generateInsight } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, abstract, sourceType } = body as {
      title: string;
      abstract: string;
      sourceType: string;
    };

    if (!title || !abstract) {
      return NextResponse.json(
        { error: '缺少标题或摘要' },
        { status: 400 }
      );
    }

    const insight = await generateInsight(title, abstract, sourceType || 'paper');

    return NextResponse.json(insight);
  } catch (error) {
    console.error('Insight API error:', error);
    return NextResponse.json(
      { error: 'AI 分析生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}

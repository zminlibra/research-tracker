'use client';

import { useState } from 'react';
import AIInsight from '@/components/AIInsight';
import type { AIInsight as AIInsightType } from '@/lib/types';

interface AIAnalyzeButtonProps {
  title: string;
  abstract: string;
  sourceType: string;
}

export default function AIAnalyzeButton({ title, abstract, sourceType }: AIAnalyzeButtonProps) {
  const [insight, setInsight] = useState<AIInsightType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, abstract, sourceType }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'AI 分析失败');
      } else {
        setInsight(data);
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  // 已有分析结果
  if (insight) {
    return (
      <div className="mb-8">
        <AIInsight insight={insight} />
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="mb-8">
        <AIInsight insight={{ summary: '', analysis: '', keyPoints: [] }} loading={true} />
      </div>
    );
  }

  // 初始状态：显示按钮
  return (
    <div className="mb-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 text-sm mb-2">{error}</p>
          <button
            onClick={handleAnalyze}
            className="text-red-600 text-sm underline hover:text-red-800"
          >
            重试
          </button>
        </div>
      )}
      <div className="bg-gradient-to-r from-accent/20 to-white rounded-lg border border-accent/30 p-6 text-center">
        <p className="text-text-secondary text-sm mb-4">
          使用 AI 分析这篇文章的核心发现、关键要点和深度见解
        </p>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm font-medium"
        >
          <span>🤖</span>
          AI 分析
        </button>
        <p className="text-text-muted text-xs mt-3">
          由 Gemini AI 提供分析，每次分析约需 3-5 秒
        </p>
      </div>
    </div>
  );
}

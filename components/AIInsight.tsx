import type { AIInsight as AIInsightType } from '@/lib/types';

interface AIInsightProps {
  insight: AIInsightType;
  loading?: boolean;
}

export default function AIInsight({ insight, loading = false }: AIInsightProps) {
  if (loading) {
    return (
      <div className="bg-accent/50 rounded-lg p-6 animate-pulse">
        <div className="h-5 bg-accent rounded w-24 mb-4" />
        <div className="space-y-2 mb-6">
          <div className="h-4 bg-accent rounded w-full" />
          <div className="h-4 bg-accent rounded w-5/6" />
          <div className="h-4 bg-accent rounded w-4/6" />
        </div>
        <div className="h-5 bg-accent rounded w-16 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-accent rounded w-full" />
          <div className="h-4 bg-accent rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-accent/30 to-white rounded-lg p-6 border border-accent/50">
      {/* 综合总结 */}
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-secondary font-bold text-lg mb-3">
          <span className="text-xl">🤖</span>
          AI 综合总结
        </h3>
        <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">
          {insight.summary}
        </p>
      </div>

      {/* 核心要点 */}
      {insight.keyPoints.length > 0 && (
        <div className="mb-6">
          <h4 className="text-secondary font-semibold text-sm mb-2">核心要点</h4>
          <ul className="space-y-1.5">
            {insight.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="inline-block w-5 h-5 bg-primary/10 text-primary rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 深度分析 */}
      <div>
        <h3 className="flex items-center gap-2 text-secondary font-bold text-lg mb-3">
          <span className="text-xl">💡</span>
          深度见解
        </h3>
        <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">
          {insight.analysis}
        </p>
      </div>
    </div>
  );
}

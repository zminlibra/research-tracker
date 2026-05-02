import type { AIInsight as AIInsightType } from '@/lib/types';

interface AIInsightProps {
  insight: AIInsightType;
  loading?: boolean;
}

const SECTIONS = [
  { key: 'coreContribution' as const, emoji: '🔬', label: '核心贡献' },
  { key: 'methodology' as const, emoji: '⚙️', label: '技术路径' },
  { key: 'keyResults' as const, emoji: '📊', label: '实验结果' },
  { key: 'limitations' as const, emoji: '⚠️', label: '局限性' },
];

function SectionCard({ emoji, label, content }: { emoji: string; label: string; content: string }) {
  if (!content) return null;
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="flex items-center gap-1.5 font-semibold text-sm text-secondary mb-1.5">
        <span>{emoji}</span> {label}
      </h4>
      <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  );
}

export default function AIInsight({ insight, loading = false }: AIInsightProps) {
  if (loading) {
    return (
      <div className="bg-accent/30 rounded-lg p-6 border border-accent/50 animate-pulse">
        <div className="h-5 bg-accent rounded w-28 mb-5" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mb-4">
            <div className="h-4 bg-accent rounded w-20 mb-2" />
            <div className="h-3.5 bg-accent rounded w-full mb-1" />
            <div className="h-3.5 bg-accent rounded w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-accent/20 to-white rounded-lg p-6 border border-accent/50">
      <h3 className="flex items-center gap-2 font-bold text-secondary mb-4">
        <span>🤖</span> AI 分析
      </h3>
      {SECTIONS.map(({ key, emoji, label }) => (
        <SectionCard
          key={key}
          emoji={emoji}
          label={label}
          content={insight[key]}
        />
      ))}
    </div>
  );
}

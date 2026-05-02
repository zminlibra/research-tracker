import type { AIInsight as AIInsightType } from '@/lib/types';

interface AIInsightProps {
  insight: AIInsightType;
  loading?: boolean;
}

type InsightSection = {
  key: keyof AIInsightType;
  emoji: string;
  label: string;
  accent?: boolean; // 首屏高亮区块
};

const SECTIONS: InsightSection[] = [
  { key: 'summary', emoji: '📝', label: '一句话摘要', accent: true },
  { key: 'coreContribution', emoji: '🔬', label: '核心贡献' },
  { key: 'methodology', emoji: '⚙️', label: '技术路径' },
  { key: 'keyResults', emoji: '📊', label: '实验结果' },
  { key: 'keyTakeaways', emoji: '💡', label: '核心要点', accent: true },
  { key: 'limitations', emoji: '⚠️', label: '局限性' },
  { key: 'deepInsights', emoji: '🔭', label: '深度见解', accent: true },
];

function InsightItem({ emoji, label, content, accent = false }: { emoji: string; label: string; content: string; accent?: boolean }) {
  if (!content) return null;
  const isList = content.includes('\n') && (content.match(/^\d+\./m) || content.match(/^[•\-]/m));

  return (
    <div className={`mb-5 last:mb-0 ${accent ? 'bg-accent/30 rounded-lg p-4' : ''}`}>
      <h4 className="flex items-center gap-1.5 font-semibold text-sm text-secondary mb-2">
        <span>{emoji}</span> {label}
      </h4>
      {isList ? (
        <ul className="space-y-1.5 text-sm leading-relaxed text-text-secondary">
          {content.split('\n').filter(l => l.trim()).map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary mt-0.5 flex-shrink-0">•</span>
              <span>{line.replace(/^\d+\.\s*/, '').replace(/^[•\-]\s*/, '').trim()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
          {content}
        </p>
      )}
    </div>
  );
}

export default function AIInsight({ insight, loading = false }: AIInsightProps) {
  if (loading) {
    return (
      <div className="bg-accent/30 rounded-lg p-6 border border-accent/50 animate-pulse">
        <div className="h-5 bg-accent rounded w-20 mb-5" />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="mb-4">
            <div className="h-4 bg-accent rounded w-24 mb-2" />
            <div className="h-3.5 bg-accent rounded w-full mb-1" />
            <div className="h-3.5 bg-accent rounded w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-accent/20 to-white rounded-lg p-6 border border-accent/50">
      <h3 className="flex items-center gap-2 font-bold text-secondary mb-5">
        <span>🤖</span> AI 分析
      </h3>
      {SECTIONS.map(({ key, emoji, label, accent }) => (
        <InsightItem
          key={key}
          emoji={emoji}
          label={label}
          content={insight[key]}
          accent={accent}
        />
      ))}
    </div>
  );
}

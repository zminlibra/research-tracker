import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '论文对比 — ResearchTracker',
  description: '多篇论文并排对比，快速分析优劣差异，辅助文献调研。',
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}

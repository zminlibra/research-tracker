import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '阅读历史 — ResearchTracker',
  description: '查看我在 ResearchTracker 上的论文和新闻阅读历史记录。',
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '我的收藏 — ResearchTracker',
  description: '查看我在 ResearchTracker 上收藏的科研论文和行业资讯。',
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

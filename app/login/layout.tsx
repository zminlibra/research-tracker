import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登录 — ResearchTracker',
  description: '登录 ResearchTracker 账号，追踪科研动态，管理收藏和阅读历史。',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

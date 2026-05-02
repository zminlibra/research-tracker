import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '注册 — ResearchTracker',
  description: '注册 ResearchTracker 账号，享受个性化科研追踪服务。',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}

'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <h2 className="text-xl font-bold text-secondary mb-4">页面加载出错</h2>
      <p className="text-text-muted mb-6">{error.message || '发生了意外错误，请稍后重试'}</p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
        >
          重试
        </button>
        <Link href="/" className="px-6 py-2 bg-white border border-border text-text-secondary rounded hover:bg-bg-light transition-colors">
          返回首页
        </Link>
      </div>
    </div>
  );
}

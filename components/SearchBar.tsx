'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SearchBarProps {
  variant?: 'hero' | 'inline';
  initialQuery?: string;
}

export default function SearchBar({ variant = 'inline', initialQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  if (variant === 'hero') {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
        <div className="flex shadow-2xl rounded-xl overflow-hidden ring-4 ring-white/30">
          <div className="flex-1 bg-white flex items-center">
            <span className="pl-5 text-text-muted text-lg">🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词，追踪科研与行业最新动态..."
              className="w-full px-3 py-5 text-lg text-text-primary bg-white outline-none border-0 placeholder:text-gray-400"
            />
          </div>
          <button
            type="submit"
            className="px-10 py-5 bg-primary hover:bg-primary-dark text-white font-semibold text-lg transition-colors tracking-wide"
          >
            搜 索
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索关键词..."
        className="flex-1 px-4 py-2 text-sm text-text-primary border border-border rounded-l focus:outline-none focus:border-primary"
      />
      <button
        type="submit"
        className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-r transition-colors"
      >
        搜索
      </button>
    </form>
  );
}

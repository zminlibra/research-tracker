'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
          <div className="flex-1 bg-white flex items-center px-5">
            <svg className="w-5 h-5 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词，追踪科研与行业最新动态..."
              className="border-0 shadow-none focus-visible:ring-0 text-lg py-6 px-3 bg-transparent"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="rounded-none px-10 py-6 text-lg font-semibold tracking-wide"
          >
            搜索
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex">
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索关键词..."
        className="rounded-r-none"
      />
      <Button type="submit" className="rounded-l-none">
        搜索
      </Button>
    </form>
  );
}

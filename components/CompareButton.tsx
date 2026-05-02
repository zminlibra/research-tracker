'use client';

import { useEffect, useState } from 'react';
import type { Article } from '@/lib/types';

const STORAGE_KEY = 'research-tracker-compare';

function getCompareList(): Article[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveCompareList(list: Article[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 4)));
}

export default function CompareButton({ article }: { article: Article }) {
  const [count, setCount] = useState(0);
  const [inCompare, setInCompare] = useState(false);

  useEffect(() => {
    const list = getCompareList();
    setCount(list.length);
    setInCompare(list.some((a) => a.id === article.id));
  }, [article.id]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list = getCompareList();
    if (inCompare) {
      const updated = list.filter((a) => a.id !== article.id);
      saveCompareList(updated);
      setCount(updated.length);
      setInCompare(false);
    } else {
      if (list.length >= 4) return; // 最多对比 4 篇
      const updated = [...list, article];
      saveCompareList(updated);
      setCount(updated.length);
      setInCompare(true);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleToggle}
        disabled={!inCompare && count >= 4}
        title={inCompare ? '从对比中移除' : '添加到对比'}
        className={`px-2 py-1 text-xs rounded border transition-colors ${
          inCompare
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed'
        }`}
      >
        {inCompare ? '✓ 对比' : '对比'}
      </button>
      {count > 0 && (
        <a href="/compare" className="text-xs text-muted-foreground hover:text-primary">
          ({count})
        </a>
      )}
    </div>
  );
}

export function CompareCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(getCompareList().length);
    const interval = setInterval(() => setCount(getCompareList().length), 500);
    return () => clearInterval(interval);
  }, []);
  if (count === 0) return null;
  return (
    <a href="/compare" className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors">
      对比 ({count})
    </a>
  );
}

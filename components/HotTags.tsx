'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTrendingTags, getClientApiKey } from '@/lib/ai-client';
import type { TrendingTag } from '@/lib/ai-client';

const DEFAULT_TAGS: TrendingTag[] = [
  { label: '大型语言模型', query: 'large language model' },
  { label: '固态电池', query: 'solid state battery' },
  { label: '基因编辑', query: 'CRISPR gene editing' },
  { label: '量子计算', query: 'quantum computing' },
  { label: '自动驾驶', query: 'autonomous driving' },
  { label: 'mRNA疫苗', query: 'mRNA vaccine' },
  { label: '核聚变', query: 'nuclear fusion' },
  { label: '脑机接口', query: 'brain computer interface' },
];

export default function HotTags() {
  const [tags, setTags] = useState<TrendingTag[]>(DEFAULT_TAGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 如果用户已配置 API Key，尝试加载动态标签
    if (getClientApiKey()) {
      setLoading(true);
      getTrendingTags()
        .then(setTags)
        .catch(() => { /* keep defaults */ })
        .finally(() => setLoading(false));
    }
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-text-muted text-sm">
        {loading ? '加载热门搜索...' : '热门搜索：'}
      </span>
      {tags.map((tag) => (
        <Link
          key={tag.query}
          href={`/search?q=${encodeURIComponent(tag.query)}`}
          className="px-3 py-1 text-sm bg-white/80 hover:bg-white text-primary rounded-full border border-primary/20 hover:border-primary/40 transition-all hover:shadow-sm"
        >
          {tag.label}
        </Link>
      ))}
    </div>
  );
}

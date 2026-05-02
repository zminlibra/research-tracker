'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface TrendingTag {
  label: string;
  query: string;
}

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
  const [tags] = useState<TrendingTag[]>(DEFAULT_TAGS);

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Link key={tag.query} href={`/search?q=${encodeURIComponent(tag.query)}`}>
          <Badge variant="secondary" className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors text-sm">
            🔥 {tag.label}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
